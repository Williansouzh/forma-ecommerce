import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { IntegrationsService } from "../integrations/integrations.service";
import { R2Client, type R2Credentials } from "./r2.client";
import { detectImage, rejectionReason } from "./image-type";

/** Teto por arquivo. Uma foto de produto bem exportada não passa disso. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export interface StoredImage {
  /** Caminho dentro do bucket. É o que permite apagar depois. */
  key: string;
  /** URL pública, montada a partir do domínio configurado. */
  url: string;
  contentType: string;
  bytes: number;
}

export interface StorageStatus {
  configured: boolean;
  enabled: boolean;
  bucket: string | null;
  accountId: string | null;
  publicBaseUrl: string | null;
  hasAccessKeyId: boolean;
  hasSecretAccessKey: boolean;
  maxBytes: number;
  acceptedTypes: string[];
}

/**
 * Guarda imagem de produto no R2 e devolve a URL pública.
 *
 * As credenciais vivem no cofre que o projeto já tem (`Integration.secrets`,
 * `select: false`) — o mesmo do Mercado Pago e da Shopee. O navegador nunca
 * recebe chave nenhuma: o arquivo sobe para a API, a API assina e envia.
 *
 * Foi essa a escolha em vez de URL pré-assinada: pré-assinada exigiria
 * política de CORS no bucket e colocaria uma credencial temporária no
 * cliente, para economizar uma banda que uma loja deste tamanho não sente.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly integrations: IntegrationsService,
    private readonly r2: R2Client,
  ) {}

  async credentials(): Promise<R2Credentials> {
    const [config, secrets] = await Promise.all([
      this.integrations.configFor("r2"),
      this.integrations.secretsFor("r2"),
    ]);

    const accountId = String(config.accountId ?? "").trim();
    const bucket = String(config.bucket ?? "").trim();
    const accessKeyId = secrets.accessKeyId?.trim();
    const secretAccessKey = secrets.secretAccessKey?.trim();

    if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
      throw new BadRequestException(
        "R2 incompleto. Grave account ID, bucket e as credenciais S3 em Integrações.",
      );
    }

    const endpoint = String(config.endpoint ?? "").trim() || undefined;
    return { accountId, bucket, accessKeyId, secretAccessKey, endpoint };
  }

  /**
   * A base pública. Sem ela não há upload: guardar um objeto que ninguém
   * consegue ler seria gastar armazenamento para produzir uma imagem quebrada
   * na vitrine. Melhor recusar e dizer o que falta.
   */
  async publicBaseUrl(): Promise<string> {
    const config = await this.integrations.configFor("r2");
    const base = String(config.publicBaseUrl ?? "").trim().replace(/\/+$/, "");
    if (!base) {
      throw new BadRequestException(
        "Nenhum domínio público configurado para o bucket. Um objeto guardado " +
          "sem domínio de leitura não aparece na loja.",
      );
    }
    return base;
  }

  async isEnabled(): Promise<boolean> {
    return this.integrations.isEnabled("r2");
  }

  /**
   * Valida os bytes e guarda o arquivo.
   *
   * A chave é gerada AQUI e nunca vem do cliente: nome de arquivo enviado por
   * quem sobe pode conter `../`, barra invertida ou caractere de controle, e
   * viraria caminho dentro do bucket. Prefixo por data facilita achar e
   * expirar; o UUID garante que subir duas vezes a mesma foto não sobrescreva
   * a anterior, que pode estar em uso por outro produto.
   */
  async storeProductImage(body: Buffer): Promise<StoredImage> {
    if (!(await this.isEnabled())) {
      throw new BadRequestException("O armazenamento no R2 está desligado.");
    }
    if (body.length === 0) {
      throw new BadRequestException("Arquivo vazio.");
    }
    if (body.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException(
        `Arquivo de ${(body.length / 1048576).toFixed(1)} MB excede o limite de ` +
          `${MAX_IMAGE_BYTES / 1048576} MB.`,
      );
    }

    const detected = detectImage(body);
    if (!detected) {
      throw new BadRequestException(rejectionReason(body));
    }

    const [credentials, base] = await Promise.all([
      this.credentials(),
      this.publicBaseUrl(),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const key = `produtos/${today}/${randomUUID()}.${detected.extension}`;

    await this.r2.putObject(credentials, key, body, detected.mime);
    this.logger.log(`Imagem guardada em ${key} (${body.length} bytes, ${detected.mime}).`);

    return {
      key,
      url: `${base}/${key}`,
      contentType: detected.mime,
      bytes: body.length,
    };
  }

  /**
   * Apaga um objeto. Só aceita chave nossa (prefixo `produtos/`) — sem isso,
   * uma rota de exclusão viraria "apague qualquer coisa deste bucket".
   */
  async removeProductImage(key: string): Promise<void> {
    const clean = key.trim().replace(/^\/+/, "");
    if (!/^produtos\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/.test(clean)) {
      throw new BadRequestException("Chave fora do padrão das imagens de produto.");
    }
    await this.r2.deleteObject(await this.credentials(), clean);
    this.logger.log(`Imagem ${clean} removida do R2.`);
  }

  /**
   * Extrai a chave de uma URL pública nossa, ou `null` quando a URL é de
   * outro lugar — imagem em `/public` continua válida e não deve ser tratada
   * como objeto do bucket.
   */
  async keyFromUrl(url: string): Promise<string | null> {
    const base = String(
      (await this.integrations.configFor("r2")).publicBaseUrl ?? "",
    )
      .trim()
      .replace(/\/+$/, "");
    if (!base || !url.startsWith(`${base}/`)) return null;
    return url.slice(base.length + 1);
  }

  /** O que o painel mostra. Nada aqui é segredo. */
  async status(): Promise<StorageStatus> {
    const [config, secrets, enabled] = await Promise.all([
      this.integrations.configFor("r2"),
      this.integrations.secretsFor("r2"),
      this.integrations.isEnabled("r2"),
    ]);

    const accountId = String(config.accountId ?? "").trim() || null;
    const bucket = String(config.bucket ?? "").trim() || null;
    const publicBaseUrl =
      String(config.publicBaseUrl ?? "").trim().replace(/\/+$/, "") || null;

    return {
      configured: Boolean(
        accountId && bucket && publicBaseUrl && secrets.accessKeyId && secrets.secretAccessKey,
      ),
      enabled,
      bucket,
      accountId,
      publicBaseUrl,
      hasAccessKeyId: Boolean(secrets.accessKeyId),
      hasSecretAccessKey: Boolean(secrets.secretAccessKey),
      maxBytes: MAX_IMAGE_BYTES,
      acceptedTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    };
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    return this.r2.checkAccess(await this.credentials());
  }
}
