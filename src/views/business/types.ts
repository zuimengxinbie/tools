export type ProductStatus = 0 | 1;

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: ProductStatus;
  warningStock: number;
  imageUrl?: string;
}

export type OrderStatus = "pending" | "making" | "completed" | "voided";

export interface OrderItem {
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
}

export interface BusinessOrder {
  id: string;
  orderNo: string;
  totalAmount: number;
  status: OrderStatus;
  remark: string;
  createTime: string;
  items: OrderItem[];
}

export interface ProductInput {
  name: string;
  category: string;
  price: number;
  stock: number;
  warningStock: number;
  status?: ProductStatus;
}

export interface CartItem {
  productId: string;
  quantity: number;
}
