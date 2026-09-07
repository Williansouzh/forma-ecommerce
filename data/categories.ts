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
 * A taxonomia é por intenção de compra, não por tema do arquivo STL.
 *
 * Três famílias existem aqui e no painel antes de terem peça: `brinquedos`,
 * `jogos` e a divisão futura de `colecionaveis`. Elas ficam ocultas na loja
 * enquanto a contagem for zero — ver `storefrontCategories`. É o que permite
 * cadastrar a primeira peça de uma família nova sem pedir deploy, sem mostrar
 * prateleira vazia para o cliente.
 *
 * Hoje `colecionaveis` acumula brinquedo e colecionável porque o catálogo tem
 * duas peças no conjunto. Quando houver volume, a divisão é um rótulo novo
 * aqui e uma passada do script de migração — nenhuma mudança de estrutura.
 */
export const CATEGORIES: Category[] = [
  {
    id: "cat-decoracao",
    slug: "decoracao",
    name: "Casa e decoração",
    description:
      "Vasos, cactos, suportes e objetos que ganham presença na estante sem pedir manutenção.",
    image: "/images/products/vaso-canelado-01.jpg",
    color: { light: "#0B7F49", dark: "#3FCB86" },
    productCount: 0,
  },
  {
    id: "cat-colecionaveis",
    slug: "colecionaveis",
    name: "Brinquedos e colecionáveis",
    description:
      "Dinos, dragões e articulados que se mexem na mão — para brincar e para deixar à mostra.",
    image: "/images/products/dragao-01.jpg",
    color: { light: "#7A2FC7", dark: "#B278F0" },
    productCount: 0,
  },
  {
    id: "cat-brinquedos",
    slug: "brinquedos",
    name: "Brinquedos e articulados",
    description:
      "Peças para brincar: articuladas, empilháveis e de encaixe, sem peça solta pequena.",
    image: "/images/products/dino-01.jpg",
    color: { light: "#B01E63", dark: "#F472B6" },
    productCount: 0,
  },
  {
    id: "cat-jogos",
    slug: "jogos",
    name: "Jogos e quebra-cabeças",
    description:
      "Tabuleiros, peças de encaixe e desafios impressos para jogar na mesa.",
    image: "/images/products/painel-01.jpg",
    color: { light: "#1257CC", dark: "#5C93FF" },
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

/**
 * Slugs aposentados e para onde cada um vai. Espelha `LEGACY_CATEGORY_MAP` em
 * `api/src/modules/products/schemas/product.schema.ts` — os dois lados
 * precisam concordar, senão a loja pede uma categoria que a API não resolve.
 *
 * `utilidades` virou parte de "Casa e decoração": suporte de mesa e
 * organizador são objeto de casa, e a família sozinha tinha uma peça.
 * `geek` era um recorte de nicho que deixava de fora o pai comprando um dino
 * articulado para o filho — a mesma peça, outro comprador.
 */
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  utilidades: "decoracao",
  geek: "colecionaveis",
};

/** Slug aposentado vira canônico; qualquer outro passa direto. */
export function canonicalCategory(slug: string): string {
  return LEGACY_CATEGORY_MAP[slug] ?? slug;
}

export function getCategory(slug: string): Category | undefined {
  const canonical = canonicalCategory(slug);
  return CATEGORIES.find((category) => category.slug === canonical);
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
      (product) => canonicalCategory(product.category) === category.slug
    ).length,
  }));
}

/**
 * O que a loja mostra: só famílias com peça.
 *
 * "Sob medida" é a exceção e fica sempre — encomenda não tem catálogo fechado,
 * então contar peças ali mentiria, e a porta precisa existir mesmo assim.
 *
 * Prateleira vazia não sinaliza sortimento futuro para quem está comprando;
 * sinaliza loja sem estoque. No painel as seis continuam disponíveis.
 */
export function storefrontCategories(categories: Category[]): Category[] {
  return categories.filter(
    (category) =>
      category.productCount > 0 || category.slug === "personalizados"
  );
}
