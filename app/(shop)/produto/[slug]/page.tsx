import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchProductBySlug, fetchRelatedProducts } from "@/lib/api";
import { getCategory } from "@/data/categories";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductDetails } from "@/components/product/product-details";
import { ProductTabs } from "@/components/product/product-tabs";
import { ProductGrid, ProductGridItem } from "@/components/product/product-grid";
import { ProductCard } from "@/components/product/product-card";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { productJsonLd } from "@/lib/schema-org";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  if (!product) return {};
  return {
    title: `${product.name} — feito sob demanda`,
    description: `${product.shortDescription} — Produção em impressão 3D com material, textura e prazo informados antes do envio.`,
    alternates: { canonical: `/produto/${product.slug}` },
    openGraph: {
      title: `${product.name} | FORMA.`,
      description: product.shortDescription,
      images: product.images.map((image) => ({ url: image.url })),
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | FORMA.`,
      description: product.shortDescription,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  if (!product) notFound();

  const category = getCategory(product.category);
  const related = await fetchRelatedProducts(product);
  const studioNotes = [
    {
      title: "O que conferir ao receber",
      text: `Veja a superfície, as bordas e o encaixe da peça. No ${product.name.toLowerCase()}, pequenas linhas de camada podem aparecer conforme a luz.`,
    },
    {
      title: "Variação honesta de produção",
      text: "Cor, brilho e textura podem variar levemente entre lotes de filamento ou resina. Isso faz parte da fabricação sob demanda.",
    },
    {
      title: "Quando pedir personalização",
      text: "Para nomes, iniciais, cores específicas ou kits, envie referência antes da compra para validarmos tamanho, prazo e limite técnico.",
    },
  ];

  const specs: [string, string][] = [
    ["Material", product.material ?? "—"],
    ["Largura", product.dimensions ? `${product.dimensions.width} mm` : "—"],
    ["Altura", product.dimensions ? `${product.dimensions.height} mm` : "—"],
    ["Profundidade", product.dimensions ? `${product.dimensions.depth} mm` : "—"],
    ["Peso", typeof product.weight === "number" ? `${product.weight} g` : "—"],
    [
      "Prazo de produção",
      typeof product.productionTime === "number"
        ? `${product.productionTime} dias úteis`
        : "Sob consulta",
    ],
  ];

  return (
    <div className="pb-24 pt-24 md:pt-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)) }}
      />

      <div className="shell">
        <Breadcrumb
          items={[
            { label: "Início", href: "/" },
            {
              label: "Coleções",
              href: "/colecoes",
            },
            ...(category
              ? [{ label: category.name, href: `/colecoes/${category.slug}` }]
              : []),
            { label: product.name },
          ]}
        />

        <div className="mt-6 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <ProductGallery product={product} />
          <ProductDetails product={product} />
        </div>

        <div className="mt-20">
          <ProductTabs
            tabs={[
              {
                id: "descricao",
                label: "Descrição",
                content: (
                  <div className="max-w-prose space-y-5 text-body text-secondary">
                    <p>{product.description}</p>
                    <p>
                      Todas as peças FORMA. passam por inspeção individual sob
                      luz direta antes da embalagem. Peças em resina recebem cura
                      UV complementar e acabamento manual; peças em filamento são
                      impressas em alturas de camada de até 0,12 mm.
                    </p>
                  </div>
                ),
              },
              {
                id: "especificacoes",
                label: "Especificações",
                content: (
                  <dl className="grid max-w-2xl grid-cols-1 gap-x-10 sm:grid-cols-2">
                    {specs.map(([term, value]) => (
                      <div
                        key={term}
                        className="flex justify-between gap-4 border-b border-border-subtle py-3.5"
                      >
                        <dt className="text-caption uppercase text-tertiary">{term}</dt>
                        <dd className="text-body-small font-medium tabular-nums">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ),
              },
              {
                id: "processo",
                label: "Processo de produção",
                content: (
                  <ol className="max-w-prose space-y-6">
                    {[
                      `Modelagem e fatiamento do arquivo do ${product.name} com verificação de espessura de parede.`,
                      `Impressão${product.material ? ` em ${product.material}` : ""}, camada por camada, com monitoramento contínuo.`,
                      "Remoção dos suportes, cura ou recozimento conforme o material.",
                      "Lixamento fino e acabamento de superfície à mão.",
                      "Inspeção final, fotografia de conferência e embalagem editorial.",
                    ].map((step, index) => (
                      <li key={index} className="flex gap-4">
                        <span className="flex size-7 shrink-0 items-center justify-center border border-primary bg-surface text-micro font-medium text-primary">
                          {index + 1}
                        </span>
                        <p className="pt-1 text-body text-secondary">{step}</p>
                      </li>
                    ))}
                  </ol>
                ),
              },
              {
                id: "observacoes",
                label: "Notas do estúdio",
                content: (
                  <ul className="max-w-2xl space-y-8">
                    {studioNotes.map((note) => (
                      <li key={note.title} className="border-b border-border-subtle pb-8 last:border-none">
                        <p className="text-micro uppercase text-tertiary">{note.title}</p>
                        <p className="mt-2 text-body text-secondary">{note.text}</p>
                      </li>
                    ))}
                  </ul>
                ),
              },
            ]}
          />
        </div>

        {related.length > 0 && (
          <section aria-labelledby="relacionados-titulo" className="mt-16 border-t border-border-subtle pt-16">
            <h2 id="relacionados-titulo" className="font-display text-heading-2 tracking-tight">
              Você também vai gostar
            </h2>
            <ProductGrid>
              {related.map((item, index) => (
                <ProductGridItem
                  key={item.id}
                  className={
                    index === 3 ? "sm:col-span-2 xl:col-span-1" : undefined
                  }
                >
                  <ProductCard
                    product={item}
                    variant="medium"
                    revealDelay={index * 0.08}
                  />
                </ProductGridItem>
              ))}
            </ProductGrid>
          </section>
        )}
      </div>

    </div>
  );
}
