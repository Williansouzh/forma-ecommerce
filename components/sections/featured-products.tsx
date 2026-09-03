import Link from "next/link";
import { getFeaturedProducts } from "@/data/products";
import { fetchProducts } from "@/lib/api";
import { ProductCard } from "@/components/product/product-card";

/**
 * Ritmo editorial, não grid bento.
 *
 * Duas peças grandes em alturas diferentes, uma faixa de respiro com uma frase
 * solta, e três médias desalinhadas de propósito. A irregularidade é o efeito:
 * grid modular perfeito é assinatura de landing page de software.
 */
export async function FeaturedProducts() {
  let products = await fetchProducts({ featured: true, limit: 6 });
  if (products.length === 0) products = getFeaturedProducts().slice(0, 6);

  const [first, second, ...rest] = products;
  const middle = rest.slice(0, 3);
  const last = rest[3];

  return (
    <section aria-labelledby="destaques-titulo" className="shell py-32 md:py-48">
      <header className="max-w-2xl">
        <p className="label text-tertiary">Seleção para casa</p>
        <h2
          id="destaques-titulo"
          className="mt-5 font-display text-display-2"
        >
          Objetos com presença,
          <br />
          mesmo quando pequenos
        </h2>
      </header>

      {/* Duas grandes, desencontradas na vertical. */}
      <div className="mt-20 grid gap-x-16 gap-y-20 md:mt-28 md:grid-cols-12">
        {first && (
          <div className="md:col-span-7">
            <ProductCard product={first} variant="large" />
          </div>
        )}
        {second && (
          <div className="md:col-span-4 md:col-start-9 md:mt-32">
            <ProductCard product={second} variant="tall" revealDelay={0.12} />
          </div>
        )}
      </div>

      {/* Faixa de respiro: uma frase solta, sem nada em volta. */}
      <p className="mx-auto my-32 max-w-xl text-center font-display text-heading-2 leading-snug text-secondary md:my-44">
        Escolhidas pela textura, pela cor e pelo jeito
        <br className="hidden sm:block" /> como ocupam uma mesa.
      </p>

      {/* Três médias em alturas diferentes. */}
      <div className="grid gap-x-16 gap-y-20 sm:grid-cols-2 md:grid-cols-3">
        {middle.map((product, index) => (
          <div
            key={product.id}
            className={
              index === 1 ? "md:mt-24" : index === 2 ? "md:mt-10" : undefined
            }
          >
            <ProductCard
              product={product}
              variant={index === 0 ? "tall" : index === 1 ? "medium" : "wide"}
              revealDelay={index * 0.1}
            />
          </div>
        ))}
      </div>

      {last && (
        <div className="mt-32 md:mt-44 md:w-2/3">
          <ProductCard product={last} variant="wide" />
        </div>
      )}

      <div className="mt-32 border-t border-border-strong pt-8 md:mt-44">
        <Link
          href="/colecoes"
          className="nav-link inline-block font-display text-heading-3 text-primary transition-colors hover:text-accent"
        >
          Ver o catálogo inteiro
        </Link>
      </div>
    </section>
  );
}
