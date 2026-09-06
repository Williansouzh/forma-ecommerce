import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { getConnectionToken } from "@nestjs/mongoose";
import { ConfigModule } from "@nestjs/config";
import type { Connection } from "mongoose";
import { createServer, type Server } from "http";
import { configuration } from "../../config/configuration";
import { StorageModule } from "./storage.module";
import { StorageService, MAX_IMAGE_BYTES } from "./storage.service";
import { R2Client } from "./r2.client";
import { IntegrationsService } from "../integrations/integrations.service";
import { APP_GUARD } from "@nestjs/core";
import { clearCollections, testMongoModule } from "../../test/mongo";
import type { CanActivate, ExecutionContext } from "@nestjs/common";

/** Guard que autentica como um admin, do jeito que o JWT real faria. */
function authenticatedAs(email: string): CanActivate {
  return {
    canActivate(context: ExecutionContext): boolean {
      context.switchToHttp().getRequest<{ user?: unknown }>().user = {
        sub: "test",
        email,
        name: "Admin de teste",
        role: "superadmin",
      };
      return true;
    },
  };
}

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(2048),
]);

/**
 * O caminho do upload de ponta a ponta, com a aplicação HTTP de verdade.
 *
 * O motivo de subir o Nest em vez de chamar o controller direto: o limite do
 * corpo e a captura do `rawBody` são configuração de BOOTSTRAP, não de
 * controller. Chamar o método com um Buffer na mão passaria mesmo que o
 * Express recusasse a requisição com 413 — que é exatamente o defeito que
 * este arquivo existe para pegar.
 *
 * O R2 é dublê: é o limite externo. Tudo abaixo dele é real.
 */
describe("Upload de imagem (HTTP real)", () => {
  let app: INestApplication;
  let server: Server;
  let base: string;
  let connection: Connection;
  let integrations: IntegrationsService;
  const puts: { key: string; contentType: string; bytes: number }[] = [];

  beforeAll(async () => {
    const r2 = {
      objectUrl: () => new URL("https://conta.r2.cloudflarestorage.com/forma-data/x"),
      putObject: (_c: unknown, key: string, body: Buffer, contentType: string) => {
        puts.push({ key, contentType, bytes: body.length });
        return Promise.resolve();
      },
      deleteObject: () => Promise.resolve(),
      checkAccess: () => Promise.resolve({ ok: true, message: "ok" }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        testMongoModule("forma_test_media"),
        StorageModule,
      ],
      /**
       * O guard entra como APP_GUARD, não como `overrideGuard`.
       *
       * `overrideGuard` só troca um guard que EXISTE, e os guards desta API
       * são registrados no `AppModule`, que não é montado aqui. O override
       * passava sem erro e não fazia nada: `request.user` ficava `undefined` e
       * o 500 vinha do andaime, não do código sob teste.
       */
      providers: [
        { provide: APP_GUARD, useValue: authenticatedAs("admin@forma.estudio") },
      ],
    })
      .overrideProvider(R2Client)
      .useValue(r2)
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>({ rawBody: true });
    (app as NestExpressApplication).useBodyParser("raw", {
      limit: "10mb",
      type: ["image/*", "application/octet-stream"],
    });
    app.setGlobalPrefix("api/v1");
    await app.init();

    server = createServer(app.getHttpAdapter().getInstance() as never);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;

    connection = app.get(getConnectionToken());
    integrations = app.get(IntegrationsService);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await app.close();
  });

  beforeEach(async () => {
    puts.length = 0;
    await clearCollections(connection);
    await integrations.update("r2", {
      enabled: true,
      config: {
        accountId: "conta-de-teste-0000000000000000",
        bucket: "forma-data",
        publicBaseUrl: "https://img.exemplo.com",
      },
      secrets: { accessKeyId: "AKID", secretAccessKey: "segredo" },
    });
  });

  function upload(body: Buffer, contentType = "image/png") {
    return fetch(`${base}/api/v1/media/products`, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: body as unknown as BodyInit,
    });
  }

  it("aceita um PNG e devolve a URL pública", async () => {
    const response = await upload(PNG);

    expect(response.status).toBe(201);
    const body = (await response.json()) as { url: string; key: string; contentType: string };
    expect(body.key).toMatch(/^produtos\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.png$/);
    expect(body.url).toBe(`https://img.exemplo.com/${body.key}`);
    expect(body.contentType).toBe("image/png");
    expect(puts).toHaveLength(1);
    expect(puts[0].bytes).toBe(PNG.length);
  });

  /**
   * A prova de que o parser cru está configurado: o padrão do Express é
   * 100 kB, e sem `useBodyParser` esta requisição voltaria 413 sem chegar ao
   * controller.
   */
  it("aceita arquivo bem acima do limite padrão de 100 kB do Express", async () => {
    const grande = Buffer.concat([PNG, Buffer.alloc(700 * 1024)]);

    const response = await upload(grande);

    expect(response.status).toBe(201);
    expect(puts[0].bytes).toBe(grande.length);
  });

  it("o Content-Type do cliente não decide o tipo gravado", async () => {
    // Diz que é JPEG; os bytes são de PNG. Quem manda são os bytes.
    const response = await upload(PNG, "image/jpeg");

    expect(response.status).toBe(201);
    expect(puts[0].contentType).toBe("image/png");
  });

  it("recusa SVG com a explicação", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>', "utf8");

    const response = await upload(svg, "image/svg+xml");

    expect(response.status).toBe(400);
    expect((await response.json()) as { message: string }).toMatchObject({
      message: expect.stringMatching(/SVG não é aceito/),
    });
    expect(puts).toHaveLength(0);
  });

  it("recusa corpo vazio", async () => {
    const response = await upload(Buffer.alloc(0));

    expect(response.status).toBe(400);
    expect(puts).toHaveLength(0);
  });

  it("recusa quando o R2 está desligado", async () => {
    await integrations.update("r2", { enabled: false });

    const response = await upload(PNG);

    expect(response.status).toBe(400);
    expect(puts).toHaveLength(0);
  });

  /**
   * Guardar um objeto sem domínio de leitura gastaria armazenamento para
   * produzir uma imagem quebrada na vitrine — que é o estado exato do bucket
   * recém-criado, antes de o domínio ser configurado.
   */
  it("recusa upload enquanto não há domínio público configurado", async () => {
    await integrations.update("r2", { config: { publicBaseUrl: "" } });

    const response = await upload(PNG);

    expect(response.status).toBe(400);
    expect((await response.json()) as { message: string }).toMatchObject({
      message: expect.stringMatching(/domínio público/),
    });
    expect(puts).toHaveLength(0);
  });

  it("o teto por arquivo é o que o status anuncia", async () => {
    const status = await (await fetch(`${base}/api/v1/media/status`)).json();
    expect(status).toMatchObject({
      configured: true,
      enabled: true,
      bucket: "forma-data",
      publicBaseUrl: "https://img.exemplo.com",
      maxBytes: MAX_IMAGE_BYTES,
      hasAccessKeyId: true,
      hasSecretAccessKey: true,
    });
    // O status não vaza credencial nenhuma, nem mascarada.
    expect(JSON.stringify(status)).not.toContain("segredo");
    expect(JSON.stringify(status)).not.toContain("AKID");
  });

  it("a exclusão só aceita chave no padrão das imagens de produto", async () => {
    const storage = app.get(StorageService);

    await expect(storage.removeProductImage("../../etc/passwd")).rejects.toThrow(/padrão/);
    await expect(storage.removeProductImage("outro-prefixo/a.jpg")).rejects.toThrow(/padrão/);
    await expect(
      storage.removeProductImage("produtos/2026-09-06/3f2504e0-4f89-41d3-9a0c-0305e82c3301.png"),
    ).resolves.toBeUndefined();
  });
});
