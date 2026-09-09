import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "crypto";
import { IntegrationsService } from "../integrations/integrations.service";
import { OrdersService } from "../orders/orders.service";
import { WhatsappService } from "../notifications/whatsapp.service";
import { SettingsService } from "../settings/settings.service";
import { PixService } from "./pix.service";
import type { ApiConfig } from "../../config/configuration";

export interface WebhookHeaders {
  signature?: string;
  requestId?: string;
}

export interface WebhookResult {
  handled: boolean;
  reason: string;
}

/**
 * Como o cliente paga este pedido.
 *
 * Ou existe um link do Mercado Pago, ou existe uma cobrança Pix direta — e o
 * `reason` explica o caso em que não existe nenhum dos dois, que é o que a
 * loja mostra em vez de deixar a tela muda.
 */
export interface PaymentInstruction {
  preferenceId: string | null;
  paymentUrl: string | null;
  /** BR Code "copia e cola", com o valor embutido. */
  pixCode: string | null;
  pixKey: string | null;
  pixReceiverName: string | null;
  reason: string;
}

interface MercadoPagoPayment {
  status?: string;
  external_reference?: string;
  /** Em reais, como o Mercado Pago fala. O domínio guarda centavos. */
  transaction_amount?: number;
}

/** A instrução vazia; cada retorno sobrescreve só o que preenche. */
const VAZIO: PaymentInstruction = {
  preferenceId: null,
  paymentUrl: null,
  pixCode: null,
  pixKey: null,
  pixReceiverName: null,
  reason: "",
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly integrations: IntegrationsService,
    private readonly orders: OrdersService,
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService<ApiConfig>,
    private readonly settings: SettingsService,
    private readonly pix: PixService,
  ) {}

  /**
   * Cria a preferência de pagamento do pedido. O `external_reference` é o
   * código do pedido — é por ele que o webhook reencontra a compra depois.
   * Chamar duas vezes devolve a mesma preferência: notificação repetida e
   * clique duplo não podem virar duas cobranças.
   */
  async createPreferenceForOrder(code: string): Promise<PaymentInstruction> {
    const order = await this.orders.findByCode(code);
    if (!order) throw new NotFoundException("Pedido não encontrado");

    if (order.paymentUrl && order.paymentPreferenceId) {
      return {
        ...VAZIO,
        preferenceId: order.paymentPreferenceId,
        paymentUrl: order.paymentUrl,
        reason: "preferência já existia",
      };
    }
    // Cobrança Pix já emitida volta idêntica: o cliente pode ter copiado o
    // código, e gerar outro txid faria o comprovante não bater com o pedido.
    if (order.pixCode) {
      return {
        ...VAZIO,
        pixCode: order.pixCode,
        pixKey: order.pixKey ?? null,
        pixReceiverName: order.pixReceiverName ?? null,
        reason: "cobrança Pix já existia",
      };
    }
    if (order.status !== "pending") {
      throw new BadRequestException("O pedido não está aguardando pagamento");
    }

    const token = (await this.integrations.isEnabled("mercadopago"))
      ? (await this.integrations.secretsFor("mercadopago")).accessToken
      : null;

    /*
     * Sem Mercado Pago no caminho, o Pix direto é o pagamento — não um plano
     * B. Antes esta função devolvia `paymentUrl: null` e a loja mostrava um
     * pedido sem nenhuma forma de pagar: o cliente fechava a compra e ficava
     * esperando alguém procurá-lo.
     */
    if (!token) {
      return this.pixDireto(
        order,
        (await this.integrations.isEnabled("mercadopago"))
          ? "Mercado Pago sem access token gravado"
          : "Mercado Pago desligado",
      );
    }

    const apiUrl = this.config.get<string>("publicApiUrl");
    const siteUrl = this.config.get<string>("publicSiteUrl");

    const response = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_reference: order.code,
          notification_url: `${apiUrl}/api/v1/payments/mercadopago/webhook`,
          back_urls: {
            success: `${siteUrl}/checkout?pedido=${order.code}`,
            pending: `${siteUrl}/checkout?pedido=${order.code}`,
            failure: `${siteUrl}/checkout?pedido=${order.code}`,
          },
          payer: {
            name: order.customer.firstName,
            surname: order.customer.lastName,
            email: order.customer.email,
          },
          // Preços do domínio são centavos; o Mercado Pago fala em reais.
          items: order.items.map((item) => ({
            title: item.name,
            quantity: item.quantity,
            currency_id: "BRL",
            unit_price: item.price / 100,
          })),
          ...(order.shipping > 0
            ? { shipments: { cost: order.shipping / 100, mode: "not_specified" } }
            : {}),
        }),
      },
    ).catch(() => null);

    if (!response?.ok) {
      const status = response?.status ?? "sem resposta";
      this.logger.warn(`Mercado Pago recusou a preferência: ${status}`);
      return this.pixDireto(
        order,
        `Mercado Pago indisponível (${status})`,
      );
    }

    const created = (await response.json()) as {
      id?: string;
      init_point?: string;
      sandbox_init_point?: string;
    };
    const url = created.init_point ?? created.sandbox_init_point ?? null;
    if (!created.id || !url) {
      return this.pixDireto(order, "Mercado Pago respondeu sem link de pagamento");
    }

    await this.orders.attachPayment(order.code, created.id, url);
    return {
      ...VAZIO,
      preferenceId: created.id,
      paymentUrl: url,
      reason: "preferência criada",
    };
  }

  /**
   * A cobrança Pix da própria loja, gravada no pedido.
   *
   * Sem chave configurada não há o que emitir, e o `reason` diz isso em vez de
   * inventar um código que o banco recusaria. É o estado de uma loja recém
   * instalada — e é por isso que o painel avisa que a chave está faltando.
   */
  private async pixDireto(
    order: { code: string; total: number },
    motivo: string,
  ): Promise<PaymentInstruction> {
    const loja = await this.settings.get();
    const chave = loja.pixKey?.trim();
    if (!chave) {
      return { ...VAZIO, reason: `${motivo}; loja sem chave Pix configurada` };
    }

    try {
      const carga = this.pix.buildCharge({
        amount: order.total,
        txid: order.code,
        key: chave,
        // O nome do ateliê serve de favorecido enquanto ninguém escrever um
        // diferente — é o que a loja já mostra em todo lugar.
        receiverName: loja.pixReceiverName?.trim() || loja.atelierName,
        city: loja.pixCity?.trim() || loja.atelierCity,
      });

      await this.orders.attachPixCharge(order.code, {
        pixCode: carga.brcode,
        pixKey: carga.key,
        pixReceiverName: carga.receiverName,
      });

      return {
        ...VAZIO,
        pixCode: carga.brcode,
        pixKey: carga.key,
        pixReceiverName: carga.receiverName,
        reason: `${motivo}; cobrança Pix emitida pela loja`,
      };
    } catch (error) {
      // Chave ou cidade inválidas não podem derrubar o checkout: o pedido já
      // existe, e a loja combina o pagamento por fora.
      const detalhe = error instanceof Error ? error.message : "erro";
      this.logger.warn(`Não foi possível emitir o Pix de ${order.code}: ${detalhe}`);
      return { ...VAZIO, reason: `${motivo}; dados de Pix inválidos (${detalhe})` };
    }
  }

  /**
   * Assinatura do Mercado Pago: o header `x-signature` traz `ts=…,v1=…`, e o
   * v1 é um HMAC-SHA256 sobre `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
   * com o segredo do webhook. Sem segredo gravado, recusamos — aceitar
   * qualquer POST em um endpoint que muda status de pedido é um convite.
   */
  async verifySignature(
    dataId: string,
    headers: WebhookHeaders,
  ): Promise<boolean> {
    const secret = (await this.integrations.secretsFor("mercadopago"))
      .webhookSecret;
    if (!secret || !headers.signature) return false;

    const parts = new Map(
      headers.signature
        .split(",")
        .map((part) => part.trim().split("=", 2))
        .filter((pair): pair is [string, string] => pair.length === 2)
        .map(([key, value]) => [key.trim(), value.trim()]),
    );
    const ts = parts.get("ts");
    const v1 = parts.get("v1");
    if (!ts || !v1) return false;

    const manifest = `id:${dataId};request-id:${headers.requestId ?? ""};ts:${ts};`;
    const expected = createHmac("sha256", secret).update(manifest).digest("hex");

    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(v1, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  /**
   * Busca o pagamento no Mercado Pago — a notificação diz só o id, e confiar
   * no corpo dela para dar um pedido como pago seria confiar no remetente.
   */
  async handlePaymentNotification(paymentId: string): Promise<WebhookResult> {
    const token = (await this.integrations.secretsFor("mercadopago")).accessToken;
    if (!token) {
      return { handled: false, reason: "sem access token gravado" };
    }

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    ).catch(() => null);

    if (!response?.ok) {
      const status = response?.status ?? "sem resposta";
      this.logger.warn(`Mercado Pago recusou a consulta do pagamento: ${status}`);
      return { handled: false, reason: `consulta ao pagamento falhou (${status})` };
    }

    const payment = (await response.json()) as MercadoPagoPayment;
    if (payment.status !== "approved") {
      return { handled: false, reason: `pagamento em ${payment.status}` };
    }

    const code = payment.external_reference;
    if (!code) {
      return { handled: false, reason: "pagamento sem external_reference" };
    }

    /*
     * Segunda barreira do preço: o valor aprovado tem de bater com o total do
     * pedido.
     *
     * A primeira é `priceOrder`, que grava o preço do catálogo em vez do que
     * o cliente mandou. Esta existe porque a preferência do Mercado Pago é um
     * documento que sai da nossa mão — quem paga vê o link, e um dia pode
     * haver outro caminho até um pagamento aprovado com valor menor. Duas
     * barreiras em pontos diferentes, para que uma falha não vire prejuízo.
     *
     * Um centavo de folga cobre o arredondamento entre reais e centavos.
     */
    const pending = await this.orders.findByCode(code);
    if (!pending) {
      return { handled: false, reason: `nenhum pedido com código ${code}` };
    }
    if (typeof payment.transaction_amount === "number") {
      const paidCents = Math.round(payment.transaction_amount * 100);
      if (Math.abs(paidCents - pending.total) > 1) {
        this.logger.error(
          `${code}: pagamento aprovado de ${paidCents} centavos para um pedido de ${pending.total}. Não marcado como pago.`,
        );
        return {
          handled: false,
          reason: `valor pago (${paidCents}) diverge do total do pedido (${pending.total})`,
        };
      }
    }

    const order = await this.orders.markPaidByCode(code);
    if (!order) {
      return { handled: false, reason: `nenhum pedido pendente com código ${code}` };
    }

    this.logger.log(`${code} marcado como pago pelo webhook do Mercado Pago.`);

    // O aviso é secundário: se falhar, o pedido continua pago.
    const notification = await this.whatsapp.notifyOrderStage(
      order.customer.phone,
      order.code,
      "paid",
    );

    return {
      handled: true,
      reason: notification.sent
        ? `${code} marcado como pago · cliente avisado`
        : `${code} marcado como pago (aviso não saiu: ${notification.reason})`,
    };
  }
}
