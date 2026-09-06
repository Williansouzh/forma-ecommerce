import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
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
import { ORDER_STATUSES, PAYMENT_METHODS } from "../schemas/order.schema";

export class OrderItemDto {
  @IsString() @MinLength(1)
  productId!: string;

  @IsString() @MinLength(1)
  name!: string;

  @IsOptional() @IsString()
  variantId?: string;

  @IsOptional() @IsString()
  variantName?: string;

  @IsInt() @Min(1)
  quantity!: number;

  @IsInt() @Min(0)
  price!: number;
}

export class CustomerDto {
  @IsEmail()
  email!: string;

  @IsString() @MinLength(1)
  firstName!: string;

  @IsString() @MinLength(1)
  lastName!: string;

  @IsString() @MinLength(8) @MaxLength(20)
  phone!: string;

  @IsOptional() @IsString()
  cpf?: string;
}

export class AddressDto {
  @IsString() street!: string;
  @IsString() number!: string;
  @IsOptional() @IsString() complement?: string;
  @IsString() neighborhood!: string;
  @IsString() city!: string;
  @IsString() state!: string;
  @IsString() zipCode!: string;
  @IsString() country!: string;
}

export class CreateOrderDto {
  @IsArray() @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ValidateNested()
  @Type(() => CustomerDto)
  customer!: CustomerDto;

  @IsOptional() @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress?: AddressDto;

  @IsEnum(PAYMENT_METHODS)
  paymentMethod!: (typeof PAYMENT_METHODS)[number];

  @IsInt() @Min(0)
  subtotal!: number;

  @IsOptional() @IsInt() @Min(0)
  shipping?: number;

  @IsOptional() @IsInt() @Min(0)
  discount?: number;

  @IsInt() @Min(0)
  total!: number;
}

export class UpdateOrderStatusDto {
  @IsEnum(ORDER_STATUSES)
  status!: (typeof ORDER_STATUSES)[number];
}
