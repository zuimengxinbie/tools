import request from "@/utils/request";
import type {
  BusinessOrder,
  CartItem,
  OrderStatus,
  Product,
  ProductInput,
  Reservation,
  ReservationStatus,
  StockAdjustmentInput,
  StockMovement,
  StockMovementType,
} from "@/views/business/types";

const BASE = "/api/v1/business";

export interface BusinessBootstrap {
  date: string;
  products: Product[];
  categories: string[];
  orders: BusinessOrder[];
  reservations: Reservation[];
}

export interface OrderRangeQuery {
  startDate: string;
  endDate: string;
}

export interface CreateOrderRequest {
  items: CartItem[];
  remark: string;
}

export interface OrderMutationResult {
  order: BusinessOrder;
  products: Product[];
  orders: BusinessOrder[];
}

export interface CatalogMutationResult {
  products: Product[];
  categories: string[];
}

export interface ReservationInput {
  customer: string;
  pickupTime: string;
  remark: string;
  items: CartItem[];
}

export interface InventoryMutationResult extends CatalogMutationResult {
  reservations: Reservation[];
}

export interface StockMovementQuery extends OrderRangeQuery {
  productId?: string;
  type?: StockMovementType;
}

const BusinessAPI = {
  getBootstrap() {
    return request<any, BusinessBootstrap>({ url: `${BASE}/bootstrap`, method: "get" });
  },
  getOrders(params: OrderRangeQuery) {
    return request<any, BusinessOrder[]>({ url: `${BASE}/orders`, method: "get", params });
  },
  createOrder(data: CreateOrderRequest) {
    return request<any, OrderMutationResult>({ url: `${BASE}/orders`, method: "post", data });
  },
  updateOrderStatus(date: string, id: string, status: OrderStatus) {
    return request<any, OrderMutationResult>({
      url: `${BASE}/orders/${date}/${id}/status`,
      method: "patch",
      data: { status },
    });
  },
  addProduct(data: ProductInput) {
    return request<any, CatalogMutationResult>({ url: `${BASE}/products`, method: "post", data });
  },
  updateProduct(id: string, data: ProductInput) {
    return request<any, CatalogMutationResult>({
      url: `${BASE}/products/${id}`,
      method: "put",
      data,
    });
  },
  toggleProduct(id: string) {
    return request<any, CatalogMutationResult>({
      url: `${BASE}/products/${id}/status`,
      method: "patch",
    });
  },
  restockProduct(id: string, quantity: number) {
    return request<any, InventoryMutationResult>({
      url: `${BASE}/products/${id}/restock`,
      method: "post",
      data: { quantity },
    });
  },
  adjustStock(id: string, data: StockAdjustmentInput) {
    return request<any, InventoryMutationResult>({
      url: `${BASE}/products/${id}/stock-adjustment`,
      method: "post",
      data,
    });
  },
  getReservations() {
    return request<any, Reservation[]>({ url: `${BASE}/reservations`, method: "get" });
  },
  addReservation(data: ReservationInput) {
    return request<any, InventoryMutationResult>({
      url: `${BASE}/reservations`,
      method: "post",
      data,
    });
  },
  updateReservation(id: string, data: ReservationInput) {
    return request<any, InventoryMutationResult>({
      url: `${BASE}/reservations/${id}`,
      method: "put",
      data,
    });
  },
  updateReservationStatus(id: string, status: ReservationStatus) {
    return request<any, InventoryMutationResult>({
      url: `${BASE}/reservations/${id}/status`,
      method: "patch",
      data: { status },
    });
  },
  getStockMovements(params: StockMovementQuery) {
    return request<any, StockMovement[]>({
      url: `${BASE}/stock-movements`,
      method: "get",
      params,
    });
  },
  addCategory(name: string) {
    return request<any, CatalogMutationResult>({
      url: `${BASE}/categories`,
      method: "post",
      data: { name },
    });
  },
  renameCategory(oldName: string, newName: string) {
    return request<any, CatalogMutationResult>({
      url: `${BASE}/categories`,
      method: "put",
      data: { oldName, newName },
    });
  },
  removeCategory(name: string) {
    return request<any, CatalogMutationResult>({
      url: `${BASE}/categories`,
      method: "delete",
      data: { name },
    });
  },
};

export default BusinessAPI;
