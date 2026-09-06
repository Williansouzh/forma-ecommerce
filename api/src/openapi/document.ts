import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";

/**
 * Monta o contrato público da API v1.
 *
 * Só entram as rotas sob `/api/v1` — se algum dia existir rota fora do
 * prefixo, ela não vaza para o contrato que a loja consome.
 */
/**
 * O contrato tem de descrever o que vai NO FIO, não a classe do Mongoose.
 *
 * Os schemas declaram `_id: string`, e o plugin do Swagger lê a classe — mas
 * o `toJSON` de cada schema renomeia `_id` para `id` antes de serializar.
 * Sem esta correção o contrato mente, e mentira em contrato é pior que
 * contrato nenhum: a loja compila contra um campo que nunca chega.
 *
 * Foi exatamente o que aconteceu — `mapProduct` lia `raw._id` e montava
 * `id: undefined` em todo produto vindo da API.
 */
function renameIdToWireFormat(document: OpenAPIObject): void {
  for (const schema of Object.values(document.components?.schemas ?? {})) {
    const properties = (schema as { properties?: Record<string, unknown> })
      .properties;
    if (!properties || !("_id" in properties)) continue;

    properties.id = properties._id;
    delete properties._id;

    const required = (schema as { required?: string[] }).required;
    if (required) {
      (schema as { required: string[] }).required = required.map((field) =>
        field === "_id" ? "id" : field,
      );
    }
  }
}

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
  renameIdToWireFormat(document);

  return document;
}
