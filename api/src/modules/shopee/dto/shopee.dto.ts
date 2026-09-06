import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { LINK_STATUSES } from "../schemas/shopee-product-link.schema";
import { PUSH_SIGNATURE_SCHEMES } from "../shopee-signature";

/** Ids da Shopee são numéricos; recebê-los como texto evita perda de precisão. */
const NUMERIC = /^\d+$/;

export class ConnectShopeeDto {
  @IsString() @MinLength(1) @MaxLength(200)
  code!: string;

  @IsString() @Matches(NUMERIC, { message: "shopId deve ser numérico" })
  shopId!: string;
}

export class AuthorizeUrlDto {
  @IsString() @MinLength(1) @MaxLength(500)
  redirectUri!: string;
}

export class UpsertLinkDto {
  @IsString() @MinLength(1)
  productId!: string;

  @IsOptional() @IsString()
  variantId?: string;

  @IsString() @Matches(NUMERIC, { message: "itemId deve ser numérico" })
  itemId!: string;

  @IsOptional() @IsString() @Matches(NUMERIC, { message: "modelId deve ser numérico" })
  modelId?: string;

  @IsOptional() @IsString() @MaxLength(120)
  shopeeSku?: string;

  @IsOptional() @IsString() @MaxLength(120)
  internalSku?: string;

  @IsOptional() @IsEnum(LINK_STATUSES)
  status?: (typeof LINK_STATUSES)[number];

  @IsOptional() @IsInt() @Min(0)
  safetyMargin?: number;

  @IsOptional() @IsBoolean()
  autoSync?: boolean;
}

export class SyncSkuDto {
  @IsString() @MinLength(1)
  productId!: string;

  @IsOptional() @IsString()
  variantId?: string;
}

export class ReconcileDto {
  /** Só lista as divergências, sem escrever nada na Shopee. */
  @IsOptional() @IsBoolean()
  dryRun?: boolean;
}

export class ShopeeSettingsDto {
  @IsOptional() @IsBoolean()
  autoSync?: boolean;

  @IsOptional() @IsInt() @Min(0)
  defaultSafetyMargin?: number;

  @IsOptional() @IsEnum(PUSH_SIGNATURE_SCHEMES)
  pushSignatureScheme?: (typeof PUSH_SIGNATURE_SCHEMES)[number];
}

export class RetryMessageDto {
  @IsOptional() @IsString()
  id?: string;

  /** Sem `id`, reprocessa a fila de mortas inteira do tópico. */
  @IsOptional() @IsString()
  topic?: string;
}
