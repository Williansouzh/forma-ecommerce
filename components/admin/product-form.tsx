"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { CATEGORIES, canonicalCategory } from "@/data/categories";
import { createProduct, updateProduct, type ProductInput } from "@/lib/admin-api";
import {
  ImageUploadButton,
  StorageNotice,
  megabytes,
  useMediaStatus,
} from "@/components/admin/image-upload";
import {
  centsToInput,
  parsePriceToCents,
  validateProductInput,
} from "@/lib/product-input";
import type { Product } from "@/types/product";

interface ImageRow {
  url: string;
  alt: string;
}


interface ProductFormProps {
  product?: Product;
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const [name, setName] = useState(product?.name ?? "");
  const [shortDescription, setShortDescription] = useState(
    product?.shortDescription ?? ""
  );
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(centsToInput(product?.price));
  const [originalPrice, setOriginalPrice] = useState(
    centsToInput(product?.originalPrice)
  );
  /*
   * Passa pelo mapa de legado: uma peça ainda gravada como `geek` abriria o
   * formulário com "Casa e decoração" pré-selecionada — o primeiro item da
   * lista —, e salvar reclassificaria a peça em silêncio. Aqui ela abre já em
   * "Brinquedos e colecionáveis", que é para onde a migração a leva.
   */
  const [category, setCategory] = useState(
    product?.category ? canonicalCategory(product.category) : CATEGORIES[0].slug
  );
  const [badge, setBadge] = useState(product?.badge ?? "");
  const [tagsInput, setTagsInput] = useState((product?.tags ?? []).join(", "));
  const [images, setImages] = useState<ImageRow[]>(
    product?.images.length
      ? product.images.map((image) => ({ url: image.url, alt: image.alt }))
      : [{ url: "", alt: "" }]
  );
  const media = useMediaStatus();
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [material, setMaterial] = useState(product?.material ?? "");
  const [productionTime, setProductionTime] = useState(
    typeof product?.productionTime === "number" ? String(product.productionTime) : ""
  );
  const [weight, setWeight] = useState(
    typeof product?.weight === "number" ? String(product.weight) : ""
  );
  const [width, setWidth] = useState(
    product?.dimensions ? String(product.dimensions.width) : ""
  );
  const [height, setHeight] = useState(
    product?.dimensions ? String(product.dimensions.height) : ""
  );
  const [depth, setDepth] = useState(
    product?.dimensions ? String(product.dimensions.depth) : ""
  );
  const [isAvailable, setIsAvailable] = useState(product?.isAvailable ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateImage = (index: number, patch: Partial<ImageRow>) => {
    setImages((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const validImages = images.filter((image) => image.url.trim());

    const payload: ProductInput = {
      name: name.trim(),
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      price: parsePriceToCents(price),
      category,
      tags: tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      images: validImages,
      isAvailable,
      isFeatured,
      ...(originalPrice.trim() ? { originalPrice: parsePriceToCents(originalPrice) } : {}),
      ...(badge.trim() ? { badge: badge.trim() } : {}),
      ...(material.trim() ? { material: material.trim() } : {}),
      ...(productionTime.trim() ? { productionTime: Number(productionTime) } : {}),
      ...(weight.trim() ? { weight: Number(weight) } : {}),
      ...(width.trim() && height.trim() && depth.trim()
        ? {
            dimensions: {
              width: Number(width),
              height: Number(height),
              depth: Number(depth),
            },
          }
        : {}),
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
      router.push("/admin/produtos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "mt-1.5 w-full rounded-md border border-strong bg-surface px-3.5 py-2.5 text-body outline-none transition-colors focus:border-accent";

  return (
    <form onSubmit={submit} className="mt-8 space-y-8">
      <section className="rounded-lg border border-border-subtle bg-surface p-6">
        <h2 className="text-caption uppercase text-tertiary">Informações</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="text-caption uppercase text-tertiary">Nome *</label>
            <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="short" className="text-caption uppercase text-tertiary">Descrição curta *</label>
            <input id="short" required value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="desc" className="text-caption uppercase text-tertiary">Descrição completa *</label>
            <textarea id="desc" required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="category" className="text-caption uppercase text-tertiary">Categoria *</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              {CATEGORIES.map((item) => (
                <option key={item.slug} value={item.slug}>{item.name}</option>
              ))}
            </select>
            <p className="mt-1.5 text-[13px] text-tertiary">
              Uma categoria só aparece na loja depois que tem pelo menos uma
              peça — cadastre aqui e ela entra na vitrine sozinha.
            </p>
          </div>
          <div>
            <label htmlFor="badge" className="text-caption uppercase text-tertiary">Badge</label>
            <input id="badge" placeholder="Ex.: Novo, Mais vendido" value={badge} onChange={(e) => setBadge(e.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="tags" className="text-caption uppercase text-tertiary">Tags (separadas por vírgula)</label>
            <input id="tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className={inputClass} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border-subtle bg-surface p-6">
        <h2 className="text-caption uppercase text-tertiary">Preço</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="price" className="text-caption uppercase text-tertiary">Preço (R$) — 0 = sob consulta *</label>
            <input id="price" inputMode="decimal" placeholder="0,00" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="oprice" className="text-caption uppercase text-tertiary">Preço original (promoção)</label>
            <input id="oprice" inputMode="decimal" placeholder="0,00" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} className={inputClass} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border-subtle bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-caption uppercase text-tertiary">Imagens *</h2>
          <button
            type="button"
            onClick={() => setImages((current) => [...current, { url: "", alt: "" }])}
            className="inline-flex items-center gap-1.5 rounded-md border border-strong px-3 py-1.5 text-micro uppercase text-secondary transition-colors hover:border-accent hover:text-accent"
          >
            <Plus size={13} />
            Adicionar
          </button>
        </div>
        <p className="mt-2 text-micro text-tertiary">
          A primeira imagem é a principal.{" "}
          {media?.configured
            ? `Envie um arquivo (até ${megabytes(media.maxBytes)}, JPEG/PNG/WebP/AVIF) ou cole um caminho de /public.`
            : "Envie um arquivo ou cole um caminho de /public."}
        </p>

        {/*
          O botão de envio aparece SEMPRE, mesmo sem R2 configurado.
          Escondê-lo era pior do que mostrá-lo desligado: quem abria a tela não
          descobria que o envio existe, e concluía que o sistema não sabe subir
          imagem. Um controle desabilitado que diz o motivo ensina; um controle
          ausente só confunde.
        */}
        <div className="mt-2.5">
          <StorageNotice media={media} />
        </div>

        {uploadError && (
          <p role="alert" className="mt-3 rounded-md bg-error/10 px-3 py-2 text-micro text-error">
            {uploadError}
          </p>
        )}

        <div className="mt-4 space-y-3">
          {images.map((image, index) => (
            <div key={index} className="flex flex-col gap-2 sm:flex-row">
              <ImageUploadButton
                media={media}
                disabled={saving}
                label={`Enviar arquivo para a imagem ${index + 1}`}
                onError={setUploadError}
                onUploaded={(url: string) => {
                  setUploadError(null);
                  updateImage(index, { url });
                }}
                className="self-end"
              />
              <input
                aria-label={`URL da imagem ${index + 1}`}
                placeholder="/images/products/…"
                value={image.url}
                onChange={(e) => updateImage(index, { url: e.target.value })}
                className={`${inputClass} mt-0 min-w-0 flex-1`}
              />
              <input
                aria-label={`Texto alternativo da imagem ${index + 1}`}
                placeholder="Descrição da imagem"
                value={image.alt}
                onChange={(e) => updateImage(index, { alt: e.target.value })}
                className={`${inputClass} mt-0 min-w-0 flex-1`}
              />
              <button
                type="button"
                onClick={() => setImages((current) => current.filter((_, i) => i !== index))}
                disabled={images.length === 1}
                aria-label={`Remover imagem ${index + 1}`}
                className="flex size-10 shrink-0 items-center justify-center self-end rounded-md border border-strong text-secondary transition-colors hover:border-error hover:text-error disabled:opacity-40"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border-subtle bg-surface p-6">
        <h2 className="text-caption uppercase text-tertiary">Especificações (opcional)</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="material" className="text-caption uppercase text-tertiary">Material</label>
            <input id="material" value={material} onChange={(e) => setMaterial(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="ptime" className="text-caption uppercase text-tertiary">Prazo (dias úteis)</label>
            <input id="ptime" type="number" min={0} value={productionTime} onChange={(e) => setProductionTime(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="weight" className="text-caption uppercase text-tertiary">Peso (g)</label>
            <input id="weight" type="number" min={0} value={weight} onChange={(e) => setWeight(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="dimw" className="text-caption uppercase text-tertiary">Largura (mm)</label>
            <input id="dimw" type="number" min={0} value={width} onChange={(e) => setWidth(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="dimh" className="text-caption uppercase text-tertiary">Altura (mm)</label>
            <input id="dimh" type="number" min={0} value={height} onChange={(e) => setHeight(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="dimd" className="text-caption uppercase text-tertiary">Profundidade (mm)</label>
            <input id="dimd" type="number" min={0} value={depth} onChange={(e) => setDepth(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-6">
          <label className="flex cursor-pointer items-center gap-2.5 text-body-small">
            <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="size-4 accent-[#C75B2A]" />
            Disponível para venda
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 text-body-small">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="size-4 accent-[#C75B2A]" />
            Destaque na home
          </label>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-md bg-error/10 px-4 py-3 text-body-small text-error">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md border border-primary bg-primary px-8 py-3.5 label text-background transition-all hover:bg-transparent hover:text-primary disabled:opacity-60"
        >
          {saving ? "Salvando…" : product ? "Salvar alterações" : "Criar produto"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/produtos")}
          className="rounded-md px-6 py-3.5 text-body font-medium text-secondary transition-colors hover:text-primary"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
