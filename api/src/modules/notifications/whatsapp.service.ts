import { Injectable, Logger } from "@nestjs/common";
import { IntegrationsService } from "../integrations/integrations.service";

export interface NotificationResult {
  sent: boolean;
  reason: string;
}

const GRAPH_VERSION = "v21.0";

/** Rótulo que o cliente entende, não o enum do banco. */
const STAGE_LABELS: Record<string, string> = {
  pending: "aguardando pagamento",
  paid: "pagamento confirmado",
  processing: "na fila de impressão",
  printing: "sendo impresso",
  finishing: "no acabamento",
  shipped: "a caminho",
  delivered: "entregue",
  cancelled: "cancelado",
};

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly integrations: IntegrationsService) {}

  /**
   * Avisa o cliente da mudança de etapa.
   *
   * Mensagem iniciada pelo negócio fora da janela de 24 h só sai por template
   * aprovado na Meta — por isso aqui não há texto livre: o nome do template
   * vem da configuração e recebe código e etapa como parâmetros.
   *
   * Nunca lança: falha de aviso não pode derrubar a mudança de status nem o
   * webhook de pagamento que a disparou.
   */
  async notifyOrderStage(
    phone: string,
    orderCode: string,
    status: string,
  ): Promise<NotificationResult> {
    try {
      if (!(await this.integrations.isEnabled("whatsapp"))) {
        return { sent: false, reason: "WhatsApp desligado" };
      }

      const config = await this.integrations.configFor("whatsapp");
      if (config.notifyStages !== true) {
        return { sent: false, reason: "aviso de etapa desligado" };
      }

      const phoneNumberId = String(config.phoneNumberId ?? "").trim();
      const template = String(config.stageTemplate ?? "").trim();
      const token = (await this.integrations.secretsFor("whatsapp")).accessToken;

      if (!phoneNumberId || !template || !token) {
        return { sent: false, reason: "WhatsApp sem credencial ou template" };
      }

      const to = phone.replace(/\D/g, "");
      if (!to) return { sent: false, reason: "cliente sem telefone" };

      const response = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
              name: template,
              language: { code: String(config.templateLanguage ?? "pt_BR") },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: orderCode },
                    { type: "text", text: STAGE_LABELS[status] ?? status },
                  ],
                },
              ],
            },
          }),
        },
      ).catch(() => null);

      if (!response?.ok) {
        const detail = response
          ? ((await response.json().catch(() => null)) as {
              error?: { message?: string };
            } | null)
          : null;
        const reason =
          detail?.error?.message ?? `WhatsApp respondeu ${response?.status ?? "nada"}`;
        this.logger.warn(`Aviso de ${orderCode} não saiu: ${reason}`);
        return { sent: false, reason };
      }

      return { sent: true, reason: "cliente avisado no WhatsApp" };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "falha inesperada";
      this.logger.warn(`Aviso de ${orderCode} não saiu: ${reason}`);
      return { sent: false, reason };
    }
  }
}
