"use client";

import { useState } from "react";
import Image from "next/image";
import { useAdminData } from "@/components/admin/admin-data";
import { ProductDrawer } from "@/components/admin/product-drawer";
import { CATEGORIES } from "@/data/categories";
import { updateProduct } from "@/lib/admin-api";
import { centsToInput, parsePriceToCents } from "@/lib/product-input";
import { cn, normalizeText } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import type { Product } from "@/types/product";

const ALL = "todas";

const chipClass = (active: boolean) =>
  cn(
    "min-h-[38px] rounded-md border px-3.5 text-[13.5px] transition-colors hover:border-accent",
    active
      ? "border-primary bg-primary text-background"
      : "border-border-strong bg-transparent text-primary"
  );

const cellInputClass =
  "min-h-[38px] w-full rounded-md border border-strong bg-surface px-2.5 text-body-small tabular-nums outline-none transition-colors focus:border-accent";

export default function AdminProductsPage() {
  const { products, loading, error, refresh, patchProduct } = useAdminData();
  const pushToast = useUIStore((state) => state.pushToast);
  const [category, setCategory] = useState(ALL);
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>(undefined);
  const [busy, setBusy] = useState<string | null>(null);

  const term = normalizeText(query.trim());
  const rows = products.filter(
    (product) =>
      (category === ALL || product.category === category) &&
      (!term || normalizeText(product.name).includes(term))
  );
  const published = products.filter((product) => product.isAvailable).length;

  /** Salva um campo solto da linha e reverte no cache se a API recusar. */
  const commit = async (
    product: Product,
    fields: Partial<Product>,
    message: string
  ) => {
    setBusy(product.id);
    patchProduct(product.id, fields);
    try {
      await updateProduct(product.id, fields);
      pushToast(message);
    } catch (err) {
      patchProduct(product.id, product);
      pushToast(
        err instanceof Error ? err.message : "Falha ao salvar",
        "error"
      );
    } finally {
      setBusy(null);
    }
  };

  const openNew = () => {
    setEditing(undefined);
    setDrawerOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setDrawerOpen(true);
  };

  return (
    <div className="animate-fade-up">
      <header className="flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="font-display text-heading-1 font-light tracking-[-0.02em]">
            Produtos
          </h1>
          <p className="mt-1.5 text-tertiary">
            {products.length} peças · {published} publicadas
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="min-h-[46px] rounded-md bg-primary px-5 font-semibold text-background transition-colors duration-300 hover:bg-accent"
        >
          + Novo produto
        </button>
      </header>

      <div className="my-[22px] flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCategory(ALL)}
          className={chipClass(category === ALL)}
        >
          Todas
        </button>
        {CATEGORIES.map((item) => (
          <button
            key={item.slug}
            type="button"
            onClick={() => setCategory(item.slug)}
            className={chipClass(category === item.slug)}
          >
            {item.name}
          </button>
        ))}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar produto…"
          aria-label="Buscar produto"
          className="ml-auto min-h-[38px] max-w-[240px] rounded-md border border-strong bg-surface px-3 text-body-small outline-none transition-colors focus:border-accent"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md bg-error/10 px-4 py-3 text-body-small text-error"
        >
          {error}
        </p>
      )}

      {/*
        Duas telas para o mesmo dado, não uma tabela com rolagem forçada. No
        celular, a listagem principal do painel precisa caber sem exigir
        arrastar os dedos para o lado só para ver o preço — por isso os
        cartões abaixo (md:hidden) e a tabela (hidden md:block) mostram os
        MESMOS campos e chamam os MESMOS handlers; só o arranjo muda.
      */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {loading ? (
          <p className="px-4 py-16 text-center text-body-small text-tertiary">
            Carregando produtos…
          </p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-16 text-center text-body-small text-tertiary">
            {products.length === 0
              ? "Nenhum produto cadastrado ainda. Toque em “Novo produto”."
              : "Nenhuma peça com esses filtros."}
          </p>
        ) : (
          rows.map((product) => (
            <div
              key={product.id}
              className={cn(
                "border border-border-subtle bg-surface p-3.5 transition-opacity",
                busy === product.id && "opacity-60"
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative size-12 shrink-0 overflow-hidden bg-surface-muted">
                  {product.images[0]?.url && (
                    <Image
                      src={product.images[0].url}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{product.name}</div>
                  <div className="truncate text-[12.5px] text-quaternary">
                    {CATEGORIES.find((item) => item.slug === product.category)
                      ?.name ?? product.category}{" "}
                    · /{product.slug}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(product)}
                  className="shrink-0 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-accent transition-colors hover:text-clay"
                >
                  Editar
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-tertiary">
                  Preço
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[13px] text-quaternary">R$</span>
                    <input
                      key={`price-m-${product.id}-${product.price}`}
                      type="text"
                      inputMode="decimal"
                      aria-label={`Preço de ${product.name}`}
                      defaultValue={centsToInput(product.price)}
                      onBlur={(event) => {
                        const cents = parsePriceToCents(event.target.value);
                        if (cents === product.price) return;
                        void commit(
                          product,
                          { price: cents },
                          `${product.name}: preço atualizado`
                        );
                      }}
                      className={cellInputClass}
                    />
                  </div>
                </label>

                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-tertiary">
                  Estoque
                  <input
                    key={`stock-m-${product.id}-${product.stock ?? ""}`}
                    type="number"
                    min={0}
                    aria-label={`Estoque de ${product.name}`}
                    defaultValue={product.stock ?? ""}
                    onBlur={(event) => {
                      const raw = event.target.value.trim();
                      if (raw === "") {
                        event.target.value = String(product.stock ?? "");
                        return;
                      }
                      const stock = Number(raw);
                      if (stock === product.stock) return;
                      void commit(
                        product,
                        { stock },
                        `${product.name}: estoque atualizado`
                      );
                    }}
                    className={cn(cellInputClass, "mt-1")}
                  />
                </label>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2.5">
                <span className="text-[13px] tabular-nums text-secondary">
                  {product.productionTime != null
                    ? `Pronto em ${product.productionTime} dias`
                    : "Sem prazo definido"}
                </span>
                <button
                  type="button"
                  aria-pressed={product.isAvailable}
                  onClick={() =>
                    void commit(
                      product,
                      { isAvailable: !product.isAvailable },
                      product.isAvailable
                        ? `${product.name} saiu da loja`
                        : `${product.name} publicado`
                    )
                  }
                  className={cn(
                    "inline-flex min-h-[34px] shrink-0 items-center gap-2 rounded-md border px-2.5 text-[12.5px] transition-colors hover:border-accent",
                    product.isAvailable
                      ? "border-primary bg-surface-muted"
                      : "border-border-strong bg-transparent"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-1.5 rounded-full",
                      product.isAvailable ? "bg-accent" : "bg-clay"
                    )}
                  />
                  {product.isAvailable ? "Publicado" : "Oculto"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden border border-border-subtle bg-surface md:block">
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="flex gap-3 border-b border-border-strong px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-tertiary">
              <span className="flex-1">Peça</span>
              <span className="w-[130px] shrink-0">Preço</span>
              <span className="w-24 shrink-0">Estoque</span>
              <span className="w-[100px] shrink-0">Prazo</span>
              <span className="w-[110px] shrink-0">Status</span>
              <span className="w-[66px] shrink-0" />
            </div>

            {loading ? (
              <p className="px-4 py-16 text-center text-body-small text-tertiary">
                Carregando produtos…
              </p>
            ) : rows.length === 0 ? (
              <p className="px-4 py-16 text-center text-body-small text-tertiary">
                {products.length === 0
                  ? "Nenhum produto cadastrado ainda. Clique em “Novo produto”."
                  : "Nenhuma peça com esses filtros."}
              </p>
            ) : (
              rows.map((product) => (
                <div
                  key={product.id}
                  className={cn(
                    "flex items-center gap-3 border-b border-border-subtle px-4 py-3 transition-opacity",
                    busy === product.id && "opacity-60"
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="relative size-11 shrink-0 overflow-hidden bg-surface-muted">
                      {product.images[0]?.url && (
                        <Image
                          src={product.images[0].url}
                          alt=""
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">
                        {product.name}
                      </div>
                      <div className="truncate text-[12.5px] text-quaternary">
                        {CATEGORIES.find(
                          (item) => item.slug === product.category
                        )?.name ?? product.category}{" "}
                        · /{product.slug}
                      </div>
                    </div>
                  </div>

                  <div className="flex w-[130px] shrink-0 items-center gap-1.5">
                    <span className="text-[13px] text-quaternary">R$</span>
                    <input
                      key={`price-${product.id}-${product.price}`}
                      type="text"
                      inputMode="decimal"
                      aria-label={`Preço de ${product.name}`}
                      defaultValue={centsToInput(product.price)}
                      onBlur={(event) => {
                        const cents = parsePriceToCents(event.target.value);
                        if (cents === product.price) return;
                        void commit(
                          product,
                          { price: cents },
                          `${product.name}: preço atualizado`
                        );
                      }}
                      className={cellInputClass}
                    />
                  </div>

                  <div className="w-24 shrink-0">
                    <input
                      key={`stock-${product.id}-${product.stock ?? ""}`}
                      type="number"
                      min={0}
                      aria-label={`Estoque de ${product.name}`}
                      defaultValue={product.stock ?? ""}
                      onBlur={(event) => {
                        const raw = event.target.value.trim();
                        // Limpar o campo não tem como virar "sob demanda" pela
                        // API (o PATCH ignora undefined), então restauramos.
                        if (raw === "") {
                          event.target.value = String(product.stock ?? "");
                          return;
                        }
                        const stock = Number(raw);
                        if (stock === product.stock) return;
                        void commit(
                          product,
                          { stock },
                          `${product.name}: estoque atualizado`
                        );
                      }}
                      className={cellInputClass}
                    />
                  </div>

                  <div className="w-[100px] shrink-0 text-[13.5px] tabular-nums text-secondary">
                    {product.productionTime != null
                      ? `${product.productionTime} dias`
                      : "—"}
                  </div>

                  <div className="w-[110px] shrink-0">
                    <button
                      type="button"
                      aria-pressed={product.isAvailable}
                      onClick={() =>
                        void commit(
                          product,
                          { isAvailable: !product.isAvailable },
                          product.isAvailable
                            ? `${product.name} saiu da loja`
                            : `${product.name} publicado`
                        )
                      }
                      className={cn(
                        "inline-flex min-h-[34px] items-center gap-2 rounded-md border px-2.5 text-[12.5px] transition-colors hover:border-accent",
                        product.isAvailable
                          ? "border-primary bg-surface-muted"
                          : "border-border-strong bg-transparent"
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "size-1.5 rounded-full",
                          product.isAvailable ? "bg-accent" : "bg-clay"
                        )}
                      />
                      {product.isAvailable ? "Publicado" : "Oculto"}
                    </button>
                  </div>

                  <div className="w-[66px] shrink-0 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(product)}
                      className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-accent transition-colors hover:text-clay"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <p className="mt-3.5 text-[13px] text-tertiary">
        Preço e estoque salvam ao sair do campo. Peças despublicadas somem da
        loja, mas continuam no painel.
      </p>

      <ProductDrawer
        open={drawerOpen}
        product={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
}
