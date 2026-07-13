import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { defineMock } from "./base";

type ProductStatus = 0 | 1;
type OrderStatus = "pending" | "making" | "completed" | "voided";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: ProductStatus;
  warningStock: number;
  imageUrl?: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
}

interface BusinessOrder {
  id: string;
  orderNo: string;
  totalAmount: number;
  status: OrderStatus;
  remark: string;
  createTime: string;
  items: OrderItem[];
}

const DATA_DIR = path.resolve(process.cwd(), "mock/business");
const ORDERS_DIR = path.join(DATA_DIR, "orders");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const CATEGORIES_FILE = path.join(DATA_DIR, "categories.json");
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ORDER_STATUSES = new Set<OrderStatus>(["pending", "making", "completed", "voided"]);

function success<T>(data: T, msg = "一切ok") {
  return { code: "00000", data, msg };
}

function failure(error: unknown) {
  return {
    code: "B0400",
    data: null,
    msg: error instanceof Error ? error.message : "业务数据处理失败",
  };
}

function ensureDataDirectories(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(ORDERS_DIR)) fs.mkdirSync(ORDERS_DIR, { recursive: true });
}

function readJson<T>(file: string, fallback?: T): T {
  if (!fs.existsSync(file)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`数据文件不存在：${path.relative(process.cwd(), file)}`);
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    throw new Error(`数据文件格式错误：${path.relative(process.cwd(), file)}`);
  }
}

function writeJson(file: string, data: unknown): void {
  ensureDataDirectories();
  const temporaryFile = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporaryFile, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
    fs.copyFileSync(temporaryFile, file);
  } finally {
    if (fs.existsSync(temporaryFile)) fs.rmSync(temporaryFile);
  }
}

function toLocalDateKey(value = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function assertDateKey(date: unknown): asserts date is string {
  if (typeof date !== "string" || !DATE_PATTERN.test(date)) {
    throw new Error("日期格式必须为 YYYY-MM-DD");
  }
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime()) || toLocalDateKey(parsed) !== date)
    throw new Error("日期无效");
}

function getOrderFile(date: string): string {
  assertDateKey(date);
  return path.join(ORDERS_DIR, `${date}.json`);
}

function readProducts(): Product[] {
  const products = readJson<unknown>(PRODUCTS_FILE);
  if (!Array.isArray(products)) throw new Error("products.json 必须是数组");
  return products as Product[];
}

function readCategories(): string[] {
  const categories = readJson<unknown>(CATEGORIES_FILE);
  if (!Array.isArray(categories) || categories.some((item) => typeof item !== "string")) {
    throw new Error("categories.json 必须是字符串数组");
  }
  return categories;
}

function readOrders(date: string): BusinessOrder[] {
  const file = getOrderFile(date);
  const orders = readJson<unknown>(file, []);
  if (!Array.isArray(orders)) throw new Error(`${date}.json 必须是订单数组`);
  return orders as BusinessOrder[];
}

function persistOrderTransaction(
  date: string,
  nextOrders: BusinessOrder[],
  nextProducts: Product[],
  previousOrders: BusinessOrder[],
  previousProducts: Product[]
): void {
  const orderFile = getOrderFile(date);
  const orderFileExisted = fs.existsSync(orderFile);
  writeJson(orderFile, nextOrders);
  try {
    writeJson(PRODUCTS_FILE, nextProducts);
  } catch (error) {
    if (orderFileExisted) writeJson(orderFile, previousOrders);
    else if (fs.existsSync(orderFile)) fs.rmSync(orderFile);
    writeJson(PRODUCTS_FILE, previousProducts);
    throw error;
  }
}

function persistCatalogTransaction(
  nextProducts: Product[],
  nextCategories: string[],
  previousProducts: Product[],
  previousCategories: string[]
): void {
  writeJson(PRODUCTS_FILE, nextProducts);
  try {
    writeJson(CATEGORIES_FILE, nextCategories);
  } catch (error) {
    writeJson(PRODUCTS_FILE, previousProducts);
    writeJson(CATEGORIES_FILE, previousCategories);
    throw error;
  }
}

function catalogResult(products = readProducts(), categories = readCategories()) {
  return { products, categories };
}

function validateProductInput(body: any, includeStock: boolean): void {
  if (!body || typeof body.name !== "string" || !body.name.trim())
    throw new Error("请输入商品名称");
  if (typeof body.category !== "string" || !body.category.trim()) throw new Error("请选择商品分类");
  if (!Number.isFinite(Number(body.price)) || Number(body.price) <= 0)
    throw new Error("销售价格必须大于 0");
  if (!Number.isInteger(Number(body.warningStock)) || Number(body.warningStock) < 0) {
    throw new Error("预警库存必须是非负整数");
  }
  if (includeStock && (!Number.isInteger(Number(body.stock)) || Number(body.stock) < 0)) {
    throw new Error("初始库存必须是非负整数");
  }
}

export default defineMock([
  {
    url: "business/bootstrap",
    method: ["GET"],
    body: () => {
      try {
        const date = toLocalDateKey();
        return success({
          date,
          products: readProducts(),
          categories: readCategories(),
          orders: readOrders(date),
        });
      } catch (error) {
        return failure(error);
      }
    },
  },
  {
    url: "business/orders",
    method: ["GET"],
    body: ({ query }) => {
      try {
        const { startDate, endDate } = query;
        assertDateKey(startDate);
        assertDateKey(endDate);
        if (startDate > endDate) throw new Error("开始日期不能晚于结束日期");
        ensureDataDirectories();
        const orders = fs
          .readdirSync(ORDERS_DIR)
          .filter((file) => file.endsWith(".json"))
          .map((file) => file.slice(0, -5))
          .filter((date) => DATE_PATTERN.test(date) && date >= startDate && date <= endDate)
          .flatMap((date) => readOrders(date))
          .sort((first, second) => Date.parse(second.createTime) - Date.parse(first.createTime));
        return success(orders);
      } catch (error) {
        return failure(error);
      }
    },
  },
  {
    url: "business/orders",
    method: ["POST"],
    body: ({ body }) => {
      try {
        const items = Array.isArray(body?.items) ? body.items : [];
        if (!items.length) throw new Error("请先选择商品");

        const quantities = new Map<string, number>();
        items.forEach((item: any) => {
          if (
            typeof item.productId !== "string" ||
            !Number.isInteger(item.quantity) ||
            item.quantity <= 0
          ) {
            throw new Error("订单商品数量无效");
          }
          quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
        });

        const date = toLocalDateKey();
        const previousProducts = readProducts();
        const previousOrders = readOrders(date);
        const nextProducts = structuredClone(previousProducts);
        const orderItems: OrderItem[] = [];

        quantities.forEach((quantity, productId) => {
          const product = nextProducts.find((item) => item.id === productId);
          if (!product || product.status !== 1) throw new Error("订单中包含不存在或已下架的商品");
          if (product.stock < quantity) {
            throw new Error(`${product.name} 库存不足，当前仅剩 ${product.stock} 份`);
          }
          product.stock -= quantity;
          orderItems.push({
            productId: product.id,
            productName: product.name,
            productPrice: product.price,
            quantity,
          });
        });

        const maxNumber = previousOrders.reduce((max, order) => {
          const value = Number(order.orderNo.replace(/\D/g, ""));
          return Number.isFinite(value) ? Math.max(max, value) : max;
        }, 0);
        const order: BusinessOrder = {
          id: `order-${randomUUID()}`,
          orderNo: `A${String(maxNumber + 1).padStart(3, "0")}`,
          totalAmount: orderItems.reduce((sum, item) => sum + item.productPrice * item.quantity, 0),
          status: "pending",
          remark: typeof body.remark === "string" ? body.remark.trim().slice(0, 80) : "",
          createTime: new Date().toISOString(),
          items: orderItems,
        };
        const nextOrders = [order, ...previousOrders];
        persistOrderTransaction(date, nextOrders, nextProducts, previousOrders, previousProducts);
        return success({ order, products: nextProducts, orders: nextOrders }, "下单成功");
      } catch (error) {
        return failure(error);
      }
    },
  },
  {
    url: "business/orders/:date/:id/status",
    method: ["PATCH"],
    body: ({ params, body }) => {
      try {
        const { date, id } = params;
        assertDateKey(date);
        const status = body?.status as OrderStatus;
        if (!ORDER_STATUSES.has(status)) throw new Error("订单状态无效");

        const previousProducts = readProducts();
        const previousOrders = readOrders(date);
        const nextProducts = structuredClone(previousProducts);
        const nextOrders = structuredClone(previousOrders);
        const order = nextOrders.find((item) => item.id === id);
        if (!order) throw new Error("订单不存在");
        if (order.status === status) {
          return success({ order, products: previousProducts, orders: previousOrders });
        }
        if (order.status === "voided" || order.status === "completed") {
          throw new Error("当前订单状态不能再变更");
        }
        if (order.status === "making" && status === "pending") {
          throw new Error("制作中的订单不能退回待制作");
        }

        if (status === "voided") {
          order.items.forEach((orderItem) => {
            const product = nextProducts.find((item) => item.id === orderItem.productId);
            if (product) product.stock += orderItem.quantity;
          });
        }
        order.status = status;
        persistOrderTransaction(date, nextOrders, nextProducts, previousOrders, previousProducts);
        return success({ order, products: nextProducts, orders: nextOrders }, "订单状态已更新");
      } catch (error) {
        return failure(error);
      }
    },
  },
  {
    url: "business/products",
    method: ["POST"],
    body: ({ body }) => {
      try {
        validateProductInput(body, true);
        const products = readProducts();
        const categories = readCategories();
        const name = body.name.trim();
        if (products.some((item) => item.name === name)) throw new Error("商品名称已存在");
        if (!categories.includes(body.category)) throw new Error("商品分类不存在");
        products.unshift({
          id: `product-${randomUUID()}`,
          name,
          category: body.category,
          price: Number(body.price),
          stock: Number(body.stock),
          warningStock: Number(body.warningStock),
          status: body.status === 0 ? 0 : 1,
          imageUrl: "",
        });
        writeJson(PRODUCTS_FILE, products);
        return success(catalogResult(products, categories), "商品已新增");
      } catch (error) {
        return failure(error);
      }
    },
  },
  {
    url: "business/products/:id",
    method: ["PUT"],
    body: ({ params, body }) => {
      try {
        validateProductInput(body, false);
        const products = readProducts();
        const categories = readCategories();
        const product = products.find((item) => item.id === params.id);
        if (!product) throw new Error("商品不存在");
        const name = body.name.trim();
        if (products.some((item) => item.id !== params.id && item.name === name)) {
          throw new Error("商品名称已存在");
        }
        if (!categories.includes(body.category)) throw new Error("商品分类不存在");
        Object.assign(product, {
          name,
          category: body.category,
          price: Number(body.price),
          warningStock: Number(body.warningStock),
        });
        writeJson(PRODUCTS_FILE, products);
        return success(catalogResult(products, categories), "商品已更新");
      } catch (error) {
        return failure(error);
      }
    },
  },
  {
    url: "business/products/:id/status",
    method: ["PATCH"],
    body: ({ params }) => {
      try {
        const products = readProducts();
        const product = products.find((item) => item.id === params.id);
        if (!product) throw new Error("商品不存在");
        product.status = product.status === 1 ? 0 : 1;
        writeJson(PRODUCTS_FILE, products);
        return success(catalogResult(products), product.status === 1 ? "商品已上架" : "商品已下架");
      } catch (error) {
        return failure(error);
      }
    },
  },
  {
    url: "business/products/:id/restock",
    method: ["POST"],
    body: ({ params, body }) => {
      try {
        const quantity = Number(body?.quantity);
        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new Error("入库数量必须是正整数");
        }
        const products = readProducts();
        const product = products.find((item) => item.id === params.id);
        if (!product) throw new Error("商品不存在");
        product.stock += quantity;
        writeJson(PRODUCTS_FILE, products);
        return success(catalogResult(products), "入库成功");
      } catch (error) {
        return failure(error);
      }
    },
  },
  {
    url: "business/categories",
    method: ["POST"],
    body: ({ body }) => {
      try {
        const name = typeof body?.name === "string" ? body.name.trim() : "";
        if (!name) throw new Error("请输入分类名称");
        const categories = readCategories();
        if (categories.includes(name)) throw new Error("分类名称已存在");
        categories.push(name);
        writeJson(CATEGORIES_FILE, categories);
        return success(catalogResult(undefined, categories), "分类已添加");
      } catch (error) {
        return failure(error);
      }
    },
  },
  {
    url: "business/categories",
    method: ["PUT"],
    body: ({ body }) => {
      try {
        const oldName = typeof body?.oldName === "string" ? body.oldName : "";
        const newName = typeof body?.newName === "string" ? body.newName.trim() : "";
        if (!newName) throw new Error("分类名称不能为空");
        const previousProducts = readProducts();
        const previousCategories = readCategories();
        const index = previousCategories.indexOf(oldName);
        if (index < 0) throw new Error("分类不存在");
        if (oldName !== newName && previousCategories.includes(newName)) {
          throw new Error("分类名称已存在");
        }
        const nextProducts = structuredClone(previousProducts);
        const nextCategories = [...previousCategories];
        nextCategories[index] = newName;
        nextProducts.forEach((product) => {
          if (product.category === oldName) product.category = newName;
        });
        persistCatalogTransaction(
          nextProducts,
          nextCategories,
          previousProducts,
          previousCategories
        );
        return success(catalogResult(nextProducts, nextCategories), "分类已重命名");
      } catch (error) {
        return failure(error);
      }
    },
  },
  {
    url: "business/categories",
    method: ["DELETE"],
    body: ({ body }) => {
      try {
        const name = typeof body?.name === "string" ? body.name : "";
        const products = readProducts();
        const categories = readCategories();
        if (!categories.includes(name)) throw new Error("分类不存在");
        if (products.some((item) => item.category === name)) {
          throw new Error("该分类下仍有商品，不能删除");
        }
        const nextCategories = categories.filter((item) => item !== name);
        writeJson(CATEGORIES_FILE, nextCategories);
        return success(catalogResult(products, nextCategories), "分类已删除");
      } catch (error) {
        return failure(error);
      }
    },
  },
]);
