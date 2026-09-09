import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthenticatedUser } from "../roles";

/**
 * O usuário da requisição — ou `null`.
 *
 * O `null` passou a ser possível quando o `JwtAuthGuard` deixou de pular o
 * passport em rota pública: hoje uma rota `@Public()` recebe o usuário quando
 * há token válido e `null` quando não há. Em rota fechada o guard já barrou
 * antes, então ali nunca é nulo — mas o tipo diz a verdade sobre os dois
 * casos, para que ninguém desreferencie sem pensar.
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser | null => {
    return ctx.switchToHttp().getRequest().user ?? null;
  },
);
