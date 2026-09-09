import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "../decorators/auth.decorators";

/**
 * Fechado por padrão; `@Public()` é a única porta de saída.
 *
 * A diferença para a versão anterior é que rota pública também PASSA pelo
 * passport agora, só que sem exigir token. Antes o guard devolvia `true` antes
 * de autenticar, e `request.user` ficava vazio mesmo quando um superadmin
 * mandava um token válido — o que impedia uma rota pública de responder
 * diferente para quem administra a loja.
 *
 * É disso que a listagem de produtos precisa: o público não pode ver peça
 * despublicada, e o painel lê a MESMA rota e precisa ver todas.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  /**
   * Em rota pública, ausência de token (ou token inválido) é anonimato, não
   * erro: devolve `null` e a requisição segue. Em rota fechada, o
   * comportamento é o de sempre.
   */
  handleRequest<TUser = unknown>(
    err: unknown,
    user: unknown,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return (user ?? null) as TUser;
    if (err || !user) throw err instanceof Error ? err : new UnauthorizedException();
    return user as TUser;
  }
}
