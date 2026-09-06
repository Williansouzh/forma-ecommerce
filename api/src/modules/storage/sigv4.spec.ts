import {
  EMPTY_PAYLOAD_SHA256,
  amzDate,
  buildCanonicalRequest,
  sha256Hex,
  signAwsV4,
  signingKey,
  uriEncode,
} from "./sigv4";

/**
 * Vetores OFICIAIS da AWS (`aws-sig-v4-test-suite`).
 *
 * Testar a assinatura contra o próprio comportamento não provaria nada: um
 * canônico errado seria reproduzido igualzinho e a suíte ficaria verde
 * enquanto o R2 devolve 403 sem dizer o motivo. Estes valores vêm de fora e
 * são os mesmos que a AWS publica.
 */
const CREDENTIALS = {
  accessKeyId: "AKIDEXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  region: "us-east-1",
  service: "service",
  date: new Date("2015-08-30T12:36:00Z"),
};

describe("signAwsV4 contra os vetores oficiais da AWS", () => {
  it("get-vanilla", () => {
    const headers = signAwsV4({
      ...CREDENTIALS,
      method: "GET",
      url: new URL("https://example.amazonaws.com/"),
      headers: { host: "example.amazonaws.com" },
      payloadHash: EMPTY_PAYLOAD_SHA256,
    });

    expect(headers.Authorization).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, " +
        "SignedHeaders=host;x-amz-date, " +
        "Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31",
    );
  });

  it("get-vanilla-query-order-key-case", () => {
    const headers = signAwsV4({
      ...CREDENTIALS,
      method: "GET",
      url: new URL("https://example.amazonaws.com/?Param2=value2&Param1=value1"),
      headers: { host: "example.amazonaws.com" },
      payloadHash: EMPTY_PAYLOAD_SHA256,
    });

    expect(headers.Authorization).toContain(
      "Signature=b97d918cfa904a5beff61c982a1b6f458b799221646efd99d3219ec94cdf2500",
    );
  });

  /**
   * A normalização de cabeçalho é verificada pelo CANÔNICO, não pela
   * assinatura final.
   *
   * O vetor `get-header-value-trim` da suíte oficial existe, mas eu não tinha
   * como conferir a assinatura publicada dele de onde este código foi escrito
   * — e teste com valor esperado errado é pior que teste nenhum: ele fixa o
   * defeito em vez de pegá-lo. A regra em si ("remova espaço nas pontas e
   * colapse espaços sequenciais") está na especificação e é observável aqui,
   * de forma verificável. A cadeia completa até a assinatura já é ancorada
   * pelos vetores `get-vanilla` e `post-vanilla` acima.
   */
  it("remove espaço nas pontas e colapsa espaços sequenciais do valor", () => {
    const canonical = buildCanonicalRequest(
      {
        ...CREDENTIALS,
        method: "GET",
        url: new URL("https://example.amazonaws.com/"),
        headers: {},
        payloadHash: EMPTY_PAYLOAD_SHA256,
      },
      { host: "example.amazonaws.com", "My-Header1": "  a   b  " },
    );

    expect(canonical).toContain("my-header1:a b\n");
    expect(canonical).toContain("host;my-header1");
  });

  it("post-vanilla", () => {
    const headers = signAwsV4({
      ...CREDENTIALS,
      method: "POST",
      url: new URL("https://example.amazonaws.com/"),
      headers: { host: "example.amazonaws.com" },
      payloadHash: EMPTY_PAYLOAD_SHA256,
    });

    expect(headers.Authorization).toContain(
      "Signature=5da7c1a2acd57cee7505fc6676e4e544621c30862966e37dddb68e92efbe5d6b",
    );
  });
});

describe("peças do canônico", () => {
  it("deriva a chave de assinatura pela cadeia data→região→serviço", () => {
    const key = signingKey("wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY", "20150830", "us-east-1", "iam");
    expect(key.toString("hex")).toBe(
      "c4afb1cc5771d871763a393e44b703571b55cc28424d1a5e86da6ed3c154a4b9",
    );
  });

  it("formata a data no formato compacto da AWS", () => {
    expect(amzDate(new Date("2015-08-30T12:36:00Z"))).toEqual({
      long: "20150830T123600Z",
      short: "20150830",
    });
  });

  /**
   * `encodeURIComponent` deixa `!'()*` passar, e a AWS os espera codificados.
   * Um objeto com aspas no nome assinaria diferente do que vai no fio — 403
   * intermitente, só nos arquivos com nome incomum.
   */
  it("codifica o que o encodeURIComponent deixa passar", () => {
    expect(uriEncode("a!b'c(d)e*f")).toBe("a%21b%27c%28d%29e%2Af");
    expect(encodeURIComponent("a!b'c(d)e*f")).not.toBe(uriEncode("a!b'c(d)e*f"));
  });

  it("codifica a barra só quando pedido", () => {
    expect(uriEncode("produtos/foto.jpg")).toBe("produtos%2Ffoto.jpg");
    expect(uriEncode("produtos/foto.jpg", false)).toBe("produtos/foto.jpg");
  });

  it("codifica acento e espaço em bytes UTF-8", () => {
    expect(uriEncode("cactos de mesa")).toBe("cactos%20de%20mesa");
    expect(uriEncode("peça")).toBe("pe%C3%A7a");
  });

  it("ordena e normaliza os cabeçalhos canônicos", () => {
    const canonical = buildCanonicalRequest(
      {
        ...CREDENTIALS,
        method: "PUT",
        url: new URL("https://bucket.r2.cloudflarestorage.com/produtos/a.jpg"),
        headers: {},
        payloadHash: "abc",
      },
      { "X-Amz-Content-Sha256": "abc", Host: "bucket.r2.cloudflarestorage.com", "Content-Type": "image/jpeg" },
    );

    expect(canonical.split("\n")).toEqual([
      "PUT",
      "/produtos/a.jpg",
      "",
      "content-type:image/jpeg",
      "host:bucket.r2.cloudflarestorage.com",
      "x-amz-content-sha256:abc",
      "",
      "content-type;host;x-amz-content-sha256",
      "abc",
    ]);
  });

  it("o hash de corpo vazio é o valor conhecido", () => {
    expect(EMPTY_PAYLOAD_SHA256).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(sha256Hex(Buffer.from("forma"))).toHaveLength(64);
  });
});
