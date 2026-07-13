import { defineStore } from "pinia";
import seedCategories from "../../mock/business/categories.json";
import seedOrders from "../../mock/business/orders.json";
import seedProducts from "../../mock/business/products.json";
import type {
  BusinessOrder,
  CartItem,
  OrderStatus,
  Product,
  ProductInput,
} from "@/views/business/types";

const STORAGE_KEY = "coffee-stall-business:v1";

interface BusinessSnapshot {
  products: Product[];
  orders: BusinessOrder[];
  categories: string[];
}

function cloneSeed<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function toLocalDateKey(value: string | Date = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getInitialSnapshot(): BusinessSnapshot {
  const fallback: BusinessSnapshot = {
    products: cloneSeed(seedProducts) as Product[],
    orders: cloneSeed(seedOrders) as BusinessOrder[],
    categories: cloneSeed(seedCategories),
  };

  if (typeof window === "undefined") return fallback;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved) as Partial<BusinessSnapshot>;
    if (!Array.isArray(parsed.products) || !Array.isArray(parsed.orders)) return fallback;
    return {
      products: parsed.products,
      orders: parsed.orders,
      categories: Array.isArray(parsed.categories) ? parsed.categories : fallback.categories,
    };
  } catch {
    return fallback;
  }
}

export const useBusinessStore = defineStore("business", () => {
  const initial = getInitialSnapshot();
  const products = ref<Product[]>(initial.products);
  const orders = ref<BusinessOrder[]>(initial.orders);
  const categories = ref<string[]>(initial.categories);

  const activeProducts = computed(() => products.value.filter((item) => item.status === 1));
  const activeOrders = computed(() =>
    orders.value.filter((item) => item.status === "pending" || item.status === "making")
  );

  function persist(): void {
    if (typeof window === "undefined") return;
    const snapshot: BusinessSnapshot = {
      products: products.value,
      orders: orders.value,
      categories: categories.value,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }

  watch([products, orders, categories], persist, { deep: true });

  function nextOrderNo(date = new Date()): string {
    const dateKey = toLocalDateKey(date);
    const max = orders.value
      .filter((item) => toLocalDateKey(item.createTime) === dateKey)
      .reduce((current, item) => {
        const value = Number(item.orderNo.replace(/\D/g, ""));
        return Number.isFinite(value) ? Math.max(current, value) : current;
      }, 0);
    return `A${String(max + 1).padStart(3, "0")}`;
  }

  function createOrder(cart: CartItem[], remark: string): BusinessOrder {
    if (cart.length === 0) throw new Error("请先选择商品");

    const normalized = cart.filter((item) => item.quantity > 0);
    const checked = normalized.map((cartItem) => {
      const product = products.value.find((item) => item.id === cartItem.productId);
      if (!product || product.status !== 1) throw new Error("订单中包含已下架商品，请重新选择");
      if (product.stock < cartItem.quantity) {
        throw new Error(`${product.name} 库存不足，当前仅剩 ${product.stock} 份`);
      }
      return { product, quantity: cartItem.quantity };
    });

    const now = new Date();
    const order: BusinessOrder = {
      id: createId("order"),
      orderNo: nextOrderNo(now),
      status: "pending",
      remark: remark.trim(),
      createTime: now.toISOString(),
      items: checked.map(({ product, quantity }) => ({
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        quantity,
      })),
      totalAmount: checked.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    };

    checked.forEach(({ product, quantity }) => {
      product.stock -= quantity;
    });
    orders.value.unshift(order);
    return order;
  }

  function changeOrderStatus(id: string, status: Exclude<OrderStatus, "voided">): void {
    const order = orders.value.find((item) => item.id === id);
    if (!order || order.status === "voided") return;
    order.status = status;
  }

  function voidOrder(id: string): void {
    const order = orders.value.find((item) => item.id === id);
    if (!order) throw new Error("订单不存在");
    if (order.status === "voided") throw new Error("订单已作废，不能重复回滚库存");
    if (order.status === "completed") throw new Error("已完成订单不能在制作队列中作废");

    order.items.forEach((orderItem) => {
      const product = products.value.find((item) => item.id === orderItem.productId);
      if (product) product.stock += orderItem.quantity;
    });
    order.status = "voided";
  }

  function restockProduct(id: string, quantity: number): void {
    const product = products.value.find((item) => item.id === id);
    if (!product) throw new Error("商品不存在");
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("入库数量必须是正整数");
    product.stock += quantity;
  }

  function addProduct(input: ProductInput): void {
    const name = input.name.trim();
    if (!name) throw new Error("请输入商品名称");
    if (products.value.some((item) => item.name === name)) throw new Error("商品名称已存在");
    if (!categories.value.includes(input.category)) categories.value.push(input.category);
    products.value.unshift({
      id: createId("product"),
      name,
      category: input.category,
      price: Number(input.price),
      stock: Number(input.stock),
      warningStock: Number(input.warningStock),
      status: input.status ?? 1,
      imageUrl: "",
    });
  }

  function updateProduct(id: string, input: ProductInput): void {
    const product = products.value.find((item) => item.id === id);
    if (!product) throw new Error("商品不存在");
    const duplicate = products.value.some(
      (item) => item.id !== id && item.name === input.name.trim()
    );
    if (duplicate) throw new Error("商品名称已存在");
    Object.assign(product, {
      name: input.name.trim(),
      category: input.category,
      price: Number(input.price),
      warningStock: Number(input.warningStock),
    });
    if (!categories.value.includes(input.category)) categories.value.push(input.category);
  }

  function toggleProduct(id: string): void {
    const product = products.value.find((item) => item.id === id);
    if (product) product.status = product.status === 1 ? 0 : 1;
  }

  function addCategory(name: string): void {
    const value = name.trim();
    if (!value) throw new Error("请输入分类名称");
    if (categories.value.includes(value)) throw new Error("分类名称已存在");
    categories.value.push(value);
  }

  function renameCategory(oldName: string, newName: string): void {
    const value = newName.trim();
    if (!value) throw new Error("分类名称不能为空");
    if (oldName !== value && categories.value.includes(value)) throw new Error("分类名称已存在");
    const index = categories.value.indexOf(oldName);
    if (index < 0) return;
    categories.value[index] = value;
    products.value.forEach((item) => {
      if (item.category === oldName) item.category = value;
    });
  }

  function removeCategory(name: string): void {
    if (products.value.some((item) => item.category === name)) {
      throw new Error("该分类下仍有商品，不能删除");
    }
    categories.value = categories.value.filter((item) => item !== name);
  }

  return {
    products,
    orders,
    categories,
    activeProducts,
    activeOrders,
    nextOrderNo,
    createOrder,
    changeOrderStatus,
    voidOrder,
    restockProduct,
    addProduct,
    updateProduct,
    toggleProduct,
    addCategory,
    renameCategory,
    removeCategory,
  };
});
