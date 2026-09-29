import { Controller, HttpCode, Post } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { createServer } from "http";
import { StoreClientModule } from "./store-client.module";
import { StoreOnly, ThrottleWithoutStoreKey } from "./decorators/store.decorators";

const KEY = "chave-da-loja-com-bastante-entropia";

/** As duas formas de rota que a API usa: a da loja e a do login. */
@Controller()
class RotasDeTeste {
  @StoreOnly(2, 60_000)
  @Post("pedido")
  @HttpCode(201)
  pedido() {
    return { ok: true };
  }

  @StoreOnly(2, 60_000)
  @ThrottleWithoutStoreKey()
  @Post("login")
  @HttpCode(200)
  login() {
    return { ok: true };
  }
}

/**
 * Os guards pela pilha HTTP de verdade: cabeçalhos, status e a contagem do
 * limitador só existem montados no Express — chamar o método direto passaria
 * mesmo com o guard desligado.
 */
async function montar(storeApiKey: string) {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ storeApiKey })] }),
      StoreClientModule,
    ],
    controllers: [RotasDeTeste],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  const server = createServer(app.getHttpAdapter().getInstance() as never);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;

  const post = (path: string, headers: Record<string, string> = {}) =>
    fetch(`${base}/${path}`, { method: "POST", headers }).then((r) => r.status);
  const fecha = async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await app.close();
  };
  return { post, fecha };
}

const daLoja = (ip: string) => ({ "x-store-key": KEY, "x-client-ip": ip });

describe("Rotas da loja com a chave configurada", () => {
  let app: Awaited<ReturnType<typeof montar>>;
  beforeEach(async () => {
    app = await montar(KEY);
  });
  afterEach(() => app.fecha());

  it("recusa quem chama a API direto, sem a chave", async () => {
    expect(await app.post("pedido")).toBe(403);
    expect(await app.post("pedido", { "x-store-key": "chute" })).toBe(403);
  });

  it("aceita a loja", async () => {
    expect(await app.post("pedido", daLoja("203.0.113.1"))).toBe(201);
  });

  /**
   * O defeito do login: contando pelo IP de quem chega (a loja), todos os
   * clientes dividiam o mesmo limite. Agora cada um tem o seu.
   */
  it("limita por cliente: um esgota o próprio limite sem afetar o outro", async () => {
    expect(await app.post("pedido", daLoja("203.0.113.1"))).toBe(201);
    expect(await app.post("pedido", daLoja("203.0.113.1"))).toBe(201);
    expect(await app.post("pedido", daLoja("203.0.113.1"))).toBe(429);

    expect(await app.post("pedido", daLoja("203.0.113.2"))).toBe(201);
  });
});

describe("Rotas da loja sem chave configurada", () => {
  let app: Awaited<ReturnType<typeof montar>>;
  beforeEach(async () => {
    app = await montar("");
  });
  afterEach(() => app.fecha());

  /**
   * Implantar a API antes de a loja mandar a chave não pode derrubar o
   * checkout — e sem saber quem é o cliente, limitar pelo IP da loja
   * barraria gente de verdade.
   */
  it("seguem abertas e sem limite, como antes", async () => {
    for (let i = 0; i < 4; i += 1) expect(await app.post("pedido")).toBe(201);
  });

  it("o login continua limitado pelo IP que chega", async () => {
    expect(await app.post("login")).toBe(200);
    expect(await app.post("login")).toBe(200);
    expect(await app.post("login")).toBe(429);
  });
});
