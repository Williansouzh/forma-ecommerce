import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
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
  @IsString() @MinLength(1) @MaxLength(64)
  productId!: string;

  @IsOptional() @IsString() @MaxLength(200)
  name?: string;

  @IsOptional() @IsString() @MaxLength(64)
  variantId?: string;

  @IsOptional() @IsString() @MaxLength(120)
  variantName?: string;

  /** O mesmo teto do carrinho da loja. */
  @IsInt() @Min(1) @Max(99)
  quantity!: number;

  /** Ignorado. O preço vem do catálogo — ver `pricing.ts`. */
  @IsOptional() @IsInt() @Min(0)
  price?: number;
}

export class CustomerDto {
  @IsEmail() @MaxLength(254)
  email!: string;

  @IsString() @MinLength(1) @MaxLength(80)
  firstName!: string;

  /**
   * Pode vir vazio: a loja tem um campo só de nome e o divide no primeiro
   * espaço, então quem digita "Maria" chega sem sobrenome — e não pode ficar
   * sem conseguir comprar por isso.
   */
  @IsString() @MaxLength(120)
  lastName!: string;

  @IsString() @MinLength(8) @MaxLength(20)
  phone!: string;

  @IsOptional() @IsString() @MaxLength(14)
  cpf?: string;
}

export class AddressDto {
  @IsString() @MaxLength(160) street!: string;
  @IsString() @MaxLength(20) number!: string;
  @IsOptional() @IsString() @MaxLength(120) complement?: string;
  @IsString() @MaxLength(120) neighborhood!: string;
  @IsString() @MaxLength(120) city!: string;
  @IsString() @MaxLength(2) state!: string;
  @IsString() @MaxLength(9) zipCode!: string;
  @IsString() @MaxLength(2) country!: string;
}

export class CreateOrderDto {
  /*
   * Teto de linhas: a rota é pública, e sem ele um corpo de 100 kB virava
   * milhares de itens — cada um com consulta ao catálogo e reserva de estoque.
   */
  @IsArray() @ArrayNotEmpty() @ArrayMaxSize(30)
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
