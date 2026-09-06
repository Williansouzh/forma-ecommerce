import { createHmac } from "node:crypto";
import {
  signPush,
  signRequest,
  verifyPushSignature,
  type PushSignatureScheme,
} from "./shopee-signature";

const PARTNER_KEY = "chave-privada-do-parceiro";
const PARTNER_ID = "1009999";
const PATH = "/api/v2/product/update_stock";
const TS = 1_800_000_000;

describe("signRequest", () => {
  it("assina chamada pública com partner_id + path + timestamp", () => {
    const expected = createHmac("sha256", PARTNER_KEY)
      .update(`${PARTNER_ID}${PATH}${TS}`)
      .digest("hex");
    expect(
      signRequest({ partnerKey: PARTNER_KEY, partnerId: PARTNER_ID, path: PATH, timestamp: TS }),
    ).toBe(expected);
  });

  it("acrescenta access_token e shop_id na chamada de loja", () => {
    const expected = createHmac("sha256", PARTNER_KEY)
      .update(`${PARTNER_ID}${PATH}${TS}token-abc98765`)
      .digest("hex");
    expect(
      signRequest({
        partnerKey: PARTNER_KEY,
        partnerId: PARTNER_ID,
        path: PATH,
        timestamp: TS,
        accessToken: "token-abc",
        shopId: "98765",
      }),
    ).toBe(expected);
  });

  /**
   * O erro que custa uma tarde: assinar `/product/update_stock` e mandar para
   * `/api/v2/product/update_stock`. A Shopee devolve `error_sign` sem dizer o
   * porquê.
   */
  it("assinatura do caminho curto difere da do caminho completo", () => {
    const short = signRequest({
      partnerKey: PARTNER_KEY,
      partnerId: PARTNER_ID,
      path: "/product/update_stock",
      timestamp: TS,
    });
    const full = signRequest({
      partnerKey: PARTNER_KEY,
      partnerId: PARTNER_ID,
      path: PATH,
      timestamp: TS,
    });
    expect(short).not.toBe(full);
  });

  it("timestamps diferentes dão assinaturas diferentes", () => {
    const a = signRequest({ partnerKey: PARTNER_KEY, partnerId: PARTNER_ID, path: PATH, timestamp: TS });
    const b = signRequest({ partnerKey: PARTNER_KEY, partnerId: PARTNER_ID, path: PATH, timestamp: TS + 1 });
    expect(a).not.toBe(b);
  });
});

describe("verifyPushSignature", () => {
  const url = "https://loja.exemplo/api/v1/shopee/webhook";
  const rawBody = '{"code":3,"shop_id":98765,"data":{"ordersn":"250101ABC"}}';

  const schemes: PushSignatureScheme[] = ["authorization", "x-shopee-signature"];

  for (const scheme of schemes) {
    describe(`esquema ${scheme}`, () => {
      const received = signPush(PARTNER_KEY, scheme, url, rawBody);

      it("aceita a assinatura legítima", () => {
        expect(
          verifyPushSignature({ partnerKey: PARTNER_KEY, scheme, url, rawBody, received }),
        ).toBe(true);
      });

      it("recusa corpo adulterado", () => {
        expect(
          verifyPushSignature({
            partnerKey: PARTNER_KEY,
            scheme,
            url,
            rawBody: rawBody.replace("250101ABC", "250101XYZ"),
            received,
          }),
        ).toBe(false);
      });

      it("recusa assinatura feita com outra chave", () => {
        expect(
          verifyPushSignature({
            partnerKey: PARTNER_KEY,
            scheme,
            url,
            rawBody,
            received: signPush("chave-do-atacante", scheme, url, rawBody),
          }),
        ).toBe(false);
      });

      /** Sem segredo gravado não há o que conferir: recusa, não aceita. */
      it("recusa quando não há partner_key gravada", () => {
        expect(
          verifyPushSignature({ partnerKey: undefined, scheme, url, rawBody, received }),
        ).toBe(false);
      });

      it("recusa quando o header não veio", () => {
        expect(
          verifyPushSignature({ partnerKey: PARTNER_KEY, scheme, url, rawBody, received: undefined }),
        ).toBe(false);
      });

      it("recusa assinatura de tamanho diferente sem estourar", () => {
        expect(
          verifyPushSignature({ partnerKey: PARTNER_KEY, scheme, url, rawBody, received: "abc" }),
        ).toBe(false);
      });
    });
  }

  /**
   * Os dois esquemas assinam bases diferentes, então a assinatura de um não
   * pode passar no outro. É o que garante que trocar `pushSignatureScheme`
   * seja uma decisão consciente, e não algo que "às vezes funciona".
   */
  it("assinatura de um esquema não vale no outro", () => {
    const asAuthorization = signPush(PARTNER_KEY, "authorization", url, rawBody);
    expect(
      verifyPushSignature({
        partnerKey: PARTNER_KEY,
        scheme: "x-shopee-signature",
        url,
        rawBody,
        received: asAuthorization,
      }),
    ).toBe(false);
  });

  /** A URL entra na base do esquema `authorization` — replay em outra rota falha. */
  it("no esquema authorization, a URL faz parte do que é assinado", () => {
    const received = signPush(PARTNER_KEY, "authorization", url, rawBody);
    expect(
      verifyPushSignature({
        partnerKey: PARTNER_KEY,
        scheme: "authorization",
        url: "https://loja.exemplo/api/v1/shopee/outra-rota",
        rawBody,
        received,
      }),
    ).toBe(false);
  });
});
