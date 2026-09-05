import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import openapiTS, { astToString, COMMENT_HEADER } from "openapi-typescript";

/**
 * Traduz `api/openapi/v1.json` para tipos TypeScript.
 *
 * Com `--check`, falha se o artefato versionado estiver diferente do que sai
 * do contrato atual. Junto com o `openapi:check` da API, fecha a corrente:
 * mudou o controller → muda o contrato → mudam os tipos → o build da loja
 * quebra na hora, e não meses depois na tela de alguém.
 */
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = resolve(projectRoot, "api/openapi/v1.json");
const outputPath = resolve(projectRoot, "types/generated/api-v1.d.ts");
const checkOnly = process.argv.includes("--check");

const ast = await openapiTS(pathToFileURL(schemaPath), {
  alphabetize: true,
  emptyObjectsUnknown: true,
});
const generated = `${COMMENT_HEADER}${astToString(ast)}`;

if (checkOnly) {
  let current = "";
  try {
    current = await readFile(outputPath, "utf8");
  } catch {
    // A mensagem abaixo cobre tanto artefato ausente quanto divergente.
  }
  if (current !== generated) {
    throw new Error(
      "types/generated/api-v1.d.ts está desatualizado. Rode `npm run api:types:generate`.",
    );
  }
  process.stdout.write("ok    tipos da API em dia\n");
} else {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, generated, "utf8");
  process.stdout.write(`Tipos da API atualizados em ${outputPath}\n`);
}
