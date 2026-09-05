export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  /** Preenchido a partir do catálogo real; ver `withProductCounts`. */
  productCount: number;
}

/**
 * As cinco categorias que existem de fato no ateliê. A foto é de uma peça
 * real da própria categoria — nada de ilustração de preenchimento.
 */
export const CATEGORIES: Category[] = [
  {
    id: "cat-decoracao",
    slug: "decoracao",
    name: "Decoração",
    description:
      "Vasos, cactos e objetos que ganham presença na estante sem pedir manutenção.",
    image: "/images/products/vaso-canelado-01.jpg",
    productCount: 0,
  },
  {
    id: "cat-geek",
    slug: "geek",
    name: "Geek",
    description:
      "Articulados e homenagens em escala, para quem reconhece a referência de longe.",
    image: "/images/products/dragao-01.jpg",
    productCount: 0,
  },
  {
    id: "cat-presentes",
    slug: "presentes",
    name: "Presentes",
    description:
      "Peças pequenas com nome, embalagem e cartão do ateliê. Saem em até dois dias.",
    image: "/images/products/tag-01.jpg",
    productCount: 0,
  },
  {
    id: "cat-utilidades",
    slug: "utilidades",
    name: "Utilidades",
    description:
      "Objetos de uso diário — suportes, organizadores e peças que resolvem alguma coisa na mesa.",
    image: "/images/products/suporte-01.jpg",
    productCount: 0,
  },
  {
    id: "cat-personalizados",
    slug: "personalizados",
    name: "Sob medida",
    description:
      "Sua ideia modelada do zero. A paleta e o nome saem combinados antes da impressão.",
    image: "/images/products/painel-01.jpg",
    productCount: 0,
  },
];

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}

/** Conta as peças de verdade, em vez de carregar um número escrito à mão. */
export function withProductCounts(
  products: { category: string }[]
): Category[] {
  return CATEGORIES.map((category) => ({
    ...category,
    productCount: products.filter(
      (product) => product.category === category.slug
    ).length,
  }));
}
