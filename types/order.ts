export interface OrderItem {
  productId: string;
  name: string;
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

export interface Order {
  id: string;
  items: OrderItem[];
  customer: Customer;
  shippingAddress: Address;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  createdAt: Date;
}
