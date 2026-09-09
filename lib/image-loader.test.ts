import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import r2ImageLoader from "./image-loader";

const BASE = "https://bucket.exemplo.com/produtos/w/2026-09-09/abc.jpg";

describe("r2ImageLoader", () => {
  it("escolhe o primeiro degrau que cobre a largura pedida", () => {
    expect(r2ImageLoader({ src: BASE, width: 200 })).toContain("-400.webp");
    expect(r2ImageLoader({ src: BASE, width: 400 })).toContain("-400.webp");
    expect(r2ImageLoader({ src: BASE, width: 401 })).toContain("-800.webp");
    expect(r2ImageLoader({ src: BASE, width: 1200 })).toContain("-1600.webp");
  });

  it("acima do maior degrau, entrega o maior", () => {
    expect(r2ImageLoader({ src: BASE, width: 4000 })).toContain("-1600.webp");
  });

  it("preserva o caminho e troca só o fim", () => {
    expect(r2ImageLoader({ src: BASE, width: 800 })).toBe(
      "https://bucket.exemplo.com/produtos/w/2026-09-09/abc-800.webp",
    );
  });

  /*
   * A regra que permitiu ligar isto sem migrar nada: o que não está marcado
   * passa intacto. Se este caso cair, as fotos antigas viram 404 na loja
   * inteira.
   */
  it("não toca em foto antiga, sem o marcador", () => {
    const antiga = "https://bucket.exemplo.com/produtos/2026-09-01/abc.jpg";
    expect(r2ImageLoader({ src: antiga, width: 400 })).toBe(antiga);
  });

  it("não toca em arquivo servido de /public", () => {
    const local = "/images/products/cactos-01.jpg";
    expect(r2ImageLoader({ src: local, width: 400 })).toBe(local);
  });

  it("não toca em SVG nem em outra origem", () => {
    const svg = "/images/products/vaso.svg";
    const externa = "https://outro.site/foto.jpg";
    expect(r2ImageLoader({ src: svg, width: 800 })).toBe(svg);
    expect(r2ImageLoader({ src: externa, width: 800 })).toBe(externa);
  });

  /*
   * O loader escolhe entre arquivos que a API gravou. Os dois lados precisam
   * concordar sobre QUAIS existem — se divergirem, o `srcset` aponta para um
   * objeto que não está no bucket e a foto some.
   */
  it("usa exatamente os degraus que a API grava", () => {
    const daApi = readFileSync(
      resolve(__dirname, "../api/src/modules/storage/image-variants.ts"),
      "utf8",
    );
    const declarados = /VARIANT_WIDTHS = \[([^\]]+)\]/.exec(daApi)?.[1];
    expect(declarados).toBeTruthy();

    const larguresDaApi = declarados!
      .split(",")
      .map((n) => Number(n.trim()))
      .filter(Number.isFinite);

    const doLoader = readFileSync(resolve(__dirname, "./image-loader.ts"), "utf8");
    const larguresDoLoader = /LARGURAS = \[([^\]]+)\]/
      .exec(doLoader)![1]
      .split(",")
      .map((n) => Number(n.trim()));

    expect(larguresDoLoader).toEqual(larguresDaApi);
  });
});
