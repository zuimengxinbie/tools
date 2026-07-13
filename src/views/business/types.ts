export type ProductStatus = 0 | 1;

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  reservedStock: number;
  availableStock: number;
  status: ProductStatus;
  warningStock: number;
  imageUrl?: string;
}

export type ReservationStatus = "active" | "completed" | "cancelled";

export interface ReservationItem {
  productId: string;
  productName: string;
  quantity: number;
}

export interface Reservation {
  id: string;
  reservationNo: string;
  customer: string;
  pickupTime: string;
  remark: string;
  status: ReservationStatus;
  createTime: string;
  updateTime: string;
  items: ReservationItem[];
}

export type StockMovementType =
  | "opening"
  | "restock"
  | "sale"
  | "void_return"
  | "reservation_lock"
  | "reservation_release"
  | "reservation_complete"
  | "loss"
  | "stocktake";

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  stockDelta: number;
  reservedDelta: number;
  beforeStock: number;
  afterStock: number;
  beforeReserved: number;
  afterReserved: number;
  referenceId?: string;
  referenceNo?: string;
  reason: string;
  remark: string;
  createTime: string;
}

export type StockAdjustmentMode = "loss" | "stocktake";

export interface StockAdjustmentInput {
  mode: StockAdjustmentMode;
  quantity: number;
  reason: string;
  remark: string;
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
