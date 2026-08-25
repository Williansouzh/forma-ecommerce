export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  name?: string;
  slug?: string;
  image?: string;
  variantName?: string;
}

export interface CartTotals {
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  count: number;
}
