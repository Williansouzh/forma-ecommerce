import { PixService } from "./pix.service";

/**
 * Um BR Code errado não falha: ele é recusado pelo app do banco, no celular do
 * cliente, depois da compra. Não há como descobrir isso pelo log — daí estes
 * casos conferirem a ESTRUTURA do payload, e não só que a função devolveu algo.
 */

const service = new PixService();

/** Lê os campos EMV de volta, para poder afirmar sobre eles. */
function parse(brcode: string): Map<string, string> {
  const campos = new Map<string, string>();
  let i = 0;
  while (i < brcode.length - 4) {
    const id = brcode.slice(i, i + 2);
    const tamanho = Number(brcode.slice(i + 2, i + 4));
    campos.set(id, brcode.slice(i + 4, i + 4 + tamanho));
    i += 4 + tamanho;
  }
  return campos;
}

/** O mesmo CRC do serviço, escrito de novo — se os dois concordarem, passa. */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const BASE = {
  amount: 12900,
  txid: "C3D-4823",
  key: "atelie@c3dcriativ.com.br",
  receiverName: "c3dcriativ",
  city: "Campina Grande",
};

describe("PixService", () => {
  it("embute chave, valor e identificação no payload", () => {
    const { brcode } = service.buildCharge(BASE);
    const campos = parse(brcode);

    expect(campos.get("26")).toContain("br.gov.bcb.pix");
    expect(campos.get("26")).toContain(BASE.key);
    expect(campos.get("54")).toBe("129.00");
    expect(campos.get("53")).toBe("986");
    expect(campos.get("58")).toBe("BR");
    expect(campos.get("62")).toContain("C3D4823");
  });

  it("fecha com um CRC que confere sobre o payload inteiro", () => {
    const { brcode } = service.buildCharge(BASE);

    expect(brcode.slice(-8, -4)).toBe("6304");
    const semCrc = brcode.slice(0, -4);
    expect(brcode.slice(-4)).toBe(crc16(semCrc));
  });

  it("declara o tamanho certo em cada campo", () => {
    /*
     * Percorre o payload campo a campo usando os tamanhos declarados. Se algum
     * estiver errado, a leitura desanda e o passeio não termina exatamente no
     * fim da string. O último campo lido é o próprio CRC (`63`), então o
     * caminhar consome o texto inteiro — o que também prova que o campo do CRC
     * declara o seu tamanho corretamente.
     */
    const { brcode } = service.buildCharge(BASE);
    let i = 0;
    while (i < brcode.length) {
      const tamanho = Number(brcode.slice(i + 2, i + 4));
      expect(Number.isNaN(tamanho)).toBe(false);
      i += 4 + tamanho;
    }
    expect(i).toBe(brcode.length);
  });

  it("tira acento do favorecido e da cidade", () => {
    const { brcode } = service.buildCharge({
      ...BASE,
      receiverName: "Ateliê Coração",
      city: "São Paulo",
    });
    const campos = parse(brcode);

    expect(campos.get("59")).toBe("Atelie Coracao");
    expect(campos.get("60")).toBe("Sao Paulo");
  });

  it("corta favorecido em 25 e cidade em 15, como o padrão manda", () => {
    const { brcode } = service.buildCharge({
      ...BASE,
      receiverName: "Ateliê de Impressao 3D Campina Grande Paraiba",
      city: "Sao Jose dos Campos dos Campos",
    });
    const campos = parse(brcode);

    expect(campos.get("59")!.length).toBeLessThanOrEqual(25);
    expect(campos.get("60")!.length).toBeLessThanOrEqual(15);
  });

  it("usa *** quando o txid não sobra nada depois da limpeza", () => {
    const { brcode } = service.buildCharge({ ...BASE, txid: "---" });
    expect(parse(brcode).get("62")).toContain("***");
  });

  it("recusa valor zerado ou negativo", () => {
    expect(() => service.buildCharge({ ...BASE, amount: 0 })).toThrow();
    expect(() => service.buildCharge({ ...BASE, amount: -1 })).toThrow();
  });

  it("recusa chave vazia ou acima de 77 caracteres", () => {
    expect(() => service.buildCharge({ ...BASE, key: "   " })).toThrow();
    expect(() =>
      service.buildCharge({ ...BASE, key: "a".repeat(78) }),
    ).toThrow();
  });

  it("recusa favorecido ou cidade que somem na limpeza", () => {
    // "!!!" vira string vazia, e um payload sem favorecido é recusado pelo app.
    expect(() =>
      service.buildCharge({ ...BASE, receiverName: "!!!" }),
    ).toThrow();
    expect(() => service.buildCharge({ ...BASE, city: "###" })).toThrow();
  });

  it("devolve o favorecido já normalizado, para a tela mostrar o mesmo que o banco", () => {
    const carga = service.buildCharge({ ...BASE, receiverName: "Ateliê" });
    expect(carga.receiverName).toBe("Atelie");
    expect(carga.key).toBe(BASE.key);
  });
});
