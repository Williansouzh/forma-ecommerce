import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { JwtService } from "@nestjs/jwt";
import { Model } from "mongoose";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { User, UserDocument } from "./schemas/user.schema";
import { AppPairing, AppPairingDocument } from "./schemas/app-pairing.schema";
import { LoginDto } from "./dto/login.dto";
import { AuthenticatedUser } from "../../common/roles";

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(AppPairing.name)
    private readonly pairingModel: Model<AppPairingDocument>,
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

  /**
   * Código do QR code de "App móvel", para quem já está logado no painel.
   *
   * Vale uma sessão de 12 h inteira, por isso dura só o tempo de apontar a
   * câmera e tem 192 bits — adivinhar não é caminho, e o limite de tentativas
   * da troca cobre o resto.
   */
  async createAppPairing(userId: string) {
    const code = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + APP_PAIRING_TTL_MS);
    await this.pairingModel.create({ _id: hashCode(code), userId, expiresAt });
    return { code, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Troca o código pela mesma sessão do login com senha. Ler e apagar numa
   * operação só garante o uso único — duas leituras do mesmo QR ao mesmo
   * tempo não viram duas sessões.
   */
  async exchangeAppPairing(code: string) {
    const pairing = await this.pairingModel
      .findOneAndDelete({ _id: hashCode(code), expiresAt: { $gt: new Date() } })
      .exec();
    const user = pairing ? await this.userModel.findById(pairing.userId).exec() : null;
    if (!user) {
      throw new UnauthorizedException(
        "QR code expirado ou já usado. Gere outro no painel.",
      );
    }
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

export const APP_PAIRING_TTL_MS = 2 * 60 * 1000;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}
