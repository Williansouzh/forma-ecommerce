import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthService } from "../auth.service";
import { AuthenticatedUser } from "../../../common/roles";
import type { ApiConfig } from "../../../config/configuration";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService<ApiConfig>,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("jwtSecret")!,
    });
  }

  async validate(
    payload: AuthenticatedUser,
  ): Promise<AuthenticatedUser | null> {
    return this.authService.findById(payload.sub);
  }
}
