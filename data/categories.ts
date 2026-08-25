export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  productCount: number;
}

export const CATEGORIES: Category[] = [
  {
    id: "cat-bonecos",
    slug: "bonecos",
    name: "Bonecos & Esculturas",
    description:
      "Peças de coleção esculpidas em alta resolução, do conceito ao acabamento manual.",
    image: "/images/categories/bonecos.svg",
    productCount: 24,
  },
  {
    id: "cat-decoracao",
    slug: "decoracao",
    name: "Decoração",
    description:
      "Objetos paramétricos e orgânicos que trazem presença para qualquer ambiente.",
    image: "/images/categories/decoracao.svg",
    productCount: 18,
  },
  {
    id: "cat-geek",
    slug: "geek",
    name: "Geek",
    description:
      "Homenagens em escala para fãs de cinema, games e cultura pop.",
    image: "/images/categories/geek.svg",
    productCount: 31,
  },
  {
    id: "cat-miniaturas",
    slug: "miniaturas",
    name: "Miniaturas",
    description:
      "Réveis detalhadas impressas em resina, camada por camada, com precisão de estúdio.",
    image: "/images/categories/miniaturas.svg",
    productCount: 42,
  },
  {
    id: "cat-presentes",
    slug: "presentes",
    name: "Presentes",
    description:
      "Peças pensadas para serem entregues: embalagem editorial e cartão assinado pelo estúdio.",
    image: "/images/categories/presentes.svg",
    productCount: 15,
  },
  {
    id: "cat-personalizados",
    slug: "personalizados",
    name: "Personalizados",
    description:
      "Sua ideia modelada do zero pelo nosso time. Uma peça, só sua.",
    image: "/images/categories/personalizados.svg",
    productCount: 9999,
  },
];

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}
