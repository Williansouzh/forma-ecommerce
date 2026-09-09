import { BadRequestException } from "@nestjs/common";

/**
 * O preço do pedido, calculado a partir do catálogo — nunca do que o cliente
 * mandou.
 *
 * Antes o `create` do pedido fazia `{ ...dto }`: `price` por item, `subtotal`,
 * `shipping`, `discount` e `total` entravam no banco exatamente como vieram
 * do corpo da requisição. E `POST /orders` é público, porque o checkout da
 * loja não tem sessão. Ou seja: qualquer pessoa pedia uma peça de R$ 129,00
 * por um centavo, e a preferência do Mercado Pago era montada com o preço
 * gravado — cobrando o centavo de verdade.
 *
 * A regra que vale aqui: do cliente vêm O QUE e QUANTO (produto, variante,
 * quantidade); QUANTO CUSTA é sempre nosso.
 */

/**
 * Frete fixo abaixo do piso de frete grátis.
 *
 * Espelha `SHIPPING_COST` em `lib/constants.ts`, na loja. São dois valores
 * porque são dois processos, e a loja precisa desenhar o resumo antes de
 * falar com a API — mas quem MANDA é este, que é o que vai para a cobrança.
 * O teste em `pricing.spec.ts` fixa o número para que uma mudança de um lado
 * só não passe despercebida.
 */
export const SHIPPING_COST = 2990;

export interface PricedItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
}

/** O que o catálogo diz sobre uma peça, já resolvido pelo serviço. */
export interface CatalogEntry {
  id: string;
  name: string;
  price: number;
  isAvailable?: boolean;
  variants?: {
    id: string;
    name: string;
    priceAdjustment?: number;
  }[];
}

export interface PricedItem {
  productId: string;
  name: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  price: number;
}

export interface PricedOrder {
  items: PricedItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
}

export interface PricingRules {
  freeShippingThreshold: number;
  pixDiscountPercent: number;
}

/**
 * Resolve cada item contra o catálogo e fecha a conta.
 *
 * Peça que não existe, saiu do ar ou aponta para uma variante inexistente
 * derruba o pedido inteiro em 400. Aceitar "o que dá" gravaria um pedido que
 * não corresponde a nada — pior que recusar, porque o cliente pagaria por ele.
 */
export function priceOrder(
  items: PricedItemInput[],
  catalog: Map<string, CatalogEntry>,
  paymentMethod: string,
  rules: PricingRules,
): PricedOrder {
  const priced: PricedItem[] = items.map((item) => {
    const product = catalog.get(item.productId);
    if (!product) {
      throw new BadRequestException(
        `Peça ${item.productId} não existe mais no catálogo.`,
      );
    }
    if (product.isAvailable === false) {
      throw new BadRequestException(`"${product.name}" saiu do ar.`);
    }

    let variantName: string | undefined;
    let adjustment = 0;
    if (item.variantId) {
      const variant = product.variants?.find((v) => v.id === item.variantId);
      if (!variant) {
        throw new BadRequestException(
          `A cor escolhida para "${product.name}" não existe mais.`,
        );
      }
      variantName = variant.name;
      adjustment = variant.priceAdjustment ?? 0;
    }

    return {
      productId: item.productId,
      // O nome também vem do catálogo: gravar o que o cliente mandou deixaria
      // a etiqueta e o Mercado Pago mostrarem um texto escolhido por ele.
      name: product.name,
      ...(item.variantId ? { variantId: item.variantId } : {}),
      ...(variantName ? { variantName } : {}),
      quantity: item.quantity,
      price: product.price + adjustment,
    };
  });

  const subtotal = priced.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );

  const shipping =
    subtotal === 0 || subtotal >= rules.freeShippingThreshold
      ? 0
      : SHIPPING_COST;

  const discount =
    paymentMethod === "pix"
      ? Math.round((subtotal * rules.pixDiscountPercent) / 100)
      : 0;

  return {
    items: priced,
    subtotal,
    shipping,
    discount,
    // `Math.max(0, …)`: um desconto configurado alto demais não pode virar
    // total negativo, que o schema recusaria com um erro sem sentido para
    // quem está comprando.
    total: Math.max(0, subtotal + shipping - discount),
  };
}
