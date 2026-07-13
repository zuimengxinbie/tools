import request from "@/utils/request";
import type {
  BusinessOrder,
  CartItem,
  OrderStatus,
  Product,
  ProductInput,
} from "@/views/business/types";

const BASE = "/api/v1/business";

export interface BusinessBootstrap {
  date: string;
  products: Product[];
  categories: string[];
  orders: BusinessOrder[];
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
    return request<any, CatalogMutationResult>({
      url: `${BASE}/products/${id}/restock`,
      method: "post",
      data: { quantity },
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
