import { createHmac } from "node:crypto";
import { PaymentsService, buildPreference } from "./payments.service";
import type { IntegrationsService } from "../integrations/integrations.service";
import type { OrdersService } from "../orders/orders.service";
import type { WhatsappService } from "../notifications/whatsapp.service";
import type { ConfigService } from "@nestjs/config";
import type { SettingsService } from "../settings/settings.service";
import { PixService } from "./pix.service";
import type { ApiConfig } from "../../config/configuration";

/**
 * A assinatura do webhook é a única coisa entre um POST anônimo e um pedido
 * marcado como pago. Aqui não se testa "o método roda" — testa-se que ele
 * RECUSA, que é o comportamento que protege a loja.
 *
 * LIMITE: nenhum destes casos distingue `timingSafeEqual` de `===`. A
 * resistência a ataque de tempo não aparece na entrada nem na saída, então
 * trocar a comparação por `===` mantém a suíte verde. Essa propriedade é
 * defendida por revisão, não por teste.
 */
const SECRET = "segredo-de-webhook-do-mercado-pago";
const DATA_ID = "1234567890";
const REQUEST_ID = "req-abc";

// Sem o `{ secret }` explícito, chamar `makeService(undefined)` acionaria o
// valor padrão do parâmetro e o teste do "sem segredo" rodaria COM segredo —
// passando por engano.
function makeService({ secret }: { secret?: string } = { secret: SECRET }) {
  const integrations = {
    secretsFor: jest.fn().mockResolvedValue({ webhookSecret: secret }),
  } as unknown as IntegrationsService;

  return new PaymentsService(
    integrations,
    {} as OrdersService,
    {} as WhatsappService,
    { get: jest.fn() } as unknown as ConfigService<ApiConfig>,
    // Nenhum caso desta suíte chega ao Pix; são dependências do construtor.
    {} as SettingsService,
    new PixService(),
  );
}

function signatureFor(
  dataId: string,
  requestId: string,
  ts: string,
  secret = SECRET,
) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

describe("PaymentsService.verifySignature", () => {
  it("aceita uma assinatura legítima", async () => {
    const service = makeService();
    const signature = signatureFor(DATA_ID, REQUEST_ID, "1700000000");
    await expect(
      service.verifySignature(DATA_ID, { signature, requestId: REQUEST_ID }),
    ).resolves.toBe(true);
  });

  it("recusa assinatura feita com outro segredo", async () => {
    const service = makeService();
    const signature = signatureFor(
      DATA_ID,
      REQUEST_ID,
      "1700000000",
      "segredo-do-atacante",
    );
    await expect(
      service.verifySignature(DATA_ID, { signature, requestId: REQUEST_ID }),
    ).resolves.toBe(false);
  });

  // Sem amarrar o id, uma assinatura válida capturada de um pagamento serve
  // para dar QUALQUER outro pedido como pago.
  it("recusa assinatura de outro pagamento", async () => {
    const service = makeService();
    const signature = signatureFor("outro-id", REQUEST_ID, "1700000000");
    await expect(
      service.verifySignature(DATA_ID, { signature, requestId: REQUEST_ID }),
    ).resolves.toBe(false);
  });

  it("recusa quando o request-id não é o assinado", async () => {
    const service = makeService();
    const signature = signatureFor(DATA_ID, "outro-request", "1700000000");
    await expect(
      service.verifySignature(DATA_ID, { signature, requestId: REQUEST_ID }),
    ).resolves.toBe(false);
  });

  it("recusa quando o ts do cabeçalho não é o assinado", async () => {
    const service = makeService();
    const legitima = signatureFor(DATA_ID, REQUEST_ID, "1700000000");
    const adulterada = legitima.replace("ts=1700000000", "ts=1700009999");
    await expect(
      service.verifySignature(DATA_ID, {
        signature: adulterada,
        requestId: REQUEST_ID,
      }),
    ).resolves.toBe(false);
  });

  it.each([
    ["sem cabeçalho", undefined],
    ["vazio", ""],
    ["sem v1", "ts=1700000000"],
    ["sem ts", "v1=abc"],
    ["lixo", "isto-não-é-uma-assinatura"],
    ["v1 curto", "ts=1700000000,v1=ab"],
  ])("recusa assinatura %s", async (_caso, signature) => {
    const service = makeService();
    await expect(
      service.verifySignature(DATA_ID, {
        signature: signature as string | undefined,
        requestId: REQUEST_ID,
      }),
    ).resolves.toBe(false);
  });

  // Integração ainda não configurada não pode virar porta aberta.
  it("recusa quando não há segredo cadastrado", async () => {
    const service = makeService({});
    const signature = signatureFor(DATA_ID, REQUEST_ID, "1700000000");
    await expect(
      service.verifySignature(DATA_ID, { signature, requestId: REQUEST_ID }),
    ).resolves.toBe(false);
  });

  // O Mercado Pago às vezes não manda o request-id; o manifesto usa string
  // vazia nesse caso, e a assinatura tem de fechar do mesmo jeito.
  it("aceita notificação sem request-id, assinando com vazio", async () => {
    const service = makeService();
    const signature = signatureFor(DATA_ID, "", "1700000000");
    await expect(
      service.verifySignature(DATA_ID, { signature }),
    ).resolves.toBe(true);
  });
});

/** O que o Mercado Pago cobraria por uma preferência: itens mais frete. */
function charged(preference: ReturnType<typeof buildPreference>): number {
  const items = preference.items.reduce(
    (acc, item) => acc + Math.round(item.unit_price * 100) * item.quantity,
    0,
  );
  const shipping = "shipments" in preference ? Math.round(preference.shipments!.cost * 100) : 0;
  return items + shipping;
}

const URLS = { apiUrl: "https://api.loja", siteUrl: "https://loja" };

/** Pedido Pix de duas peças: 2×12.990 + 5.990, 5% de desconto, frete 2.990. */
const PEDIDO_PIX = {
  code: "C3D-4900",
  items: [
    { name: "Vaso Onda", quantity: 2, price: 12990 },
    { name: "Luminária", quantity: 1, price: 5990 },
  ],
  customer: { firstName: "Ana", lastName: "Lima", email: "ana@exemplo.com" },
  paymentMethod: "pix",
  shipping: 2990,
  discount: 1599,
  total: 31970 + 2990 - 1599,
};

describe("buildPreference", () => {
  /**
   * O defeito que isto fecha: os itens iam a preço cheio, o desconto do Pix
   * ficava de fora, o cliente pagava a mais e o webhook recusava o valor.
   */
  it("com desconto do Pix, cobra exatamente o total do pedido", () => {
    expect(charged(buildPreference(PEDIDO_PIX, URLS))).toBe(PEDIDO_PIX.total);
  });

  it("com desconto do Pix, aceita só Pix", () => {
    const preference = buildPreference(PEDIDO_PIX, URLS);
    const excluded = preference.payment_methods?.excluded_payment_types.map((t) => t.id);
    expect(excluded).toEqual(expect.arrayContaining(["credit_card", "debit_card", "ticket"]));
    expect(excluded).not.toContain("bank_transfer");
  });

  it("sem desconto, mantém as linhas e todos os meios de pagamento", () => {
    const cartao = { ...PEDIDO_PIX, paymentMethod: "credit_card", discount: 0, total: 31970 + 2990 };
    const preference = buildPreference(cartao, URLS);

    expect(preference.items).toHaveLength(2);
    expect(preference.payment_methods).toBeUndefined();
    expect(charged(preference)).toBe(cartao.total);
  });

  it("frete grátis não manda `shipments`", () => {
    const semFrete = { ...PEDIDO_PIX, shipping: 0, total: 31970 - 1599 };
    const preference = buildPreference(semFrete, URLS);

    expect("shipments" in preference).toBe(false);
    expect(charged(preference)).toBe(semFrete.total);
  });
});

/**
 * O ciclo que nunca tinha sido exercitado: preferência criada, pagamento
 * aprovado pelo valor que ELA cobra, webhook dando o pedido como pago.
 */
describe("PaymentsService — Mercado Pago de ponta a ponta", () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it("um Pix com desconto pago pelo valor da preferência marca o pedido como pago", async () => {
    const pedido = { ...PEDIDO_PIX, status: "pending" };
    let sentPreference: ReturnType<typeof buildPreference> | null = null;

    global.fetch = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const href = String(url);
      if (href.endsWith("/checkout/preferences")) {
        sentPreference = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ id: "pref-1", init_point: "https://mp/pay" }));
      }
      // A consulta do pagamento: aprovado pelo que a preferência cobrou.
      return new Response(
        JSON.stringify({
          status: "approved",
          external_reference: pedido.code,
          transaction_amount: charged(sentPreference!) / 100,
        }),
      );
    }) as typeof fetch;

    const markPaidByCode = jest.fn().mockResolvedValue({ ...pedido, status: "paid", customer: { phone: "" } });
    const service = new PaymentsService(
      {
        isEnabled: jest.fn().mockResolvedValue(true),
        secretsFor: jest.fn().mockResolvedValue({ accessToken: "tok" }),
      } as unknown as IntegrationsService,
      {
        findByCode: jest.fn().mockResolvedValue(pedido),
        attachPayment: jest.fn().mockResolvedValue(pedido),
        markPaidByCode,
      } as unknown as OrdersService,
      {
        notifyOrderStage: jest.fn().mockResolvedValue({ sent: false, reason: "desligado" }),
      } as unknown as WhatsappService,
      { get: jest.fn().mockReturnValue("https://x") } as unknown as ConfigService<ApiConfig>,
      {} as SettingsService,
      new PixService(),
    );

    const instruction = await service.createPreferenceForOrder(pedido.code);
    expect(instruction.paymentUrl).toBe("https://mp/pay");

    const result = await service.handlePaymentNotification("pay-1");

    expect(result.handled).toBe(true);
    expect(markPaidByCode).toHaveBeenCalledWith(pedido.code);
  });
});
