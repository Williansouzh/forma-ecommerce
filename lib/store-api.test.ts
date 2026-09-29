import { afterEach, describe, expect, it, vi } from "vitest";
import { storeHeaders } from "./store-api";

function request(headers: Record<string, string>) {
  return { headers: new Headers(headers) };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("storeHeaders", () => {
  it("manda a chave e o IP que a Cloudflare entregou", () => {
    vi.stubEnv("STORE_API_KEY", "segredo");
    expect(storeHeaders(request({ "cf-connecting-ip": "203.0.113.5" }))).toEqual({
      "x-store-key": "segredo",
      "x-client-ip": "203.0.113.5",
    });
  });

  it("fora da Cloudflare, usa o primeiro salto do x-forwarded-for", () => {
    vi.stubEnv("STORE_API_KEY", "segredo");
    expect(
      storeHeaders(request({ "x-forwarded-for": "198.51.100.3, 10.0.0.1" }))["x-client-ip"]
    ).toBe("198.51.100.3");
  });

  /** Sem chave a API também não exige: os dois lados sobem em qualquer ordem. */
  it("sem STORE_API_KEY, não manda nada", () => {
    vi.stubEnv("STORE_API_KEY", "");
    expect(storeHeaders(request({ "cf-connecting-ip": "203.0.113.5" }))).toEqual({});
  });
});
