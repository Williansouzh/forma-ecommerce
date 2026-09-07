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
import { Order, OrderDocument } from "../modules/orders/schemas/order.schema";
import type { ApiConfig } from "../config/configuration";

const DEMO_PRODUCTS = [
  {
    name: "Cactos de Mesa",
    slug: "cactos-mesa",
    description:
      "Três cactos de mesa impressos em PLA fosco, com a textura de espinho saindo do próprio caminho da extrusora — nada é colado depois. Cada um vem no seu vasinho de parede trançada, impresso em vaso mode numa volta só. Ficam de pé sozinhos e não pedem água.",
    shortDescription:
      "Cactos impressos em PLA com textura de espinho aparente e vasinho de parede trançada.",
    price: 9900,
    category: "decoracao",
    tags: ["cactos", "mesa", "decoração", "casa", "pla+ fosco"],
    images: [
      { url: "/images/products/cactos-01.jpg", alt: "Cactos de Mesa, o trio completo" },
      { url: "/images/products/cactos-02.jpg", alt: "Detalhe da textura de espinho" },
      { url: "/images/products/cactos-03.jpg", alt: "Cactos de Mesa em ambiente" },
      { url: "/images/products/cactos-04.jpg", alt: "Vasinho de parede trançada" },
    ],
    variants: [
      { id: "var-cactos-mesa-1", name: "Verde Musgo", colorHex: "#4F6248", priceAdjustment: 0, stock: 4 },
      { id: "var-cactos-mesa-2", name: "Verde Claro", colorHex: "#7E9163", priceAdjustment: 0, stock: 4 },
      { id: "var-cactos-mesa-3", name: "Terracota", colorHex: "#AE5E3D", priceAdjustment: 0, stock: 4 },
    ],
    material: "PLA+ fosco",
    productionTime: 4,
    stock: 14,
    dimensions: { width: 90, height: 140, depth: 90 },
    weight: 180,
    isCustom: false,
    isFeatured: true,
    badge: "Mais vendido",
  },
  {
    name: "Vaso Nervura",
    slug: "vaso-nervura",
    description:
      "Vaso de parede nervurada impresso em PLA+ Silk, que devolve a luz de um jeito acetinado em vez de brilhante. Vem em conjunto com bandeja e porta-vela do mesmo desenho. Impermeabilizado por dentro para receber água.",
    shortDescription:
      "Vaso de parede nervurada com bandeja e porta-vela no conjunto.",
    price: 12900,
    category: "decoracao",
    tags: ["vaso", "nervura", "decoração", "casa", "pla+ silk"],
    images: [
      { url: "/images/products/vaso-nervura-01.jpg", alt: "Vaso Nervura visto de frente" },
      { url: "/images/products/vaso-nervura-02.jpg", alt: "Conjunto com bandeja e porta-vela" },
    ],
    variants: [
      { id: "var-vaso-nervura-1", name: "Branco Gesso", colorHex: "#EDEBE4", priceAdjustment: 0, stock: 3 },
      { id: "var-vaso-nervura-2", name: "Rosa Argila", colorHex: "#D9A38C", priceAdjustment: 0, stock: 3 },
    ],
    material: "PLA+ Silk",
    productionTime: 5,
    stock: 7,
    dimensions: { width: 120, height: 220, depth: 120 },
    weight: 310,
    isCustom: false,
    badge: "Conjunto",
    isFeatured: true,
  },
  {
    name: "Dragão Articulado",
    slug: "dragao-articulado",
    description:
      "Quarenta e dois centímetros de dragão com 38 juntas que se mexem — e tudo sai da mesa impresso de uma vez, sem montagem. O filamento gradiente troca de cor ao longo do corpo, então nenhuma peça sai idêntica à anterior.",
    shortDescription:
      "Dragão de 42 cm com 38 juntas móveis, impresso em uma peça só.",
    price: 8900,
    category: "colecionaveis",
    tags: ["dragão", "articulado", "geek", "colecionável", "pla+ gradient"],
    images: [
      { url: "/images/products/dragao-01.jpg", alt: "Dragão Articulado inteiro sobre a mesa" },
    ],
    variants: [
      { id: "var-dragao-articulado-1", name: "Azul Gelo", colorHex: "#8FA8C8", priceAdjustment: 0, stock: 2 },
      { id: "var-dragao-articulado-2", name: "Lilás", colorHex: "#A996C4", priceAdjustment: 0, stock: 2 },
    ],
    material: "PLA+ Gradient",
    productionTime: 4,
    stock: 5,
    dimensions: { width: 420, height: 110, depth: 80 },
    weight: 260,
    isCustom: false,
    isFeatured: true,
    badge: "38 juntas móveis",
  },
  {
    name: "Gato de Contorno",
    slug: "gato-contorno",
    description:
      "O desenho de um gato feito sem tirar a caneta do papel, levantado em três dimensões. Fica em pé na estante ou encostado na parede, e o vazado entre as linhas muda conforme a luz do ambiente.",
    shortDescription:
      "Um gato desenhado em uma linha só e levantado do papel.",
    price: 5900,
    category: "decoracao",
    tags: ["gato", "contorno", "decoração", "casa", "pla fosco"],
    images: [
      { url: "/images/products/gato-01.jpg", alt: "Gato de Contorno apoiado na estante" },
    ],
    variants: [
      { id: "var-gato-contorno-1", name: "Preto Fosco", colorHex: "#1B1A15", priceAdjustment: 0, stock: 9 },
    ],
    material: "PLA fosco",
    productionTime: 3,
    stock: 9,
    dimensions: { width: 150, height: 180, depth: 40 },
    weight: 90,
    isCustom: false,
    isFeatured: true,
  },
  {
    name: "Suporte Onda",
    slug: "suporte-onda",
    description:
      "Suporte de celular com perfil de onda e o miolo listrado pelas próprias camadas de impressão. Segura o aparelho em pé ou deitado, com recorte para o cabo passar por baixo. Base com peso suficiente para não escorregar.",
    shortDescription:
      "Suporte de celular de perfil curvo com miolo em camadas coloridas.",
    price: 4500,
    category: "decoracao",
    tags: ["suporte", "onda", "utilidade", "mesa", "pla+ multicor"],
    images: [
      { url: "/images/products/suporte-01.jpg", alt: "Suporte Onda com celular apoiado" },
      { url: "/images/products/suporte-02.jpg", alt: "Perfil curvo do suporte" },
      { url: "/images/products/suporte-03.jpg", alt: "Camadas coloridas do miolo" },
    ],
    variants: [
      { id: "var-suporte-onda-1", name: "Rosa Quartzo", colorHex: "#E4A6AC", priceAdjustment: 0, stock: 11 },
      { id: "var-suporte-onda-2", name: "Arco-íris", colorHex: "#C97F4A", priceAdjustment: 0, stock: 11 },
    ],
    material: "PLA+ multicor",
    productionTime: 3,
    stock: 22,
    dimensions: { width: 100, height: 80, depth: 90 },
    weight: 70,
    isCustom: false,
    isFeatured: false,
  },
  {
    name: "Painel de Cores",
    slug: "painel-cores",
    description:
      "Painel sensorial de encaixe, feito para mão pequena: discos coloridos que entram e saem, alças rígidas e nenhuma quina viva. A paleta e o nome gravado saem combinados com você antes de a impressão começar.",
    shortDescription:
      "Painel sensorial de encaixe com discos coloridos e alças rígidas.",
    price: 13900,
    category: "personalizados",
    tags: ["painel", "cores", "sob medida", "personalizado", "pla+ fosco"],
    images: [
      { url: "/images/products/painel-01.jpg", alt: "Painel de Cores montado" },
      { url: "/images/products/painel-02.jpg", alt: "Discos de encaixe do painel" },
    ],
    variants: [
      { id: "var-painel-cores-1", name: "Base Branca", colorHex: "#EDEBE4", priceAdjustment: 0, stock: 1 },
      { id: "var-painel-cores-2", name: "Base Coral", colorHex: "#E7A078", priceAdjustment: 0, stock: 1 },
    ],
    material: "PLA+ fosco",
    productionTime: 7,
    stock: 3,
    dimensions: { width: 300, height: 240, depth: 25 },
    weight: 520,
    isCustom: true,
    isFeatured: false,
    badge: "Sob medida",
  },
  {
    name: "Tag de Pet",
    slug: "tag-pet",
    description:
      "Plaquinha de identificação com o nome do bicho em relevo e o telefone no verso. Leve o bastante para não incomodar na coleira e impressa em sólido, sem miolo oco, para aguentar mordida e chuva.",
    shortDescription:
      "Plaquinha de identificação com o nome do bicho em relevo.",
    price: 3200,
    category: "presentes",
    tags: ["tag", "pet", "presente", "lembrança", "pla+ fosco"],
    images: [
      { url: "/images/products/tag-01.jpg", alt: "Tag de Pet com nome em relevo" },
    ],
    variants: [
      { id: "var-tag-pet-1", name: "Verde Musgo", colorHex: "#4F6248", priceAdjustment: 0, stock: 20 },
      { id: "var-tag-pet-2", name: "Barro", colorHex: "#AE5E3D", priceAdjustment: 0, stock: 20 },
    ],
    material: "PLA+ fosco",
    productionTime: 2,
    stock: 40,
    dimensions: { width: 38, height: 28, depth: 4 },
    weight: 6,
    isCustom: true,
    badge: "Com nome",
    isFeatured: false,
  },
  {
    name: "Vaso Canelado",
    slug: "vaso-canelado",
    description:
      "Canelado fundo o suficiente para o vaso ganhar sombra própria ao longo do dia. Impresso em PLA+ Silk e entregue sobre bandeja de madeira, com porta-vela do mesmo desenho para fechar o conjunto.",
    shortDescription:
      "Vaso de canelado profundo com bandeja de madeira e porta-vela.",
    price: 11900,
    category: "decoracao",
    tags: ["vaso", "canelado", "decoração", "casa", "pla+ silk"],
    images: [
      { url: "/images/products/vaso-canelado-01.jpg", alt: "Vaso Canelado sobre a bandeja" },
      { url: "/images/products/vaso-canelado-02.jpg", alt: "Detalhe do canelado" },
    ],
    variants: [
      { id: "var-vaso-canelado-1", name: "Verde Oliva", colorHex: "#5C6A49", priceAdjustment: 0, stock: 3 },
      { id: "var-vaso-canelado-2", name: "Branco Gesso", colorHex: "#EDEBE4", priceAdjustment: 0, stock: 3 },
    ],
    material: "PLA+ Silk",
    productionTime: 5,
    stock: 6,
    dimensions: { width: 130, height: 210, depth: 130 },
    weight: 340,
    isCustom: false,
    isFeatured: false,
  },
  {
    name: "Mini Dinos",
    slug: "dinos-mesa",
    description:
      "Seis dinossauros de palma da mão em cores pastel, cada um de uma espécie, com um arco de exposição para deixá-los enfileirados na estante. Impressos em PLA+ fosco, sem tinta — a cor é a do próprio filamento.",
    shortDescription:
      "Seis dinossauros pequenos em cores pastel, com arco de exposição.",
    price: 7900,
    category: "colecionaveis",
    tags: ["mini", "dinos", "presente", "lembrança", "pla+ fosco"],
    images: [
      { url: "/images/products/dino-01.jpg", alt: "Mini Dinos enfileirados no arco" },
      { url: "/images/products/dino-02.jpg", alt: "Detalhe de dois dinossauros" },
    ],
    variants: [
      { id: "var-dinos-mesa-1", name: "Pastel", colorHex: "#E9B7C4", priceAdjustment: 0, stock: 11 },
    ],
    material: "PLA+ fosco",
    productionTime: 4,
    stock: 11,
    dimensions: { width: 60, height: 70, depth: 40 },
    weight: 25,
    isCustom: false,
    badge: "Kit com 6",
    isFeatured: false,
  },
];

const DEMO_ORDERS = [
  {
    firstName: "Pedro", lastName: "Lins", email: "pedro.lins@exemplo.com",
    phone: "5583988717642", quantity: 3, variantName: "Arco-íris",
    paymentMethod: "pix" as const, status: "paid" as const,
  },
  {
    firstName: "Júlia", lastName: "Batista", email: "julia.batista@exemplo.com",
    phone: "5583988717643", quantity: 1, variantName: "Verde Oliva",
    paymentMethod: "credit_card" as const, status: "shipped" as const,
  },
  {
    firstName: "Escola", lastName: "Semear", email: "contato@escolasemear.com",
    phone: "5583988717644", quantity: 6, variantName: "Base Coral",
    paymentMethod: "pix" as const, status: "finishing" as const,
  },
  {
    firstName: "Rafael", lastName: "Nóbrega", email: "rafael.nobrega@exemplo.com",
    phone: "5583988717645", quantity: 1, variantName: "Azul Gelo",
    paymentMethod: "credit_card" as const, status: "processing" as const,
  },
  {
    firstName: "Marina", lastName: "Alencar", email: "marina.alencar@exemplo.com",
    phone: "5583988717646", quantity: 2, variantName: "Verde Musgo",
    paymentMethod: "pix" as const, status: "printing" as const,
  },
];

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly config: ConfigService<ApiConfig>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedAdmin();
    if (this.config.get<boolean>("seedDemo")) {
      await this.seedDemoProducts();
      await this.seedDemoOrders();
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

    // O slug vem escrito no dado, não derivado do nome: ele é a URL pública
    // da peça e precisa bater com `data/products.ts` na loja.
    for (const item of DEMO_PRODUCTS) {
      await this.productModel.create(item);
    }
    this.logger.log(`${DEMO_PRODUCTS.length} produtos de demonstração criados.`);
  }

  /**
   * Pedidos de exemplo espalhados pelos estágios da produção, para o painel
   * ter fila e números antes da loja receber a primeira venda de verdade.
   */
  private async seedDemoOrders() {
    const total = await this.orderModel.countDocuments().exec();
    if (total > 0) return;

    const products = await this.productModel.find().limit(5).lean();
    if (products.length === 0) return;

    for (const [index, demo] of DEMO_ORDERS.entries()) {
      const product = products[index % products.length];
      const price = product.price || 9900;
      const subtotal = price * demo.quantity;
      await this.orderModel.create({
        code: `C3D-${4816 + index}`,
        items: [
          {
            productId: String(product._id),
            name: product.name,
            variantName: demo.variantName,
            quantity: demo.quantity,
            price,
          },
        ],
        customer: {
          email: demo.email,
          firstName: demo.firstName,
          lastName: demo.lastName,
          phone: demo.phone,
        },
        paymentMethod: demo.paymentMethod,
        status: demo.status,
        subtotal,
        shipping: 0,
        discount: 0,
        total: subtotal,
      });
    }
    this.logger.log(`${DEMO_ORDERS.length} pedidos de demonstração criados.`);
  }
}
