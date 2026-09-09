import { createHmac } from "node:crypto";
import { PaymentsService } from "./payments.service";
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
