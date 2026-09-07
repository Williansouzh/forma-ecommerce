// Os decoradores do class-validator leem metadados de tipo. Dentro do Nest,
// `@nestjs/core` carrega o polyfill; num teste que importa o DTO direto, não —
// e o erro (`Reflect.getMetadata is not a function`) aponta para a linha do
// import, não para a causa.
import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { UpdateSettingsDto } from "./dto/settings.dto";

/** Coleta os nomes de campo que falharam, em qualquer profundidade. */
async function invalidFields(payload: unknown): Promise<string[]> {
  const dto = plainToInstance(UpdateSettingsDto, payload);
  const errors = await validate(dto);
  const names: string[] = [];
  const walk = (list: typeof errors) => {
    for (const e of list) {
      if (e.constraints) names.push(e.property);
      if (e.children?.length) walk(e.children);
    }
  };
  walk(errors);
  return names;
}

describe("UpdateSettingsDto — imagens da vitrine", () => {
  it("aceita caminho do site e URL https", async () => {
    expect(
      await invalidFields({
        homeMedia: {
          hero: { url: "/images/products/vaso-canelado-01.jpg", alt: "Vaso" },
          atelierHero: { url: "https://pub-abc.r2.dev/produtos/x.png", alt: "Peça" },
        },
      }),
    ).toEqual([]);
  });

  /**
   * Estas URLs vão para o `src` de uma imagem servida a todo visitante.
   * `javascript:` num `src` de `<img>` não executa nos navegadores atuais, mas
   * o campo também alimenta metadados e links — recusar na entrada custa uma
   * linha e fecha a categoria inteira.
   */
  it("recusa esquema que não seja http(s) nem caminho do site", async () => {
    for (const url of [
      "javascript:alert(1)",
      "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
      "//evil.example/x.png",
      "vbscript:msgbox(1)",
      "nao-e-url",
    ]) {
      expect(await invalidFields({ homeMedia: { hero: { url, alt: "x" } } })).toContain(
        "url",
      );
    }
  });

  it("recusa lookbook com mais de seis fotos", async () => {
    const foto = { url: "/a.jpg", alt: "a", room: "Sala", place: "Centro" };
    expect(
      await invalidFields({ homeMedia: { lookbook: Array(7).fill(foto) } }),
    ).toContain("lookbook");
    expect(
      await invalidFields({ homeMedia: { lookbook: Array(6).fill(foto) } }),
    ).toEqual([]);
  });

  it("valida cada foto do lookbook, não só a lista", async () => {
    expect(
      await invalidFields({
        homeMedia: {
          lookbook: [{ url: "javascript:alert(1)", alt: "a", room: "Sala", place: "Centro" }],
        },
      }),
    ).toContain("url");
  });

  it("os ajustes de sempre continuam validando como antes", async () => {
    expect(await invalidFields({ pixDiscountPercent: 60 })).toContain(
      "pixDiscountPercent",
    );
    expect(await invalidFields({ pixDiscountPercent: 5 })).toEqual([]);
  });
});
