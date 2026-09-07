"use client";

import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { getMediaStatus, uploadProductImage } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import type { MediaStatus } from "@/types/media";

/**
 * O envio de imagem do painel, em um lugar só.
 *
 * Existiu primeiro solto dentro do formulário de produto — e o painel tem
 * TRÊS editores de imagem: o formulário (`/admin/novo`, `/admin/[id]/editar`),
 * a gaveta (`/admin/produtos`) e a vitrine (`/admin/home`). Só o primeiro
 * ganhou o botão, então quem editava pela gaveta continuava sem upload e
 * concluía, com razão, que o recurso não existia.
 *
 * Componente compartilhado em vez de copiar: o próximo editor de imagem que
 * alguém escrever vai importar isto ou não vai ter upload — e a segunda
 * hipótese fica evidente na revisão, em vez de aparecer no uso.
 */

/** O estado do armazenamento, lido uma vez por tela. */
export function useMediaStatus(): MediaStatus | null {
  const [status, setStatus] = useState<MediaStatus | null>(null);

  useEffect(() => {
    // Uma API mais antiga que o módulo de mídia não pode derrubar a tela:
    // sem status, o campo de URL continua funcionando como sempre.
    getMediaStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  return status;
}

/** Megabytes legíveis, para as mensagens de limite. */
export function megabytes(bytes: number): string {
  return `${Math.round(bytes / 1048576)} MB`;
}

interface ImageUploadButtonProps {
  media: MediaStatus | null;
  /** Recebe a URL pública já gravada no bucket. */
  onUploaded: (url: string) => void;
  onError: (message: string) => void;
  /** Impede o envio enquanto outra coisa da tela está gravando. */
  disabled?: boolean;
  /** Descrição para leitor de tela — cada linha de imagem tem a sua. */
  label: string;
  /** `compact` cabe na gaveta; `default` na página cheia. */
  size?: "default" | "compact";
  className?: string;
}

/**
 * O botão aparece SEMPRE, mesmo sem bucket configurado.
 *
 * Escondê-lo era pior do que mostrá-lo desligado: quem abria a tela não
 * descobria que o envio existe. Um controle desabilitado que diz o motivo
 * ensina; um controle ausente só confunde.
 */
export function ImageUploadButton({
  media,
  onUploaded,
  onError,
  disabled = false,
  label,
  size = "default",
  className,
}: ImageUploadButtonProps) {
  const input = useRef<HTMLInputElement | null>(null);
  const [sending, setSending] = useState(false);

  const send = async (file: File) => {
    if (media && file.size > media.maxBytes) {
      onError(
        `"${file.name}" tem ${(file.size / 1048576).toFixed(1)} MB e o limite é ${megabytes(media.maxBytes)}.`,
      );
      return;
    }

    setSending(true);
    try {
      const stored = await uploadProductImage(file);
      onUploaded(stored.url);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Falha ao enviar a imagem");
    } finally {
      setSending(false);
      // Sem limpar, escolher o MESMO arquivo depois de um erro não dispara
      // `change` de novo, e a tela parece travada.
      if (input.current) input.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={(media?.acceptedTypes ?? ["image/*"]).join(",")}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void send(file);
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={!media?.configured || disabled || sending}
        title={
          media?.configured
            ? undefined
            : "Configure o bucket em Integrações → Imagens"
        }
        aria-label={label}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-strong text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40",
          size === "compact"
            ? "h-[42px] px-3 text-[12.5px] uppercase tracking-[0.06em]"
            : "min-h-[42px] px-3.5 text-[13px] font-semibold uppercase tracking-[0.08em]",
          className,
        )}
      >
        <Upload size={13} />
        {sending ? "Enviando…" : "Enviar"}
      </button>
    </>
  );
}

/**
 * O aviso de "falta configurar", com o caminho para resolver. Devolve `null`
 * quando está tudo certo ou quando o status ainda não chegou — nesse segundo
 * caso, avisar seria adivinhar.
 */
export function StorageNotice({ media }: { media: MediaStatus | null }) {
  if (!media || media.configured) return null;

  // Configuração ERRADA e configuração AUSENTE pedem respostas diferentes.
  // "falta configurar" para quem já configurou é a mensagem que faz a pessoa
  // conferir o que já está certo em vez do que está errado.
  if (media.publicUrlProblem) {
    return (
      <p
        role="alert"
        className="rounded-md bg-error/10 px-3 py-2 text-[12.5px] text-error"
      >
        {media.publicUrlProblem} Corrija em{" "}
        <a href="/admin/integracoes" className="underline">
          Integrações → Imagens
        </a>
        .
      </p>
    );
  }

  return (
    <p className="rounded-md bg-surface-muted px-3 py-2 text-[12.5px] text-secondary">
      O envio de arquivos está desligado: falta configurar o bucket em{" "}
      <a href="/admin/integracoes" className="underline hover:text-accent">
        Integrações → Imagens
      </a>
      . Enquanto isso, cole o caminho da imagem no campo.
    </p>
  );
}
