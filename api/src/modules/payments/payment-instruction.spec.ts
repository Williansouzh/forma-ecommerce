import { PaymentsService } from "./payments.service";
import { PixService } from "./pix.service";
import type { IntegrationsService } from "../integrations/integrations.service";
import type { OrdersService } from "../orders/orders.service";
import type { SettingsService } from "../settings/settings.service";
import type { WhatsappService } from "../notifications/whatsapp.service";
import type { ConfigService } from "@nestjs/config";
import type { ApiConfig } from "../../config/configuration";

/**
 * Que instrução de pagamento o pedido recebe.
 *
 * O que estes casos defendem: sem Mercado Pago, o cliente PRECISA sair do
 * checkout com uma forma de pagar. Antes ele saía com `paymentUrl: null` e
 * mais nada — pedido registrado, ninguém avisado, nenhum jeito de pagar.
 */

const PEDIDO = {
  code: "C3D-4823",
  total: 15245,
  status: "pending" as const,
  paymentUrl: undefined as string | undefined,
  paymentPreferenceId: undefined as string | undefined,
  pixCode: undefined as string | undefined,
  pixKey: undefined as string | undefined,
  pixReceiverName: undefined as string | undefined,
};

const LOJA = {
  pixKey: "atelie@c3dcriativ.com.br",
  pixReceiverName: "c3dcriativ",
  pixCity: "Campina Grande",
  atelierName: "c3dcriativ",
  atelierCity: "Campina Grande — PB",
};

function build({
  mercadoPagoLigado = false,
  accessToken = null as string | null,
  pedido = PEDIDO,
  loja = LOJA,
} = {}) {
  const attachPixCharge = jest.fn().mockResolvedValue(pedido);
  const orders = {
    findByCode: jest.fn().mockResolvedValue(pedido),
    attachPixCharge,
    attachPayment: jest.fn(),
  } as unknown as OrdersService;

  const integrations = {
    isEnabled: jest.fn().mockResolvedValue(mercadoPagoLigado),
    secretsFor: jest.fn().mockResolvedValue({ accessToken }),
  } as unknown as IntegrationsService;

  const settings = {
    get: jest.fn().mockResolvedValue(loja),
  } as unknown as SettingsService;

  const service = new PaymentsService(
    integrations,
    orders,
    {} as WhatsappService,
    { get: jest.fn() } as unknown as ConfigService<ApiConfig>,
    settings,
    new PixService(),
  );

  return { service, attachPixCharge };
}

describe("Instrução de pagamento do pedido", () => {
  it("emite o Pix da loja quando o Mercado Pago está desligado", async () => {
    const { service, attachPixCharge } = build();

    const instrucao = await service.createPreferenceForOrder("C3D-4823");

    expect(instrucao.pixCode).toBeTruthy();
    expect(instrucao.pixKey).toBe(LOJA.pixKey);
    expect(instrucao.paymentUrl).toBeNull();
    expect(instrucao.reason).toContain("Mercado Pago desligado");
    // Fica gravado: quem abrir o pedido de novo tem de ver o MESMO código.
    expect(attachPixCharge).toHaveBeenCalledWith(
      "C3D-4823",
      expect.objectContaining({ pixKey: LOJA.pixKey }),
    );
  });

  it("emite o Pix quando o Mercado Pago está ligado mas sem token", async () => {
    const { service } = build({ mercadoPagoLigado: true, accessToken: null });

    const instrucao = await service.createPreferenceForOrder("C3D-4823");

    expect(instrucao.pixCode).toBeTruthy();
    expect(instrucao.reason).toContain("sem access token");
  });

  it("embute no código o total do pedido, não o subtotal", async () => {
    const { service } = build();

    const instrucao = await service.createPreferenceForOrder("C3D-4823");

    // 15245 centavos viram "152.45" no campo 54 do BR Code.
    expect(instrucao.pixCode).toContain("5406152.45");
  });

  it("usa o nome e a cidade do ateliê quando o favorecido não foi preenchido", async () => {
    const { service } = build({
      loja: { ...LOJA, pixReceiverName: "", pixCity: "" },
    });

    const instrucao = await service.createPreferenceForOrder("C3D-4823");

    expect(instrucao.pixReceiverName).toBe("c3dcriativ");
    // "Campina Grande — PB" perde o travessão e cabe nos 15 caracteres.
    expect(instrucao.pixCode).toContain("Campina Grande");
  });

  it("sem chave Pix, diz o motivo em vez de inventar um código", async () => {
    const { service, attachPixCharge } = build({
      loja: { ...LOJA, pixKey: "" },
    });

    const instrucao = await service.createPreferenceForOrder("C3D-4823");

    expect(instrucao.pixCode).toBeNull();
    expect(instrucao.reason).toContain("sem chave Pix");
    expect(attachPixCharge).not.toHaveBeenCalled();
  });

  it("devolve a cobrança já emitida, sem gerar outra", async () => {
    const { service, attachPixCharge } = build({
      pedido: { ...PEDIDO, pixCode: "00020126BR-CODE-ANTIGO", pixKey: LOJA.pixKey },
    });

    const instrucao = await service.createPreferenceForOrder("C3D-4823");

    expect(instrucao.pixCode).toBe("00020126BR-CODE-ANTIGO");
    expect(instrucao.reason).toContain("já existia");
    expect(attachPixCharge).not.toHaveBeenCalled();
  });

  it("não derruba o checkout quando os dados de Pix são inválidos", async () => {
    // Cidade que some na limpeza: o BR Code não pode ser montado, mas o
    // pedido já existe e a resposta precisa dizer isso sem estourar.
    const { service } = build({ loja: { ...LOJA, pixCity: "###", atelierCity: "###" } });

    const instrucao = await service.createPreferenceForOrder("C3D-4823");

    expect(instrucao.pixCode).toBeNull();
    expect(instrucao.reason).toContain("inválidos");
  });
});
