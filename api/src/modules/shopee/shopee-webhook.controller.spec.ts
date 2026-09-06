import { UnauthorizedException } from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { createShopeeHarness, SHOP_ID, type ShopeeHarness } from "../../test/shopee-harness";
import { ShopeeWebhookController } from "./shopee-webhook.controller";
import { signPush } from "./shopee-signature";
import { ORDER_SYNC_TOPIC } from "./shopee-order.service";

const PARTNER_KEY = "chave-privada-de-teste";
const WEBHOOK_URL = "http://localhost:4000/api/v1/shopee/webhook";

/**
 * O endpoint do push, de ponta a ponta: assinatura conferida sobre os bytes
 * crus, corpo tratado como não confiável, e o trabalho indo para a fila em
 * vez de acontecer dentro da requisição.
 */
describe("ShopeeWebhookController", () => {
  let h: ShopeeHarness;
  let controller: ShopeeWebhookController;

  beforeAll(async () => {
    h = await createShopeeHarness("forma_test_shopee_hook");
    controller = h.app.get(ShopeeWebhookController);
  });
  afterAll(async () => {
    await h.close();
  });
  beforeEach(() => h.reset());

  function request(rawBody: string): RawBodyRequest<Request> {
    return { rawBody: Buffer.from(rawBody, "utf8") } as RawBodyRequest<Request>;
  }

  function pushBody(over: Record<string, unknown> = {}): string {
    return JSON.stringify({
      code: 3,
      shop_id: Number(SHOP_ID),
      timestamp: 1_800_000_000,
      data: { ordersn: "250101PUSH", status: "READY_TO_SHIP" },
      ...over,
    });
  }

  function sign(rawBody: string): string {
    return signPush(PARTNER_KEY, "authorization", WEBHOOK_URL, rawBody);
  }

  it("aceita o push assinado e delega para a fila", async () => {
    const raw = pushBody();

    const result = await controller.handle(request(raw), sign(raw));

    expect(result).toMatchObject({ received: true, handled: true, reason: "enfileirado" });
    const queued = await h.outbox.list({ topic: ORDER_SYNC_TOPIC });
    expect(queued).toHaveLength(1);
    expect(queued[0].payload).toMatchObject({
      shopId: SHOP_ID,
      orderSn: "250101PUSH",
      pushCode: 3,
    });
    // Responder rápido significa NÃO ter falado com a Shopee aqui dentro.
    expect(h.api.calls).toHaveLength(0);
  });

  it("recusa push sem assinatura", async () => {
    await expect(controller.handle(request(pushBody()), undefined)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(await h.outbox.list({ topic: ORDER_SYNC_TOPIC })).toHaveLength(0);
  });

  it("recusa push com assinatura de outra chave", async () => {
    const raw = pushBody();
    const forged = signPush("chave-do-atacante", "authorization", WEBHOOK_URL, raw);

    await expect(controller.handle(request(raw), forged)).rejects.toThrow(UnauthorizedException);
  });

  /**
   * O ataque que a assinatura sobre o corpo cru impede: capturar um push
   * legítimo e trocar o número do pedido antes de reenviar.
   */
  it("recusa push com corpo adulterado depois de assinado", async () => {
    const original = pushBody();
    const signature = sign(original);
    const tampered = original.replace("250101PUSH", "250101OUTRO");

    await expect(controller.handle(request(tampered), signature)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  /** Sem segredo gravado não há o que conferir: recusa, nunca aceita. */
  it("recusa tudo quando não há partner_key gravada", async () => {
    await h.integrations.update("shopee", { removeSecrets: ["partnerKey"] });
    const raw = pushBody();

    await expect(controller.handle(request(raw), sign(raw))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("ignora push que não é de pedido, sem tratar como erro", async () => {
    const raw = pushBody({ code: 9 });

    const result = await controller.handle(request(raw), sign(raw));

    expect(result).toMatchObject({ received: true, handled: false });
    expect(result.reason).toMatch(/não é de pedido/);
    expect(await h.outbox.list({ topic: ORDER_SYNC_TOPIC })).toHaveLength(0);
  });

  it("ignora push de uma loja que não é a conectada", async () => {
    const raw = pushBody({ shop_id: 11111 });

    const result = await controller.handle(request(raw), sign(raw));

    expect(result.reason).toBe("push de outra loja");
    expect(await h.outbox.list({ topic: ORDER_SYNC_TOPIC })).toHaveLength(0);
  });

  it("ignora push sem order_sn", async () => {
    const raw = pushBody({ data: {} });

    const result = await controller.handle(request(raw), sign(raw));

    expect(result.reason).toMatch(/sem shop_id ou order_sn/);
  });

  it("push repetido enfileira uma mensagem só", async () => {
    const raw = pushBody();
    const signature = sign(raw);

    await controller.handle(request(raw), signature);
    await controller.handle(request(raw), signature);

    expect(await h.outbox.list({ topic: ORDER_SYNC_TOPIC })).toHaveLength(1);
  });

  it("respeita o esquema de assinatura configurado", async () => {
    await h.integrations.update("shopee", {
      config: { pushSignatureScheme: "x-shopee-signature" },
    });
    const raw = pushBody();

    // A assinatura do outro esquema não vale mais.
    await expect(controller.handle(request(raw), sign(raw))).rejects.toThrow(
      UnauthorizedException,
    );

    const correct = signPush(PARTNER_KEY, "x-shopee-signature", WEBHOOK_URL, raw);
    const result = await controller.handle(request(raw), undefined, correct);
    expect(result.handled).toBe(true);
  });
});
