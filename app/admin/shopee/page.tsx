"use client";

import { useCallback, useEffect, useState } from "react";
import {
  connectShopee,
  deleteShopeeLink,
  disconnectShopee,
  drainShopeeQueue,
  getShopeeAuthorizationUrl,
  getShopeeConnection,
  getShopeeMetrics,
  getShopeeQueue,
  listShopeeEvents,
  listShopeeLinks,
  listShopeeListings,
  listShopeeOrders,
  listShopeeSuggestions,
  pollShopeeOrders,
  reconcileShopee,
  retryShopeeMessage,
  saveShopeeLink,
  syncAllShopee,
  syncShopeeSku,
  updateShopeeSettings,
} from "@/lib/admin-api";
import { useAdminData } from "@/components/admin/admin-data";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import type { Order } from "@/types/order";
import type {
  ShopeeConnection,
  ShopeeEventRow,
  ShopeeLink,
  ShopeeListing,
  ShopeeMetrics,
  ShopeeQueueMessage,
  ShopeeQueueStats,
  ShopeeReconciliationReport,
  ShopeeSuggestion,
} from "@/types/shopee";
import { fieldClass, labelClass } from "@/components/admin/field";
import { TableScroller } from "@/components/admin/table-scroller";

const sectionClass =
  "mt-5 border border-border-subtle bg-surface p-[18px] sm:p-6 lg:p-[30px]";
const buttonClass =
  "min-h-[42px] shrink-0 rounded-md border border-border-strong px-4 text-[13.5px] font-semibold transition-colors hover:border-accent hover:text-accent disabled:opacity-50";
const primaryButtonClass =
  "min-h-[44px] shrink-0 rounded-md border border-primary bg-primary px-[18px] font-semibold text-background transition-colors hover:border-accent hover:bg-accent disabled:opacity-50";

const TABS = ["conexao", "produtos", "pedidos", "erros"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  conexao: "Conexão",
  produtos: "Produtos",
  pedidos: "Pedidos",
  erros: "Fila e erros",
};

function Tag({ tone, children }: { tone: "on" | "off" | "warn"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "px-[9px] py-1 text-[10.5px] font-bold uppercase tracking-[0.14em]",
        tone === "on" && "bg-accent text-background",
        tone === "warn" && "bg-error/15 text-error",
        tone === "off" && "bg-surface-muted text-tertiary"
      )}
    >
      {children}
    </span>
  );
}

/** Quanto falta para o token vencer, dito como gente fala. */
function tokenNote(connection: ShopeeConnection): string {
  if (!connection.connected) return "sem token";
  const seconds = connection.tokenExpiresInSeconds;
  if (seconds == null) return "validade desconhecida";
  if (seconds <= 0) return "vencido — será renovado na próxima chamada";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `vence em ${hours}h${minutes.toString().padStart(2, "0")}` : `vence em ${minutes} min`;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminShopeePage() {
  const pushToast = useUIStore((state) => state.pushToast);
  const { products } = useAdminData();

  const [tab, setTab] = useState<Tab>("conexao");
  const [connection, setConnection] = useState<ShopeeConnection | null>(null);
  const [links, setLinks] = useState<ShopeeLink[]>([]);
  const [listings, setListings] = useState<ShopeeListing[]>([]);
  const [suggestions, setSuggestions] = useState<ShopeeSuggestion[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<ShopeeEventRow[]>([]);
  const [queue, setQueue] = useState<ShopeeQueueMessage[]>([]);
  const [queueStats, setQueueStats] = useState<ShopeeQueueStats | null>(null);
  const [metrics, setMetrics] = useState<ShopeeMetrics | null>(null);
  const [report, setReport] = useState<ShopeeReconciliationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  /** Um só lugar para "faça isto, mostre o estado e não engula o erro". */
  const run = useCallback(
    async <T,>(key: string, action: () => Promise<T>, success?: string): Promise<T | null> => {
      setBusy(key);
      setError(null);
      try {
        const result = await action();
        if (success) pushToast(success);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Falha na operação";
        setError(message);
        pushToast(message, "error");
        return null;
      } finally {
        setBusy(null);
      }
    },
    [pushToast]
  );

  const loadConnection = useCallback(async () => {
    try {
      setConnection(await getShopeeConnection());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao ler a conexão");
    }
  }, []);

  useEffect(() => {
    void loadConnection();
  }, [loadConnection]);

  useEffect(() => {
    if (!connection?.connected) return;
    if (tab === "produtos") {
      void listShopeeLinks().then(setLinks).catch(() => setLinks([]));
    }
    if (tab === "pedidos") {
      void listShopeeOrders().then(setOrders).catch(() => setOrders([]));
      void listShopeeEvents().then(setEvents).catch(() => setEvents([]));
    }
    if (tab === "erros") {
      void getShopeeQueue()
        .then((data) => {
          setQueue(data.messages);
          setQueueStats(data.stats);
        })
        .catch(() => setQueue([]));
      void getShopeeMetrics().then(setMetrics).catch(() => setMetrics(null));
    }
  }, [tab, connection?.connected]);

  const productName = (productId: string, variantId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return productId;
    if (!variantId) return product.name;
    const variant = product.variants?.find((v) => v.id === variantId);
    return `${product.name} — ${variant?.name ?? variantId}`;
  };

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-heading-1 font-light tracking-[-0.02em]">
        Shopee
      </h1>
      <p className="mt-1.5 max-w-[620px] text-tertiary">
        O estoque desta loja é a fonte oficial. A Shopee é um canal de venda: ela
        recebe o saldo, não o define.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-md bg-error/10 px-4 py-3 text-body-small text-error"
        >
          {error}
        </p>
      )}

      <nav className="mt-7 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            aria-current={tab === item ? "page" : undefined}
            className={cn(
              "min-h-[38px] rounded-md border px-3.5 text-[13.5px] transition-colors hover:border-accent",
              tab === item
                ? "border-primary bg-primary text-background"
                : "border-border-strong bg-transparent text-primary"
            )}
          >
            {TAB_LABELS[item]}
          </button>
        ))}
      </nav>

      {!connection ? (
        <p className="mt-7 text-body-small text-tertiary">Carregando…</p>
      ) : (
        <>
          {tab === "conexao" && (
            <ConnectionPanel
              connection={connection}
              busy={busy}
              run={run}
              reload={loadConnection}
              report={report}
              setReport={setReport}
            />
          )}

          {tab === "produtos" && (
            <ProductsPanel
              connection={connection}
              links={links}
              listings={listings}
              suggestions={suggestions}
              busy={busy}
              run={run}
              productName={productName}
              onLoadListings={async () => {
                const [remote, proposed] = await Promise.all([
                  listShopeeListings(),
                  listShopeeSuggestions(),
                ]);
                setListings(remote);
                setSuggestions(proposed);
              }}
              onReload={async () => setLinks(await listShopeeLinks())}
            />
          )}

          {tab === "pedidos" && (
            <OrdersPanel
              orders={orders}
              events={events}
              busy={busy}
              run={run}
              onReload={async () => {
                setOrders(await listShopeeOrders());
                setEvents(await listShopeeEvents());
              }}
            />
          )}

          {tab === "erros" && (
            <QueuePanel
              queue={queue}
              stats={queueStats}
              metrics={metrics}
              busy={busy}
              run={run}
              onReload={async () => {
                const data = await getShopeeQueue();
                setQueue(data.messages);
                setQueueStats(data.stats);
                setMetrics(await getShopeeMetrics());
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

type Run = <T>(key: string, action: () => Promise<T>, success?: string) => Promise<T | null>;

// ── Conexão ────────────────────────────────────────────────────────────────

function ConnectionPanel({
  connection,
  busy,
  run,
  reload,
  report,
  setReport,
}: {
  connection: ShopeeConnection;
  busy: string | null;
  run: Run;
  reload: () => Promise<void>;
  report: ShopeeReconciliationReport | null;
  setReport: (value: ShopeeReconciliationReport | null) => void;
}) {
  const [code, setCode] = useState("");
  const [shopId, setShopId] = useState("");
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  return (
    <>
      <section className={sectionClass}>
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="min-w-0 flex-1 basis-[260px]">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-display text-2xl">Loja conectada</h2>
              <Tag tone={connection.connected ? "on" : "off"}>
                {connection.connected ? "Conectada" : "Desconectada"}
              </Tag>
              {connection.connected && !connection.enabled && (
                <Tag tone="warn">Integração desligada</Tag>
              )}
            </div>
            <p className="mt-2 text-sm text-secondary">
              {connection.connected
                ? `Loja ${connection.shopId} · região ${connection.region} · token ${tokenNote(connection)}`
                : "Grave partner_id e partner_key em Integrações, depois autorize a loja aqui."}
            </p>
            <p className="mt-1 text-[13px] text-tertiary">
              Última sincronização saudável: {formatDate(connection.lastHealthySyncAt)}
            </p>
          </div>

          {connection.connected &&
            (confirmingDisconnect ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className="text-[13px] text-error">
                  Apaga os tokens do servidor. As associações são preservadas.
                </span>
                <button
                  type="button"
                  disabled={busy === "disconnect"}
                  onClick={() =>
                    void run("disconnect", disconnectShopee, "Loja desconectada").then(
                      () => {
                        setConfirmingDisconnect(false);
                        void reload();
                      }
                    )
                  }
                  className="min-h-[42px] rounded-md border border-error px-4 text-[13.5px] font-semibold text-error transition-colors hover:bg-error hover:text-background disabled:opacity-50"
                >
                  {busy === "disconnect" ? "Desconectando…" : "Confirmar"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDisconnect(false)}
                  className={buttonClass}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDisconnect(true)}
                className={buttonClass}
              >
                Desconectar
              </button>
            ))}
        </div>

        {!connection.hasPartnerKey && (
          <p className="mt-4 rounded-md bg-error/10 px-3.5 py-3 text-[13px] text-error">
            Nenhuma <strong>partner_key</strong> gravada. Sem ela, toda notificação
            da Shopee é recusada e nenhuma chamada pode ser assinada. Grave em
            Integrações → Shopee.
          </p>
        )}

        {!connection.connected && (
          <div className="mt-[22px]">
            <button
              type="button"
              disabled={busy === "auth-url" || !connection.hasPartnerKey}
              onClick={() =>
                void run("auth-url", async () => {
                  const { url } = await getShopeeAuthorizationUrl(
                    `${window.location.origin}/admin/shopee`
                  );
                  window.open(url, "_blank", "noopener");
                })
              }
              className={primaryButtonClass}
            >
              {busy === "auth-url" ? "Gerando…" : "Abrir autorização da Shopee"}
            </button>
            <p className="mt-2.5 text-[13px] text-tertiary">
              A Shopee redireciona de volta com <code>code</code> e{" "}
              <code>shop_id</code> na URL. Cole os dois abaixo — o código vale uma
              vez só e por poucos minutos.
            </p>

            <div className="mt-[18px] flex flex-wrap gap-3.5">
              <label className={cn(labelClass, "flex-1 basis-[260px]")}>
                Código de autorização
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.trim())}
                  placeholder="code do retorno"
                  className={fieldClass}
                />
              </label>
              <label className={cn(labelClass, "flex-1 basis-[180px]")}>
                shop_id
                <input
                  value={shopId}
                  onChange={(event) => setShopId(event.target.value.trim())}
                  placeholder="123456789"
                  inputMode="numeric"
                  className={fieldClass}
                />
              </label>
              <button
                type="button"
                disabled={!code || !shopId || busy === "connect"}
                onClick={() =>
                  void run(
                    "connect",
                    () => connectShopee(code, shopId),
                    "Loja conectada à Shopee"
                  ).then(() => {
                    setCode("");
                    setShopId("");
                    void reload();
                  })
                }
                className={cn(primaryButtonClass, "self-end")}
              >
                {busy === "connect" ? "Conectando…" : "Conectar"}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className="font-display text-2xl">Sincronização</h2>
        <p className="mt-2 text-sm text-secondary">
          O saldo enviado é sempre{" "}
          <strong>máximo(0, disponível − margem de segurança)</strong>. A margem
          cobre a janela entre a venda aqui e a Shopee saber dela.
        </p>

        <div className="mt-[22px] flex flex-wrap items-end gap-3.5">
          <button
            type="button"
            onClick={() =>
              void run(
                "auto",
                () => updateShopeeSettings({ autoSync: !connection.autoSync }),
                connection.autoSync
                  ? "Sincronização automática desligada"
                  : "Sincronização automática ligada"
              ).then(reload)
            }
            className={cn(
              "flex min-h-[42px] items-center gap-2.5 rounded-md border px-3.5 text-[13.5px] transition-colors hover:border-accent",
              connection.autoSync
                ? "border-primary bg-surface-muted"
                : "border-border-strong bg-transparent"
            )}
            aria-pressed={connection.autoSync}
          >
            <span
              aria-hidden
              className={cn(
                "size-2 rounded-full",
                connection.autoSync ? "bg-accent" : "bg-primary/20"
              )}
            />
            Sincronização automática
          </button>

          <label className={cn(labelClass, "basis-[220px]")}>
            Margem de segurança padrão
            <input
              type="number"
              min={0}
              defaultValue={connection.defaultSafetyMargin}
              onBlur={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value) || value === connection.defaultSafetyMargin) return;
                void run(
                  "margin",
                  () => updateShopeeSettings({ defaultSafetyMargin: Math.max(0, value) }),
                  `Margem padrão: ${Math.max(0, value)} unidade(s)`
                ).then(reload);
              }}
              className={fieldClass}
            />
          </label>

          <label className={cn(labelClass, "basis-[240px]")}>
            Assinatura do webhook
            <select
              value={connection.pushSignatureScheme}
              onChange={(event) =>
                void run(
                  "scheme",
                  () =>
                    updateShopeeSettings({
                      pushSignatureScheme: event.target
                        .value as ShopeeConnection["pushSignatureScheme"],
                    }),
                  "Esquema de assinatura atualizado"
                ).then(reload)
              }
              className={fieldClass}
            >
              <option value="authorization">Authorization (url|corpo)</option>
              <option value="x-shopee-signature">x-shopee-signature (corpo)</option>
            </select>
          </label>
        </div>

        <div className="mt-[18px] flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={!connection.connected || busy === "sync-all"}
            onClick={() =>
              void run("sync-all", syncAllShopee).then(
                (result) =>
                  result && alertQueued(result.queued)
              )
            }
            className={buttonClass}
          >
            {busy === "sync-all" ? "Enfileirando…" : "Sincronizar tudo"}
          </button>
          <button
            type="button"
            disabled={!connection.connected || busy === "dry"}
            onClick={() =>
              void run("dry", () => reconcileShopee(true)).then(setReport)
            }
            className={buttonClass}
          >
            {busy === "dry" ? "Conferindo…" : "Conferir divergências (simulação)"}
          </button>
          <button
            type="button"
            disabled={!connection.connected || busy === "reconcile"}
            onClick={() =>
              void run(
                "reconcile",
                () => reconcileShopee(false),
                "Conciliação concluída"
              ).then(setReport)
            }
            className={buttonClass}
          >
            {busy === "reconcile" ? "Conciliando…" : "Conciliar e corrigir"}
          </button>
          <button
            type="button"
            disabled={!connection.connected || busy === "poll"}
            onClick={() =>
              void run("poll", pollShopeeOrders).then(
                (result) =>
                  result &&
                  alertQueued(result.enqueued, `${result.found} pedido(s) encontrado(s)`)
              )
            }
            className={buttonClass}
          >
            {busy === "poll" ? "Buscando…" : "Buscar pedidos agora"}
          </button>
        </div>

        <div className="mt-4 bg-surface-muted px-3.5 py-3 text-[13px]">
          Webhook: <strong>POST /api/v1/shopee/webhook</strong>
          {connection.hasPartnerKey
            ? " — assinatura verificada com a partner_key. O corpo do push nunca decide estoque: o pedido é relido na API."
            : " — sem partner_key gravada, toda notificação é recusada."}
        </div>
      </section>

      {report && <ReconciliationReport report={report} onClose={() => setReport(null)} />}
    </>
  );
}

function alertQueued(count: number, extra?: string) {
  const message = extra ? `${extra} · ${count} na fila` : `${count} na fila`;
  useUIStore.getState().pushToast(message);
}

function ReconciliationReport({
  report,
  onClose,
}: {
  report: ShopeeReconciliationReport;
  onClose: () => void;
}) {
  return (
    <section className={sectionClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">
          Conciliação {report.dryRun && <span className="text-tertiary">(simulação)</span>}
        </h2>
        <button type="button" onClick={onClose} className={buttonClass}>
          Fechar
        </button>
      </div>
      <p className="mt-2 text-sm text-secondary">
        {report.checked} anúncio(s) conferido(s) · {report.divergences.length}{" "}
        divergência(s) · {report.corrected} corrigida(s) · {report.failed} com falha
      </p>

      {report.divergences.length === 0 ? (
        <p className="mt-4 text-body-small text-tertiary">
          Nenhuma divergência: a Shopee tem exatamente o que o sistema calculou.
        </p>
      ) : (
        <TableScroller className="mt-4">
          <table className="w-full min-w-[560px] text-left text-[13.5px]">
            <thead className="text-[11.5px] uppercase tracking-[0.1em] text-tertiary">
              <tr>
                <th className="pb-2 pr-3 font-semibold">Anúncio</th>
                <th className="pb-2 pr-3 font-semibold">Central</th>
                <th className="pb-2 pr-3 font-semibold">Shopee</th>
                <th className="pb-2 font-semibold">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {report.divergences.map((row) => (
                <tr key={`${row.itemId}-${row.modelId}`} className="border-t border-border-subtle">
                  <td className="py-2 pr-3 tabular-nums">
                    {row.itemId}/{row.modelId}
                  </td>
                  <td className="py-2 pr-3 tabular-nums font-semibold">{row.expected}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.remote ?? "—"}</td>
                  <td className="py-2 text-[13px]">
                    {row.error ? (
                      <span className="text-error">{row.error}</span>
                    ) : row.corrected ? (
                      "corrigido com o saldo central"
                    ) : (
                      "não corrigido (simulação)"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroller>
      )}
      <p className="mt-3 text-[12px] text-tertiary">
        Correlation ID: <code>{report.correlationId}</code>
      </p>
    </section>
  );
}

// ── Produtos e associações ─────────────────────────────────────────────────

function ProductsPanel({
  connection,
  links,
  listings,
  suggestions,
  busy,
  run,
  productName,
  onLoadListings,
  onReload,
}: {
  connection: ShopeeConnection;
  links: ShopeeLink[];
  listings: ShopeeListing[];
  suggestions: ShopeeSuggestion[];
  busy: string | null;
  run: Run;
  productName: (productId: string, variantId: string) => string;
  onLoadListings: () => Promise<void>;
  onReload: () => Promise<void>;
}) {
  const [removing, setRemoving] = useState<string | null>(null);

  if (!connection.connected) {
    return (
      <section className={sectionClass}>
        <p className="text-body-small text-tertiary">
          Conecte a loja para associar produtos.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className={sectionClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Associações</h2>
            <p className="mt-2 max-w-[600px] text-sm text-secondary">
              Cada anúncio da Shopee aponta para um produto — ou para uma
              variação. A ligação é por <code>item_id</code>/<code>model_id</code>,
              nunca por nome.
            </p>
          </div>
          <button
            type="button"
            disabled={busy === "listings"}
            onClick={() => void run("listings", onLoadListings)}
            className={buttonClass}
          >
            {busy === "listings" ? "Buscando…" : "Buscar anúncios da Shopee"}
          </button>
        </div>

        {links.length === 0 ? (
          <p className="mt-5 text-body-small text-tertiary">
            Nenhuma associação ainda. Busque os anúncios e confirme as sugestões
            abaixo.
          </p>
        ) : (
          <TableScroller className="mt-5">
            <table className="w-full min-w-[840px] text-left text-[13.5px]">
              <thead className="text-[11.5px] uppercase tracking-[0.1em] text-tertiary">
                <tr>
                  <th className="pb-2 pr-3 font-semibold">Peça</th>
                  <th className="pb-2 pr-3 font-semibold">Anúncio</th>
                  <th className="pb-2 pr-3 font-semibold">Estado</th>
                  <th className="pb-2 pr-3 font-semibold">Margem</th>
                  <th className="pb-2 pr-3 font-semibold">Enviado</th>
                  <th className="pb-2 pr-3 font-semibold">Na Shopee</th>
                  <th className="pb-2 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id} className="border-t border-border-subtle align-top">
                    <td className="py-2.5 pr-3">
                      {productName(link.productId, link.variantId)}
                      {link.lastError && (
                        <div className="mt-1 text-[12px] text-error">
                          {link.lastError} ({link.failureCount} tentativa
                          {link.failureCount === 1 ? "" : "s"})
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {link.itemId}/{link.modelId}
                      {link.shopeeSku && (
                        <div className="text-[12px] text-tertiary">{link.shopeeSku}</div>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Tag
                        tone={
                          link.status === "active"
                            ? "on"
                            : link.status === "error"
                              ? "warn"
                              : "off"
                        }
                      >
                        {link.status === "active"
                          ? "Ativa"
                          : link.status === "pending"
                            ? "Pendente"
                            : link.status === "error"
                              ? "Erro"
                              : "Desligada"}
                      </Tag>
                    </td>
                    <td className="py-2.5 pr-3">
                      <input
                        type="number"
                        min={0}
                        defaultValue={link.safetyMargin}
                        onBlur={(event) => {
                          const value = Number(event.target.value);
                          if (!Number.isFinite(value) || value === link.safetyMargin) return;
                          void run(
                            `margin-${link.id}`,
                            () =>
                              saveShopeeLink({
                                productId: link.productId,
                                variantId: link.variantId,
                                itemId: link.itemId,
                                modelId: link.modelId,
                                safetyMargin: Math.max(0, value),
                              }),
                            "Margem de segurança atualizada"
                          ).then(onReload);
                        }}
                        className="min-h-[38px] w-[84px] rounded-md border border-strong bg-surface px-2 text-[16px] tabular-nums outline-none focus:border-accent"
                      />
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {link.lastPushedStock ?? "—"}
                      <div className="text-[12px] text-tertiary">
                        {formatDate(link.lastSyncedAt)}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {link.lastRemoteStock ?? "—"}
                      {link.lastRemoteStock != null &&
                        link.lastPushedStock != null &&
                        link.lastRemoteStock !== link.lastPushedStock && (
                          <div className="text-[12px] text-error">divergente</div>
                        )}
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          disabled={busy === `sync-${link.id}`}
                          onClick={() =>
                            void run(
                              `sync-${link.id}`,
                              () => syncShopeeSku(link.productId, link.variantId)
                            ).then((result) => {
                              if (result) {
                                useUIStore
                                  .getState()
                                  .pushToast(
                                    result.ok
                                      ? `Enviado: ${result.pushedStock ?? "—"} un. (${result.reason})`
                                      : result.reason,
                                    result.ok ? "success" : "error"
                                  );
                              }
                              void onReload();
                            })
                          }
                          className="min-h-[34px] rounded-md border border-border-strong px-2.5 text-[12.5px] font-semibold transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                        >
                          {busy === `sync-${link.id}` ? "…" : "Sincronizar"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void run(
                              `toggle-${link.id}`,
                              () =>
                                saveShopeeLink({
                                  productId: link.productId,
                                  variantId: link.variantId,
                                  itemId: link.itemId,
                                  modelId: link.modelId,
                                  status: link.status === "disabled" ? "active" : "disabled",
                                }),
                              link.status === "disabled"
                                ? "Associação reativada"
                                : "Associação desligada"
                            ).then(onReload)
                          }
                          className="min-h-[34px] rounded-md border border-border-strong px-2.5 text-[12.5px] transition-colors hover:border-accent"
                        >
                          {link.status === "disabled" ? "Ativar" : "Desligar"}
                        </button>
                        {removing === link.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                void run(
                                  `remove-${link.id}`,
                                  () => deleteShopeeLink(link.id),
                                  "Associação removida"
                                ).then(() => {
                                  setRemoving(null);
                                  void onReload();
                                })
                              }
                              className="min-h-[34px] rounded-md border border-error px-2.5 text-[12.5px] font-semibold text-error transition-colors hover:bg-error hover:text-background"
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => setRemoving(null)}
                              className="min-h-[34px] rounded-md border border-border-strong px-2.5 text-[12.5px]"
                            >
                              Não
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setRemoving(link.id)}
                            className="min-h-[34px] rounded-md border border-border-strong px-2.5 text-[12.5px] transition-colors hover:border-error hover:text-error"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroller>
        )}
      </section>

      {suggestions.length > 0 && (
        <section className={sectionClass}>
          <h2 className="font-display text-2xl">Sugestões por SKU</h2>
          <p className="mt-2 max-w-[620px] text-sm text-secondary">
            Nada é aplicado sozinho. O que casa com exatamente uma peça pode ser
            confirmado direto; o ambíguo precisa da sua escolha, porque associar
            errado anuncia o estoque de outra peça.
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            {suggestions.map((suggestion) => (
              <div
                key={`${suggestion.listing.itemId}-${suggestion.listing.modelId}-${suggestion.productId}-${suggestion.variantId}`}
                className="flex flex-wrap items-center gap-3 border border-border-subtle bg-surface-muted px-3.5 py-3"
              >
                <div className="min-w-0 flex-1 basis-[280px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-[14px]">{suggestion.productName}</strong>
                    <Tag tone={suggestion.confidence === "sku-exato" ? "on" : "warn"}>
                      {suggestion.confidence === "sku-exato" ? "SKU exato" : "Ambíguo"}
                    </Tag>
                  </div>
                  <div className="mt-1 text-[13px] text-tertiary">
                    {suggestion.listing.name} · {suggestion.listing.itemId}/
                    {suggestion.listing.modelId} · {suggestion.reason}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void run(
                      `link-${suggestion.listing.itemId}-${suggestion.productId}`,
                      () =>
                        saveShopeeLink({
                          productId: suggestion.productId,
                          variantId: suggestion.variantId,
                          itemId: suggestion.listing.itemId,
                          modelId: suggestion.listing.modelId,
                          shopeeSku: suggestion.listing.sku,
                          status: "active",
                        }),
                      "Associação confirmada"
                    ).then(onReload)
                  }
                  className={buttonClass}
                >
                  Confirmar associação
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {listings.length > 0 && (
        <section className={sectionClass}>
          <h2 className="font-display text-2xl">Anúncios sem associação</h2>
          <UnlinkedListings listings={listings} links={links} />
        </section>
      )}
    </>
  );
}

function UnlinkedListings({
  listings,
  links,
}: {
  listings: ShopeeListing[];
  links: ShopeeLink[];
}) {
  const linked = new Set(links.map((link) => `${link.itemId}:${link.modelId}`));
  const rows = listings.filter(
    (listing) => !linked.has(`${listing.itemId}:${listing.modelId}`)
  );

  if (rows.length === 0) {
    return (
      <p className="mt-4 text-body-small text-tertiary">
        Todos os anúncios da loja estão associados.
      </p>
    );
  }

  return (
    <>
      <TableScroller className="mt-4">
        <table className="w-full min-w-[520px] text-left text-[13.5px]">
          <thead className="text-[11.5px] uppercase tracking-[0.1em] text-tertiary">
            <tr>
              <th className="pb-2 pr-3 font-semibold">Anúncio</th>
              <th className="pb-2 pr-3 font-semibold">Nome na Shopee</th>
              <th className="pb-2 pr-3 font-semibold">SKU</th>
              <th className="pb-2 font-semibold">Estoque lá</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((listing) => (
              <tr
                key={`${listing.itemId}-${listing.modelId}`}
                className="border-t border-border-subtle"
              >
                <td className="py-2 pr-3 tabular-nums">
                  {listing.itemId}/{listing.modelId}
                </td>
                <td className="py-2 pr-3">{listing.name}</td>
                <td className="py-2 pr-3">{listing.sku || "—"}</td>
                <td className="py-2 tabular-nums">{listing.stock ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroller>
      {/* A explicação fica FORA do scroller: dentro dele o parágrafo
          esticava até os 520px da tabela e o esmaecido de borda comia
          as pontas dele. */}
      <p className="mt-3 text-[13px] text-tertiary">
        Anúncio sem associação não recebe saldo, e um pedido dele entra no painel
        marcado — sem mexer em estoque nenhum.
      </p>
    </>
  );
}

// ── Pedidos importados ─────────────────────────────────────────────────────

function OrdersPanel({
  orders,
  events,
  busy,
  run,
  onReload,
}: {
  orders: Order[];
  events: ShopeeEventRow[];
  busy: string | null;
  run: Run;
  onReload: () => Promise<void>;
}) {
  return (
    <>
      <section className={sectionClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Pedidos importados</h2>
          <button
            type="button"
            disabled={busy === "drain"}
            onClick={() =>
              void run("drain", drainShopeeQueue, "Fila processada").then(onReload)
            }
            className={buttonClass}
          >
            {busy === "drain" ? "Processando…" : "Processar fila agora"}
          </button>
        </div>

        {orders.length === 0 ? (
          <p className="mt-5 text-body-small text-tertiary">
            Nenhum pedido da Shopee importado ainda.
          </p>
        ) : (
          <TableScroller className="mt-5">
            <table className="w-full min-w-[640px] text-left text-[13.5px]">
              <thead className="text-[11.5px] uppercase tracking-[0.1em] text-tertiary">
                <tr>
                  <th className="pb-2 pr-3 font-semibold">Código</th>
                  <th className="pb-2 pr-3 font-semibold">order_sn</th>
                  <th className="pb-2 pr-3 font-semibold">Status</th>
                  <th className="pb-2 pr-3 font-semibold">Itens</th>
                  <th className="pb-2 font-semibold">Criado</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-border-subtle">
                    <td className="py-2 pr-3 font-semibold">{order.code}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {order.externalRef?.orderSn ?? "—"}
                    </td>
                    <td className="py-2 pr-3">
                      {order.status}
                      {order.externalRef?.remoteStatus && (
                        <div className="text-[12px] text-tertiary">
                          {order.externalRef.remoteStatus}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{order.items.length}</td>
                    <td className="py-2">{formatDate(String(order.createdAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroller>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className="font-display text-2xl">Eventos recebidos</h2>
        <p className="mt-2 text-sm text-secondary">
          Inclui o que foi ignorado. Sem este registro, &ldquo;por que este pedido
          não entrou?&rdquo; não teria resposta.
        </p>

        {events.length === 0 ? (
          <p className="mt-5 text-body-small text-tertiary">Nenhum evento ainda.</p>
        ) : (
          <TableScroller className="mt-5">
            <table className="w-full min-w-[680px] text-left text-[13.5px]">
              <thead className="text-[11.5px] uppercase tracking-[0.1em] text-tertiary">
                <tr>
                  <th className="pb-2 pr-3 font-semibold">order_sn</th>
                  <th className="pb-2 pr-3 font-semibold">Evento</th>
                  <th className="pb-2 pr-3 font-semibold">Estado</th>
                  <th className="pb-2 pr-3 font-semibold">Desfecho</th>
                  <th className="pb-2 font-semibold">Quando</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-border-subtle align-top">
                    <td className="py-2 pr-3 tabular-nums">{event.orderSn || "—"}</td>
                    <td className="py-2 pr-3">{event.eventType}</td>
                    <td className="py-2 pr-3">
                      <Tag
                        tone={
                          event.status === "processed"
                            ? "on"
                            : event.status === "failed"
                              ? "warn"
                              : "off"
                        }
                      >
                        {event.status}
                      </Tag>
                    </td>
                    <td className="py-2 pr-3 text-[13px] text-secondary">
                      {event.outcome ?? "—"}
                    </td>
                    <td className="py-2">{formatDate(event.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroller>
        )}
      </section>
    </>
  );
}

// ── Fila e erros ───────────────────────────────────────────────────────────

function QueuePanel({
  queue,
  stats,
  metrics,
  busy,
  run,
  onReload,
}: {
  queue: ShopeeQueueMessage[];
  stats: ShopeeQueueStats | null;
  metrics: ShopeeMetrics | null;
  busy: string | null;
  run: Run;
  onReload: () => Promise<void>;
}) {
  const dead = queue.filter((message) => message.status === "dead");

  return (
    <>
      {metrics && (
        <section className={sectionClass}>
          <h2 className="font-display text-2xl">Observabilidade</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Sincronizações", metrics.worker.processed],
              ["Sucessos", metrics.worker.succeeded],
              ["Falhas", metrics.worker.failed],
              ["Mortas", metrics.worker.dead],
              ["Limite de taxa", metrics.worker.rateLimited],
              ["Pedidos importados", metrics.worker.ordersImported],
              ["Duplicados ignorados", metrics.worker.duplicatesIgnored],
              ["Duração do ciclo", `${metrics.worker.lastRunDurationMs ?? 0} ms`],
            ].map(([label, value]) => (
              <div key={String(label)} className="border border-border-subtle px-3.5 py-3">
                <div className="text-[11.5px] uppercase tracking-[0.1em] text-tertiary">
                  {label}
                </div>
                <div className="mt-1 font-display text-2xl tabular-nums">{value}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-tertiary">
            Última sincronização saudável: {formatDate(metrics.lastHealthySyncAt)} · fila:{" "}
            {stats?.pending ?? 0} pendente(s), {stats?.processing ?? 0} em curso,{" "}
            {stats?.done ?? 0} entregue(s), {stats?.dead ?? 0} morta(s)
            {metrics.reconciliationRunning && " · conciliação em andamento"}
          </p>
        </section>
      )}

      <section className={sectionClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Fila</h2>
            <p className="mt-2 max-w-[620px] text-sm text-secondary">
              Mensagem que esgota as tentativas não some: fica aqui, com o erro,
              esperando reprocessamento. Uma falha da Shopee nunca desfaz uma
              venda já confirmada.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {dead.length > 0 && (
              <button
                type="button"
                disabled={busy === "retry-all"}
                onClick={() =>
                  void run(
                    "retry-all",
                    () => retryShopeeMessage({}),
                    "Mensagens devolvidas à fila"
                  ).then(onReload)
                }
                className={buttonClass}
              >
                {busy === "retry-all"
                  ? "Reprocessando…"
                  : `Reprocessar ${dead.length} morta(s)`}
              </button>
            )}
            <button
              type="button"
              disabled={busy === "drain-queue"}
              onClick={() =>
                void run("drain-queue", drainShopeeQueue, "Fila processada").then(onReload)
              }
              className={buttonClass}
            >
              {busy === "drain-queue" ? "Processando…" : "Processar agora"}
            </button>
          </div>
        </div>

        {queue.length === 0 ? (
          <p className="mt-5 text-body-small text-tertiary">Fila vazia.</p>
        ) : (
          <TableScroller className="mt-5">
            <table className="w-full min-w-[780px] text-left text-[13.5px]">
              <thead className="text-[11.5px] uppercase tracking-[0.1em] text-tertiary">
                <tr>
                  <th className="pb-2 pr-3 font-semibold">Tópico</th>
                  <th className="pb-2 pr-3 font-semibold">Estado</th>
                  <th className="pb-2 pr-3 font-semibold">Tentativas</th>
                  <th className="pb-2 pr-3 font-semibold">Último erro</th>
                  <th className="pb-2 font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((message) => (
                  <tr key={message.id} className="border-t border-border-subtle align-top">
                    <td className="py-2.5 pr-3">
                      {message.topic}
                      <div className="text-[12px] text-tertiary">{message.dedupeKey}</div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Tag
                        tone={
                          message.status === "done"
                            ? "on"
                            : message.status === "dead"
                              ? "warn"
                              : "off"
                        }
                      >
                        {message.status}
                      </Tag>
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {message.attempts}/{message.maxAttempts}
                    </td>
                    <td className="py-2.5 pr-3 text-[13px] text-error">
                      {message.lastError ?? "—"}
                    </td>
                    <td className="py-2.5">
                      {message.status !== "done" && (
                        <button
                          type="button"
                          disabled={busy === `retry-${message.id}`}
                          onClick={() =>
                            void run(
                              `retry-${message.id}`,
                              () => retryShopeeMessage({ id: message.id }),
                              "Mensagem devolvida à fila"
                            ).then(onReload)
                          }
                          className="min-h-[34px] rounded-md border border-border-strong px-2.5 text-[12.5px] font-semibold transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                        >
                          Reprocessar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroller>
        )}
      </section>
    </>
  );
}
