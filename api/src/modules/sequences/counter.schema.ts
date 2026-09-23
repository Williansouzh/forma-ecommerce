import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type CounterDocument = HydratedDocument<Counter>;

/**
 * Um contador por sequência (`order:C3D-`, `order:SHP-`, `request:ORC-`).
 *
 * O `_id` é o nome da sequência: é ele que faz o `$inc` cair sempre no mesmo
 * documento, e o índice único que vem de graça com o `_id` é o que resolve a
 * corrida na criação.
 */
@Schema({ collection: "counters", versionKey: false })
export class Counter {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ required: true, default: 0 })
  seq: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
