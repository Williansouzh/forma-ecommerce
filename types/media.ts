/** O que o painel sabe sobre o armazenamento de imagens. Nada aqui é segredo. */
export interface MediaStatus {
  /** Verdadeiro quando dá para subir arquivo: conta, bucket, domínio e chaves. */
  configured: boolean;
  enabled: boolean;
  bucket: string | null;
  accountId: string | null;
  /** Domínio público de leitura. Sem ele, o objeto guardado não aparece. */
  publicBaseUrl: string | null;
  hasAccessKeyId: boolean;
  hasSecretAccessKey: boolean;
  maxBytes: number;
  acceptedTypes: string[];
}

export interface UploadedImage {
  /** Caminho dentro do bucket — é o que permite apagar depois. */
  key: string;
  url: string;
  contentType: string;
  bytes: number;
}
