import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type AppPairingDocument = HydratedDocument<AppPairing>;

/**
 * Código de uso único que liga o app Minhas Lojas a quem já está logado no
 * painel (o QR code de "App móvel").
 *
 * O `_id` é o hash do código, nunca o código: quem lê o banco não entra no
 * painel com o que encontrou ali. O Mongo apaga o documento ao expirar.
 */
@Schema({ collection: "app_pairings", versionKey: false })
export class AppPairing {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  expiresAt: Date;
}

export const AppPairingSchema = SchemaFactory.createForClass(AppPairing);

AppPairingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
