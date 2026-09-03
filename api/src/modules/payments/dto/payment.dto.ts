import { IsString, MinLength } from "class-validator";

export class CreatePreferenceDto {
  /** Código do pedido: C3D-4821. */
  @IsString() @MinLength(3)
  code!: string;
}
