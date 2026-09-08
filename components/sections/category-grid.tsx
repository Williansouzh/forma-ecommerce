import Image from "next/image";
import Link from "next/link";
import {
  CATEGORIES,
  storefrontCategories,
  type Category,
} from "@/data/categories";

/**
 * As coleções logo abaixo da vitrine, no lugar onde antes rolava uma faixa de
 * palavras decorativas. A posição é a mais valiosa da página depois do hero, e
 * o marquee a gastava repetindo os rótulos que já estavam no menu.
 *
 * Grade fixa, sem carrossel: com cinco coleções, um carrossel esconderia três
 * e a maioria nunca desliza. A régua colorida no topo de cada bloco é a cor de
 * filamento da família — é o mesmo código que reaparece no chip do catálogo e
 * no selo do card.
 */
function CategoryBlock({ category }: { category: Category }) {
  const isCustom = category.slug === "personalizados";

  return (
    <Link
      href={`/colecoes/${category.slug}`}
      style={
        {
          "--cat-light": category.color.light,
          "--cat-dark": category.color.dark,
        } as React.CSSProperties
      }
      className="group flex min-w-0 flex-col"
    >
      <span aria-hidden className="cat-bg h-[3px] w-full" />

      <div className="relative mt-3 aspect-[4/5] overflow-hidden bg-surface-muted">
        <Image
          src={category.image}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 260px"
          className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.2,0.6,0.3,1)] group-hover:scale-[1.03]"
        />
      </div>

      {/*
        Mesma correção do card de produto: no celular o nome fica em cima e a
        contagem embaixo.

        "Brinquedos e colecionáveis" mede ~130px só na maior palavra; somada à
        contagem em `whitespace-nowrap` e ao vão, a linha pedia 189px numa
        coluna de 156px — e o excedente ia escrito por cima do bloco vizinho.
      */}
      <div className="mt-3 flex min-w-0 flex-col gap-y-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-x-3">
        <h3 className="min-w-0 break-words font-display text-heading-3 transition-colors duration-200 group-hover:text-accent">
          {category.name}
        </h3>
        <span className="data shrink-0 whitespace-nowrap text-[13px] text-tertiary">
          {/* Sob medida não tem catálogo fechado: contar peças ali mentiria. */}
          {isCustom
            ? "sob encomenda"
            : `${category.productCount} ${
                category.productCount === 1 ? "peça" : "peças"
              }`}
        </span>
      </div>
    </Link>
  );
}

/** As contagens vêm do servidor; sem elas, mostra as categorias sem número. */
export function CategoryIndex({
  categories = CATEGORIES,
}: {
  categories?: Category[];
}) {
  return (
    <section
      aria-labelledby="categorias-titulo"
      className="section-rhythm shell"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-border-strong pb-5">
        <h2 id="categorias-titulo" className="font-display text-display-2">
          O que dá pra pedir
        </h2>
        <Link
          href="/colecoes"
          className="nav-link text-body-small font-medium text-primary"
        >
          Ver a coleção completa
        </Link>
      </div>

      {/* Família sem peça não vira prateleira vazia na loja — ver
          `storefrontCategories`. No painel as seis continuam disponíveis. */}
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
        {storefrontCategories(categories).map((category) => (
          <CategoryBlock key={category.slug} category={category} />
        ))}
      </div>
    </section>
  );
}
