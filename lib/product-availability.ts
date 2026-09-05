import type { Product } from "@/types/product";

/**
 * Estoque e prazo se dizem com palavra, não com semáforo. O prazo aparece
 * sempre que a peça está disponível — é a informação que decide a compra.
 *
 * Vive aqui porque o card da vitrine, o do catálogo e a página do produto
 * precisam dizer a mesma coisa sobre a mesma peça.
 */
export function availabilityNote(product: Product): string | null {
  const soldOut = !product.isAvailable || product.stock === 0;
  if (soldOut) return "Esgotado";
  if (product.price === 0) return "Sob encomenda";
  if (typeof product.stock === "number" && product.stock <= 3) {
    return product.stock === 1
      ? "Última peça"
      : `Últimas ${product.stock} unidades`;
  }
  if (typeof product.productionTime === "number") {
    // Quem decide a redação é a categoria, não o `isCustom`: uma tag com nome
    // é personalizada e mesmo assim sai do estoque de branco em dois dias.
    return product.category === "personalizados"
      ? `Feito depois do seu pedido — ${product.productionTime} dias`
      : `Pronto em ${product.productionTime} dias`;
  }
  return null;
}
