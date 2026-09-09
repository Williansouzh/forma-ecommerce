import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  registerDecorator,
  type ValidationOptions,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * A URL de uma imagem da vitrine.
 *
 * Aceita caminho absoluto do site (`/images/...`) OU URL http(s) — é o mesmo
 * contrato do campo de imagem do produto, e o que permite continuar usando o
 * que está em `/public` enquanto o bucket não é o único caminho.
 *
 * O que NÃO aceita: `javascript:`, `data:` e afins. Estas URLs vão parar em
 * `src` de imagem renderizada para todo visitante, e validar aqui é mais
 * barato que confiar que ninguém vai colar o que não deve.
 */
function isSafeImageUrl(value: string): boolean {
  const v = value.trim();
  if (v.startsWith("/") && !v.startsWith("//")) return true;
  try {
    const url = new URL(v);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Liga `isSafeImageUrl` ao class-validator. */
export function IsSafeImageUrl(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isSafeImageUrl",
      target: object.constructor,
      propertyName,
      options: {
        message:
          "A imagem precisa ser um caminho do site (/images/…) ou uma URL http(s).",
        ...options,
      },
      validator: {
        validate: (value: unknown) =>
          typeof value === "string" && isSafeImageUrl(value),
      },
    });
  };
}

export class HomeImageDto {
  @IsString() @MinLength(1) @MaxLength(500) @IsSafeImageUrl()
  url!: string;

  @IsString() @MaxLength(300)
  alt!: string;
}

export class LookbookImageDto extends HomeImageDto {
  @IsString() @MaxLength(60)
  room!: string;

  @IsString() @MaxLength(60)
  place!: string;
}

export class HomeMediaDto {
  @IsOptional() @ValidateNested() @Type(() => HomeImageDto)
  hero?: HomeImageDto;

  @IsOptional() @IsArray() @ArrayMaxSize(6)
  @ValidateNested({ each: true }) @Type(() => LookbookImageDto)
  lookbook?: LookbookImageDto[];

  @IsOptional() @ValidateNested() @Type(() => HomeImageDto)
  atelierHero?: HomeImageDto;

  @IsOptional() @ValidateNested() @Type(() => HomeImageDto)
  atelierProcess?: HomeImageDto;

  @IsOptional() @ValidateNested() @Type(() => HomeImageDto)
  atelierBench?: HomeImageDto;
}


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

  /*
   * Contato e Pix aceitam string VAZIA — vazio é o estado "ainda não
   * configurei", e é ele que faz a loja esconder o botão de WhatsApp e o
   * bloco de Pix em vez de mostrar um link quebrado. Por isso `@MinLength(1)`
   * não aparece aqui, ao contrário dos campos do ateliê.
   */

  /** Só dígitos, com DDI. Ex.: 5583988717642. */
  @IsOptional() @IsString() @MaxLength(20)
  @Matches(/^[0-9]*$/, {
    message: "O WhatsApp deve ter só dígitos, com DDI (ex.: 5583988717642).",
  })
  whatsappNumber?: string;

  /** O limite de 77 é do padrão BR Code, não nosso. */
  @IsOptional() @IsString() @MaxLength(77)
  pixKey?: string;

  /** 25 e 15 são os tamanhos que o payload do BACEN reserva. */
  @IsOptional() @IsString() @MaxLength(25)
  pixReceiverName?: string;

  @IsOptional() @IsString() @MaxLength(15)
  pixCity?: string;

  @IsOptional() @ValidateNested() @Type(() => HomeMediaDto)
  homeMedia?: HomeMediaDto;
}
