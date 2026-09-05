import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { buildOpenApiDocument } from "./document";

/**
 * Escreve `openapi/v1.json` a partir das rotas registradas — ou, com
 * `--check`, falha se o arquivo versionado estiver diferente do que a API
 * expõe hoje. É esse check que impede o contrato de envelhecer em silêncio.
 *
 * Precisa de um Mongo de pé: `app.init()` aguarda a conexão do Mongoose antes
 * de o scanner enxergar as rotas. Use `MONGODB_URI` para apontar para um banco
 * descartável — nada é lido nem escrito nele.
 */
const outputPath = resolve(process.cwd(), "openapi/v1.json");
const checkOnly = process.argv.includes("--check");

async function main(): Promise<void> {
  process.env.SEED_DEMO = "false";
  process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27018/openapi";

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api/v1");
  try {
    await app.init();

    const serialized = `${JSON.stringify(buildOpenApiDocument(app), null, 2)}\n`;

    if (checkOnly) {
      let current = "";
      try {
        current = await readFile(outputPath, "utf8");
      } catch {
        // A mensagem abaixo cobre tanto arquivo ausente quanto divergente.
      }
      if (current !== serialized) {
        throw new Error(
          "openapi/v1.json está desatualizado. Rode `npm run openapi:generate` na pasta api.",
        );
      }
      process.stdout.write("ok    contrato OpenAPI em dia\n");
      return;
    }

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, serialized, "utf8");
    process.stdout.write(`Contrato OpenAPI atualizado em ${outputPath}\n`);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
