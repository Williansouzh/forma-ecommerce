import {
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { Public } from "../../common/decorators/auth.decorators";
import type { ApiConfig } from "../../config/configuration";
import { ShopeeAuthService } from "./shopee-auth.service";
import { ShopeeOrderService } from "./shopee-order.service";
import { verifyPushSignature } from "./shopee-signature";

/**
 * O corpo de um push. Tudo opcional: vem de fora, e o que chega aqui é
 * TRATADO COMO NÃO CONFIÁVEL — nenhum campo daqui decide estoque. O corpo só
 * diz "olhe o pedido tal"; o que aconteceu com ele vem de `get_order_detail`,
 * autenticado.
 */
interface ShopeePushBody {
  code?: number;
  shop_id?: number;
  timestamp?: number;
  data?: {
    ordersn?: string;
    order_sn?: string;
    status?: string;
  };
}

/**
 * Os `code` de push que tratamos como "algo mudou em um pedido".
 *
 * `3 = Order status update push`, confirmado na especificação de
 * `v2.push.set_app_push_config` — a tabela completa dos códigos está em
 * `docs/SHOPEE_API.md`.
 *
 * O desenho continua não DEPENDENDO da lista estar completa: um código fora
 * dela é registrado e ignorado, e a varredura periódica importa o pedido
 * alguns minutos depois. O custo de faltar um código é latência, não estoque
 * errado.
 *
 * Dois valem tratar quando houver necessidade: `2` (desautorização da loja) e
 * `12` (expiração da autorização) — hoje só descobrimos que o acesso caiu
 * quando uma chamada falha.
 */
const ORDER_PUSH_CODES = new Set([3]);

@Controller("shopee")
export class ShopeeWebhookController {
  private readonly logger = new Logger(ShopeeWebhookController.name);

  constructor(
    private readonly auth: ShopeeAuthService,
    private readonly orders: ShopeeOrderService,
    private readonly config: ConfigService<ApiConfig>,
  ) {}

  /**
   * O endpoint que a Shopee chama.
   *
   * Público porque a Shopee não tem sessão — quem autentica é a assinatura,
   * exatamente como no webhook do Mercado Pago. Sem `partner_key` gravada,
   * TODA notificação é recusada: um endpoint aberto que mexe em estoque é um
   * convite.
   *
   * Responde depressa e delega: o processamento vai para a fila persistente.
   * Push que demora vira reenvio, e reenvio vira trabalho repetido — que a
   * chave de idempotência absorveria, mas de graça é melhor.
   */
  @Public()
  @HttpCode(200)
  @Post("webhook")
  async handle(
    @Req() request: RawBodyRequest<Request>,
    @Headers("authorization") authorization?: string,
    @Headers("x-shopee-signature") shopeeSignature?: string,
  ) {
    const correlationId = randomUUID();

    // O corpo CRU, não o objeto já re-serializado: `JSON.parse` seguido de
    // `JSON.stringify` reordena chaves e normaliza espaços, e o HMAC deixa de
    // bater por um motivo que não aparece em lugar nenhum.
    const rawBody = request.rawBody?.toString("utf8") ?? "";
    const scheme = await this.auth.pushSignatureScheme();
    const received = scheme === "authorization" ? authorization : shopeeSignature;

    // A URL entra na base do esquema `authorization`. Usamos a URL PÚBLICA
    // configurada, e não o `Host` do request: atrás de proxy o header chega
    // reescrito, e a assinatura passaria a falhar de forma intermitente.
    const url = `${this.config.get<string>("publicApiUrl")}/api/v1/shopee/webhook`;

    const valid = verifyPushSignature({
      partnerKey: await this.auth.partnerKey(),
      scheme,
      url,
      rawBody,
      received,
    });
    if (!valid) {
      this.logger.warn(`[${correlationId}] push com assinatura inválida recusado.`);
      throw new UnauthorizedException("Assinatura inválida");
    }

    let body: ShopeePushBody;
    try {
      body = JSON.parse(rawBody) as ShopeePushBody;
    } catch {
      return { received: true, handled: false, reason: "corpo não é JSON" };
    }

    const shopId = body.shop_id ? String(body.shop_id) : null;
    const orderSn = (body.data?.ordersn ?? body.data?.order_sn)?.trim();

    if (!body.code || !ORDER_PUSH_CODES.has(body.code)) {
      // Não é falha: a Shopee manda vários tipos de push, e ignorar o que não
      // interessa é o comportamento certo. Fica no log com o código para o
      // caso de a lista precisar crescer.
      return {
        received: true,
        handled: false,
        reason: `code ${body.code ?? "ausente"} não é de pedido`,
      };
    }
    if (!shopId || !orderSn) {
      return { received: true, handled: false, reason: "push sem shop_id ou order_sn" };
    }

    // A loja conectada é uma só; um push de outra loja é ruído — ou pior.
    const connectedShop = await this.auth.shopId();
    if (connectedShop && connectedShop !== shopId) {
      this.logger.warn(
        `[${correlationId}] push da loja ${shopId}, mas a conectada é ${connectedShop}.`,
      );
      return { received: true, handled: false, reason: "push de outra loja" };
    }

    await this.orders.enqueue({
      shopId,
      orderSn,
      hintedStatus: body.data?.status,
      pushCode: body.code,
      correlationId,
    });

    return { received: true, handled: true, reason: "enfileirado", correlationId };
  }
}
