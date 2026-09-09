import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type SettingsDocument = HydratedDocument<Settings>;

/** Uma imagem trocável da vitrine: o arquivo e o texto que o descreve. */
export class HomeImageEmbed {
  url!: string;
  alt!: string;
}

/** Uma foto do lookbook, com o cômodo e o bairro que aparecem sobre ela. */
export class LookbookImageEmbed {
  url!: string;
  alt!: string;
  room!: string;
  place!: string;
}

/**
 * As imagens da página inicial que o ateliê troca sozinho.
 *
 * Todos os campos são opcionais e o padrão é AUSENTE, não uma URL: a loja tem
 * os valores atuais embutidos como reserva, e slot vazio significa "usa o que
 * já estava". Assim ligar este recurso não muda nada até alguém trocar uma
 * foto, e apagar uma troca devolve a original em vez de deixar buraco.
 */
export class HomeMediaEmbed {
  /** A foto de tela cheia do topo. */
  hero?: HomeImageEmbed;
  /** A tira de fotos "onde as peças moram". Até seis. */
  lookbook?: LookbookImageEmbed[];
  /** Pôsteres dos três slots de vídeo do ateliê. */
  atelierHero?: HomeImageEmbed;
  atelierProcess?: HomeImageEmbed;
  atelierBench?: HomeImageEmbed;
}

/** Documento único: existe no máximo uma linha, com esta chave. */
export const SETTINGS_KEY = "store";

/**
 * Ajustes que o ateliê muda sozinho, sem deploy. Valores em CENTAVOS quando
 * são dinheiro, para bater com o resto do domínio.
 */
@Schema({ collection: "settings", timestamps: true })
export class Settings {
  _id: string;

  @Prop({ required: true, unique: true, default: SETTINGS_KEY })
  key: string;

  @Prop({ required: true, min: 0, default: 40000 })
  freeShippingThreshold: number;

  @Prop({ required: true, min: 0, max: 50, default: 5 })
  pixDiscountPercent: number;

  @Prop({ required: true, min: 1, default: 5 })
  defaultProductionDays: number;

  @Prop({ required: true, trim: true, default: "c3dcriativ" })
  atelierName: string;

  @Prop({ required: true, trim: true, default: "Campina Grande — PB" })
  atelierCity: string;

  @Prop({ required: true, trim: true, default: "Seg a sáb · 8h às 18h" })
  atelierHours: string;

  /**
   * O WhatsApp que a loja atende, só dígitos e com DDI (5583988717642).
   *
   * Estava escrito à mão em `lib/constants.ts`, na loja — o que significava
   * pedir deploy para trocar de número. Vazio faz os botões de WhatsApp
   * sumirem em vez de levarem a lugar nenhum.
   */
  @Prop({ required: true, trim: true, default: "" })
  whatsappNumber: string;

  /**
   * A chave Pix da loja, e o que o BR Code precisa dizer sobre o recebedor.
   *
   * É o caminho de pagamento quando o Mercado Pago não está configurado —
   * sem ela, o cliente fecha o pedido e não tem como pagar. `pixCity` e
   * `pixReceiverName` não são enfeite: o padrão do BACEN os exige dentro do
   * payload, e o app do banco os mostra na hora de confirmar.
   */
  @Prop({ required: true, trim: true, default: "" })
  pixKey: string;

  @Prop({ required: true, trim: true, default: "" })
  pixReceiverName: string;

  @Prop({ required: true, trim: true, default: "" })
  pixCity: string;

  /** Imagens trocáveis da vitrine. Ausente = a loja usa as embutidas. */
  @Prop({ type: Object, default: {} })
  homeMedia: HomeMediaEmbed;

  createdAt: Date;
  updatedAt: Date;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);

SettingsSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: unknown) => {
    const record = ret as Record<string, unknown>;
    delete record._id;
    delete record.__v;
    return record;
  },
});
