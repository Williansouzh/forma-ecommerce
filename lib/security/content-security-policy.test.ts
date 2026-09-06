import { afterEach, describe, expect, it, vi } from "vitest";
import { buildContentSecurityPolicy, configuredCspMode, securityHeaders } from "./content-security-policy";
import { IMAGE_HOST_ENV } from "./image-host";

/** Lê a diretiva pedida da política montada. */
function directive(policy: string, name: string): string {
  const found = policy.split("; ").find((part) => part.startsWith(`${name} `));
  if (!found) throw new Error(`Diretiva ${name} ausente na política`);
  return found;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("img-src e o bucket de imagens", () => {
  /**
   * A afirmação que a documentação faz e que este teste sustenta: configurar
   * o domínio das imagens basta para a CSP liberá-lo. Sem isso, o navegador
   * bloqueia a foto, a página carrega inteira e ninguém associa o sintoma à
   * política de segurança.
   */
  it("libera o domínio configurado", () => {
    vi.stubEnv(IMAGE_HOST_ENV, "https://img.exemplo.com");

    expect(directive(buildContentSecurityPolicy(), "img-src")).toBe(
      "img-src 'self' data: blob: https://img.exemplo.com",
    );
  });

  it("sem domínio configurado, a política fica como era", () => {
    vi.stubEnv(IMAGE_HOST_ENV, "");

    expect(directive(buildContentSecurityPolicy(), "img-src")).toBe(
      "img-src 'self' data: blob:",
    );
  });

  /** Caminho e barra final não podem entrar: a CSP compara ORIGEM. */
  it("usa a origem, não a URL inteira", () => {
    vi.stubEnv(IMAGE_HOST_ENV, "https://img.exemplo.com/produtos/");

    expect(directive(buildContentSecurityPolicy(), "img-src")).toBe(
      "img-src 'self' data: blob: https://img.exemplo.com",
    );
  });

  /**
   * A CSP é montada em toda resposta HTTP. Um erro de digitação na variável
   * não pode derrubar a loja — ele degrada para "sem host remoto".
   */
  it("variável malformada não quebra a política", () => {
    vi.stubEnv(IMAGE_HOST_ENV, "img.exemplo.com");

    const policy = buildContentSecurityPolicy();
    expect(directive(policy, "img-src")).toBe("img-src 'self' data: blob:");
    expect(policy).toContain("default-src 'self'");
  });
});

describe("a política continua fechada onde importa", () => {
  it("mantém as travas que não dependem de configuração", () => {
    const policy = buildContentSecurityPolicy();

    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("form-action 'self'");
  });

  /** O bucket entra em `img-src` e em lugar nenhum além dele. */
  it("o domínio das imagens não vaza para script-src nem connect-src", () => {
    vi.stubEnv(IMAGE_HOST_ENV, "https://img.exemplo.com");
    const policy = buildContentSecurityPolicy();

    expect(directive(policy, "script-src")).not.toContain("img.exemplo.com");
    expect(directive(policy, "connect-src")).not.toContain("img.exemplo.com");
    expect(directive(policy, "default-src")).not.toContain("img.exemplo.com");
  });
});

describe("configuredCspMode", () => {
  it("respeita o modo escolhido", () => {
    vi.stubEnv("CSP_MODE", "report-only");
    expect(configuredCspMode()).toBe("report-only");

    vi.stubEnv("CSP_MODE", "off");
    expect(configuredCspMode()).toBe("off");
  });

  it("com o modo desligado, o cabeçalho de CSP não é emitido", () => {
    vi.stubEnv("CSP_MODE", "off");
    const keys = securityHeaders().map((header) => header.key);

    expect(keys).not.toContain("Content-Security-Policy");
    expect(keys).not.toContain("Content-Security-Policy-Report-Only");
    // Os baratos continuam valendo mesmo sem CSP.
    expect(keys).toContain("X-Content-Type-Options");
  });
});
