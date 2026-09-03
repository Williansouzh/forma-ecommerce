import type { Product } from "@/types/product";
import { CATEGORIES } from "@/data/categories";

const img = (
  slug: string,
  index: number,
  alt: string,
  isPrimary = false
): Product["images"][number] => ({
  id: `${slug}-img-${index}`,
  url: `/images/products/${slug}-${String(index).padStart(2, "0")}${
    index === 3 ? ".svg" : ".jpg"
  }`,
  alt,
  isPrimary,
  order: index,
});

export const PRODUCTS: Product[] = [
  {
    id: "a1f0b2c3-d4e5-4f60-8a71-000000000001",
    slug: "dragao-obsidiana",
    name: "Dragão Obsidiana",
    description:
      "Escultura de coleção esculpida em alta resolução e impressa em resina preta fosca. Cada escama é verificada manualmente antes do acabamento, com pintura em camadas que revela tons profundos sob a luz direta. Peça numerada e acompanhada de certificado do estúdio.",
    shortDescription:
      "Escultura de dragão em resina preta fosca, peça numerada com certificado do estúdio.",
    price: 28900,
    originalPrice: 33900,
    category: "bonecos",
    tags: ["dragão", "escultura", "resina", "colecionável", "fantasia"],
    images: [
      img("dragao-obsidiana", 1, "Dragão Obsidiana vista frontal", true),
      img("dragao-obsidiana", 2, "Dragão Obsidiana detalhe das asas"),
      img("dragao-obsidiana", 3, "Dragão Obsidiana em ambiente"),
    ],
    variants: [
      {
        id: "var-dragao-preto",
        name: "Preto Fosco",
        colorHex: "#111111",
        priceAdjustment: 0,
        stock: 12,
        images: [],
      },
      {
        id: "var-dragao-bronze",
        name: "Bronze Envelhecido",
        colorHex: "#A0461C",
        priceAdjustment: 2000,
        stock: 5,
        images: [],
      },
    ],
    dimensions: { width: 180, height: 240, depth: 160 },
    weight: 640,
    material: "Resina ABS-Like",
    productionTime: 7,
    stock: 17,
    isAvailable: true,
    isCustom: false,
    isFeatured: true,
    badge: "Mais vendido",
    rating: 4.9,
    reviewCount: 132,
    createdAt: new Date("2026-03-14"),
    updatedAt: new Date("2026-08-01"),
  },
  {
    id: "a1f0b2c3-d4e5-4f60-8a71-000000000002",
    slug: "vaso-kintsugi-moderno",
    name: "Vaso Kintsugi Moderno",
    description:
      "Releitura contemporânea da arte japonesa kintsugi: as juntas impressas ganham veios dourados aplicados à mão. Design gerado parametricamente para garantir paredes de espessura uniforme. Impermeabilizado para uso com água.",
    shortDescription:
      "Vaso paramétrico inspirado no kintsugi japonês, com veios dourados aplicados à mão.",
    price: 18900,
    category: "decoracao",
    tags: ["vaso", "kintsugi", "decoração", "japonês"],
    images: [
      img("vaso-kintsugi-moderno", 1, "Vaso Kintsugi Moderno vista principal", true),
      img("vaso-kintsugi-moderno", 2, "Vaso Kintsugi Moderno detalhe dos veios"),
      img("vaso-kintsugi-moderno", 3, "Vaso Kintsugi Moderno em ambiente"),
    ],
    variants: [
      {
        id: "var-kintsugi-gesso",
        name: "Branco Gesso",
        colorHex: "#EDEDE8",
        priceAdjustment: 0,
        stock: 20,
        images: [],
      },
      {
        id: "var-kintsugi-grafite",
        name: "Grafite",
        colorHex: "#444444",
        priceAdjustment: 1000,
        stock: 8,
        images: [],
      },
    ],
    dimensions: { width: 140, height: 260, depth: 140 },
    weight: 420,
    material: "PLA+ Silk",
    productionTime: 5,
    stock: 28,
    isAvailable: true,
    isCustom: false,
    isFeatured: true,
    badge: "Novo",
    rating: 4.8,
    reviewCount: 64,
    createdAt: new Date("2026-07-02"),
    updatedAt: new Date("2026-08-10"),
  },
  {
    id: "a1f0b2c3-d4e5-4f60-8a71-000000000003",
    slug: "miniatura-cyberpunk-city",
    name: "Miniatura Cyberpunk City",
    description:
      "Diorama compacto de metrópole cyberpunk com prédios em diferentes profundidades e letreiros em relevo. Impressa em resina de alta definição com base acrílica inclusa. Edição limitada a 50 unidades numeradas.",
    shortDescription:
      "Diorama de metrópole cyberpunk em resina, edição limitada de 50 unidades.",
    price: 14900,
    category: "miniaturas",
    tags: ["cyberpunk", "diorama", "miniatura", "cidade"],
    images: [
      img("miniatura-cyberpunk-city", 1, "Miniatura Cyberpunk City vista geral", true),
      img("miniatura-cyberpunk-city", 2, "Miniatura Cyberpunk City detalhe dos letreiros"),
      img("miniatura-cyberpunk-city", 3, "Miniatura Cyberpunk City iluminação noturna"),
    ],
    variants: [
      {
        id: "var-cyber-neon",
        name: "Cinza Neon",
        colorHex: "#444444",
        priceAdjustment: 0,
        stock: 2,
        images: [],
      },
    ],
    dimensions: { width: 200, height: 180, depth: 120 },
    weight: 380,
    material: "Resina Padrão",
    productionTime: 6,
    stock: 2,
    isAvailable: true,
    isCustom: false,
    isFeatured: true,
    badge: "Edição limitada",
    rating: 4.7,
    reviewCount: 41,
    createdAt: new Date("2026-05-20"),
    updatedAt: new Date("2026-07-30"),
  },
  {
    id: "a1f0b2c3-d4e5-4f60-8a71-000000000004",
    slug: "busto-anatomia-classica",
    name: "Busto Anatomia Clássica",
    description:
      "Estudo anatômico digitalizado a partir de escaneamento de alta precisão e reimpresso em escala 1:1 reduzida. Superfície lixada em sete etapas até o acabamento acetinado. Produção sob encomenda, com escolha de pátina.",
    shortDescription:
      "Estudo anatômico clássico em escala reduzida, acabamento acetinado sob encomenda.",
    price: 32900,
    category: "bonecos",
    tags: ["busto", "anatomia", "clássico", "escultura", "arte"],
    images: [
      img("busto-anatomia-classica", 1, "Busto Anatomia Clássica perfil", true),
      img("busto-anatomia-classica", 2, "Busto Anatomia Clássica três quartos"),
      img("busto-anatomia-classica", 3, "Busto Anatomia Clássica base"),
    ],
    variants: [
      {
        id: "var-busto-marmore",
        name: "Mármore",
        colorHex: "#EDEDE8",
        priceAdjustment: 0,
        stock: 99,
        images: [],
      },
      {
        id: "var-busto-terra",
        name: "Terra Queimada",
        colorHex: "#C75B2A",
        priceAdjustment: 3000,
        stock: 99,
        images: [],
      },
    ],
    dimensions: { width: 160, height: 320, depth: 190 },
    weight: 890,
    material: "PETG Fosco",
    productionTime: 10,
    stock: 99,
    isAvailable: true,
    isCustom: false,
    isFeatured: true,
    badge: "Exclusivo",
    rating: 5.0,
    reviewCount: 27,
    createdAt: new Date("2026-04-11"),
    updatedAt: new Date("2026-08-05"),
  },
  {
    id: "a1f0b2c3-d4e5-4f60-8a71-000000000005",
    slug: "luminaria-organica",
    name: "Luminária Orgânica",
    description:
      "Luz difusa através de paredes translúcidas impressas em espiral contínua, sem emendas visíveis. Estrutura interna acomoda lâmpada LED E14 (não inclusa). O padrão de superfície projeta sombras suaves e mutáveis no ambiente.",
    shortDescription:
      "Luminária de paredes translúcidas impressas em espiral contínua, luz difusa e sombras suaves.",
    price: 25900,
    category: "decoracao",
    tags: ["luminária", "luz", "orgânico", "decoração"],
    images: [
      img("luminaria-organica", 1, "Luminária Orgânica acesa", true),
      img("luminaria-organica", 2, "Luminária Orgânica textura em espiral"),
      img("luminaria-organica", 3, "Luminária Orgânica em ambiente"),
    ],
    variants: [
      {
        id: "var-lum-natural",
        name: "Natural",
        colorHex: "#EDEDE8",
        priceAdjustment: 0,
        stock: 15,
        images: [],
      },
      {
        id: "var-lum-laranja",
        name: "Laranja Queimado",
        colorHex: "#C75B2A",
        priceAdjustment: 1500,
        stock: 9,
        images: [],
      },
    ],
    dimensions: { width: 180, height: 280, depth: 180 },
    weight: 510,
    material: "PLA Translúcido",
    productionTime: 6,
    stock: 24,
    isAvailable: true,
    isCustom: false,
    isFeatured: true,
    badge: "Novo",
    rating: 4.9,
    reviewCount: 58,
    createdAt: new Date("2026-06-18"),
    updatedAt: new Date("2026-08-12"),
  },
  {
    id: "a1f0b2c3-d4e5-4f60-8a71-000000000006",
    slug: "personagem-customizado",
    name: "Personagem Customizado",
    description:
      "Envie referências do seu personagem favorito ou criação original. Nosso time modela do zero, envia prévia para aprovação e produz em resina com pintura artesanal. Orçamento personalizado conforme complexidade e escala.",
    shortDescription:
      "Personagem modelado do zero a partir das suas referências, com pintura artesanal.",
    price: 0,
    category: "personalizados",
    tags: ["customizado", "personagem", "sob consulta", "exclusivo"],
    images: [
      img("personagem-customizado", 1, "Personagem Customizado exemplo 1", true),
      img("personagem-customizado", 2, "Personagem Customizado exemplo 2"),
      img("personagem-customizado", 3, "Personagem Customizado processo"),
    ],
    variants: [],
    dimensions: { width: 120, height: 220, depth: 120 },
    weight: 350,
    material: "Resina + Pintura Artesanal",
    productionTime: 21,
    stock: 9999,
    isAvailable: true,
    isCustom: true,
    isFeatured: true,
    badge: "Sob encomenda",
    rating: 4.9,
    reviewCount: 89,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-08-01"),
  },
  {
    id: "a1f0b2c3-d4e5-4f60-8a71-000000000007",
    slug: "levi-ackerman-ataque-dos-titas",
    name: 'Levi Ackerman — Ataque dos Titãs',
    description:
      "Figure do capitão mais forte da humanidade, capturado em pose dinâmica com equipamento de manobra tridimensional em detalhe. Impresso em resina cinza para pintura ou na versão já finalizada com base temática.",
    shortDescription:
      "Figure do capitão Levi em pose dinâmica, disponível para pintura ou finalizada.",
    price: 19900,
    category: "bonecos",
    tags: ["levi", "ataque dos titãs", "anime", "figure", "geek"],
    images: [
      img("levi-ackerman-ataque-dos-titas", 1, "Levi Ackerman pose de combate", true),
      img("levi-ackerman-ataque-dos-titas", 2, "Levi Ackerman detalhe do equipamento"),
      img("levi-ackerman-ataque-dos-titas", 3, "Levi Ackerman base temática"),
    ],
    variants: [
      {
        id: "var-levi-cinza",
        name: "Cinza para Pintura",
        colorHex: "#888888",
        priceAdjustment: 0,
        stock: 10,
        images: [],
      },
      {
        id: "var-levi-pintado",
        name: "Pintado à Mão",
        colorHex: "#111111",
        priceAdjustment: 6000,
        stock: 4,
        images: [],
      },
    ],
    dimensions: { width: 110, height: 230, depth: 130 },
    weight: 310,
    material: "Resina ABS-Like",
    productionTime: 8,
    stock: 14,
    isAvailable: true,
    isCustom: false,
    isFeatured: false,
    rating: 4.8,
    reviewCount: 73,
    createdAt: new Date("2026-02-27"),
    updatedAt: new Date("2026-07-19"),
  },
  {
    id: "a1f0b2c3-d4e5-4f60-8a71-000000000008",
    slug: "vaso-parametrico-espiral",
    name: "Vaso Paramétrico Espiral",
    description:
      "Geometria gerada por algoritmo: cada vaso é único, com assinatura numérica gravada na base. As nervuras em espiral criam brinquedo de luz durante o dia e textura tátil marcante. Ideal para arranjos secos.",
    shortDescription:
      "Vaso de geometria algorítmica única, com assinatura numérica gravada na base.",
    price: 15900,
    category: "decoracao",
    tags: ["vaso", "paramétrico", "algoritmo", "design"],
    images: [
      img("vaso-parametrico-espiral", 1, "Vaso Paramétrico Espiral vista principal", true),
      img("vaso-parametrico-espiral", 2, "Vaso Paramétrico Espiral nervuras"),
      img("vaso-parametrico-espiral", 3, "Vaso Paramétrico Espiral base numerada"),
    ],
    variants: [
      {
        id: "var-vasop-areia",
        name: "Areia",
        colorHex: "#EDEDE8",
        priceAdjustment: 0,
        stock: 16,
        images: [],
      },
      {
        id: "var-vasop-musgo",
        name: "Musgo",
        colorHex: "#2D6A4F",
        priceAdjustment: 800,
        stock: 11,
        images: [],
      },
    ],
    dimensions: { width: 120, height: 210, depth: 120 },
    weight: 290,
    material: "PLA+ Matte",
    productionTime: 4,
    stock: 27,
    isAvailable: true,
    isCustom: false,
    isFeatured: false,
    rating: 4.6,
    reviewCount: 38,
    createdAt: new Date("2026-03-30"),
    updatedAt: new Date("2026-06-25"),
  },
  {
    id: "a1f0b2c3-d4e5-4f60-8a71-000000000009",
    slug: "miniatura-millennium-falcon",
    name: "Miniatura Millennium Falcon",
    description:
      "A nave mais veloz da galáxia em escala 1:144, com painéis em relevo fiéis ao modelo de filmagem original. Suporte angular incluso para exibição em voo. Impressa em resina de alta definição.",
    shortDescription:
      "Millennium Falcon em escala 1:144 com painéis fiéis ao modelo original e suporte de exibição.",
    price: 22900,
    category: "miniaturas",
    tags: ["millennium falcon", "star wars", "nave", "miniatura", "geek"],
    images: [
      img("miniatura-millennium-falcon", 1, "Millennium Falcon vista superior", true),
      img("miniatura-millennium-falcon", 2, "Millennium Falcon painéis em relevo"),
      img("miniatura-millennium-falcon", 3, "Millennium Falcon suporte angular"),
    ],
    variants: [
      {
        id: "var-falcon-cinza",
        name: "Cinza Espacial",
        colorHex: "#888888",
        priceAdjustment: 0,
        stock: 13,
        images: [],
      },
    ],
    dimensions: { width: 220, height: 60, depth: 170 },
    weight: 340,
    material: "Resina Padrão",
    productionTime: 7,
    stock: 13,
    isAvailable: true,
    isCustom: false,
    isFeatured: false,
    rating: 4.9,
    reviewCount: 95,
    createdAt: new Date("2026-04-22"),
    updatedAt: new Date("2026-08-03"),
  },
  {
    id: "a1f0b2c3-d4e5-4f60-8a71-000000000010",
    slug: "busto-david-estilizado",
    name: "Busto David Estilizado",
    description:
      "O clássico de Michelangelo reinterpretado em facetas low-poly que dançam entre o digital e o mármore. Cada face é polida individualmente. Uma declaração de amor entre o Renascimento e a cultura maker.",
    shortDescription:
      "David de Michelangelo reinterpretado em facetas low-poly, entre o clássico e o digital.",
    price: 27900,
    category: "bonecos",
    tags: ["david", "michelangelo", "low poly", "arte", "clássico"],
    images: [
      img("busto-david-estilizado", 1, "Busto David Estilizado vista frontal", true),
      img("busto-david-estilizado", 2, "Busto David Estilizado facetas"),
      img("busto-david-estilizado", 3, "Busto David Estilizado em ambiente"),
    ],
    variants: [
      {
        id: "var-david-branco",
        name: "Branco Alabastro",
        colorHex: "#EDEDE8",
        priceAdjustment: 0,
        stock: 99,
        images: [],
      },
      {
        id: "var-david-preto",
        name: "Preto Obsidiana",
        colorHex: "#111111",
        priceAdjustment: 1500,
        stock: 99,
        images: [],
      },
    ],
    dimensions: { width: 150, height: 300, depth: 170 },
    weight: 720,
    material: "PETG Fosco",
    productionTime: 9,
    stock: 99,
    isAvailable: true,
    isCustom: false,
    isFeatured: false,
    rating: 4.8,
    reviewCount: 46,
    createdAt: new Date("2026-05-09"),
    updatedAt: new Date("2026-07-22"),
  },
  {
    id: "a1f0b2c3-d4e5-4f60-8a71-000000000011",
    slug: "chaveiro-inicial-personalizado",
    name: "Chaveiro Inicial Personalizado",
    description:
      "Chaveiro leve em PLA fosco com inicial em relevo e argola metálica inclusa. Ideal para presente rápido, lembrança de evento ou kit corporativo pequeno. A peça recebe acabamento de borda e conferência manual antes da embalagem.",
    shortDescription:
      "Chaveiro em PLA fosco com inicial em relevo, feito para presente rápido.",
    price: 3900,
    category: "presentes",
    tags: ["chaveiro", "personalizado", "presente", "pla", "inicial"],
    images: [
      img("vaso-parametrico-espiral", 3, "Chaveiro personalizado em PLA fosco", true),
      img("personagem-customizado", 3, "Detalhe de acabamento de chaveiro personalizado"),
    ],
    variants: [
      {
        id: "var-chaveiro-preto",
        name: "Preto Fosco",
        colorHex: "#111111",
        priceAdjustment: 0,
        stock: 40,
        images: [],
      },
      {
        id: "var-chaveiro-laranja",
        name: "Laranja FORMA",
        colorHex: "#C75B2A",
        priceAdjustment: 0,
        stock: 30,
        images: [],
      },
      {
        id: "var-chaveiro-musgo",
        name: "Verde Musgo",
        colorHex: "#2D6A4F",
        priceAdjustment: 0,
        stock: 24,
        images: [],
      },
    ],
    dimensions: { width: 42, height: 60, depth: 5 },
    weight: 18,
    material: "PLA+ Matte",
    productionTime: 3,
    stock: 94,
    isAvailable: true,
    isCustom: true,
    isFeatured: true,
    badge: "Personalizável",
    rating: 4.9,
    reviewCount: 36,
    createdAt: new Date("2026-08-20"),
    updatedAt: new Date("2026-09-01"),
  },
  {
    id: "a1f0b2c3-d4e5-4f60-8a71-000000000012",
    slug: "kit-chaveiros-presente",
    name: "Kit Chaveiros Presente",
    description:
      "Trio de chaveiros impressos em PLA com paleta coordenada, embalagem de presente e cartão do estúdio. Uma opção de entrada para quem quer presentear com algo físico, personalizado e bem acabado.",
    shortDescription:
      "Trio de chaveiros em PLA com paleta coordenada e embalagem de presente.",
    price: 9900,
    originalPrice: 11700,
    category: "presentes",
    tags: ["chaveiro", "kit", "presente", "lembrança", "pla"],
    images: [
      img("personagem-customizado", 3, "Kit de chaveiros em embalagem de presente", true),
      img("vaso-kintsugi-moderno", 3, "Detalhe de embalagem e acabamento"),
    ],
    variants: [
      {
        id: "var-kit-neutro",
        name: "Neutros",
        colorHex: "#EDEDE8",
        priceAdjustment: 0,
        stock: 20,
        images: [],
      },
      {
        id: "var-kit-terra",
        name: "Terra",
        colorHex: "#A0461C",
        priceAdjustment: 0,
        stock: 18,
        images: [],
      },
    ],
    dimensions: { width: 60, height: 70, depth: 18 },
    weight: 62,
    material: "PLA+ Matte",
    productionTime: 4,
    stock: 38,
    isAvailable: true,
    isCustom: false,
    isFeatured: true,
    badge: "Presente",
    rating: 4.8,
    reviewCount: 22,
    createdAt: new Date("2026-08-22"),
    updatedAt: new Date("2026-09-01"),
  },
  {
    id: "a1f0b2c3-d4e5-4f60-8a71-000000000013",
    slug: "cacto-trancado-mesa",
    name: "Cacto Trançado de Mesa",
    description:
      "Cacto decorativo impresso em PLA com textura trançada aparente, vaso integrado e acabamento manual nas bordas. A peça foi pensada para mesa, prateleira ou composição de presente: não precisa de água, não desbota fácil em ambiente interno e mostra de perto o desenho das camadas.",
    shortDescription:
      "Cacto decorativo em PLA com textura trançada aparente e vaso integrado.",
    price: 8900,
    category: "decoracao",
    tags: ["cacto", "decoração", "mesa", "pla", "presente"],
    images: [
      {
        id: "cacto-trancado-mesa-img-1",
        url: "/images/products/cacto-trancado-mesa-01.jpg",
        alt: "Dois cactos decorativos impressos em PLA sobre mesa de madeira",
        isPrimary: true,
        order: 1,
      },
      {
        id: "cacto-trancado-mesa-img-2",
        url: "/images/products/cacto-trancado-mesa-02.jpg",
        alt: "Conjunto de cactos decorativos com textura trançada em PLA",
        isPrimary: false,
        order: 2,
      },
    ],
    variants: [
      {
        id: "var-cacto-musgo",
        name: "Musgo + Terracota",
        colorHex: "#2D6A4F",
        priceAdjustment: 0,
        stock: 18,
        images: [],
      },
      {
        id: "var-cacto-terracota",
        name: "Terracota + Verde",
        colorHex: "#C95424",
        priceAdjustment: 0,
        stock: 12,
        images: [],
      },
    ],
    dimensions: { width: 90, height: 150, depth: 90 },
    weight: 140,
    material: "PLA+ Matte",
    productionTime: 4,
    stock: 30,
    isAvailable: true,
    isCustom: false,
    isFeatured: true,
    badge: "Textura real",
    rating: 4.9,
    reviewCount: 18,
    createdAt: new Date("2026-09-02"),
    updatedAt: new Date("2026-09-02"),
  },
  {
    id: "a1f0b2c3-d4e5-4f60-8a71-000000000014",
    slug: "painel-sensorial-colorido",
    name: "Painel Sensorial Colorido",
    description:
      "Peça interativa impressa em PLA com base fosca, discos coloridos e alças rígidas. Boa para atividades educativas, rotina visual, coordenação motora ou projeto personalizado por cor. As marcas de camada ficam visíveis nas laterais e reforçam o caráter físico da impressão 3D.",
    shortDescription:
      "Painel interativo em PLA com discos coloridos, alças rígidas e textura visível.",
    price: 12900,
    category: "personalizados",
    tags: ["sensorial", "educativo", "personalizado", "pla", "colorido"],
    images: [
      {
        id: "painel-sensorial-colorido-img-1",
        url: "/images/products/painel-sensorial-colorido-01.jpg",
        alt: "Painel sensorial colorido impresso em PLA segurado com a mão",
        isPrimary: true,
        order: 1,
      },
      {
        id: "painel-sensorial-colorido-img-2",
        url: "/images/products/painel-sensorial-colorido-02.jpg",
        alt: "Detalhe do painel sensorial com discos coloridos e camadas de impressão",
        isPrimary: false,
        order: 2,
      },
      {
        id: "painel-sensorial-colorido-img-3",
        url: "/images/products/painel-sensorial-colorido-03.jpg",
        alt: "Close da textura dos discos coloridos no painel sensorial",
        isPrimary: false,
        order: 3,
      },
    ],
    variants: [
      {
        id: "var-painel-coral",
        name: "Base Coral",
        colorHex: "#E7A078",
        priceAdjustment: 0,
        stock: 8,
        images: [],
      },
      {
        id: "var-painel-colorido",
        name: "Discos Coloridos",
        colorHex: "#4F46E5",
        priceAdjustment: 0,
        stock: 8,
        images: [],
      },
    ],
    dimensions: { width: 180, height: 250, depth: 18 },
    weight: 220,
    material: "PLA+ Matte",
    productionTime: 5,
    stock: 8,
    isAvailable: true,
    isCustom: true,
    isFeatured: true,
    badge: "Sob medida",
    rating: 4.8,
    reviewCount: 9,
    createdAt: new Date("2026-09-02"),
    updatedAt: new Date("2026-09-02"),
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
