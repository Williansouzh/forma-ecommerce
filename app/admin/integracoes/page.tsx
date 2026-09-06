"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listIntegrations,
  testMercadoPago,
  testR2,
  updateIntegration,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import type { Integration, IntegrationKey } from "@/types/integration";

const labelClass =
  "block text-[12px] font-semibold uppercase tracking-[0.12em] text-tertiary";
const fieldClass =
  "mt-1.5 min-h-[42px] w-full rounded-md border border-strong bg-surface px-3 text-body-small font-normal normal-case tracking-normal outline-none transition-colors focus:border-accent";

function Tag({ on, small }: { on: boolean; small?: boolean }) {
  return (
    <span
      className={cn(
        "font-bold uppercase",
        small
          ? "px-2 py-[3px] text-[10px] tracking-[0.13em]"
          : "px-[9px] py-1 text-[10.5px] tracking-[0.14em]",
        on ? "bg-accent text-background" : "bg-surface-muted text-tertiary"
      )}
    >
      {on ? "Conectado" : "Desconectado"}
    </span>
  );
}

function Toggle({
  name,
  on,
  onClick,
}: {
  name: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex min-h-[42px] items-center gap-2.5 rounded-md border px-3.5 text-[13.5px] transition-colors hover:border-accent",
        on ? "border-primary bg-surface-muted" : "border-border-strong bg-transparent"
      )}
    >
      <span
        aria-hidden
        className={cn("size-2 rounded-full", on ? "bg-accent" : "bg-primary/20")}
      />
      {name}
    </button>
  );
}


/** Rótulo do campo com a opção de apagar a credencial já guardada. */
function SecretLabel({
  title,
  stored,
  onRemove,
}: {
  title: string;
  stored?: string;
  onRemove: () => void;
}) {
  return (
    <span className="flex items-baseline justify-between gap-2">
      {title}
      {stored && (
        <button
          type="button"
          onClick={onRemove}
          className="text-[11px] font-semibold uppercase tracking-[0.1em] text-tertiary transition-colors hover:text-error"
        >
          Remover
        </button>
      )}
    </span>
  );
}

const SMALL_CARDS: { key: IntegrationKey; name: string; text: string }[] = [
  {
    key: "melhorenvio",
    name: "Melhor Envio",
    text: "Cotação de frete no checkout, etiqueta e rastreio dos Correios e Jadlog.",
  },
  {
    key: "instagram",
    name: "Instagram Shopping",
    text: "Marca as peças nos posts do @c3dcriativ e leva o clique direto para o produto.",
  },
  {
    key: "nfe",
    name: "Nota fiscal (MEI)",
    text: "Emissão automática de NFS-e a cada pedido pago, com envio por e-mail.",
  },
];

export default function AdminIntegrationsPage() {
  const pushToast = useUIStore((state) => state.pushToast);
  const [rows, setRows] = useState<Integration[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const load = useCallback(() => {
    listIntegrations()
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  const find = (key: IntegrationKey) => rows?.find((row) => row.key === key);

  const save = async (
    key: IntegrationKey,
    input: Parameters<typeof updateIntegration>[1],
    message?: string
  ) => {
    setError(null);
    try {
      const saved = await updateIntegration(key, input);
      setRows((current) =>
        (current ?? []).map((row) => (row.key === key ? saved : row))
      );
      if (message) pushToast(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar");
    }
  };

  const runTest = async () => {
    setTesting(true);
    try {
      const result = await testMercadoPago();
      pushToast(result.message, result.ok ? "success" : "error");
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : "Falha ao testar",
        "error"
      );
    } finally {
      setTesting(false);
    }
  };

  if (error && !rows) {
    return (
      <div className="animate-fade-up">
        <h1 className="font-display text-heading-1 font-light tracking-[-0.02em]">
          Integrações
        </h1>
        <p role="alert" className="mt-6 rounded-md bg-error/10 px-4 py-3 text-body-small text-error">
          {error}
        </p>
      </div>
    );
  }

  const mp = find("mercadopago");
  const wa = find("whatsapp");
  const waNumber = String(wa?.config.phone ?? "");
  const waMessage = String(wa?.config.message ?? "");

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-heading-1 font-light tracking-[-0.02em]">
        Integrações
      </h1>
      <p className="mt-1.5 max-w-[620px] text-tertiary">
        Pagamento, atendimento e envio. As chaves ficam guardadas no servidor — o
        painel só mostra os últimos dígitos.
      </p>

      {error && (
        <p role="alert" className="mt-6 rounded-md bg-error/10 px-4 py-3 text-body-small text-error">
          {error}
        </p>
      )}

      {!rows ? (
        <p className="mt-7 text-body-small text-tertiary">
          Carregando integrações…
        </p>
      ) : (
        <>
          <section className="mt-7 border border-border-subtle bg-surface p-[18px] sm:p-6 lg:p-[30px]">
            <div className="flex flex-wrap items-center gap-3.5">
              <div className="min-w-0 flex-1 basis-[260px]">
                <div className="flex items-center gap-2.5">
                  <h2 className="font-display text-2xl">Mercado Pago</h2>
                  <Tag on={mp?.enabled ?? false} />
                </div>
                <p className="mt-2 text-sm text-secondary">
                  Pix, cartão em até 12×, boleto e reembolso. O webhook de
                  pagamento aprovado dispara a etiqueta e a mensagem no WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  void save(
                    "mercadopago",
                    { enabled: !mp?.enabled },
                    mp?.enabled ? "Mercado Pago desconectado" : "Mercado Pago conectado"
                  )
                }
                className={cn(
                  "min-h-[44px] shrink-0 rounded-md border px-[18px] font-semibold transition-colors",
                  mp?.enabled
                    ? "border-border-strong bg-transparent text-primary hover:border-primary"
                    : "border-primary bg-primary text-background hover:bg-accent hover:border-accent"
                )}
              >
                {mp?.enabled ? "Desconectar" : "Conectar"}
              </button>
            </div>

            <div className="mt-[22px] flex flex-wrap gap-3.5">
              <label className={cn(labelClass, "flex-1 basis-[260px]")}>
                Public key
                <input
                  defaultValue={String(mp?.config.publicKey ?? "")}
                  placeholder="APP_USR-…"
                  onBlur={(event) =>
                    void save("mercadopago", {
                      config: { publicKey: event.target.value.trim() },
                    })
                  }
                  className={fieldClass}
                />
              </label>

              <label className={cn(labelClass, "flex-1 basis-[260px]")}>
                <SecretLabel
                  title="Access token"
                  stored={mp?.secretHints.accessToken}
                  onRemove={() =>
                    void save(
                      "mercadopago",
                      { removeSecrets: ["accessToken"] },
                      "Access token removido do servidor"
                    )
                  }
                />
                <input
                  type="password"
                  autoComplete="off"
                  placeholder={mp?.secretHints.accessToken ?? "não gravado"}
                  onBlur={(event) => {
                    const value = event.target.value.trim();
                    if (!value) return;
                    event.target.value = "";
                    void save(
                      "mercadopago",
                      { secrets: { accessToken: value } },
                      "Access token gravado no servidor"
                    );
                  }}
                  className={fieldClass}
                />
              </label>

              <label className={cn(labelClass, "flex-1 basis-[260px]")}>
                <SecretLabel
                  title="Segredo do webhook"
                  stored={mp?.secretHints.webhookSecret}
                  onRemove={() =>
                    void save(
                      "mercadopago",
                      { removeSecrets: ["webhookSecret"] },
                      "Segredo do webhook removido do servidor"
                    )
                  }
                />
                <input
                  type="password"
                  autoComplete="off"
                  placeholder={mp?.secretHints.webhookSecret ?? "não gravado"}
                  onBlur={(event) => {
                    const value = event.target.value.trim();
                    if (!value) return;
                    event.target.value = "";
                    void save(
                      "mercadopago",
                      { secrets: { webhookSecret: value } },
                      "Segredo do webhook gravado no servidor"
                    );
                  }}
                  className={fieldClass}
                />
              </label>

              <label className={cn(labelClass, "flex-1 basis-[160px]")}>
                Máx. de parcelas
                <select
                  value={String(mp?.config.installments ?? "6")}
                  onChange={(event) =>
                    void save(
                      "mercadopago",
                      { config: { installments: event.target.value } },
                      `Parcelamento atualizado para ${event.target.value}×`
                    )
                  }
                  className={fieldClass}
                >
                  <option value="3">3× sem juros</option>
                  <option value="6">6× sem juros</option>
                  <option value="12">12× com juros</option>
                </select>
              </label>
            </div>

            <div className="mt-[18px] flex flex-wrap items-center gap-2.5">
              {(
                [
                  ["pix", "Pix"],
                  ["boleto", "Boleto"],
                  ["antifraude", "Antifraude"],
                ] as const
              ).map(([key, name]) => (
                <Toggle
                  key={key}
                  name={name}
                  on={Boolean(mp?.config[key])}
                  onClick={() =>
                    void save("mercadopago", {
                      config: { [key]: !mp?.config[key] },
                    })
                  }
                />
              ))}
              <button
                type="button"
                onClick={() => void runTest()}
                disabled={testing}
                className="ml-auto min-h-[42px] rounded-md border border-border-strong px-4 text-[13.5px] font-semibold transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
              >
                {testing ? "Testando…" : "Testar conexão"}
              </button>
            </div>

            <div className="mt-4 bg-surface-muted px-3.5 py-3 text-[13px]">
              Webhook: <strong>POST /api/v1/payments/mercadopago/webhook</strong>
              {mp?.secretHints.webhookSecret
                ? " — assinatura verificada. O pedido é marcado como pago pelo external_reference."
                : " — grave o segredo do webhook acima; sem ele toda notificação é recusada."}
            </div>
          </section>

          <section className="mt-5 border border-border-subtle bg-surface p-[18px] sm:p-6 lg:p-[30px]">
            <div className="flex flex-wrap items-center gap-3.5">
              <div className="min-w-0 flex-1 basis-[260px]">
                <div className="flex items-center gap-2.5">
                  <h2 className="font-display text-2xl">WhatsApp Business</h2>
                  <Tag on={wa?.enabled ?? false} />
                </div>
                <p className="mt-2 text-sm text-secondary">
                  Botão de orçamento, carrinho enviado por mensagem e aviso
                  automático em cada etapa da produção.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  void save(
                    "whatsapp",
                    { enabled: !wa?.enabled },
                    wa?.enabled ? "WhatsApp desconectado" : "WhatsApp conectado"
                  )
                }
                className={cn(
                  "min-h-[44px] shrink-0 rounded-md border px-[18px] font-semibold transition-colors",
                  wa?.enabled
                    ? "border-border-strong bg-transparent text-primary hover:border-primary"
                    : "border-primary bg-primary text-background hover:bg-accent hover:border-accent"
                )}
              >
                {wa?.enabled ? "Desconectar" : "Conectar"}
              </button>
            </div>

            <div className="mt-[22px] flex flex-wrap gap-3.5">
              <label className={cn(labelClass, "flex-1 basis-[200px]")}>
                Número do ateliê
                <input
                  defaultValue={waNumber}
                  placeholder="+55 83 98871-7642"
                  onBlur={(event) =>
                    void save("whatsapp", {
                      config: { phone: event.target.value.trim() },
                    })
                  }
                  className={fieldClass}
                />
              </label>
              <label className={cn(labelClass, "flex-1 basis-[200px]")}>
                Phone number ID
                <input
                  defaultValue={String(wa?.config.phoneNumberId ?? "")}
                  placeholder="da Cloud API da Meta"
                  onBlur={(event) =>
                    void save("whatsapp", {
                      config: { phoneNumberId: event.target.value.trim() },
                    })
                  }
                  className={fieldClass}
                />
              </label>

              <label className={cn(labelClass, "flex-1 basis-[200px]")}>
                <SecretLabel
                  title="Access token"
                  stored={wa?.secretHints.accessToken}
                  onRemove={() =>
                    void save(
                      "whatsapp",
                      { removeSecrets: ["accessToken"] },
                      "Access token do WhatsApp removido"
                    )
                  }
                />
                <input
                  type="password"
                  autoComplete="off"
                  placeholder={wa?.secretHints.accessToken ?? "não gravado"}
                  onBlur={(event) => {
                    const value = event.target.value.trim();
                    if (!value) return;
                    event.target.value = "";
                    void save(
                      "whatsapp",
                      { secrets: { accessToken: value } },
                      "Access token do WhatsApp gravado no servidor"
                    );
                  }}
                  className={fieldClass}
                />
              </label>

              <label className={cn(labelClass, "flex-1 basis-[200px]")}>
                Template de etapa
                <input
                  defaultValue={String(wa?.config.stageTemplate ?? "")}
                  placeholder="nome aprovado na Meta"
                  onBlur={(event) =>
                    void save("whatsapp", {
                      config: { stageTemplate: event.target.value.trim() },
                    })
                  }
                  className={fieldClass}
                />
              </label>

              <label className={cn(labelClass, "flex-[2_1_320px]")}>
                Mensagem padrão do orçamento
                <textarea
                  rows={3}
                  defaultValue={waMessage}
                  onBlur={(event) =>
                    void save("whatsapp", {
                      config: { message: event.target.value },
                    })
                  }
                  className={cn(fieldClass, "min-h-[90px] resize-y py-2.5")}
                />
              </label>
            </div>

            <div className="mt-[18px] flex flex-wrap items-center gap-2.5">
              {(
                [
                  ["sendCart", "Enviar carrinho"],
                  ["notifyStages", "Avisar cada etapa"],
                  ["syncCatalog", "Sincronizar catálogo"],
                ] as const
              ).map(([key, name]) => (
                <Toggle
                  key={key}
                  name={name}
                  on={Boolean(wa?.config[key])}
                  onClick={() =>
                    void save("whatsapp", {
                      config: { [key]: !wa?.config[key] },
                    })
                  }
                />
              ))}
              <a
                href={`https://wa.me/${waNumber.replace(/\D/g, "")}?text=${encodeURIComponent(waMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!waNumber}
                className={cn(
                  "ml-auto inline-flex min-h-[42px] items-center rounded-md border border-border-strong px-3.5 text-[13.5px] font-semibold transition-colors hover:border-accent",
                  !waNumber && "pointer-events-none opacity-40"
                )}
              >
                Testar link ↗
              </a>
            </div>
          </section>

          <ShopeeCredentials row={find("shopee")} save={save} />

          <R2Credentials row={find("r2")} save={save} />

          <div className="mt-5 flex flex-wrap gap-5">
            {SMALL_CARDS.map((card) => {
              const row = find(card.key);
              return (
                <section
                  key={card.key}
                  className="min-w-0 flex-1 basis-[min(100%,300px)] border border-border-subtle bg-surface p-[22px]"
                >
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-display text-xl">{card.name}</h3>
                    <Tag on={row?.enabled ?? false} small />
                  </div>
                  <p className="mb-4 mt-2.5 text-[13.5px] leading-[1.55] text-secondary">
                    {card.text}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      void save(
                        card.key,
                        { enabled: !row?.enabled },
                        `${card.name} ${row?.enabled ? "desconectado" : "conectado"}`
                      )
                    }
                    className="min-h-[40px] rounded-md border border-border-strong px-3.5 text-[13px] font-semibold transition-colors hover:border-accent hover:text-accent"
                  >
                    {row?.enabled ? "Desconectar" : "Conectar"}
                  </button>
                </section>
              );
            })}
          </div>

          <p className="mt-6 max-w-[620px] text-[13px] text-tertiary">
            Ligar uma integração guarda a configuração e a credencial. O webhook
            de pagamento e o aviso de etapa no WhatsApp já funcionam — o aviso
            sai por <strong>template aprovado na Meta</strong>, que é a única
            forma de mensagem iniciada pelo negócio fora da janela de 24 h. O
            template recebe dois parâmetros: código do pedido e etapa. A etiqueta
            de envio ainda não está implementada.
          </p>
        </>
      )}
    </div>
  );
}

/**
 * As credenciais da Shopee: `partner_id` público e `partner_key` privada.
 *
 * Fica aqui, junto das outras credenciais, e não na página da Shopee, por dois
 * motivos: é o mesmo cofre (`Integration.secrets`, `select: false`) que já
 * guarda o token do Mercado Pago, e a página da Shopee trata de OPERAÇÃO —
 * conectar loja, associar peça, conciliar —, não de segredo.
 *
 * A partner_key entra e não volta: o campo mostra só a dica mascarada, e a
 * mesma chave assina as chamadas de saída e confere a assinatura do webhook.
 */
function ShopeeCredentials({
  row,
  save,
}: {
  row?: Integration;
  save: (
    key: IntegrationKey,
    input: Parameters<typeof updateIntegration>[1],
    message?: string
  ) => Promise<void>;
}) {
  return (
    <section className="mt-5 border border-border-subtle bg-surface p-[18px] sm:p-6 lg:p-[30px]">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-0 flex-1 basis-[260px]">
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-2xl">Shopee</h2>
            <Tag on={row?.enabled ?? false} />
          </div>
          <p className="mt-2 text-sm text-secondary">
            Credenciais do app na Shopee Open Platform. Depois de gravá-las,
            autorize a loja e administre as associações em{" "}
            <a href="/admin/shopee" className="underline hover:text-accent">
              Shopee
            </a>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            void save(
              "shopee",
              { enabled: !row?.enabled },
              row?.enabled ? "Shopee desligada" : "Shopee ligada"
            )
          }
          className={cn(
            "min-h-[44px] shrink-0 rounded-md border px-[18px] font-semibold transition-colors",
            row?.enabled
              ? "border-border-strong bg-transparent text-primary hover:border-primary"
              : "border-primary bg-primary text-background hover:border-accent hover:bg-accent"
          )}
        >
          {row?.enabled ? "Desligar" : "Ligar"}
        </button>
      </div>

      <div className="mt-[22px] flex flex-wrap gap-3.5">
        <label className={cn(labelClass, "flex-1 basis-[220px]")}>
          Partner ID
          <input
            defaultValue={String(row?.config.partnerId ?? "")}
            placeholder="1009999"
            inputMode="numeric"
            onBlur={(event) =>
              void save("shopee", {
                config: { partnerId: event.target.value.trim() },
              })
            }
            className={fieldClass}
          />
        </label>

        <label className={cn(labelClass, "flex-1 basis-[260px]")}>
          <SecretLabel
            title="Partner key"
            stored={row?.secretHints.partnerKey}
            onRemove={() =>
              void save(
                "shopee",
                { removeSecrets: ["partnerKey"] },
                "Partner key removida do servidor"
              )
            }
          />
          <input
            type="password"
            autoComplete="off"
            placeholder={row?.secretHints.partnerKey ?? "não gravada"}
            onBlur={(event) => {
              const value = event.target.value.trim();
              if (!value) return;
              event.target.value = "";
              void save(
                "shopee",
                { secrets: { partnerKey: value } },
                "Partner key gravada no servidor"
              );
            }}
            className={fieldClass}
          />
        </label>

        <label className={cn(labelClass, "flex-1 basis-[180px]")}>
          Região
          <select
            value={String(row?.config.region ?? "BR")}
            onChange={(event) =>
              void save(
                "shopee",
                { config: { region: event.target.value } },
                `Região: ${event.target.value}`
              )
            }
            className={fieldClass}
          >
            <option value="BR">Brasil (produção)</option>
            <option value="GLOBAL">Global (produção)</option>
            <option value="SANDBOX">Sandbox (homologação)</option>
          </select>
        </label>
      </div>

      <div className="mt-4 bg-surface-muted px-3.5 py-3 text-[13px]">
        Webhook: <strong>POST /api/v1/shopee/webhook</strong>
        {row?.secretHints.partnerKey
          ? " — a partner_key confere a assinatura de cada push. O corpo do push nunca decide estoque."
          : " — sem partner_key gravada, toda notificação é recusada."}
      </div>
    </section>
  );
}

/**
 * Credenciais do bucket R2 onde ficam as imagens de produto.
 *
 * As chaves S3 entram e não voltam — mesmo cofre do Mercado Pago e da Shopee.
 * O `publicBaseUrl` é a única parte que precisa existir ANTES do primeiro
 * upload: guardar um objeto num bucket sem domínio de leitura gasta
 * armazenamento para produzir uma imagem quebrada na vitrine, e a API recusa
 * o envio justamente para não deixar isso acontecer.
 */
function R2Credentials({
  row,
  save,
}: {
  row?: Integration;
  save: (
    key: IntegrationKey,
    input: Parameters<typeof updateIntegration>[1],
    message?: string
  ) => Promise<void>;
}) {
  const pushToast = useUIStore((state) => state.pushToast);
  const [testing, setTesting] = useState(false);
  const publicBaseUrl = String(row?.config.publicBaseUrl ?? "");

  const runTest = async () => {
    setTesting(true);
    try {
      const result = await testR2();
      pushToast(result.message, result.ok ? "success" : "error");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Falha ao testar", "error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className="mt-5 border border-border-subtle bg-surface p-[18px] sm:p-6 lg:p-[30px]">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-0 flex-1 basis-[260px]">
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-2xl">Imagens (Cloudflare R2)</h2>
            <Tag on={row?.enabled ?? false} />
          </div>
          <p className="mt-2 text-sm text-secondary">
            Guarda as fotos dos produtos. O arquivo sobe para a API, que assina
            e grava no bucket — a chave nunca passa pelo navegador.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            void save(
              "r2",
              { enabled: !row?.enabled },
              row?.enabled ? "Envio de imagens desligado" : "Envio de imagens ligado"
            )
          }
          className={cn(
            "min-h-[44px] shrink-0 rounded-md border px-[18px] font-semibold transition-colors",
            row?.enabled
              ? "border-border-strong bg-transparent text-primary hover:border-primary"
              : "border-primary bg-primary text-background hover:border-accent hover:bg-accent"
          )}
        >
          {row?.enabled ? "Desligar" : "Ligar"}
        </button>
      </div>

      <div className="mt-[22px] flex flex-wrap gap-3.5">
        <label className={cn(labelClass, "flex-1 basis-[280px]")}>
          Account ID
          <input
            defaultValue={String(row?.config.accountId ?? "")}
            placeholder="o Account ID da sua conta Cloudflare"
            onBlur={(event) =>
              void save("r2", { config: { accountId: event.target.value.trim() } })
            }
            className={fieldClass}
          />
        </label>

        <label className={cn(labelClass, "flex-1 basis-[180px]")}>
          Bucket
          <input
            defaultValue={String(row?.config.bucket ?? "")}
            placeholder="forma-data"
            onBlur={(event) =>
              void save("r2", { config: { bucket: event.target.value.trim() } })
            }
            className={fieldClass}
          />
        </label>

        <label className={cn(labelClass, "flex-1 basis-[280px]")}>
          Domínio público de leitura
          <input
            defaultValue={publicBaseUrl}
            placeholder="https://img.seudominio.com"
            onBlur={(event) =>
              void save("r2", {
                config: { publicBaseUrl: event.target.value.trim() },
              })
            }
            className={fieldClass}
          />
        </label>

        <label className={cn(labelClass, "flex-1 basis-[260px]")}>
          <SecretLabel
            title="Access Key ID"
            stored={row?.secretHints.accessKeyId}
            onRemove={() =>
              void save("r2", { removeSecrets: ["accessKeyId"] }, "Access Key ID removida")
            }
          />
          <input
            type="password"
            autoComplete="off"
            placeholder={row?.secretHints.accessKeyId ?? "não gravada"}
            onBlur={(event) => {
              const value = event.target.value.trim();
              if (!value) return;
              event.target.value = "";
              void save("r2", { secrets: { accessKeyId: value } }, "Access Key ID gravada");
            }}
            className={fieldClass}
          />
        </label>

        <label className={cn(labelClass, "flex-1 basis-[260px]")}>
          <SecretLabel
            title="Secret Access Key"
            stored={row?.secretHints.secretAccessKey}
            onRemove={() =>
              void save("r2", { removeSecrets: ["secretAccessKey"] }, "Secret Access Key removida")
            }
          />
          <input
            type="password"
            autoComplete="off"
            placeholder={row?.secretHints.secretAccessKey ?? "não gravada"}
            onBlur={(event) => {
              const value = event.target.value.trim();
              if (!value) return;
              event.target.value = "";
              void save("r2", { secrets: { secretAccessKey: value } }, "Secret Access Key gravada");
            }}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="mt-[18px] flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => void runTest()}
          disabled={testing}
          className="ml-auto min-h-[42px] rounded-md border border-border-strong px-4 text-[13.5px] font-semibold transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {testing ? "Testando…" : "Testar conexão"}
        </button>
      </div>

      <div className="mt-4 bg-surface-muted px-3.5 py-3 text-[13px]">
        {publicBaseUrl ? (
          <>
            O mesmo domínio precisa estar em{" "}
            <strong>NEXT_PUBLIC_IMAGE_BASE_URL</strong> no build da loja — é dele
            que saem a política de CSP e os hosts autorizados do{" "}
            <code>next/image</code>. Divergindo, a página carrega e só a foto
            some.
          </>
        ) : (
          <>
            Sem domínio público de leitura, o envio é recusado: um objeto que
            ninguém consegue ler viraria imagem quebrada na vitrine.
          </>
        )}
      </div>
    </section>
  );
}
