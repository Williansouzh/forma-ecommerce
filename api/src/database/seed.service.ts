import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ConfigService } from "@nestjs/config";
import { Model } from "mongoose";
import * as bcrypt from "bcryptjs";
import { User, UserDocument } from "../modules/auth/schemas/user.schema";
import {
  Product,
  ProductDocument,
} from "../modules/products/schemas/product.schema";
import type { ApiConfig } from "../config/configuration";

const DEMO_PRODUCTS = [
  {
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
      { url: "/images/products/dragao-obsidiana-01.jpg", alt: "Dragão Obsidiana vista frontal" },
      { url: "/images/products/dragao-obsidiana-02.jpg", alt: "Dragão Obsidiana detalhe das asas" },
      { url: "/images/products/dragao-obsidiana-03.jpg", alt: "Dragão Obsidiana em ambiente" },
    ],
    material: "Resina ABS-Like",
    productionTime: 7,
    dimensions: { width: 180, height: 240, depth: 160 },
    weight: 640,
    isFeatured: true,
    badge: "Mais vendido",
  },
  {
    name: "Vaso Kintsugi Moderno",
    description:
      "Releitura contemporânea da arte japonesa kintsugi: as juntas impressas ganham veios dourados aplicados à mão. Design gerado parametricamente para garantir paredes de espessura uniforme. Impermeabilizado para uso com água.",
    shortDescription:
      "Vaso paramétrico inspirado no kintsugi japonês, com veios dourados aplicados à mão.",
    price: 18900,
    category: "decoracao",
    tags: ["vaso", "kintsugi", "decoração", "japonês"],
    images: [
      { url: "/images/products/vaso-kintsugi-moderno-01.jpg", alt: "Vaso Kintsugi Moderno vista frontal" },
      { url: "/images/products/vaso-kintsugi-moderno-02.jpg", alt: "Vaso Kintsugi Moderno em ambiente" },
      { url: "/images/products/vaso-kintsugi-moderno-03.svg", alt: "Vaso Kintsugi Moderno ilustração" },
    ],
    material: "PLA+ Silk",
    productionTime: 5,
    dimensions: { width: 140, height: 260, depth: 140 },
    weight: 380,
    isFeatured: true,
    badge: "Novo",
  },
  {
    name: "Miniatura Cyberpunk City",
    description:
      "Diorama de quarteirão cyberpunk com letreiros neon pintados à mão sob lupa. Impressa em resina de alta definição para capturar cada antena e ar-condicionado dos edifícios.",
    shortDescription: "Diorama cyberpunk com letreiros neon pintados à mão.",
    price: 14900,
    category: "geek",
    tags: ["cyberpunk", "diorama", "miniatura", "neon"],
    images: [
      { url: "/images/products/miniatura-cyberpunk-city-01.jpg", alt: "Miniatura Cyberpunk City vista geral" },
      { url: "/images/products/miniatura-cyberpunk-city-02.jpg", alt: "Miniatura Cyberpunk City detalhe dos letreiros" },
      { url: "/images/products/miniatura-cyberpunk-city-03.jpg", alt: "Miniatura Cyberpunk City em ambiente" },
    ],
    material: "Resina Padrão",
    productionTime: 8,
    dimensions: { width: 220, height: 180, depth: 220 },
    weight: 520,
    isFeatured: true,
    badge: "Edição limitada",
  },
  {
    name: "Busto Anatomia Clássica",
    description:
      "Estudo anatômico em estilo clássico, digitalizado a partir de escultura em argila e finalizado com pátina envelhecida. Peça de sob encomenda: produzimos após a confirmação do pedido.",
    shortDescription: "Busto anatômico com pátina envelhecida, sob encomenda.",
    price: 0,
    category: "bonecos",
    tags: ["busto", "anatomia", "escultura", "clássico"],
    images: [
      { url: "/images/products/busto-anatomia-classica-01.jpg", alt: "Busto Anatomia Clássica vista frontal" },
      { url: "/images/products/busto-anatomia-classica-02.jpg", alt: "Busto Anatomia Clássica perfil" },
      { url: "/images/products/busto-anatomia-classica-03.jpg", alt: "Busto Anatomia Clássica em ambiente" },
    ],
    material: "Resina ABS-Like",
    productionTime: 12,
    dimensions: { width: 200, height: 320, depth: 190 },
    weight: 900,
    isAvailable: true,
    isFeatured: true,
    badge: "Exclusivo",
  },
  {
    name: "Luminária Orgânica",
    description:
      "Luminária de mesa com superfície voronoi que projeta sombras orgânicas nas paredes. Acompanha cabo têxtil e lâmpada LED de 2700K.",
    shortDescription: "Luminária voronoi com sombras orgânicas e LED quente.",
    price: 25900,
    category: "decoracao",
    tags: ["luminária", "voronoi", "iluminação", "orgânico"],
    images: [
      { url: "/images/products/luminaria-organica-01.jpg", alt: "Luminária Orgânica acesa" },
      { url: "/images/products/luminaria-organica-02.jpg", alt: "Luminária Orgânica em ambiente" },
      { url: "/images/products/luminaria-organica-03.jpg", alt: "Luminária Orgânica detalhe" },
    ],
    material: "PLA+ Fosco",
    productionTime: 6,
    dimensions: { width: 160, height: 300, depth: 160 },
    weight: 450,
    isFeatured: true,
    badge: "Novo",
  },
  {
    name: "Personagem Customizado",
    description:
      "Sua ideia modelada do zero pelo nosso time de design. Envie referências, acompanhe a prévia 3D e receba uma peça única — nenhuma igual será reimpressa.",
    shortDescription: "Peça única modelada do zero a partir das suas referências.",
    price: 0,
    category: "personalizados",
    tags: ["customizado", "sob medida", "exclusivo"],
    images: [
      { url: "/images/products/personagem-customizado-01.jpg", alt: "Personagem Customizado exemplo" },
      { url: "/images/products/personagem-customizado-02.jpg", alt: "Personagem Customizado processo" },
      { url: "/images/products/personagem-customizado-03.svg", alt: "Personagem Customizado ilustração" },
    ],
    material: "A definir no orçamento",
    productionTime: 15,
    isAvailable: true,
    badge: "Sob consulta",
  },
  {
    name: "Levi Ackerman — Ataque dos Titãs",
    description:
      "Figura de coleção do capitão Levi com equipamento de manobra tridimensional detalhado. Base diorâmica inclusa.",
    shortDescription: "Figura de coleção do capitão Levi com base diorâmica.",
    price: 19900,
    category: "geek",
    tags: ["levi", "anime", "ataque dos titãs", "figura"],
    images: [
      { url: "/images/products/levi-ackerman-ataque-dos-titas-01.jpg", alt: "Figura Levi Ackerman vista frontal" },
      { url: "/images/products/levi-ackerman-ataque-dos-titas-02.jpg", alt: "Figura Levi Ackerman detalhe" },
      { url: "/images/products/levi-ackerman-ataque-dos-titas-03.jpg", alt: "Figura Levi Ackerman em ambiente" },
    ],
    material: "Resina Padrão",
    productionTime: 9,
    dimensions: { width: 150, height: 240, depth: 150 },
    weight: 410,
  },
  {
    name: "Vaso Paramétrico Espiral",
    description:
      "Vaso gerado por algoritmo com superfície em espiral contínua. Cada variação de parâmetro gera um desenho único de paredes.",
    shortDescription: "Vaso algorítmico com superfície em espiral contínua.",
    price: 15900,
    category: "decoracao",
    tags: ["vaso", "paramétrico", "espiral", "algoritmo"],
    images: [
      { url: "/images/products/vaso-parametrico-espiral-01.jpg", alt: "Vaso Paramétrico Espiral vista frontal" },
      { url: "/images/products/vaso-parametrico-espiral-02.jpg", alt: "Vaso Paramétrico Espiral detalhe da espiral" },
      { url: "/images/products/vaso-parametrico-espiral-03.jpg", alt: "Vaso Paramétrico Espiral em ambiente" },
    ],
    material: "PETG Translúcido",
    productionTime: 5,
    dimensions: { width: 130, height: 240, depth: 130 },
    weight: 320,
  },
  {
    name: "Miniatura Millennium Falcon",
    description:
      "Réplica da nave mais rápida da galáxia com painéis gravados em escala fina e suporte de exibição angular.",
    shortDescription: "Réplica da Millennium Falcon com suporte de exibição.",
    price: 22900,
    category: "geek",
    tags: ["star wars", "millennium falcon", "nave", "geek"],
    images: [
      { url: "/images/products/miniatura-millennium-falcon-01.jpg", alt: "Miniatura Millennium Falcon vista superior" },
      { url: "/images/products/miniatura-millennium-falcon-02.jpg", alt: "Miniatura Millennium Falcon detalhe" },
      { url: "/images/products/miniatura-millennium-falcon-03.jpg", alt: "Miniatura Millennium Falcon em ambiente" },
    ],
    material: "PLA+ Cinza",
    productionTime: 7,
    dimensions: { width: 280, height: 90, depth: 220 },
    weight: 480,
  },
  {
    name: "Busto David Estilizado",
    description:
      "O David de Michelangelo reinterpretado em formas facetadas low-poly. Impressão em monocamada visível que valoriza a geometria.",
    shortDescription: "David de Michelangelo em releitura facetada low-poly.",
    price: 27900,
    category: "presentes",
    tags: ["david", "low-poly", "arte", "estatueta"],
    images: [
      { url: "/images/products/busto-david-estilizado-01.jpg", alt: "Busto David Estilizado vista frontal" },
      { url: "/images/products/busto-david-estilizado-02.jpg", alt: "Busto David Estilizado ângulo lateral" },
      { url: "/images/products/busto-david-estilizado-03.jpg", alt: "Busto David Estilizado em ambiente" },
    ],
    material: "PLA Mármore",
    productionTime: 6,
    dimensions: { width: 170, height: 300, depth: 170 },
    weight: 560,
  },
];

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly config: ConfigService<ApiConfig>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedAdmin();
    if (this.config.get<boolean>("seedDemo")) {
      await this.seedDemoProducts();
    }
  }

  private async seedAdmin() {
    const email = this.config.get<string>("adminEmail")!.toLowerCase();
    const exists = await this.userModel.findOne({ email }).exec();
    if (exists) return;

    const passwordHash = await bcrypt.hash(
      this.config.get<string>("adminPassword")!,
      10,
    );
    await this.userModel.create({
      email,
      passwordHash,
      name: this.config.get<string>("adminName"),
      role: "superadmin",
    });
    this.logger.log(`Super admin criado: ${email}`);
  }

  private async seedDemoProducts() {
    const total = await this.productModel.countDocuments().exec();
    if (total > 0) return;

    for (const item of DEMO_PRODUCTS) {
      const { name, ...rest } = item;
      await this.productModel.create({
        ...rest,
        name,
        slug: name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, ""),
      });
    }
    this.logger.log(`${DEMO_PRODUCTS.length} produtos de demonstração criados.`);
  }
}
