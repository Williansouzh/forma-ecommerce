import { IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class UpdateSettingsDto {
  /** Em centavos. */
  @IsOptional() @IsInt() @Min(0)
  freeShippingThreshold?: number;

  @IsOptional() @IsInt() @Min(0) @Max(50)
  pixDiscountPercent?: number;

  @IsOptional() @IsInt() @Min(1)
  defaultProductionDays?: number;

  @IsOptional() @IsString() @MinLength(1)
  atelierName?: string;

  @IsOptional() @IsString() @MinLength(1)
  atelierCity?: string;

  @IsOptional() @IsString() @MinLength(1)
  atelierHours?: string;
}
