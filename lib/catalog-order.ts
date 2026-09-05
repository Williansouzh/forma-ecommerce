import type { Product } from "@/types/product";
import { PRODUCTS } from "@/data/products";

/**
 * A API devolve os produtos na ordem em que o Mongo os entrega, que é a de
 * inserção e não diz nada. Em vitrine e catálogo a ordem é editorial — a
 * primeira peça é a que abre a loja — então ancoramos na sequência do
 * catálogo local. Peça que só exista remotamente vai para o fim, sem sumir.
 */
export function inCatalogOrder(products: Product[]): Product[] {
  const rank = new Map(PRODUCTS.map((product, index) => [product.slug, index]));
  return [...products].sort(
    (a, b) =>
      (rank.get(a.slug) ?? Number.MAX_SAFE_INTEGER) -
      (rank.get(b.slug) ?? Number.MAX_SAFE_INTEGER)
  );
}
