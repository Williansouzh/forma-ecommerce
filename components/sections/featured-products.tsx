import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types/product";
import { getFeaturedProducts } from "@/data/products";
import { inCatalogOrder } from "@/lib/catalog-order";
import { fetchProducts } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { SectionHeading } from "@/components/sections/section-heading";

/**
 * Quatro peças em larguras e alturas diferentes, encaixadas por `flex-wrap`.
 *
 * O desencontro é a intenção: as duas colunas menores descem alguns pixels,
 * então nenhuma linha fecha certinha. Grid modular perfeito lê como catálogo
 * de fornecedor; isto lê como página aberta de revista. As medidas vêm do
 * protótipo — `basis` define quanto cada peça quer ocupar, e a proporção da
 * foto muda de uma para a outra pelo mesmo motivo.
 */
const LAYOUT = [
  { basis: "flex-[1_1_min(100%,560px)] min-w-[260px]", ratio: "aspect-[4/5]" },
  {
    basis: "flex-[1_1_min(100%,340px)] min-w-[250px]",
    ratio: "aspect-[3/4]",
    offset: "md:mt-[clamp(0px,5vw,96px)]",
  },
  { basis: "flex-[1_1_min(100%,620px)] min-w-[260px]", ratio: "aspect-[5/4]" },
  {
    basis: "flex-[1_1_min(100%,300px)] min-w-[240px]",
    ratio: "aspect-[1/1]",
    offset: "md:mt-[clamp(0px,4vw,70px)]",
  },
];

function Piece({
  product,
  ratio,
  sizes,
}: {
  product: Product;
  ratio: string;
  sizes: string;
}) {
  const photo = product.images.find((image) => image.isPrimary) ?? product.images[0];

  return (
    <Link href={`/produto/${product.slug}`} className="group block">
      <div className={`relative overflow-hidden bg-surface-muted ${ratio}`}>
        {photo && (
          <Image
            src={photo.url}
            alt={photo.alt}
            fill
            sizes={sizes}
            className="object-cover saturate-[0.94] transition-transform duration-[900ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:scale-[1.04]"
          />
        )}
        {product.badge && (
          <span className="absolute left-3.5 top-3.5 bg-background/[0.92] px-[11px] py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            {product.badge}
          </span>
        )}
      </div>

      <div className="mt-[18px] flex items-baseline justify-between gap-4">
        <div>
          <h3 className="font-display text-[clamp(20px,2.2vw,30px)] font-normal tracking-[-0.01em]">
            {product.name}
          </h3>
          <p className="mt-1.5 max-w-sm text-body-small text-tertiary">
            {product.shortDescription}
          </p>
        </div>
        <span className="whitespace-nowrap text-[16px] font-semibold tabular-nums">
          {formatPrice(product.price)}
        </span>
      </div>
    </Link>
  );
}

export async function FeaturedProducts() {
  const all = await fetchProducts();
  let featured = inCatalogOrder(all.filter((product) => product.isFeatured)).slice(0, 4);
  if (featured.length === 0) featured = getFeaturedProducts().slice(0, 4);

  return (
    <section aria-labelledby="destaques-titulo" className="shell pt-[clamp(64px,12vh,150px)]">
      <SectionHeading
        number="01"
        id="destaques-titulo"
        title="Vitrine do ateliê"
        action={{
          href: "/colecoes",
          label: `Ver as ${all.length} peças`,
        }}
      />

      <div className="mt-[clamp(34px,7vh,80px)] flex flex-wrap gap-[clamp(22px,4vw,68px)]">
        {featured.map((product, index) => {
          const slot = LAYOUT[index % LAYOUT.length];
          return (
            <div key={product.id} className={`${slot.basis} ${slot.offset ?? ""}`}>
              <Piece
                product={product}
                ratio={slot.ratio}
                sizes="(max-width: 768px) 100vw, 45vw"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
