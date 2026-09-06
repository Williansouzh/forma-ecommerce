import { Injectable, Logger } from "@nestjs/common";
import { EMPTY_PAYLOAD_SHA256, sha256Hex, signAwsV4, uriEncode } from "./sigv4";

/** O R2 aceita a API S3 com região fixa `auto`. */
export const R2_REGION = "auto";
const S3_SERVICE = "s3";
const DEFAULT_TIMEOUT_MS = 30_000;

export interface R2Credentials {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Endpoint S3 completo, quando o padrão da conta não servir. */
  endpoint?: string;
}

export class R2Error extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "R2Error";
  }
}

/**
 * O cliente do R2 pela API S3.
 *
 * Faz três coisas — PUT, DELETE e HEAD de objeto — e nada além disso. É o
 * limite externo do armazenamento: quem chama não sabe o que é SigV4, e este
 * arquivo não sabe o que é produto.
 */
@Injectable()
export class R2Client {
  private readonly logger = new Logger(R2Client.name);

  /** `https://<conta>.r2.cloudflarestorage.com/<bucket>/<chave>` */
  objectUrl(credentials: R2Credentials, key: string): URL {
    const base =
      credentials.endpoint?.replace(/\/+$/, "") ??
      `https://${credentials.accountId}.r2.cloudflarestorage.com`;
    // Cada segmento é codificado separadamente: a barra separa e não pode
    // virar `%2F`, mas o resto do nome precisa ser escapado.
    const path = key
      .split("/")
      .map((segment) => uriEncode(segment))
      .join("/");
    return new URL(`${base}/${credentials.bucket}/${path}`);
  }

  async putObject(
    credentials: R2Credentials,
    key: string,
    body: Buffer,
    contentType: string,
    /** `Cache-Control` do objeto; imagem versionada por nome pode ser imutável. */
    cacheControl = "public, max-age=31536000, immutable",
  ): Promise<void> {
    const url = this.objectUrl(credentials, key);
    const payloadHash = sha256Hex(body);

    const headers: Record<string, string> = {
      host: url.host,
      "content-type": contentType,
      "content-length": String(body.length),
      "cache-control": cacheControl,
      "x-amz-content-sha256": payloadHash,
    };

    const signed = signAwsV4({
      method: "PUT",
      url,
      headers,
      payloadHash,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      region: R2_REGION,
      service: S3_SERVICE,
      date: new Date(),
    });

    await this.send("PUT", url, { ...headers, ...signed }, body);
  }

  async deleteObject(credentials: R2Credentials, key: string): Promise<void> {
    const url = this.objectUrl(credentials, key);
    const headers: Record<string, string> = {
      host: url.host,
      "x-amz-content-sha256": EMPTY_PAYLOAD_SHA256,
    };
    const signed = signAwsV4({
      method: "DELETE",
      url,
      headers,
      payloadHash: EMPTY_PAYLOAD_SHA256,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      region: R2_REGION,
      service: S3_SERVICE,
      date: new Date(),
    });

    await this.send("DELETE", url, { ...headers, ...signed });
  }

  /**
   * Confere credencial e bucket sem gravar nada: um HEAD em chave que não
   * existe devolve 404 quando as credenciais servem, e 401/403 quando não.
   * É a diferença entre "conectado" e "chave recusada" no painel.
   */
  async checkAccess(credentials: R2Credentials): Promise<{ ok: boolean; message: string }> {
    const url = this.objectUrl(credentials, `.forma-verificacao-de-acesso`);
    const headers: Record<string, string> = {
      host: url.host,
      "x-amz-content-sha256": EMPTY_PAYLOAD_SHA256,
    };
    const signed = signAwsV4({
      method: "HEAD",
      url,
      headers,
      payloadHash: EMPTY_PAYLOAD_SHA256,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      region: R2_REGION,
      service: S3_SERVICE,
      date: new Date(),
    });

    const response = await fetch(url, {
      method: "HEAD",
      headers: { ...headers, ...signed },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    }).catch(() => null);

    if (!response) return { ok: false, message: "Não foi possível alcançar o R2." };
    if (response.status === 404 || response.ok) {
      return { ok: true, message: `Conexão OK · bucket ${credentials.bucket}` };
    }
    if (response.status === 401 || response.status === 403) {
      return { ok: false, message: `Credencial recusada (${response.status}).` };
    }
    return { ok: false, message: `R2 respondeu ${response.status}.` };
  }

  private async send(
    method: string,
    url: URL,
    headers: Record<string, string>,
    body?: Buffer,
  ): Promise<void> {
    const response = await fetch(url, {
      method,
      headers,
      // `Buffer` é um `Uint8Array`; o fetch do Node aceita, mas o tipo do DOM
      // não conhece essa sobrecarga.
      body: body as unknown as BodyInit | undefined,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    }).catch((error: unknown) => {
      const reason = error instanceof Error ? error.name : "erro desconhecido";
      throw new R2Error(0, `Não foi possível alcançar o R2 (${reason}).`, true);
    });

    if (response.ok) return;

    // O erro do S3 vem em XML. Extraímos só o <Message>; o corpo inteiro pode
    // trazer o nome do bucket e a chave, que não precisam ir para o log.
    const text = await response.text().catch(() => "");
    const detail = /<Message>([^<]*)<\/Message>/.exec(text)?.[1] ?? "";
    this.logger.warn(`${method} no R2 respondeu ${response.status}: ${detail}`);

    throw new R2Error(
      response.status,
      detail || `R2 respondeu ${response.status}.`,
      response.status >= 500 || response.status === 429,
    );
  }
}
