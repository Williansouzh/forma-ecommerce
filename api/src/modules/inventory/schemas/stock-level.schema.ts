import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type StockLevelDocument = HydratedDocument<StockLevel>;

/**
 * O saldo de um SKU (produto + variação), mantido como CONTADOR para poder
 * ser testado e alterado numa operação atômica só.
 *
 * Poderia ser derivado somando o ledger a cada leitura, e o ledger continua
 * sendo a verdade — mas a guarda "não vender o que não tem" precisa ser um
 * `findOneAndUpdate` condicional em um documento, e é este. A conciliação
 * confere um contra o outro.
 */
@Schema({ collection: "stock_levels", timestamps: true })
export class StockLevel {
  _id: string;

  @Prop({ required: true, index: true })
  productId: string;

  /**
   * `required` do Mongoose recusa string vazia (o teste de `required` para
   * String é `length > 0`), e vazio é justamente o valor válido do produto
   * simples. O default garante a presença; o tipo garante o resto.
   */
  @Prop({ type: String, default: "" })
  variantId: string;

  /** Estoque FÍSICO: o que está na prateleira, reservado ou não. */
  @Prop({ required: true, min: 0, default: 0 })
  onHand: number;

  /**
   * Estoque COMPROMETIDO: prometido a um checkout ou a um pedido da Shopee
   * que ainda não confirmou. Continua físico, mas não pode ser vendido de novo.
   */
  @Prop({ required: true, min: 0, default: 0 })
  reserved: number;

  /**
   * Sobe a cada alteração. Serve para o optimistic locking de quem lê, decide
   * e escreve em dois tempos — a projeção para a Shopee, principalmente:
   * uma resposta atrasada não pode sobrescrever um saldo mais novo.
   */
  @Prop({ required: true, min: 0, default: 0 })
  version: number;

  createdAt: Date;
  updatedAt: Date;
}

export const StockLevelSchema = SchemaFactory.createForClass(StockLevel);

/**
 * Um saldo por SKU, garantido pelo banco. Sem isto, duas requisições
 * simultâneas para um produto ainda sem saldo criariam DOIS documentos, e
 * cada uma passaria na própria guarda com o mesmo estoque.
 */
StockLevelSchema.index({ productId: 1, variantId: 1 }, { unique: true });

StockLevelSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: unknown) => {
    const record = ret as Record<string, unknown>;
    record.id = String(record._id);
    delete record._id;
    delete record.__v;
    return record;
  },
});
