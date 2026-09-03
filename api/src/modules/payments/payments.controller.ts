import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { CreatePreferenceDto } from "./dto/payment.dto";
import { Public } from "../../common/decorators/auth.decorators";

interface MercadoPagoNotification {
  type?: string;
  action?: string;
  data?: { id?: string };
}

@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * Chamado pelo servidor da loja logo depois de criar o pedido. Público
   * porque o checkout não tem sessão de admin; só age sobre pedido existente
   * e ainda pendente, e repetir devolve a mesma preferência.
   */
  @Public()
  @Post("mercadopago/preference")
  createPreference(@Body() body: CreatePreferenceDto) {
    return this.payments.createPreferenceForOrder(body.code);
  }

  /**
   * O Mercado Pago chama sem sessão, então a rota é pública — quem autentica
   * é a assinatura. Sempre respondemos rápido: notificação que demora vira
   * reenvio, e reenvio vira pedido processado duas vezes.
   */
  @Public()
  @HttpCode(200)
  @Post("mercadopago/webhook")
  async mercadoPago(
    @Body() body: MercadoPagoNotification,
    @Headers("x-signature") signature?: string,
    @Headers("x-request-id") requestId?: string,
  ) {
    const dataId = body?.data?.id;
    if (!dataId) return { received: true, handled: false, reason: "sem data.id" };

    const valid = await this.payments.verifySignature(String(dataId), {
      signature,
      requestId,
    });
    if (!valid) throw new UnauthorizedException("Assinatura inválida");

    if (body.type && body.type !== "payment") {
      return { received: true, handled: false, reason: `tipo ${body.type}` };
    }

    const result = await this.payments.handlePaymentNotification(String(dataId));
    return { received: true, ...result };
  }
}
