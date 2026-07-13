import { defineStore } from "pinia";
import BusinessAPI from "@/api/business";
import type { ReservationInput, StockMovementQuery } from "@/api/business";
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
} from "@/views/business/types";

export function toLocalDateKey(value: string | Date = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const useBusinessStore = defineStore("business", () => {
  const products = ref<Product[]>([]);
  const orders = ref<BusinessOrder[]>([]);
  const historyOrders = ref<BusinessOrder[]>([]);
  const categories = ref<string[]>([]);
  const reservations = ref<Reservation[]>([]);
  const stockMovements = ref<StockMovement[]>([]);
  const businessDate = ref(toLocalDateKey());
  const loading = ref(false);
  const historyLoading = ref(false);
  const movementLoading = ref(false);
  const initialized = ref(false);
  const historyRange = ref<[string, string]>();
  let initializePromise: Promise<void> | null = null;

  const activeProducts = computed(() => products.value.filter((item) => item.status === 1));
  const activeOrders = computed(() =>
    orders.value.filter((item) => item.status === "pending" || item.status === "making")
  );

  function applyCatalog(result: { products: Product[]; categories: string[] }): void {
    products.value = result.products;
    categories.value = result.categories;
  }

  function applyInventory(result: {
    products: Product[];
    categories: string[];
    reservations: Reservation[];
  }): void {
    applyCatalog(result);
    reservations.value = result.reservations;
  }

  function updateHistoryOrder(order: BusinessOrder): void {
    const index = historyOrders.value.findIndex((item) => item.id === order.id);
    if (index >= 0) {
      historyOrders.value[index] = order;
      return;
    }
    const date = toLocalDateKey(order.createTime);
    if (historyRange.value && date >= historyRange.value[0] && date <= historyRange.value[1]) {
      historyOrders.value.unshift(order);
    }
  }

  async function initialize(force = false): Promise<void> {
    if (initialized.value && !force) return;
    if (initializePromise) return initializePromise;

    initializePromise = (async () => {
      loading.value = true;
      try {
        const data = await BusinessAPI.getBootstrap();
        products.value = data.products;
        categories.value = data.categories;
        orders.value = data.orders;
        reservations.value = data.reservations;
        businessDate.value = data.date;
        initialized.value = true;
      } finally {
        loading.value = false;
        initializePromise = null;
      }
    })();
    return initializePromise;
  }

  async function loadOrders(startDate: string, endDate: string): Promise<void> {
    historyLoading.value = true;
    try {
      historyOrders.value = await BusinessAPI.getOrders({ startDate, endDate });
      historyRange.value = [startDate, endDate];
    } finally {
      historyLoading.value = false;
    }
  }

  function nextOrderNo(): string {
    const max = orders.value.reduce((current, item) => {
      const value = Number(item.orderNo.replace(/\D/g, ""));
      return Number.isFinite(value) ? Math.max(current, value) : current;
    }, 0);
    return `A${String(max + 1).padStart(3, "0")}`;
  }

  async function createOrder(cart: CartItem[], remark: string): Promise<BusinessOrder> {
    const result = await BusinessAPI.createOrder({ items: cart, remark });
    products.value = result.products;
    orders.value = result.orders;
    businessDate.value = toLocalDateKey(result.order.createTime);
    updateHistoryOrder(result.order);
    return result.order;
  }

  async function changeOrderStatus(id: string, status: OrderStatus): Promise<void> {
    const order =
      orders.value.find((item) => item.id === id) ??
      historyOrders.value.find((item) => item.id === id);
    if (!order) throw new Error("订单不存在");
    const date = toLocalDateKey(order.createTime);
    const result = await BusinessAPI.updateOrderStatus(date, id, status);
    products.value = result.products;
    if (date === businessDate.value) orders.value = result.orders;
    updateHistoryOrder(result.order);
  }

  async function voidOrder(id: string): Promise<void> {
    await changeOrderStatus(id, "voided");
  }

  async function restockProduct(id: string, quantity: number): Promise<void> {
    const result = await BusinessAPI.restockProduct(id, quantity);
    applyInventory(result);
  }

  async function adjustStock(id: string, input: StockAdjustmentInput): Promise<void> {
    const result = await BusinessAPI.adjustStock(id, input);
    applyInventory(result);
  }

  async function loadReservations(): Promise<void> {
    reservations.value = await BusinessAPI.getReservations();
  }

  async function addReservation(input: ReservationInput): Promise<void> {
    const result = await BusinessAPI.addReservation(input);
    applyInventory(result);
  }

  async function updateReservation(id: string, input: ReservationInput): Promise<void> {
    const result = await BusinessAPI.updateReservation(id, input);
    applyInventory(result);
  }

  async function changeReservationStatus(id: string, status: ReservationStatus): Promise<void> {
    const result = await BusinessAPI.updateReservationStatus(id, status);
    applyInventory(result);
  }

  async function loadStockMovements(query: StockMovementQuery): Promise<void> {
    movementLoading.value = true;
    try {
      stockMovements.value = await BusinessAPI.getStockMovements(query);
    } finally {
      movementLoading.value = false;
    }
  }

  async function addProduct(input: ProductInput): Promise<void> {
    const result = await BusinessAPI.addProduct(input);
    applyCatalog(result);
  }

  async function updateProduct(id: string, input: ProductInput): Promise<void> {
    const result = await BusinessAPI.updateProduct(id, input);
    applyCatalog(result);
  }

  async function toggleProduct(id: string): Promise<void> {
    const result = await BusinessAPI.toggleProduct(id);
    applyCatalog(result);
  }

  async function addCategory(name: string): Promise<void> {
    const result = await BusinessAPI.addCategory(name);
    applyCatalog(result);
  }

  async function renameCategory(oldName: string, newName: string): Promise<void> {
    const result = await BusinessAPI.renameCategory(oldName, newName);
    applyCatalog(result);
  }

  async function removeCategory(name: string): Promise<void> {
    const result = await BusinessAPI.removeCategory(name);
    applyCatalog(result);
  }

  return {
    products,
    orders,
    historyOrders,
    categories,
    reservations,
    stockMovements,
    businessDate,
    loading,
    historyLoading,
    movementLoading,
    initialized,
    activeProducts,
    activeOrders,
    initialize,
    loadOrders,
    nextOrderNo,
    createOrder,
    changeOrderStatus,
    voidOrder,
    restockProduct,
    adjustStock,
    loadReservations,
    addReservation,
    updateReservation,
    changeReservationStatus,
    loadStockMovements,
    addProduct,
    updateProduct,
    toggleProduct,
    addCategory,
    renameCategory,
    removeCategory,
  };
});
