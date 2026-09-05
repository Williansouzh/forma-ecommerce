import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";

/**
 * Monta o contrato público da API v1.
 *
 * Só entram as rotas sob `/api/v1` — se algum dia existir rota fora do
 * prefixo, ela não vaza para o contrato que a loja consome.
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle("c3dcriativ — API v1")
    .setDescription(
      "Contrato da API da loja. Preços em CENTAVOS (inteiros) em todos os campos monetários.",
    )
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    // Sem isto o operationId sai como `ProductsController_findAll`, que muda
    // se o controller for renomeado. O nome do domínio é mais estável.
    operationIdFactory: (controllerKey, methodKey) =>
      `${controllerKey.replace(/Controller$/, "")}_${methodKey}`,
  });

  document.paths = Object.fromEntries(
    Object.entries(document.paths).filter(([path]) => path.startsWith("/api/v1")),
  );
  document.servers = [{ url: "/", description: "Mesma origem" }];

  return document;
}
