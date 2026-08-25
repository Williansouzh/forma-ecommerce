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
  };
}
