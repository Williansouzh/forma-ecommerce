import { Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/auth.decorators";
import type { AuthenticatedUser } from "../../common/roles";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Autentica no painel. Limitado a cinco tentativas por minuto, por IP. */
  /*
   * Antes eram infinitas: força bruta sem custo, e um caminho de negação de
   * serviço — `bcrypt` é caro POR DESENHO, então um laço de requisições prende
   * a CPU da API sem precisar acertar senha nenhuma.
   *
   * O limite vale só aqui, e não globalmente: as leituras de catálogo passam
   * pelo servidor da loja e chegam todas do mesmo IP, então um limite global
   * derrubaria a vitrine no primeiro pico de visitas.
   */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
