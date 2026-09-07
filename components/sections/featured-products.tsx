import { getFeaturedProducts } from "@/data/products";
import { inCatalogOrder } from "@/lib/catalog-order";
import { fetchProducts } from "@/lib/api";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeading } from "@/components/sections/section-heading";

/**
 * Quatro peças em duas linhas de pesos alternados: 7+5, depois 5+7.
 *
 * O desencontro continua sendo a intenção — grade modular perfeita lê como
 * catálogo de fornecedor. Mas agora ele é determinístico. Com `flex-wrap` e
 * `basis` variável, a quebra entre 900 e 1200px era imprevisível e sobrava uma
 * peça sozinha na linha, esticada à largura inteira: lia como erro, não como
 * revista.
 *
 * Só a **largura** varia. A proporção da foto é 4:5 em todas, senão não dá
 * para comparar o tamanho real das peças — que é a dúvida de quem compra
 * objeto pequeno pela internet.
 */
const SLOTS = [
  "md:col-span-7",
  "md:col-span-5 md:mt-16",
  "md:col-span-5",
  "md:col-span-7 md:mt-16",
];

export async function FeaturedProducts() {
  const all = await fetchProducts();
  let featured = inCatalogOrder(all.filter((product) => product.isFeatured)).slice(0, 4);
  if (featured.length === 0) featured = getFeaturedProducts().slice(0, 4);

  return (
    <section aria-labelledby="destaques-titulo" className="section-rhythm shell">
      <SectionHeading
        id="destaques-titulo"
        title="Prontas para pedir"
        action={{
          href: "/colecoes",
          label: `Ver as ${all.length} peças`,
        }}
      />

      <div className="mt-8 grid grid-cols-2 gap-x-[clamp(16px,3vw,40px)] gap-y-10 md:grid-cols-12">
        {featured.map((product, index) => (
          <div key={product.id} className={SLOTS[index % SLOTS.length]}>
            <ProductCard product={product} variant="editorial" />
          </div>
        ))}
      </div>
    </section>
  );
}
