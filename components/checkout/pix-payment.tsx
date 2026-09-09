"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils";

/**
 * Como pagar, logo depois de confirmar o pedido.
 *
 * Sem Mercado Pago configurado, esta tela dizia o código do pedido e mais
 * nada: a pessoa terminava a compra sem nenhuma forma de pagar, e o ateliê só
 * descobria a venda se fosse olhar o painel. Agora o Pix da loja aparece aqui,
 * com o valor já embutido no código.
 *
 * O "copia e cola" vem primeiro porque é o caminho que não erra: o app do
 * banco preenche chave, valor e identificação sozinho. A chave solta fica
 * abaixo, para quem prefere digitar ou usa um banco que não lê o código.
 */

export interface PixCharge {
  /** BR Code com o valor embutido. */
  code: string;
  key: string | null;
  receiverName: string | null;
}

function CopyButton({
  value,
  label,
  copiedLabel = "Copiado",
}: {
  value: string;
  label: string;
  copiedLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sem permissão de área de transferência o texto continua na tela e
      // selecionável — some o atalho, não o caminho.
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border border-border-strong px-4 text-[14px] font-medium text-primary transition-colors hover:border-accent hover:text-accent"
    >
      {copied ? (
        <Check size={15} strokeWidth={2} aria-hidden />
      ) : (
        <Copy size={15} strokeWidth={1.75} aria-hidden />
      )}
      {copied ? copiedLabel : label}
    </button>
  );
}

export function PixPayment({
  charge,
  total,
  orderCode,
  whatsappNumber,
}: {
  charge: PixCharge;
  /** Em centavos. */
  total: number;
  orderCode: string;
  /** Só dígitos, com DDI. Vazio esconde o botão. */
  whatsappNumber?: string;
}) {
  const digits = (whatsappNumber ?? "").replace(/\D/g, "");
  const mensagem = `Olá! Fiz o pedido ${orderCode} (${formatPrice(total)}) e vou enviar o comprovante do Pix por aqui.`;
  const whatsappUrl = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(mensagem)}`
    : null;

  return (
    <section
      aria-labelledby="pix-titulo"
      className="mt-10 rounded-lg border border-border-strong bg-surface p-[clamp(18px,4vw,28px)] text-left"
    >
      <h2 id="pix-titulo" className="font-display text-heading-3">
        Pague com Pix
      </h2>
      <p className="mt-1.5 text-body-small text-secondary">
        A produção começa depois que o pagamento cair. O valor já está dentro
        do código — não precisa digitar nada.
      </p>

      <div className="mt-5 rounded-md bg-surface-muted p-4">
        <span className="label text-tertiary">Pix copia e cola</span>
        <p className="data mt-2 break-all text-[12.5px] leading-relaxed text-primary">
          {charge.code}
        </p>
        <div className="mt-3">
          <CopyButton value={charge.code} label="Copiar código Pix" />
        </div>
      </div>

      {charge.key && (
        <div className="mt-3 flex flex-col gap-3 rounded-md bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span className="label text-tertiary">Ou use a chave</span>
            <p className="data mt-1 break-all text-body-small text-primary">
              {charge.key}
            </p>
            {charge.receiverName && (
              <p className="mt-1 text-[13px] text-tertiary">
                Favorecido: {charge.receiverName}
              </p>
            )}
          </div>
          <CopyButton value={charge.key} label="Copiar chave" />
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border-subtle pt-4">
        <span className="text-body-small text-secondary">Total a pagar</span>
        <span className="data shrink-0 whitespace-nowrap text-heading-3">
          {formatPrice(total)}
        </span>
      </div>

      {/* Pix direto não avisa ninguém quando cai: quem confere o comprovante é
          uma pessoa. Por isso o caminho do comprovante fica junto do código, e
          não numa instrução que a pessoa leria depois — se lesse. */}
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2.5 rounded-md bg-primary px-6 text-[15px] font-semibold text-background transition-colors duration-200 hover:bg-accent"
        >
          <MessageCircle size={17} strokeWidth={1.75} aria-hidden />
          Enviar comprovante no WhatsApp
        </a>
      )}
      <p className="mt-3 text-[13px] text-tertiary">
        {whatsappUrl
          ? "O pedido entra na fila assim que o ateliê confirmar o recebimento."
          : "Envie o comprovante para o ateliê — o pedido entra na fila assim que ele confirmar."}
      </p>
    </section>
  );
}
