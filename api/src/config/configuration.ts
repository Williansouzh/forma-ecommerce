import * as path from "path";
import * as dotenv from "dotenv";

const envPath = path.resolve(process.cwd(), ".env");
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("fs").accessSync(envPath);
  dotenv.config({ path: envPath });
  // eslint-disable-next-line no-empty
} catch {}

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

export function configuration(): ApiConfig {
  return {
    port: Number(process.env.PORT) || 4000,
    mongoUri:
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/forma",
    jwtSecret: process.env.JWT_SECRET ?? "forma-dev-secret",
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    adminEmail: process.env.ADMIN_EMAIL ?? "admin@forma.estudio",
    adminPassword: process.env.ADMIN_PASSWORD ?? "forma-admin-2026",
    adminName: process.env.ADMIN_NAME ?? "Super Admin",
    seedDemo: process.env.SEED_DEMO !== "false",
    publicApiUrl:
      process.env.PUBLIC_API_URL ?? "http://localhost:4000",
    publicSiteUrl:
      process.env.PUBLIC_SITE_URL ?? "http://localhost:3000",
  };
}
