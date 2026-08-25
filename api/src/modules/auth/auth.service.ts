import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { JwtService } from "@nestjs/jwt";
import { Model } from "mongoose";
import * as bcrypt from "bcryptjs";
import { User, UserDocument } from "./schemas/user.schema";
import { LoginDto } from "./dto/login.dto";
import { AuthenticatedUser } from "../../common/roles";

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userModel
      .findOne({ email: dto.email.toLowerCase().trim() })
      .exec();
    if (!user) throw new UnauthorizedException("Credenciais inválidas");

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) throw new UnauthorizedException("Credenciais inválidas");

    return this.buildSession(user);
  }

  async findById(id: string): Promise<AuthenticatedUser | null> {
    const user = await this.userModel.findById(id).exec();
    if (!user) return null;
    return {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  private buildSession(user: UserDocument) {
    const payload: AuthenticatedUser = {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: payload,
    };
  }
}
