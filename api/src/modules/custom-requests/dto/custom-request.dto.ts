import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { CUSTOM_TYPES, REQUEST_STATUSES } from "../schemas/custom-request.schema";

export class CreateCustomRequestDto {
  @IsString() @MinLength(2) @MaxLength(120)
  customerName!: string;

  @IsEmail()
  customerEmail!: string;

  @IsOptional() @IsString() @MaxLength(20)
  customerPhone?: string;

  @IsString() @MinLength(10) @MaxLength(2000)
  description!: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  referenceImages?: string[];

  @IsOptional() @IsEnum(CUSTOM_TYPES)
  type?: (typeof CUSTOM_TYPES)[number];

  @IsOptional() @IsInt() @Min(0)
  budget?: number;

  @IsOptional() @IsString() @MaxLength(60)
  deadline?: string;
}

export class UpdateCustomRequestStatusDto {
  @IsEnum(REQUEST_STATUSES)
  status!: (typeof REQUEST_STATUSES)[number];
}
