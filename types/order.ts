export interface OrderItem {
  productId: string;
  name: string;
  /** Id da variação escolhida — é por ele que o estoque acha o saldo certo. */
  variantId?: string;
  variantName?: string;
  quantity: number;
  price: number;
}

export type PaymentMethod = "pix" | "credit_card" | "boleto";

export interface Customer {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  cpf?: string;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "printing"
  | "finishing"
  | "shipped"
  | "delivered"
  | "cancelled";

/** De onde veio o pedido: o checkout da loja ou um marketplace. */
export type OrderChannel = "site" | "shopee";

/** Identidade do pedido na origem, quando ele nasceu fora daqui. */
export interface ExternalRef {
  source: OrderChannel;
  shopId: string;
  orderSn: string;
  /** Último status visto na origem — o que descarta evento atrasado. */
  remoteStatus?: string;
}

export interface Order {
  id: string;
  /** Código curto que o cliente lê e cita no WhatsApp: C3D-4820. */
  code: string;
  items: OrderItem[];
  customer: Customer;
  shippingAddress?: Address;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  /** Ausente nos pedidos antigos; a API assume `site` como padrão. */
  channel?: OrderChannel;
  /** Presente só em pedido importado de um marketplace. */
  externalRef?: ExternalRef;
  /**
   * String quando vem da API — JSON não tem `Date`. O tipo diz a verdade
   * para ninguém chamar `.getTime()` num texto e descobrir em produção.
   */
  createdAt: string | Date;
}
