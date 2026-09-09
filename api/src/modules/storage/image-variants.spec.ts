import sharp from "sharp";
import { VARIANT_WIDTHS, buildVariants, variantKey } from "./image-variants";

/**
 * As variantes são o que substitui o otimizador de imagem na Cloudflare, onde
 * ele é passthrough. Se pararem de ser geradas, nada quebra visivelmente — a
 * loja volta a servir o arquivo inteiro e só o peso denuncia. Daí estes casos
 * medirem largura e tamanho, e não só "retornou alguma coisa".
 */

/** Uma foto sintética, para não depender de arquivo no repositório. */
async function foto(width: number, height = Math.round((width * 5) / 4)) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 120, b: 60 },
    },
  })
    .jpeg()
    .toBuffer();
}

describe("buildVariants", () => {
  it("gera um degrau para cada largura menor que a original", async () => {
    const variantes = await buildVariants(await foto(2000));

    expect(variantes.map((v) => v.width)).toEqual([...VARIANT_WIDTHS]);
  });

  it("não amplia: foto pequena não ganha degraus maiores que ela", async () => {
    const variantes = await buildVariants(await foto(600));

    // 400 entra; 800 e 1600 seriam ampliação e não acrescentam detalhe.
    expect(variantes.map((v) => v.width)).toEqual([400]);
  });

  it("ainda converte quando a foto é menor que o primeiro degrau", async () => {
    // O ganho aqui não é o redimensionamento, é o WebP.
    const variantes = await buildVariants(await foto(300));

    expect(variantes).toHaveLength(1);
    expect(variantes[0].contentType).toBe("image/webp");
  });

  it("entrega WebP de verdade, com a largura pedida", async () => {
    const variantes = await buildVariants(await foto(2000));

    for (const variante of variantes) {
      const meta = await sharp(variante.body).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBe(variante.width);
    }
  });

  it("cada degrau é menor que o anterior", async () => {
    const variantes = await buildVariants(await foto(2000));
    const tamanhos = variantes.map((v) => v.body.length);

    expect(tamanhos[0]).toBeLessThan(tamanhos[1]);
    expect(tamanhos[1]).toBeLessThan(tamanhos[2]);
  });

  it("o menor degrau pesa uma fração do original", async () => {
    // É o motivo de tudo isto existir: no catálogo, o card de 136px recebia o
    // arquivo inteiro.
    const original = await foto(2000);
    const [menor] = await buildVariants(original);

    expect(menor.body.length).toBeLessThan(original.length / 2);
  });

  it("aplica a orientação do EXIF em vez de arrastá-la", async () => {
    // Foto de celular deitada: sem `rotate()`, a peça aparece de lado na loja.
    const deitada = await sharp({
      create: { width: 1200, height: 900, channels: 3, background: "#c8783c" },
    })
      .withMetadata({ orientation: 6 }) // 6 = girar 90° no sentido horário
      .jpeg()
      .toBuffer();

    const [variante] = await buildVariants(deitada);
    const meta = await sharp(variante.body).metadata();

    // Depois de aplicada a rotação, o retrato fica mais alto que largo.
    expect(meta.height!).toBeGreaterThan(meta.width!);
  });

  it("recusa bytes que não são imagem", async () => {
    await expect(buildVariants(Buffer.from("nem de longe uma foto"))).rejects.toThrow();
  });
});

describe("variantKey", () => {
  it("troca a extensão pelo degrau, preservando o caminho", () => {
    expect(variantKey("produtos/w/2026-09-09/abc-123.jpg", 800)).toBe(
      "produtos/w/2026-09-09/abc-123-800.webp",
    );
  });

  it("funciona com qualquer extensão de origem", () => {
    expect(variantKey("produtos/w/2026-09-09/x.png", 400)).toBe(
      "produtos/w/2026-09-09/x-400.webp",
    );
    expect(variantKey("produtos/w/2026-09-09/x.avif", 1600)).toBe(
      "produtos/w/2026-09-09/x-1600.webp",
    );
  });
});
