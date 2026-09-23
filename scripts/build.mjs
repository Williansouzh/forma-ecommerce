import { execSync } from "node:child_process";

/**
 * O `npm run build` da loja.
 *
 * Fora da Cloudflare — local, CI, Docker — é `next build` e nada mais: o
 * contêiner e o gate do CI esperam o servidor Node em `.next/standalone`.
 *
 * Dentro do Workers Builds (que exporta `WORKERS_CI=1`), o mesmo comando gera
 * também o Worker em `.open-next`. Precisa ser AQUI, no build: o deploy de
 * produção é `wrangler deploy`, que ao ver `open-next.config.ts` repassa para
 * `opennextjs-cloudflare deploy` antes de olhar o `build.command` do
 * `wrangler.jsonc` — e esse deploy não constrói nada, só envia o que achar.
 * Sem `.open-next`, falha com "Could not find compiled Open Next config".
 *
 * Não há recursão: o adaptador chama `next build` direto (ver `buildCommand`
 * em `open-next.config.ts`), não este script.
 */
const command = process.env.WORKERS_CI
  ? "npx opennextjs-cloudflare build"
  : "npx next build";

execSync(command, { stdio: "inherit" });
