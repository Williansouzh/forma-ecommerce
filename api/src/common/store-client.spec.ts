import { resolveStoreClient } from "./store-client";

const KEY = "chave-da-loja-com-bastante-entropia";

function request(headers: Record<string, string>, ip = "10.0.0.9") {
  return { headers, ip };
}

describe("resolveStoreClient", () => {
  it("com a chave certa, usa o IP que a loja informou", () => {
    const client = resolveStoreClient(
      request({ "x-store-key": KEY, "x-client-ip": "203.0.113.7" }),
      KEY,
    );
    expect(client).toEqual({ fromStore: true, ip: "203.0.113.7" });
  });

  /**
   * O ponto de segurança do desenho: sem a chave, `x-client-ip` é só um
   * cabeçalho que qualquer um escreve. Aceitá-lo deixaria o atacante trocar
   * de "IP" a cada tentativa e nunca bater no limite.
   */
  it("sem a chave certa, ignora o IP informado", () => {
    const casos: Record<string, string>[] = [
      { "x-client-ip": "203.0.113.7" },
      { "x-store-key": "chute", "x-client-ip": "203.0.113.7" },
      { "x-store-key": `${KEY}x`, "x-client-ip": "203.0.113.7" },
    ];
    for (const headers of casos) {
      expect(resolveStoreClient(request(headers), KEY)).toEqual({
        fromStore: false,
        ip: "10.0.0.9",
      });
    }
  });

  it("sem chave configurada, nada é da loja — nem cabeçalho vazio", () => {
    expect(resolveStoreClient(request({ "x-store-key": "" }), "").fromStore).toBe(false);
  });

  it("IP informado que não é IP cai no IP da conexão", () => {
    const client = resolveStoreClient(
      request({ "x-store-key": KEY, "x-client-ip": "qualquer-coisa" }),
      KEY,
    );
    expect(client).toEqual({ fromStore: true, ip: "10.0.0.9" });
  });

  it("aceita IPv6", () => {
    const client = resolveStoreClient(
      request({ "x-store-key": KEY, "x-client-ip": "2001:db8::1" }),
      KEY,
    );
    expect(client.ip).toBe("2001:db8::1");
  });
});
