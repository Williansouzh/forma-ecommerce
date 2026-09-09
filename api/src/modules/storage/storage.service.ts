import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { IntegrationsService } from "../integrations/integrations.service";
import { R2Client, type R2Credentials } from "./r2.client";
import { detectImage, rejectionReason } from "./image-type";
import { VARIANT_WIDTHS, buildVariants, variantKey } from "./image-variants";

/**
 * Diz por que uma URL não serve como base pública, ou `null` quando serve.
 *
 * O caso que motivou isto: o painel da Cloudflare mostra o **endpoint da API
 * S3** em destaque, com botão de copiar, logo acima da URL de leitura. Colado
 * aqui, ele deixa o upload FUNCIONAR e a exibição falhar — o objeto é gravado,
 * a URL é montada, e o navegador leva 400 porque aquele endereço exige
 * assinatura em toda requisição.
 *
 * Falha tardia, longe da causa, e sem nada dizendo o que houve. Recusar na
 * entrada custa uma função e transforma isso numa mensagem.
 */
export function publicUrlProblem(base: string): string | null {
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return `"${base}" não é uma URL. Use o domínio de leitura do bucket, como https://pub-….r2.dev`;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return "O domínio público precisa ser http(s).";
  }

  if (url.hostname.endsWith("r2.cloudflarestorage.com")) {
    return (
      "Esse é o endpoint da API S3, que exige assinatura em toda requisição — " +
      "o navegador não consegue ler imagem dele. Use o domínio personalizado " +
      "do bucket, ou a Public Development URL (https://pub-….r2.dev), em " +
      "R2 → o bucket → Settings."
    );
  }

  if (url.hostname === "dash.cloudflare.com") {
    return "Essa é a URL do painel da Cloudflare, não do bucket.";
  }

  return null;
}

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
  /** Por que a base pública não serve, quando não serve. */
  publicUrlProblem: string | null;
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

    const problem = publicUrlProblem(base);
    if (problem) throw new BadRequestException(problem);

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
    const id = randomUUID();

    /*
     * As variantes primeiro, e o caminho definido pelo resultado.
     *
     * `produtos/w/…` é o marcador que diz à loja "esta foto tem versões
     * menores"; ele só é usado quando TODAS subiram. Se o redimensionamento
     * ou qualquer envio falhar, a foto vai para o caminho antigo e a loja a
     * serve inteira, como sempre serviu — nunca um `srcset` apontando para
     * arquivo que não está no bucket.
     */
    const variants = await this.buildVariantsOrNone(body);
    const prefix = variants.length > 0 ? `produtos/w/${today}` : `produtos/${today}`;
    const key = `${prefix}/${id}.${detected.extension}`;

    await this.r2.putObject(credentials, key, body, detected.mime);

    let stored = variants.length;
    if (stored > 0) {
      try {
        await Promise.all(
          variants.map((variant) =>
            this.r2.putObject(
              credentials,
              variantKey(key, variant.width),
              variant.body,
              variant.contentType,
            ),
          ),
        );
      } catch (error) {
        // O original já está no bucket sob `produtos/w/`, e agora sem todas as
        // variantes. Regravar num caminho sem marcador seria o certo, mas
        // custa outro PUT no caminho de resposta do upload; o `srcset` da loja
        // tolera a ausência caindo no original, e a linha abaixo deixa o
        // rastro para quem for investigar.
        stored = 0;
        this.logger.warn(
          `Variantes de ${key} falharam: ${error instanceof Error ? error.message : "erro"}.`,
        );
      }
    }

    this.logger.log(
      `Imagem guardada em ${key} (${body.length} bytes, ${detected.mime})` +
        (stored > 0 ? ` com ${stored} variante(s).` : " sem variantes."),
    );

    return {
      key,
      url: `${base}/${key}`,
      contentType: detected.mime,
      bytes: body.length,
    };
  }

  /**
   * As variantes, ou nenhuma.
   *
   * Falhar aqui não pode derrubar o upload: uma foto sem versões menores
   * continua sendo uma foto boa, e o painel já mostrou o arquivo ao usuário.
   */
  private async buildVariantsOrNone(body: Buffer) {
    try {
      return await buildVariants(body);
    } catch (error) {
      this.logger.warn(
        `Não deu para gerar variantes: ${error instanceof Error ? error.message : "erro"}.`,
      );
      return [];
    }
  }

  /**
   * Apaga um objeto. Só aceita chave nossa (prefixo `produtos/`) — sem isso,
   * uma rota de exclusão viraria "apague qualquer coisa deste bucket".
   */
  async removeProductImage(key: string): Promise<void> {
    const clean = key.trim().replace(/^\/+/, "");
    // `w/` opcional: o padrão aceita tanto as fotos antigas quanto as que têm
    // variantes, e nada além destas duas formas.
    if (
      !/^produtos\/(w\/)?\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/.test(
        clean,
      )
    ) {
      throw new BadRequestException("Chave fora do padrão das imagens de produto.");
    }

    const credentials = await this.credentials();
    await this.r2.deleteObject(credentials, clean);

    /*
     * As variantes vão junto, senão apagar uma foto deixaria três órfãs
     * pagando armazenamento para sempre.
     *
     * Sem `Promise.all`: uma variante que já não exista não pode impedir as
     * outras de sair, e o original — que é o que importa — já foi apagado
     * acima. Falha aqui vira aviso, não erro para quem clicou.
     */
    if (clean.startsWith("produtos/w/")) {
      for (const width of VARIANT_WIDTHS) {
        try {
          await this.r2.deleteObject(credentials, variantKey(clean, width));
        } catch (error) {
          this.logger.warn(
            `Variante ${width} de ${clean} não saiu: ${error instanceof Error ? error.message : "erro"}.`,
          );
        }
      }
    }

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

    // Uma base pública inválida NÃO conta como configurado: o painel mostraria
    // tudo verde e o upload falharia — ou pior, funcionaria e produziria uma
    // imagem que ninguém consegue ver.
    const problem = publicBaseUrl ? publicUrlProblem(publicBaseUrl) : null;

    return {
      configured: Boolean(
        accountId &&
          bucket &&
          publicBaseUrl &&
          !problem &&
          secrets.accessKeyId &&
          secrets.secretAccessKey,
      ),
      publicUrlProblem: problem,
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
