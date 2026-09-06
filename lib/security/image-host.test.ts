import { describe, expect, it } from "vitest";
import { configuredImageHost } from "./image-host";

describe("configuredImageHost", () => {
  it("extrai origem, hostname e protocolo do domínio configurado", () => {
    expect(configuredImageHost("https://img.exemplo.com")).toEqual({
      origin: "https://img.exemplo.com",
      hostname: "img.exemplo.com",
      protocol: "https",
    });
  });

  it("ignora caminho e barra final — a CSP compara ORIGEM", () => {
    expect(configuredImageHost("https://img.exemplo.com/produtos/")?.origin).toBe(
      "https://img.exemplo.com",
    );
  });

  it("sem variável, devolve nulo e a loja segue servindo de /public", () => {
    expect(configuredImageHost(undefined)).toBeNull();
    expect(configuredImageHost("")).toBeNull();
    expect(configuredImageHost("   ")).toBeNull();
  });

  /**
   * A CSP passa por aqui em toda resposta HTTP. Estourar por causa de um erro
   * de digitação na variável derrubaria a loja inteira — bem pior que servir
   * sem o host remoto.
   */
  it("URL inválida devolve nulo em vez de estourar", () => {
    expect(configuredImageHost("nao-e-url")).toBeNull();
    expect(configuredImageHost("img.exemplo.com")).toBeNull();
    expect(configuredImageHost("javascript:alert(1)")).toBeNull();
    expect(configuredImageHost("data:image/png;base64,AAAA")).toBeNull();
  });

  it("aceita http para desenvolvimento local", () => {
    expect(configuredImageHost("http://localhost:8787")).toMatchObject({
      protocol: "http",
      hostname: "localhost",
    });
  });
});
