import type { Product } from "@/types/product";
import { CATEGORIES } from "@/data/categories";

/**
 * As 9 peças reais do ateliê. Espelha o seed da API (`api/src/database`) —
 * aqui é o que a loja mostra quando a API não responde.
 */
export const PRODUCTS: Product[] = [
  {
    id: "c3d-0001-cactos-mesa",
    slug: "cactos-mesa",
    name: "Cactos de Mesa",
    description:
      "Três cactos de mesa impressos em PLA fosco, com a textura de espinho saindo do próprio caminho da extrusora — nada é colado depois. Cada um vem no seu vasinho de parede trançada, impresso em vaso mode numa volta só. Ficam de pé sozinhos e não pedem água.",
    shortDescription:
      "Cactos impressos em PLA com textura de espinho aparente e vasinho de parede trançada.",
    price: 9900,
    category: "decoracao",
    tags: ["cactos", "mesa", "decoração", "casa", "pla+ fosco"],
    images: [
      {
        id: "cactos-mesa-img-1",
        url: "/images/products/cactos-01.jpg",
        alt: "Cactos de Mesa, o trio completo",
        isPrimary: true,
        order: 1,
      },
      {
        id: "cactos-mesa-img-2",
        url: "/images/products/cactos-02.jpg",
        alt: "Detalhe da textura de espinho",
        order: 2,
      },
      {
        id: "cactos-mesa-img-3",
        url: "/images/products/cactos-03.jpg",
        alt: "Cactos de Mesa em ambiente",
        order: 3,
      },
      {
        id: "cactos-mesa-img-4",
        url: "/images/products/cactos-04.jpg",
        alt: "Vasinho de parede trançada",
        order: 4,
      },
    ],
    variants: [
      {
        id: "var-cactos-mesa-1",
        name: "Verde Musgo",
        colorHex: "#4F6248",
        priceAdjustment: 0,
        stock: 4,
        images: [],
      },
      {
        id: "var-cactos-mesa-2",
        name: "Verde Claro",
        colorHex: "#7E9163",
        priceAdjustment: 0,
        stock: 4,
        images: [],
      },
      {
        id: "var-cactos-mesa-3",
        name: "Terracota",
        colorHex: "#AE5E3D",
        priceAdjustment: 0,
        stock: 4,
        images: [],
      },
    ],
    dimensions: { width: 90, height: 140, depth: 90 },
    weight: 180,
    material: "PLA+ fosco",
    productionTime: 4,
    stock: 14,
    isAvailable: true,
    isCustom: false,
    isFeatured: true,
    badge: "Mais vendido",
    createdAt: new Date("2026-09-03"),
    updatedAt: new Date("2026-09-03"),
  },
  {
    id: "c3d-0002-vaso-nervura",
    slug: "vaso-nervura",
    name: "Vaso Nervura",
    description:
      "Vaso de parede nervurada impresso em PLA+ Silk, que devolve a luz de um jeito acetinado em vez de brilhante. Vem em conjunto com bandeja e porta-vela do mesmo desenho. Impermeabilizado por dentro para receber água.",
    shortDescription:
      "Vaso de parede nervurada com bandeja e porta-vela no conjunto.",
    price: 12900,
    category: "decoracao",
    tags: ["vaso", "nervura", "decoração", "casa", "pla+ silk"],
    images: [
      {
        id: "vaso-nervura-img-1",
        url: "/images/products/vaso-nervura-01.jpg",
        alt: "Vaso Nervura visto de frente",
        isPrimary: true,
        order: 1,
      },
      {
        id: "vaso-nervura-img-2",
        url: "/images/products/vaso-nervura-02.jpg",
        alt: "Conjunto com bandeja e porta-vela",
        order: 2,
      },
    ],
    variants: [
      {
        id: "var-vaso-nervura-1",
        name: "Branco Gesso",
        colorHex: "#EDEBE4",
        priceAdjustment: 0,
        stock: 3,
        images: [],
      },
      {
        id: "var-vaso-nervura-2",
        name: "Rosa Argila",
        colorHex: "#D9A38C",
        priceAdjustment: 0,
        stock: 3,
        images: [],
      },
    ],
    dimensions: { width: 120, height: 220, depth: 120 },
    weight: 310,
    material: "PLA+ Silk",
    productionTime: 5,
    stock: 7,
    isAvailable: true,
    isCustom: false,
    badge: "Conjunto",
    isFeatured: true,
    createdAt: new Date("2026-09-03"),
    updatedAt: new Date("2026-09-03"),
  },
  {
    id: "c3d-0003-dragao-articulado",
    slug: "dragao-articulado",
    name: "Dragão Articulado",
    description:
      "Quarenta e dois centímetros de dragão com 38 juntas que se mexem — e tudo sai da mesa impresso de uma vez, sem montagem. O filamento gradiente troca de cor ao longo do corpo, então nenhuma peça sai idêntica à anterior.",
    shortDescription:
      "Dragão de 42 cm com 38 juntas móveis, impresso em uma peça só.",
    price: 8900,
    category: "colecionaveis",
    tags: ["dragão", "articulado", "geek", "colecionável", "pla+ gradient"],
    images: [
      {
        id: "dragao-articulado-img-1",
        url: "/images/products/dragao-01.jpg",
        alt: "Dragão Articulado inteiro sobre a mesa",
        isPrimary: true,
        order: 1,
      },
    ],
    variants: [
      {
        id: "var-dragao-articulado-1",
        name: "Azul Gelo",
        colorHex: "#8FA8C8",
        priceAdjustment: 0,
        stock: 2,
        images: [],
      },
      {
        id: "var-dragao-articulado-2",
        name: "Lilás",
        colorHex: "#A996C4",
        priceAdjustment: 0,
        stock: 2,
        images: [],
      },
    ],
    dimensions: { width: 420, height: 110, depth: 80 },
    weight: 260,
    material: "PLA+ Gradient",
    productionTime: 4,
    stock: 5,
    isAvailable: true,
    isCustom: false,
    isFeatured: true,
    badge: "38 juntas móveis",
    createdAt: new Date("2026-09-03"),
    updatedAt: new Date("2026-09-03"),
  },
  {
    id: "c3d-0004-gato-contorno",
    slug: "gato-contorno",
    name: "Gato de Contorno",
    description:
      "O desenho de um gato feito sem tirar a caneta do papel, levantado em três dimensões. Fica em pé na estante ou encostado na parede, e o vazado entre as linhas muda conforme a luz do ambiente.",
    shortDescription:
      "Um gato desenhado em uma linha só e levantado do papel.",
    price: 5900,
    category: "decoracao",
    tags: ["gato", "contorno", "decoração", "casa", "pla fosco"],
    images: [
      {
        id: "gato-contorno-img-1",
        url: "/images/products/gato-01.jpg",
        alt: "Gato de Contorno apoiado na estante",
        isPrimary: true,
        order: 1,
      },
    ],
    variants: [
      {
        id: "var-gato-contorno-1",
        name: "Preto Fosco",
        colorHex: "#1B1A15",
        priceAdjustment: 0,
        stock: 9,
        images: [],
      },
    ],
    dimensions: { width: 150, height: 180, depth: 40 },
    weight: 90,
    material: "PLA fosco",
    productionTime: 3,
    stock: 9,
    isAvailable: true,
    isCustom: false,
    isFeatured: true,
    createdAt: new Date("2026-09-03"),
    updatedAt: new Date("2026-09-03"),
  },
  {
    id: "c3d-0005-suporte-onda",
    slug: "suporte-onda",
    name: "Suporte Onda",
    description:
      "Suporte de celular com perfil de onda e o miolo listrado pelas próprias camadas de impressão. Segura o aparelho em pé ou deitado, com recorte para o cabo passar por baixo. Base com peso suficiente para não escorregar.",
    shortDescription:
      "Suporte de celular de perfil curvo com miolo em camadas coloridas.",
    price: 4500,
    category: "decoracao",
    tags: ["suporte", "onda", "utilidade", "mesa", "pla+ multicor"],
    images: [
      {
        id: "suporte-onda-img-1",
        url: "/images/products/suporte-01.jpg",
        alt: "Suporte Onda com celular apoiado",
        isPrimary: true,
        order: 1,
      },
      {
        id: "suporte-onda-img-2",
        url: "/images/products/suporte-02.jpg",
        alt: "Perfil curvo do suporte",
        order: 2,
      },
      {
        id: "suporte-onda-img-3",
        url: "/images/products/suporte-03.jpg",
        alt: "Camadas coloridas do miolo",
        order: 3,
      },
    ],
    variants: [
      {
        id: "var-suporte-onda-1",
        name: "Rosa Quartzo",
        colorHex: "#E4A6AC",
        priceAdjustment: 0,
        stock: 11,
        images: [],
      },
      {
        id: "var-suporte-onda-2",
        name: "Arco-íris",
        colorHex: "#C97F4A",
        priceAdjustment: 0,
        stock: 11,
        images: [],
      },
    ],
    dimensions: { width: 100, height: 80, depth: 90 },
    weight: 70,
    material: "PLA+ multicor",
    productionTime: 3,
    stock: 22,
    isAvailable: true,
    isCustom: false,
    isFeatured: false,
    createdAt: new Date("2026-09-03"),
    updatedAt: new Date("2026-09-03"),
  },
  {
    id: "c3d-0006-painel-cores",
    slug: "painel-cores",
    name: "Painel de Cores",
    description:
      "Painel sensorial de encaixe, feito para mão pequena: discos coloridos que entram e saem, alças rígidas e nenhuma quina viva. A paleta e o nome gravado saem combinados com você antes de a impressão começar.",
    shortDescription:
      "Painel sensorial de encaixe com discos coloridos e alças rígidas.",
    price: 13900,
    category: "personalizados",
    tags: ["painel", "cores", "sob medida", "personalizado", "pla+ fosco"],
    images: [
      {
        id: "painel-cores-img-1",
        url: "/images/products/painel-01.jpg",
        alt: "Painel de Cores montado",
        isPrimary: true,
        order: 1,
      },
      {
        id: "painel-cores-img-2",
        url: "/images/products/painel-02.jpg",
        alt: "Discos de encaixe do painel",
        order: 2,
      },
    ],
    variants: [
      {
        id: "var-painel-cores-1",
        name: "Base Branca",
        colorHex: "#EDEBE4",
        priceAdjustment: 0,
        stock: 1,
        images: [],
      },
      {
        id: "var-painel-cores-2",
        name: "Base Coral",
        colorHex: "#E7A078",
        priceAdjustment: 0,
        stock: 1,
        images: [],
      },
    ],
    dimensions: { width: 300, height: 240, depth: 25 },
    weight: 520,
    material: "PLA+ fosco",
    productionTime: 7,
    stock: 3,
    isAvailable: true,
    isCustom: true,
    isFeatured: false,
    badge: "Sob medida",
    createdAt: new Date("2026-09-03"),
    updatedAt: new Date("2026-09-03"),
  },
  {
    id: "c3d-0007-tag-pet",
    slug: "tag-pet",
    name: "Tag de Pet",
    description:
      "Plaquinha de identificação com o nome do bicho em relevo e o telefone no verso. Leve o bastante para não incomodar na coleira e impressa em sólido, sem miolo oco, para aguentar mordida e chuva.",
    shortDescription:
      "Plaquinha de identificação com o nome do bicho em relevo.",
    price: 3200,
    category: "presentes",
    tags: ["tag", "pet", "presente", "lembrança", "pla+ fosco"],
    images: [
      {
        id: "tag-pet-img-1",
        url: "/images/products/tag-01.jpg",
        alt: "Tag de Pet com nome em relevo",
        isPrimary: true,
        order: 1,
      },
    ],
    variants: [
      {
        id: "var-tag-pet-1",
        name: "Verde Musgo",
        colorHex: "#4F6248",
        priceAdjustment: 0,
        stock: 20,
        images: [],
      },
      {
        id: "var-tag-pet-2",
        name: "Barro",
        colorHex: "#AE5E3D",
        priceAdjustment: 0,
        stock: 20,
        images: [],
      },
    ],
    dimensions: { width: 38, height: 28, depth: 4 },
    weight: 6,
    material: "PLA+ fosco",
    productionTime: 2,
    stock: 40,
    isAvailable: true,
    isCustom: true,
    badge: "Com nome",
    isFeatured: false,
    createdAt: new Date("2026-09-03"),
    updatedAt: new Date("2026-09-03"),
  },
  {
    id: "c3d-0008-vaso-canelado",
    slug: "vaso-canelado",
    name: "Vaso Canelado",
    description:
      "Canelado fundo o suficiente para o vaso ganhar sombra própria ao longo do dia. Impresso em PLA+ Silk e entregue sobre bandeja de madeira, com porta-vela do mesmo desenho para fechar o conjunto.",
    shortDescription:
      "Vaso de canelado profundo com bandeja de madeira e porta-vela.",
    price: 11900,
    category: "decoracao",
    tags: ["vaso", "canelado", "decoração", "casa", "pla+ silk"],
    images: [
      {
        id: "vaso-canelado-img-1",
        url: "/images/products/vaso-canelado-01.jpg",
        alt: "Vaso Canelado sobre a bandeja",
        isPrimary: true,
        order: 1,
      },
      {
        id: "vaso-canelado-img-2",
        url: "/images/products/vaso-canelado-02.jpg",
        alt: "Detalhe do canelado",
        order: 2,
      },
    ],
    variants: [
      {
        id: "var-vaso-canelado-1",
        name: "Verde Oliva",
        colorHex: "#5C6A49",
        priceAdjustment: 0,
        stock: 3,
        images: [],
      },
      {
        id: "var-vaso-canelado-2",
        name: "Branco Gesso",
        colorHex: "#EDEBE4",
        priceAdjustment: 0,
        stock: 3,
        images: [],
      },
    ],
    dimensions: { width: 130, height: 210, depth: 130 },
    weight: 340,
    material: "PLA+ Silk",
    productionTime: 5,
    stock: 6,
    isAvailable: true,
    isCustom: false,
    isFeatured: false,
    createdAt: new Date("2026-09-03"),
    updatedAt: new Date("2026-09-03"),
  },
  {
    id: "c3d-0009-dinos-mesa",
    slug: "dinos-mesa",
    name: "Mini Dinos",
    description:
      "Seis dinossauros de palma da mão em cores pastel, cada um de uma espécie, com um arco de exposição para deixá-los enfileirados na estante. Impressos em PLA+ fosco, sem tinta — a cor é a do próprio filamento.",
    shortDescription:
      "Seis dinossauros pequenos em cores pastel, com arco de exposição.",
    price: 7900,
    category: "colecionaveis",
    tags: ["mini", "dinos", "presente", "lembrança", "pla+ fosco"],
    images: [
      {
        id: "dinos-mesa-img-1",
        url: "/images/products/dino-01.jpg",
        alt: "Mini Dinos enfileirados no arco",
        isPrimary: true,
        order: 1,
      },
      {
        id: "dinos-mesa-img-2",
        url: "/images/products/dino-02.jpg",
        alt: "Detalhe de dois dinossauros",
        order: 2,
      },
    ],
    variants: [
      {
        id: "var-dinos-mesa-1",
        name: "Pastel",
        colorHex: "#E9B7C4",
        priceAdjustment: 0,
        stock: 11,
        images: [],
      },
    ],
    dimensions: { width: 60, height: 70, depth: 40 },
    weight: 25,
    material: "PLA+ fosco",
    productionTime: 4,
    stock: 11,
    isAvailable: true,
    isCustom: false,
    badge: "Kit com 6",
    isFeatured: false,
    createdAt: new Date("2026-09-03"),
    updatedAt: new Date("2026-09-03"),
  },
];

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((product) => product.slug === slug);
}

export function getProductsByCategory(categorySlug: string): Product[] {
  return PRODUCTS.filter((product) => product.category === categorySlug);
}

export function getFeaturedProducts(): Product[] {
  return PRODUCTS.filter((product) => product.isFeatured);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  const sameCategory = PRODUCTS.filter(
    (item) => item.category === product.category && item.id !== product.id
  );
  if (sameCategory.length >= limit) return sameCategory.slice(0, limit);
  const others = PRODUCTS.filter(
    (item) => item.category !== product.category && item.id !== product.id
  );
  return [...sameCategory, ...others].slice(0, limit);
}

export function getProductStatus(product: Product) {
  if (!product.isAvailable || product.stock === 0) return "sold_out" as const;
  if (product.price === 0) return "made_to_order" as const;
  if (
    typeof product.stock === "number" &&
    product.stock <= 3 &&
    !(product.variants?.length)
  )
    return "low_stock" as const;
  return "in_stock" as const;
}

export { CATEGORIES };
