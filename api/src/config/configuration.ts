import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

// O `.env` só existe fora do container: em produção as variáveis vêm do
// ambiente. Ausência do arquivo é o caso normal, não erro.
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

export interface ApiConfig {
  port: number;
  mongoUri: string;
  jwtSecret: string;
  corsOrigin: string;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
  seedDemo: boolean;
  /** Base pública da API, para o Mercado Pago alcançar o webhook. */
  publicApiUrl: string;
  /** Base pública da loja, para as back_urls do checkout. */
  publicSiteUrl: string;
}

/**
 * Os valores que existem para o desenvolvimento funcionar sem `.env` — e que
 * NÃO podem sair daqui.
 *
 * Eles estão num repositório público. Subir em produção com o `jwtSecret`
 * abaixo significa assinar token com um segredo que qualquer pessoa lê no
 * GitHub: forja-se um JWT com `role: superadmin` e o painel está aberto.
 *
 * O `docker-compose.prod.yml` já usa `${JWT_SECRET:?...}`, que impede o
 * contêiner de subir sem a variável. Mas essa é uma proteção do orquestrador:
 * quem rodar por `docker run`, por systemd na EC2 ou pelo compose de
 * desenvolvimento passa por fora dela. A aplicação precisa se recusar sozinha.
 */
const INSEGUROS = {
  jwtSecret: "forma-dev-secret",
  adminPassword: "forma-admin-2026",
} as const;

/**
 * Em produção, segredo padrão é falha de partida — não aviso no log.
 *
 * Aviso a gente não lê; processo que não sobe, sim. E falhar no boot é
 * infinitamente mais barato que descobrir a invasão depois.
 */
function exigeSegredoProprio(config: ApiConfig): void {
  if (process.env.NODE_ENV !== "production") return;

  const pendentes = (
    Object.keys(INSEGUROS) as (keyof typeof INSEGUROS)[]
  ).filter((chave) => config[chave] === INSEGUROS[chave]);

  if (pendentes.length > 0) {
    const variaveis = pendentes
      .map((chave) => (chave === "jwtSecret" ? "JWT_SECRET" : "ADMIN_PASSWORD"))
      .join(", ");
    throw new Error(
      `Recusando iniciar em produção com valor padrão em: ${variaveis}. ` +
        "Esses valores estão no repositório público — defina os seus no ambiente.",
    );
  }
}

export function configuration(): ApiConfig {
  const config: ApiConfig = {
    port: Number(process.env.PORT) || 4000,
    mongoUri:
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/forma",
    jwtSecret: process.env.JWT_SECRET ?? INSEGUROS.jwtSecret,
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    adminEmail: process.env.ADMIN_EMAIL ?? "admin@forma.estudio",
    adminPassword: process.env.ADMIN_PASSWORD ?? INSEGUROS.adminPassword,
    adminName: process.env.ADMIN_NAME ?? "Super Admin",
    seedDemo: process.env.SEED_DEMO !== "false",
    publicApiUrl:
      process.env.PUBLIC_API_URL ?? "http://localhost:4000",
    publicSiteUrl:
      process.env.PUBLIC_SITE_URL ?? "http://localhost:3000",
  };

  exigeSegredoProprio(config);
  return config;
}
