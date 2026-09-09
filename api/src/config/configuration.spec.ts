import { configuration } from "./configuration";

/**
 * O `jwtSecret` e a senha do admin padrão estão num repositório PÚBLICO.
 * Subir em produção com eles é entregar o painel: forja-se um JWT com
 * `role: superadmin` e pronto. Estes casos garantem que a API se recusa a
 * iniciar assim, sem depender de o orquestrador ter passado as variáveis.
 */
describe("configuration", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("aceita os padrões fora de produção — é o que faz o dev rodar sem .env", () => {
    process.env.NODE_ENV = "development";
    delete process.env.JWT_SECRET;
    delete process.env.ADMIN_PASSWORD;

    expect(() => configuration()).not.toThrow();
    expect(configuration().jwtSecret).toBe("forma-dev-secret");
  });

  it("recusa iniciar em produção sem JWT_SECRET próprio", () => {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;
    process.env.ADMIN_PASSWORD = "uma-senha-de-verdade";

    expect(() => configuration()).toThrow(/JWT_SECRET/);
  });

  it("recusa iniciar em produção com a senha de admin do repositório", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "um-segredo-de-verdade";
    process.env.ADMIN_PASSWORD = "forma-admin-2026";

    expect(() => configuration()).toThrow(/ADMIN_PASSWORD/);
  });

  it("nomeia as duas variáveis quando as duas estão pendentes", () => {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;
    delete process.env.ADMIN_PASSWORD;

    expect(() => configuration()).toThrow(/JWT_SECRET, ADMIN_PASSWORD/);
  });

  it("sobe em produção quando os dois vêm do ambiente", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "um-segredo-de-verdade";
    process.env.ADMIN_PASSWORD = "uma-senha-de-verdade";

    expect(() => configuration()).not.toThrow();
  });
});
