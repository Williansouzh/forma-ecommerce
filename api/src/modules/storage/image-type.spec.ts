import { detectImage, rejectionReason } from "./image-type";

const HEADERS = {
  jpeg: [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  gif: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
};

function bytes(values: number[], length = 64): Buffer {
  const buffer = Buffer.alloc(length);
  Buffer.from(values).copy(buffer);
  return buffer;
}

function riff(brand: string): Buffer {
  const buffer = Buffer.alloc(64);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(56, 4);
  buffer.write(brand, 8, "ascii");
  return buffer;
}

function isoBmff(brand: string): Buffer {
  const buffer = Buffer.alloc(64);
  buffer.writeUInt32BE(32, 0);
  buffer.write("ftyp", 4, "ascii");
  buffer.write(brand, 8, "ascii");
  return buffer;
}

describe("detectImage", () => {
  it("reconhece JPEG, PNG, WebP e AVIF pelos bytes", () => {
    expect(detectImage(bytes(HEADERS.jpeg))).toEqual({ mime: "image/jpeg", extension: "jpg" });
    expect(detectImage(bytes(HEADERS.png))).toEqual({ mime: "image/png", extension: "png" });
    expect(detectImage(riff("WEBP"))).toEqual({ mime: "image/webp", extension: "webp" });
    expect(detectImage(isoBmff("avif"))).toEqual({ mime: "image/avif", extension: "avif" });
    expect(detectImage(isoBmff("avis"))).toEqual({ mime: "image/avif", extension: "avif" });
  });

  /**
   * A defesa que o `Content-Type` do cliente não dá: quem envia escolhe o
   * cabeçalho, e um HTML anunciado como `image/jpeg` passaria direto.
   */
  it("recusa HTML disfarçado de imagem", () => {
    const html = Buffer.from("<!DOCTYPE html><script>alert(1)</script>", "utf8");
    expect(detectImage(html)).toBeNull();
    expect(rejectionReason(html)).toMatch(/HTML/);
  });

  /** SVG executa script; servido de um domínio nosso, é XSS armazenado. */
  it("recusa SVG e explica o motivo", () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>', "utf8");
    expect(detectImage(svg)).toBeNull();
    expect(rejectionReason(svg)).toMatch(/SVG não é aceito/);
  });

  it("recusa RIFF que não é WebP", () => {
    expect(detectImage(riff("WAVE"))).toBeNull();
  });

  it("recusa ISO-BMFF que não é AVIF", () => {
    expect(detectImage(isoBmff("mp42"))).toBeNull();
  });

  it("recusa GIF com mensagem própria", () => {
    expect(detectImage(bytes(HEADERS.gif))).toBeNull();
    expect(rejectionReason(bytes(HEADERS.gif))).toMatch(/GIF/);
  });

  it("não estoura com arquivo vazio ou truncado", () => {
    expect(detectImage(Buffer.alloc(0))).toBeNull();
    expect(detectImage(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(rejectionReason(Buffer.alloc(0))).toMatch(/não reconhecido/);
  });

  /** Bytes certos no lugar errado não valem: o magic number tem posição. */
  it("não aceita a assinatura deslocada", () => {
    const deslocado = Buffer.concat([Buffer.from([0x00]), bytes(HEADERS.png)]);
    expect(detectImage(deslocado)).toBeNull();
  });
});
