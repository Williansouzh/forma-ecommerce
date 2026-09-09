import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "crypto";
import { IntegrationsService } from "../integrations/integrations.service";
import { OrdersService } from "../orders/orders.service";
import { WhatsappService } from "../notifications/whatsapp.service";
import type { ApiConfig } from "../../config/configuration";

export interface WebhookHeaders {
  signature?: string;
  requestId?: string;
}

export interface WebhookResult {
  handled: boolean;
  reason: string;
}

interface MercadoPagoPayment {
  status?: string;
  external_reference?: string;
  /** Em reais, como o Mercado Pago fala. O domínio guarda centavos. */
  transaction_amount?: number;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly integrations: IntegrationsService,
    private readonly orders: OrdersService,
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService<ApiConfig>,
  ) {}

  /**
   * Cria a preferência de pagamento do pedido. O `external_reference` é o
   * código do pedido — é por ele que o webhook reencontra a compra depois.
   * Chamar duas vezes devolve a mesma preferência: notificação repetida e
   * clique duplo não podem virar duas cobranças.
   */
  async createPreferenceForOrder(code: string): Promise<{
    preferenceId: string | null;
    paymentUrl: string | null;
    reason: string;
  }> {
    const order = await this.orders.findByCode(code);
    if (!order) throw new NotFoundException("Pedido não encontrado");

    if (order.paymentUrl && order.paymentPreferenceId) {
      return {
        preferenceId: order.paymentPreferenceId,
        paymentUrl: order.paymentUrl,
        reason: "preferência já existia",
      };
    }
    if (order.status !== "pending") {
      throw new BadRequestException("O pedido não está aguardando pagamento");
    }

    if (!(await this.integrations.isEnabled("mercadopago"))) {
      return {
        preferenceId: null,
        paymentUrl: null,
        reason: "Mercado Pago desligado",
      };
    }
    const token = (await this.integrations.secretsFor("mercadopago")).accessToken;
    if (!token) {
      return {
        preferenceId: null,
        paymentUrl: null,
        reason: "sem access token gravado",
      };
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
      return {
        preferenceId: null,
        paymentUrl: null,
        reason: `criação da preferência falhou (${status})`,
      };
    }

    const created = (await response.json()) as {
      id?: string;
      init_point?: string;
      sandbox_init_point?: string;
    };
    const url = created.init_point ?? created.sandbox_init_point ?? null;
    if (!created.id || !url) {
      return {
        preferenceId: null,
        paymentUrl: null,
        reason: "resposta do Mercado Pago sem init_point",
      };
    }

    await this.orders.attachPayment(order.code, created.id, url);
    return {
      preferenceId: created.id,
      paymentUrl: url,
      reason: "preferência criada",
    };
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
