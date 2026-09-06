import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class ReceiveStockDto {
  @IsString() @MinLength(1)
  productId!: string;

  /** String vazia (ou ausente) para produto simples. */
  @IsOptional() @IsString()
  variantId?: string;

  @IsInt() @Min(1)
  quantity!: number;

  /** Custo unitário em CENTAVOS — é o que congela no COGS da venda. */
  @IsOptional() @IsInt() @Min(0)
  unitCost?: number;

  @IsOptional() @IsString() @MaxLength(60)
  code?: string;

  @IsOptional() @IsDateString()
  expiresAt?: string;
}

export class AdjustStockDto {
  @IsString() @MinLength(1)
  productId!: string;

  @IsOptional() @IsString()
  variantId?: string;

  /** Positivo entra, negativo sai. Zero é recusado pelo serviço. */
  @IsInt()
  delta!: number;

  @IsString() @MinLength(3) @MaxLength(200)
  reason!: string;
}

export class RegisterLossDto {
  @IsString() @MinLength(1)
  productId!: string;

  @IsOptional() @IsString()
  variantId?: string;

  @IsInt() @Min(1)
  quantity!: number;

  @IsString() @MinLength(3) @MaxLength(200)
  reason!: string;
}
