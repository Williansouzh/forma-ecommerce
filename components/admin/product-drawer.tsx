"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";
import { CATEGORIES } from "@/data/categories";
import {
  createProduct,
  updateProduct,
  type ProductInput,
} from "@/lib/admin-api";
import {
  centsToInput,
  parsePriceToCents,
  summarize,
  validateProductInput,
} from "@/lib/product-input";
import {
  ImageUploadButton,
  StorageNotice,
  useMediaStatus,
} from "@/components/admin/image-upload";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import type { Product, ProductVariant } from "@/types/product";
import { fieldClass, labelClass } from "@/components/admin/field";

const MAX_IMAGES = 6;

interface ImageRow {
  url: string;
  alt: string;
}

interface DraftState {
  name: string;
  price: string;
  originalPrice: string;
  stock: string;
  category: string;
  productionTime: string;
  material: string;
  description: string;
  images: ImageRow[];
  variants: ProductVariant[];
  isFeatured: boolean;
  isCustom: boolean;
  isAvailable: boolean;
}

function toDraft(product?: Product): DraftState {
  return {
    name: product?.name ?? "",
    price: centsToInput(product?.price),
    originalPrice: centsToInput(product?.originalPrice),
    stock: product?.stock != null ? String(product.stock) : "",
    category: product?.category ?? CATEGORIES[0].slug,
    productionTime:
      product?.productionTime != null ? String(product.productionTime) : "",
    material: product?.material ?? "",
    description: product?.description ?? "",
    images: product?.images.map((image) => ({
      url: image.url,
      alt: image.alt,
    })) ?? [],
    variants: product?.variants ?? [],
    isFeatured: product?.isFeatured ?? false,
    isCustom: product?.isCustom ?? false,
    isAvailable: product?.isAvailable ?? true,
  };
}


interface ProductDrawerProps {
  /** `null` fecha; `undefined` como produto abre em modo "Nova peça". */
  open: boolean;
  product?: Product;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

export function ProductDrawer({
  open,
  product,
  onClose,
  onSaved,
}: ProductDrawerProps) {
  const pushToast = useUIStore((state) => state.pushToast);
  const [draft, setDraft] = useState<DraftState>(() => toDraft(product));
  const [error, setError] = useState<string | null>(null);
  const media = useMediaStatus();
  const [saving, setSaving] = useState(false);
  const [addingColor, setAddingColor] = useState(false);
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#5C6A49");

  const isNew = !product;

  // Cada abertura recomeça do produto atual — o drawer não guarda rascunho.
  useEffect(() => {
    if (!open) return;
    setDraft(toDraft(product));
    setError(null);
    setAddingColor(false);
    setColorName("");
  }, [open, product]);

  useEffect(() => {
    if (!open) return;
    // Mesmo padrão da gaveta do menu e do overlay de busca: com o drawer
    // aberto, a listagem de trás não rola junto.
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const set = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const addColor = () => {
    const name = colorName.trim();
    if (!name) return;
    set("variants", [
      ...draft.variants,
      {
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `var-${Date.now()}`,
        name,
        colorHex,
        priceAdjustment: 0,
        stock: 0,
      },
    ]);
    setColorName("");
    setAddingColor(false);
  };

  const save = async () => {
    setError(null);
    const description = draft.description.trim();
    const images = draft.images.filter((image) => image.url.trim());

    const payload: ProductInput = {
      name: draft.name.trim(),
      description,
      shortDescription: summarize(description),
      price: parsePriceToCents(draft.price),
      category: draft.category,
      images,
      variants: draft.variants,
      isAvailable: draft.isAvailable,
      isFeatured: draft.isFeatured,
      isCustom: draft.isCustom,
      ...(draft.originalPrice.trim()
        ? { originalPrice: parsePriceToCents(draft.originalPrice) }
        : {}),
      ...(draft.stock.trim() ? { stock: Number(draft.stock) } : {}),
      ...(draft.productionTime.trim()
        ? { productionTime: Number(draft.productionTime) }
        : {}),
      ...(draft.material.trim() ? { material: draft.material.trim() } : {}),
    };

    const invalid = validateProductInput(payload);
    if (invalid) {
      setError(invalid);
      return;
    }

    setSaving(true);
    try {
      if (product) {
        await updateProduct(product.id, payload);
      } else {
        await createProduct(payload);
      }
      await onSaved();
      pushToast(
        isNew ? "Peça cadastrada" : `${payload.name}: alterações salvas`
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const cover = draft.images[0]?.url;

  const flags: { key: keyof DraftState; name: string }[] = [
    { key: "isFeatured", name: "Destaque na home" },
    { key: "isCustom", name: "Aceita personalização" },
    { key: "isAvailable", name: "Publicado" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(27,26,21,0.45)]"
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={isNew ? "Cadastrar produto" : `Editar ${product?.name}`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.38, ease: [0.25, 0.1, 0.25, 1] }}
            /* `h-dvh` e não `h-full`: com a barra de endereço do celular na
               tela, `100%` do contêiner fixo passava do que dá para ver e o
               rodapé com "Salvar peça" ficava embaixo dela. O drawer do
               carrinho da loja já usava `dvh`; só este tinha ficado para trás. */
            className="relative flex h-dvh w-[min(100%,680px)] flex-col border-l border-border-strong bg-background"
          >
            <header className="flex items-center justify-between gap-3 border-b border-border-strong px-[22px] py-[18px]">
              <div className="min-w-0">
                <div className="text-caption uppercase text-tertiary">
                  {isNew ? "Nova peça" : "Editando peça"}
                </div>
                <div className="truncate font-display text-[23px]">
                  {isNew ? "Cadastrar produto" : product?.name}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="flex size-[42px] shrink-0 items-center justify-center text-secondary transition-colors hover:text-primary"
              >
                <X size={20} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-[22px]">
              <div className="flex gap-3">
                <div className="relative h-[100px] w-20 shrink-0 overflow-hidden bg-surface-muted sm:h-[120px] sm:w-24">
                  {cover && (
                    <Image
                      src={cover}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      set("images", [...draft.images, { url: "", alt: "" }])
                    }
                    disabled={draft.images.length >= MAX_IMAGES}
                    className="min-h-[42px] rounded-md border border-dashed border-primary/30 text-[13px] transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
                  >
                    Adicionar foto
                  </button>
                  <p className="text-[12.5px] text-tertiary">
                    Até {MAX_IMAGES} fotos. A primeira é a capa na loja. Envie
                    um arquivo em cada linha ou cole o caminho.
                  </p>
                  <StorageNotice media={media} />
                </div>
              </div>

              {/*
                No celular cada foto é um bloco em coluna; a partir de `sm` a
                linha horizontal volta inteira.

                Os quatro controles numa linha só não cabiam: enviar (98px) e
                lixeira (42px) não encolhem, então os dois campos dividiam os
                142px restantes de uma gaveta de 306px — 47px de área de texto
                cada, ou cerca de cinco caracteres. Conferir ou colar um
                caminho de imagem pelo celular era impossível, que é
                justamente a tarefa desta tela.

                A página cheia (`product-form.tsx`) já resolvia assim; era só
                a gaveta que tinha ficado para trás.
              */}
              {draft.images.length > 0 && (
                <div className="mt-3 space-y-3 sm:space-y-2">
                  {draft.images.map((image, index) => (
                    <div
                      key={index}
                      className="rounded-md border border-border-subtle p-2.5 sm:border-0 sm:p-0"
                    >
                      <div className="label mb-2 text-tertiary sm:hidden">
                        Foto {index + 1}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        {/* `sm:contents` dissolve este agrupamento na largura
                            maior: o enviar e a lixeira viram itens diretos da
                            linha, e a lixeira vai para o fim por `order-last`. */}
                        <div className="flex gap-2 sm:contents">
                          <ImageUploadButton
                            media={media}
                            size="compact"
                            disabled={saving}
                            label={`Enviar arquivo para a foto ${index + 1}`}
                            className="flex-1 justify-center sm:flex-none sm:justify-start"
                            onError={setError}
                            onUploaded={(url) => {
                              setError(null);
                              set(
                                "images",
                                draft.images.map((row, i) =>
                                  i === index ? { ...row, url } : row
                                )
                              );
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              set(
                                "images",
                                draft.images.filter((_, i) => i !== index)
                              )
                            }
                            aria-label={`Remover foto ${index + 1}`}
                            className="flex size-[42px] shrink-0 items-center justify-center rounded-md border border-strong text-secondary transition-colors hover:border-error hover:text-error sm:order-last"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <input
                          aria-label={`URL da foto ${index + 1}`}
                          placeholder="/images/products/…"
                          value={image.url}
                          onChange={(event) =>
                            set(
                              "images",
                              draft.images.map((row, i) =>
                                i === index
                                  ? { ...row, url: event.target.value }
                                  : row
                              )
                            )
                          }
                          className={cn(fieldClass, "mt-0 min-w-0 sm:flex-1")}
                        />
                        <input
                          aria-label={`Descrição da foto ${index + 1}`}
                          placeholder="Texto alternativo"
                          value={image.alt}
                          onChange={(event) =>
                            set(
                              "images",
                              draft.images.map((row, i) =>
                                i === index
                                  ? { ...row, alt: event.target.value }
                                  : row
                              )
                            )
                          }
                          className={cn(fieldClass, "mt-0 min-w-0 sm:flex-1")}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <label className={cn(labelClass, "mt-5")}>
                Nome
                <input
                  value={draft.name}
                  onChange={(event) => set("name", event.target.value)}
                  className={fieldClass}
                />
              </label>

              <div className="mt-4 flex flex-wrap gap-3">
                <label className={cn(labelClass, "flex-1 basis-[130px]")}>
                  Preço (R$)
                  <input
                    inputMode="decimal"
                    placeholder="0,00"
                    value={draft.price}
                    onChange={(event) => set("price", event.target.value)}
                    className={cn(fieldClass, "tabular-nums")}
                  />
                </label>
                <label className={cn(labelClass, "flex-1 basis-[130px]")}>
                  Promocional
                  <input
                    inputMode="decimal"
                    placeholder="—"
                    value={draft.originalPrice}
                    onChange={(event) =>
                      set("originalPrice", event.target.value)
                    }
                    className={cn(fieldClass, "tabular-nums")}
                  />
                </label>
                <label className={cn(labelClass, "flex-1 basis-[110px]")}>
                  Estoque
                  <input
                    type="number"
                    min={0}
                    value={draft.stock}
                    onChange={(event) => set("stock", event.target.value)}
                    className={cn(fieldClass, "tabular-nums")}
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <label className={cn(labelClass, "flex-1 basis-[170px]")}>
                  Categoria
                  <select
                    value={draft.category}
                    onChange={(event) => set("category", event.target.value)}
                    className={fieldClass}
                  >
                    {CATEGORIES.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={cn(labelClass, "flex-1 basis-[130px]")}>
                  Prazo (dias)
                  <input
                    type="number"
                    min={0}
                    value={draft.productionTime}
                    onChange={(event) =>
                      set("productionTime", event.target.value)
                    }
                    className={cn(fieldClass, "tabular-nums")}
                  />
                </label>
                <label className={cn(labelClass, "flex-1 basis-[130px]")}>
                  Material
                  <input
                    placeholder="PLA+ fosco"
                    value={draft.material}
                    onChange={(event) => set("material", event.target.value)}
                    className={fieldClass}
                  />
                </label>
              </div>

              <label className={cn(labelClass, "mt-4")}>
                Descrição
                <textarea
                  rows={4}
                  value={draft.description}
                  onChange={(event) => set("description", event.target.value)}
                  className={cn(fieldClass, "min-h-[90px] resize-y py-2.5")}
                />
              </label>

              <div className="mt-[18px]">
                <div className={labelClass}>Cores de filamento</div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {draft.variants.map((variant) => (
                    <span
                      key={variant.id}
                      className="inline-flex min-h-[38px] items-center gap-2 rounded-md border border-strong bg-surface px-3 text-[13px]"
                    >
                      <span
                        aria-hidden
                        style={{ background: variant.colorHex }}
                        className="size-3.5 rounded-full border border-border-strong"
                      />
                      {variant.name}
                      <button
                        type="button"
                        onClick={() =>
                          set(
                            "variants",
                            draft.variants.filter(
                              (item) => item.id !== variant.id
                            )
                          )
                        }
                        aria-label={`Remover ${variant.name}`}
                        className="text-tertiary transition-colors hover:text-error"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}

                  {addingColor ? (
                    <span className="inline-flex min-h-[38px] items-center gap-2 rounded-md border border-accent bg-surface px-2">
                      <input
                        type="color"
                        aria-label="Cor do filamento"
                        value={colorHex}
                        onChange={(event) => setColorHex(event.target.value)}
                        className="size-6 cursor-pointer border-0 bg-transparent p-0"
                      />
                      <input
                        autoFocus
                        aria-label="Nome da cor"
                        placeholder="Verde Musgo"
                        value={colorName}
                        onChange={(event) => setColorName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addColor();
                          }
                        }}
                        className="w-32 border-0 bg-transparent p-0 text-[13px] outline-none"
                      />
                      <button
                        type="button"
                        onClick={addColor}
                        className="text-accent transition-colors hover:text-primary"
                        aria-label="Confirmar cor"
                      >
                        <Plus size={15} />
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingColor(true)}
                      className="min-h-[38px] rounded-md border border-dashed border-primary/30 px-3 text-[13px] transition-colors hover:border-accent hover:text-accent"
                    >
                      + cor
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2.5">
                {flags.map((flag) => {
                  const on = draft[flag.key] as boolean;
                  return (
                    <button
                      key={flag.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set(flag.key, !on as never)}
                      className={cn(
                        "flex min-h-[42px] items-center gap-2.5 rounded-md border px-3.5 text-[13.5px] transition-colors hover:border-accent",
                        on
                          ? "border-primary bg-surface-muted"
                          : "border-border-strong bg-transparent"
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "size-2 rounded-full",
                          on ? "bg-accent" : "bg-primary/20"
                        )}
                      />
                      {flag.name}
                    </button>
                  );
                })}
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-5 rounded-md bg-error/10 px-4 py-3 text-body-small text-error"
                >
                  {error}
                </p>
              )}
            </div>

            {/* O recuo inferior acompanha a barra de gestos do iPhone: sem
                ele, "Salvar peça" ficava metade embaixo dela. */}
            <footer className="flex shrink-0 gap-2.5 border-t border-border-strong bg-surface px-[22px] pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="min-h-[50px] flex-1 rounded-md bg-primary font-semibold text-background transition-colors duration-300 hover:bg-accent disabled:opacity-60"
              >
                {saving ? "Salvando…" : "Salvar peça"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[50px] shrink-0 rounded-md border border-border-strong px-[18px] font-medium transition-colors hover:border-primary"
              >
                Cancelar
              </button>
            </footer>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
