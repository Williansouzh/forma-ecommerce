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

/**
 * Do cliente vêm O QUE e QUANTO. QUANTO CUSTA sai do catálogo.
 *
 * `name`, `variantName` e `price` continuam aceitos porque a loja já os envia
 * e `forbidNonWhitelisted` recusaria a requisição inteira se sumissem daqui —
 * mas são IGNORADOS: `priceOrder` reescreve os três a partir do produto
 * gravado. Não apague sem tirar também do corpo que a loja monta.
 */
export class OrderItemDto {
  @IsString() @MinLength(1)
  productId!: string;

  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  variantId?: string;

  @IsOptional() @IsString()
  variantName?: string;

  @IsInt() @Min(1)
  quantity!: number;

  /** Ignorado. O preço vem do catálogo — ver `pricing.ts`. */
  @IsOptional() @IsInt() @Min(0)
  price?: number;
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

  /*
   * Os quatro valores abaixo são informativos e ficam apenas para que a loja
   * possa continuar mandando o que desenhou na tela. O servidor recalcula
   * todos a partir do catálogo e das configurações; divergência entre o que
   * chegou e o que foi calculado vira aviso no log, não erro para o cliente.
   */
  @IsOptional() @IsInt() @Min(0)
  subtotal?: number;

  @IsOptional() @IsInt() @Min(0)
  shipping?: number;

  @IsOptional() @IsInt() @Min(0)
  discount?: number;

  @IsOptional() @IsInt() @Min(0)
  total?: number;
}

export class UpdateOrderStatusDto {
  @IsEnum(ORDER_STATUSES)
  status!: (typeof ORDER_STATUSES)[number];
}
