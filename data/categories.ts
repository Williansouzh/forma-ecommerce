export interface CategoryColor {
  /** Usada sobre fundo claro — escurecida até passar 4.5:1. */
  light: string;
  /** Usada sobre fundo escuro (`.ink`, tema escuro). */
  dark: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  /**
   * A cor de filamento da família. É o único lugar de onde a interface tira
   * cor: chip ativo, régua do bloco de categoria, selo na grade mista. Nunca
   * vira fundo de seção nem cor de texto corrido.
   */
  color: CategoryColor;
  /** Preenchido a partir do catálogo real; ver `withProductCounts`. */
  productCount: number;
}

/*
 * Os slugs são os mesmos de sempre porque `product.category` é campo
 * persistido: renomear aqui sem migrar o banco esvaziaria as coleções em
 * produção. O que mudou foi o rótulo — "Geek" era um recorte de nicho que
 * deixava de fora o pai comprando um dino articulado para o filho, que é
 * exatamente a mesma peça.
 */
export const CATEGORIES: Category[] = [
  {
    id: "cat-decoracao",
    slug: "decoracao",
    name: "Casa e decoração",
    description:
      "Vasos, cactos e objetos que ganham presença na estante sem pedir manutenção.",
    image: "/images/products/vaso-canelado-01.jpg",
    color: { light: "#0B7F49", dark: "#3FCB86" },
    productCount: 0,
  },
  {
    id: "cat-geek",
    slug: "geek",
    name: "Colecionáveis e articulados",
    description:
      "Dinos, dragões e homenagens em escala — peças que se mexem na mão e que se reconhecem de longe.",
    image: "/images/products/dragao-01.jpg",
    color: { light: "#7A2FC7", dark: "#B278F0" },
    productCount: 0,
  },
  {
    id: "cat-presentes",
    slug: "presentes",
    name: "Presentes e chaveiros",
    description:
      "Peças pequenas com nome, embalagem e cartão do ateliê. Saem em até dois dias.",
    image: "/images/products/tag-01.jpg",
    color: { light: "#8A6200", dark: "#F0C33C" },
    productCount: 0,
  },
  {
    id: "cat-utilidades",
    slug: "utilidades",
    name: "Utilidades",
    description:
      "Objetos de uso diário — suportes, organizadores e peças que resolvem alguma coisa na mesa.",
    image: "/images/products/suporte-01.jpg",
    color: { light: "#1257CC", dark: "#5C93FF" },
    productCount: 0,
  },
  {
    id: "cat-personalizados",
    slug: "personalizados",
    name: "Sob medida",
    description:
      "Sua ideia modelada do zero. A paleta e o nome saem combinados antes da impressão.",
    image: "/images/products/painel-01.jpg",
    color: { light: "#101012", dark: "#F2F2F0" },
    productCount: 0,
  },
];

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}

/** A cor de filamento da família, para selo e chip. Cinza se o slug não existe. */
export function categoryColor(slug: string): CategoryColor {
  return getCategory(slug)?.color ?? { light: "#6E7075", dark: "#8B8E93" };
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
