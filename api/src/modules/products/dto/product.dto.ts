import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { CATEGORY_SLUGS } from "../schemas/product.schema";

export class ProductImageDto {
  @IsString()
  @MinLength(1)
  url!: string;

  @IsString()
  @MaxLength(200)
  alt!: string;
}

export class ProductVariantDto {
  @IsString() @MinLength(1)
  id!: string;

  @IsString() @MinLength(1)
  name!: string;

  @IsOptional() @IsString() @MaxLength(9)
  colorHex?: string;

  @IsInt()
  priceAdjustment: number = 0;

  @IsInt() @Min(0)
  stock: number = 0;
}

export class DimensionsDto {
  @IsInt() @Min(0) width!: number;
  @IsInt() @Min(0) height!: number;
  @IsInt() @Min(0) depth!: number;
}

export class CreateProductDto {
  @IsString() @MinLength(2)
  name!: string;

  @IsOptional() @IsString()
  slug?: string;

  @IsString() @MinLength(10)
  description!: string;

  @IsString() @MinLength(5)
  shortDescription!: string;

  @IsInt() @Min(0)
  price!: number;

  @IsOptional() @IsInt() @Min(0)
  originalPrice?: number;

  @IsEnum(CATEGORY_SLUGS)
  category!: (typeof CATEGORY_SLUGS)[number];

  @IsArray() @IsString({ each: true })
  tags: string[] = [];

  @IsArray() @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images!: ProductImageDto[];

  @IsOptional() @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @IsOptional() @IsString()
  material?: string;

  @IsOptional() @IsInt() @Min(0)
  productionTime?: number;

  @IsOptional() @IsInt() @Min(0)
  stock?: number;

  @IsOptional() @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;

  @IsOptional() @IsInt() @Min(0)
  weight?: number;

  @IsBoolean() @IsOptional()
  isAvailable?: boolean;

  @IsBoolean() @IsOptional()
  isFeatured?: boolean;

  @IsBoolean() @IsOptional()
  isCustom?: boolean;

  @IsOptional() @IsString() @MaxLength(40)
  badge?: string;
}

export class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(2)
  name?: string;

  @IsOptional() @IsString() @MinLength(10)
  description?: string;

  @IsOptional() @IsString() @MinLength(5)
  shortDescription?: string;

  @IsOptional() @IsInt() @Min(0)
  price?: number;

  @IsOptional() @IsInt() @Min(0)
  originalPrice?: number;

  @IsOptional() @IsEnum(CATEGORY_SLUGS)
  category?: (typeof CATEGORY_SLUGS)[number];

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @IsOptional() @IsArray() @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @IsOptional() @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @IsOptional() @IsString()
  material?: string;

  @IsOptional() @IsInt() @Min(0)
  productionTime?: number;

  @IsOptional() @IsInt() @Min(0)
  stock?: number;

  @IsOptional() @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;

  @IsOptional() @IsInt() @Min(0)
  weight?: number;

  @IsOptional() @IsBoolean()
  isAvailable?: boolean;

  @IsOptional() @IsBoolean()
  isFeatured?: boolean;

  @IsOptional() @IsBoolean()
  isCustom?: boolean;

  @IsOptional() @IsString() @MaxLength(40)
  badge?: string;
}
