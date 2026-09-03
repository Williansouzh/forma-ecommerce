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
    productCount: 19,
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
      "Réplicas detalhadas impressas em resina, camada por camada, com precisão de estúdio.",
    image: "/images/categories/miniaturas.svg",
    productCount: 42,
  },
  {
    id: "cat-presentes",
    slug: "presentes",
    name: "Presentes & Chaveiros",
    description:
      "Chaveiros, lembranças e peças pequenas pensadas para serem entregues com embalagem de presente.",
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
    productCount: 1,
  },
];

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}
