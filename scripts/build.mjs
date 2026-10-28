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
/*
 * Na Cloudflare, sem `NEXT_PUBLIC_API_URL` o build passava verde e publicava
 * uma loja falando com `localhost:4000` — isto é, com ninguém. Ela ficou no
 * ar assim, sem erro em lugar nenhum. A variável é embutida no build, então é
 * aqui que a falta dela tem de parar tudo.
 */
if (process.env.WORKERS_CI) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  if (!/^https:\/\//.test(apiUrl) || /localhost|127\.0\.0\.1/.test(apiUrl)) {
    console.error(
      `\nNEXT_PUBLIC_API_URL inválida para produção: "${apiUrl}".\n` +
        "Defina em Workers & Pages → forma-ecommerce → Settings → Build → " +
        "Variables and secrets (ex.: https://api.studiocamada.com). Ver docs/DEPLOY.md § 6.\n",
    );
    process.exit(1);
  }
}

const command = process.env.WORKERS_CI
  ? "npx opennextjs-cloudflare build"
  : "npx next build";

execSync(command, { stdio: "inherit" });
