import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type UserDocument = HydratedDocument<User>;

@Schema({ collection: "users", timestamps: true })
export class User {
  _id: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: ["superadmin"], default: "superadmin" })
  role: "superadmin";
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: unknown) => {
    const record = ret as Record<string, unknown>;
    record.id = String(record._id);
    delete record._id;
    delete record.passwordHash;
    delete record.__v;
    return record;
  },
});
