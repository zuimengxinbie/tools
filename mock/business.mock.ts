import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { defineMock } from "./base";

type ProductStatus = 0 | 1;
type OrderStatus = "pending" | "making" | "completed" | "voided";
type ReservationStatus = "active" | "completed" | "cancelled";
type StockMovementType =
  | "opening"
  | "restock"
  | "sale"
  | "void_return"
  | "reservation_lock"
  | "reservation_release"
  | "reservation_complete"
  | "loss"
  | "stocktake";

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

interface ReservationItem {
  productId: string;
  productName: string;
  quantity: number;
}

interface Reservation {
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

interface StockMovement {
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

const DATA_DIR = path.resolve(process.cwd(), "mock/business");
const ORDERS_DIR = path.join(DATA_DIR, "orders");
const MOVEMENTS_DIR = path.join(DATA_DIR, "stock-movements");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const CATEGORIES_FILE = path.join(DATA_DIR, "categories.json");
const RESERVATIONS_FILE = path.join(DATA_DIR, "reservations.json");
const LEDGER_META_FILE = path.join(DATA_DIR, "stock-ledger.json");
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
  if (!fs.existsSync(MOVEMENTS_DIR)) fs.mkdirSync(MOVEMENTS_DIR, { recursive: true });
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

function getMovementFile(date: string): string {
  assertDateKey(date);
  return path.join(MOVEMENTS_DIR, `${date}.json`);
}

function readReservations(): Reservation[] {
  const reservations = readJson<unknown>(RESERVATIONS_FILE, []);
  if (!Array.isArray(reservations)) throw new Error("reservations.json 必须是数组");
  return reservations as Reservation[];
}

function readMovements(date: string): StockMovement[] {
  const movements = readJson<unknown>(getMovementFile(date), []);
  if (!Array.isArray(movements)) throw new Error(`${date}.json 库存流水必须是数组`);
  return movements as StockMovement[];
}

function reservedMap(reservations = readReservations()): Map<string, number> {
  const result = new Map<string, number>();
  reservations
    .filter((item) => item.status === "active")
    .forEach((reservation) => {
      reservation.items.forEach((item) => {
        result.set(item.productId, (result.get(item.productId) ?? 0) + item.quantity);
      });
    });
  return result;
}

function enrichProducts(products = readProducts(), reservations = readReservations()) {
  const reserved = reservedMap(reservations);
  return products.map((product) => {
    const reservedStock = reserved.get(product.id) ?? 0;
    return {
      ...product,
      reservedStock,
      availableStock: Math.max(0, product.stock - reservedStock),
    };
  });
}

function inventoryResult(
  products = readProducts(),
  reservations = readReservations(),
  categories = readCategories()
) {
  return { products: enrichProducts(products, reservations), reservations, categories };
}

function persistJsonTransaction(changes: Array<{ file: string; data: unknown }>): void {
  const snapshots = changes.map(({ file }) => ({
    file,
    existed: fs.existsSync(file),
    content: fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : "",
  }));
  try {
    changes.forEach(({ file, data }) => writeJson(file, data));
  } catch (error) {
    snapshots.reverse().forEach(({ file, existed, content }) => {
      if (existed) fs.writeFileSync(file, content, "utf-8");
      else if (fs.existsSync(file)) fs.rmSync(file);
    });
    throw error;
  }
}

function movement(
  product: Product,
  type: StockMovementType,
  values: {
    beforeStock: number;
    afterStock: number;
    beforeReserved: number;
    afterReserved: number;
    referenceId?: string;
    referenceNo?: string;
    reason: string;
    remark?: string;
    createTime?: string;
  }
): StockMovement {
  return {
    id: `movement-${randomUUID()}`,
    productId: product.id,
    productName: product.name,
    type,
    stockDelta: values.afterStock - values.beforeStock,
    reservedDelta: values.afterReserved - values.beforeReserved,
    beforeStock: values.beforeStock,
    afterStock: values.afterStock,
    beforeReserved: values.beforeReserved,
    afterReserved: values.afterReserved,
    referenceId: values.referenceId,
    referenceNo: values.referenceNo,
    reason: values.reason,
    remark: values.remark?.trim().slice(0, 100) ?? "",
    createTime: values.createTime ?? new Date().toISOString(),
  };
}

function movementChange(date: string, additions: StockMovement[]) {
  return { file: getMovementFile(date), data: [...additions, ...readMovements(date)] };
}

function ensureOpeningMovements(): void {
  ensureDataDirectories();
  if (fs.existsSync(LEDGER_META_FILE)) return;
  const products = readProducts();
  const date = toLocalDateKey();
  const createTime = new Date().toISOString();
  const openings = products.map((product) =>
    movement(product, "opening", {
      beforeStock: 0,
      afterStock: product.stock,
      beforeReserved: 0,
      afterReserved: 0,
      reason: "库存流水启用时的期初库存",
      createTime,
    })
  );
  persistJsonTransaction([
    movementChange(date, openings),
    { file: LEDGER_META_FILE, data: { initializedAt: createTime } },
  ]);
}

function normalizeReservationItems(
  rawItems: unknown,
  products: Product[],
  reservations: Reservation[],
  current?: Reservation
): ReservationItem[] {
  if (!Array.isArray(rawItems) || !rawItems.length) throw new Error("请至少选择一个预定商品");
  const quantities = new Map<string, number>();
  rawItems.forEach((item: any) => {
    if (
      typeof item?.productId !== "string" ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new Error("预定商品数量无效");
    }
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  });
  const reserved = reservedMap(reservations);
  current?.items.forEach((item) => {
    reserved.set(item.productId, Math.max(0, (reserved.get(item.productId) ?? 0) - item.quantity));
  });
  return [...quantities].map(([productId, quantity]) => {
    const product = products.find((item) => item.id === productId);
    if (!product || product.status !== 1) throw new Error("预定中包含不存在或已下架的商品");
    const available = product.stock - (reserved.get(product.id) ?? 0);
    if (quantity > available) {
      throw new Error(`${product.name} 可售库存不足，当前仅剩 ${available} 份`);
    }
    return { productId, productName: product.name, quantity };
  });
}

function validateReservationBody(body: any): void {
  if (!body || typeof body.customer !== "string" || !body.customer.trim()) {
    throw new Error("请输入预定人或来源");
  }
  if (typeof body.pickupTime !== "string" || Number.isNaN(Date.parse(body.pickupTime))) {
    throw new Error("请选择有效的预计取货时间");
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
  return { products: enrichProducts(products), categories };
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

ensureOpeningMovements();

export default defineMock([
  {
    url: "business/bootstrap",
    method: ["GET"],
    body: () => {
      try {
        ensureOpeningMovements();
        const date = toLocalDateKey();
        const reservations = readReservations();
        return success({
          date,
          products: enrichProducts(readProducts(), reservations),
          categories: readCategories(),
          orders: readOrders(date),
          reservations,
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
        const reservations = readReservations();
        const reserved = reservedMap(reservations);
        const nextProducts = structuredClone(previousProducts);
        const orderItems: OrderItem[] = [];
        const movements: StockMovement[] = [];

        quantities.forEach((quantity, productId) => {
          const product = nextProducts.find((item) => item.id === productId);
          if (!product || product.status !== 1) throw new Error("订单中包含不存在或已下架的商品");
          const available = product.stock - (reserved.get(product.id) ?? 0);
          if (available < quantity) {
            throw new Error(`${product.name} 可售库存不足，当前仅剩 ${available} 份`);
          }
          const beforeStock = product.stock;
          product.stock -= quantity;
          orderItems.push({
            productId: product.id,
            productName: product.name,
            productPrice: product.price,
            quantity,
          });
          movements.push(
            movement(product, "sale", {
              beforeStock,
              afterStock: product.stock,
              beforeReserved: reserved.get(product.id) ?? 0,
              afterReserved: reserved.get(product.id) ?? 0,
              reason: "普通订单销售出库",
            })
          );
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
        movements.forEach((item) => {
          item.referenceId = order.id;
          item.referenceNo = order.orderNo;
          item.createTime = order.createTime;
        });
        persistJsonTransaction([
          { file: getOrderFile(date), data: nextOrders },
          { file: PRODUCTS_FILE, data: nextProducts },
          movementChange(date, movements),
        ]);
        return success(
          { order, products: enrichProducts(nextProducts, reservations), orders: nextOrders },
          "下单成功"
        );
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
        const reservations = readReservations();
        const reserved = reservedMap(reservations);
        const nextProducts = structuredClone(previousProducts);
        const nextOrders = structuredClone(previousOrders);
        const order = nextOrders.find((item) => item.id === id);
        if (!order) throw new Error("订单不存在");
        if (order.status === status) {
          return success({
            order,
            products: enrichProducts(previousProducts, reservations),
            orders: previousOrders,
          });
        }
        if (order.status === "voided" || order.status === "completed") {
          throw new Error("当前订单状态不能再变更");
        }
        if (order.status === "making" && status === "pending") {
          throw new Error("制作中的订单不能退回待制作");
        }

        if (status === "voided") {
          const movements: StockMovement[] = [];
          order.items.forEach((orderItem) => {
            const product = nextProducts.find((item) => item.id === orderItem.productId);
            if (product) {
              const beforeStock = product.stock;
              product.stock += orderItem.quantity;
              movements.push(
                movement(product, "void_return", {
                  beforeStock,
                  afterStock: product.stock,
                  beforeReserved: reserved.get(product.id) ?? 0,
                  afterReserved: reserved.get(product.id) ?? 0,
                  referenceId: order.id,
                  referenceNo: order.orderNo,
                  reason: "订单作废退回库存",
                })
              );
            }
          });
          order.status = status;
          persistJsonTransaction([
            { file: getOrderFile(date), data: nextOrders },
            { file: PRODUCTS_FILE, data: nextProducts },
            movementChange(toLocalDateKey(), movements),
          ]);
          return success(
            { order, products: enrichProducts(nextProducts, reservations), orders: nextOrders },
            "订单状态已更新"
          );
        }
        order.status = status;
        writeJson(getOrderFile(date), nextOrders);
        return success(
          { order, products: enrichProducts(nextProducts, reservations), orders: nextOrders },
          "订单状态已更新"
        );
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
        const product: Product = {
          id: `product-${randomUUID()}`,
          name,
          category: body.category,
          price: Number(body.price),
          stock: Number(body.stock),
          warningStock: Number(body.warningStock),
          status: body.status === 0 ? 0 : 1,
          imageUrl: "",
        };
        products.unshift(product);
        const date = toLocalDateKey();
        persistJsonTransaction([
          { file: PRODUCTS_FILE, data: products },
          movementChange(date, [
            movement(product, "opening", {
              beforeStock: 0,
              afterStock: product.stock,
              beforeReserved: 0,
              afterReserved: 0,
              reason: "新增商品初始库存",
            }),
          ]),
        ]);
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
        const reservations = readReservations();
        const reserved = reservedMap(reservations);
        const product = products.find((item) => item.id === params.id);
        if (!product) throw new Error("商品不存在");
        const beforeStock = product.stock;
        product.stock += quantity;
        const date = toLocalDateKey();
        persistJsonTransaction([
          { file: PRODUCTS_FILE, data: products },
          movementChange(date, [
            movement(product, "restock", {
              beforeStock,
              afterStock: product.stock,
              beforeReserved: reserved.get(product.id) ?? 0,
              afterReserved: reserved.get(product.id) ?? 0,
              reason: "商品入库",
            }),
          ]),
        ]);
        return success(inventoryResult(products, reservations), "入库成功");
      } catch (error) {
        return failure(error);
      }
    },
  },
  {
    url: "business/products/:id/stock-adjustment",
    method: ["POST"],
    body: ({ params, body }) => {
      try {
        const mode = body?.mode as "loss" | "stocktake";
        if (mode !== "loss" && mode !== "stocktake") throw new Error("库存调整方式无效");
        const quantity = Number(body?.quantity);
        if (!Number.isInteger(quantity) || quantity < 0 || (mode === "loss" && quantity === 0)) {
          throw new Error(mode === "loss" ? "损耗数量必须是正整数" : "盘点库存必须是非负整数");
        }
        const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
        if (!reason) throw new Error("请输入调整原因");
        const remark = typeof body?.remark === "string" ? body.remark.trim() : "";
        const products = readProducts();
        const reservations = readReservations();
        const reserved = reservedMap(reservations);
        const product = products.find((item) => item.id === params.id);
        if (!product) throw new Error("商品不存在");
        const beforeStock = product.stock;
        const afterStock = mode === "loss" ? beforeStock - quantity : quantity;
        const productReserved = reserved.get(product.id) ?? 0;
        if (afterStock < 0) throw new Error("损耗数量不能超过当前实物库存");
        if (afterStock < productReserved) {
          throw new Error(`调整后库存不能低于已预留的 ${productReserved} 份，请先处理相关预定`);
        }
        if (afterStock === beforeStock) throw new Error("调整后库存与当前库存相同");
        product.stock = afterStock;
        const date = toLocalDateKey();
        persistJsonTransaction([
          { file: PRODUCTS_FILE, data: products },
          movementChange(date, [
            movement(product, mode, {
              beforeStock,
              afterStock,
              beforeReserved: productReserved,
              afterReserved: productReserved,
              reason: reason.slice(0, 40),
              remark,
            }),
          ]),
        ]);
        return success(inventoryResult(products, reservations), "库存调整成功");
      } catch (error) {
        return failure(error);
      }
    },
  },
  {
    url: "business/reservations",
    method: ["GET"],
    body: () => {
      try {
        return success(
          readReservations().sort(
            (first, second) => Date.parse(second.createTime) - Date.parse(first.createTime)
          )
        );
      } catch (error) {
        return failure(error);
      }
    },
  },
  {
    url: "business/reservations",
    method: ["POST"],
    body: ({ body }) => {
      try {
        validateReservationBody(body);
        const products = readProducts();
        const reservations = readReservations();
        const items = normalizeReservationItems(body.items, products, reservations);
        const beforeReserved = reservedMap(reservations);
        const now = new Date();
        const date = toLocalDateKey(now);
        const maxNumber = reservations
          .filter((item) => toLocalDateKey(new Date(item.createTime)) === date)
          .reduce((max, item) => {
            const value = Number(item.reservationNo.match(/(\d+)$/)?.[1] ?? 0);
            return Math.max(max, value);
          }, 0);
        const reservation: Reservation = {
          id: `reservation-${randomUUID()}`,
          reservationNo: `R${date.replaceAll("-", "")}-${String(maxNumber + 1).padStart(3, "0")}`,
          customer: body.customer.trim().slice(0, 30),
          pickupTime: new Date(body.pickupTime).toISOString(),
          remark: typeof body.remark === "string" ? body.remark.trim().slice(0, 100) : "",
          status: "active",
          createTime: now.toISOString(),
          updateTime: now.toISOString(),
          items,
        };
        const nextReservations = [reservation, ...reservations];
        const afterReserved = reservedMap(nextReservations);
        const movements = items.map((item) => {
          const product = products.find((candidate) => candidate.id === item.productId)!;
          return movement(product, "reservation_lock", {
            beforeStock: product.stock,
            afterStock: product.stock,
            beforeReserved: beforeReserved.get(product.id) ?? 0,
            afterReserved: afterReserved.get(product.id) ?? 0,
            referenceId: reservation.id,
            referenceNo: reservation.reservationNo,
            reason: "新增预定锁定库存",
            remark: reservation.remark,
            createTime: reservation.createTime,
          });
        });
        persistJsonTransaction([
          { file: RESERVATIONS_FILE, data: nextReservations },
          movementChange(date, movements),
        ]);
        return success(inventoryResult(products, nextReservations), "预定已创建");
      } catch (error) {
        return failure(error);
      }
    },
  },
  {
    url: "business/reservations/:id",
    method: ["PUT"],
    body: ({ params, body }) => {
      try {
        validateReservationBody(body);
        const products = readProducts();
        const reservations = readReservations();
        const current = reservations.find((item) => item.id === params.id);
        if (!current) throw new Error("预定不存在");
        if (current.status !== "active") throw new Error("只有预定中的记录可以编辑");
        const items = normalizeReservationItems(body.items, products, reservations, current);
        const beforeReserved = reservedMap(reservations);
        const nextReservations = structuredClone(reservations);
        const next = nextReservations.find((item) => item.id === params.id)!;
        Object.assign(next, {
          customer: body.customer.trim().slice(0, 30),
          pickupTime: new Date(body.pickupTime).toISOString(),
          remark: typeof body.remark === "string" ? body.remark.trim().slice(0, 100) : "",
          updateTime: new Date().toISOString(),
          items,
        });
        const afterReserved = reservedMap(nextReservations);
        const productIds = new Set([
          ...current.items.map((item) => item.productId),
          ...items.map((item) => item.productId),
        ]);
        const movements: StockMovement[] = [];
        productIds.forEach((productId) => {
          const product = products.find((item) => item.id === productId);
          if (!product) return;
          const before = beforeReserved.get(productId) ?? 0;
          const after = afterReserved.get(productId) ?? 0;
          if (before === after) return;
          movements.push(
            movement(product, after > before ? "reservation_lock" : "reservation_release", {
              beforeStock: product.stock,
              afterStock: product.stock,
              beforeReserved: before,
              afterReserved: after,
              referenceId: next.id,
              referenceNo: next.reservationNo,
              reason: "编辑预定调整预留库存",
              remark: next.remark,
              createTime: next.updateTime,
            })
          );
        });
        const date = toLocalDateKey();
        const changes: Array<{ file: string; data: unknown }> = [
          { file: RESERVATIONS_FILE, data: nextReservations },
        ];
        if (movements.length) changes.push(movementChange(date, movements));
        persistJsonTransaction(changes);
        return success(inventoryResult(products, nextReservations), "预定已更新");
      } catch (error) {
        return failure(error);
      }
    },
  },
  {
    url: "business/reservations/:id/status",
    method: ["PATCH"],
    body: ({ params, body }) => {
      try {
        const status = body?.status as ReservationStatus;
        if (status !== "completed" && status !== "cancelled") {
          throw new Error("预定状态无效");
        }
        const products = readProducts();
        const reservations = readReservations();
        const current = reservations.find((item) => item.id === params.id);
        if (!current) throw new Error("预定不存在");
        if (current.status === status) return success(inventoryResult(products, reservations));
        if (current.status !== "active") throw new Error("当前预定状态不能再变更");
        const beforeReserved = reservedMap(reservations);
        const nextProducts = structuredClone(products);
        const nextReservations = structuredClone(reservations);
        const next = nextReservations.find((item) => item.id === params.id)!;
        next.status = status;
        next.updateTime = new Date().toISOString();
        const afterReserved = reservedMap(nextReservations);
        const movements: StockMovement[] = [];
        current.items.forEach((item) => {
          const product = nextProducts.find((candidate) => candidate.id === item.productId);
          if (!product) throw new Error(`${item.productName} 已不存在，无法处理预定`);
          const beforeStock = product.stock;
          if (status === "completed") {
            if (product.stock < item.quantity) throw new Error(`${product.name} 实物库存不足`);
            product.stock -= item.quantity;
          }
          movements.push(
            movement(
              product,
              status === "completed" ? "reservation_complete" : "reservation_release",
              {
                beforeStock,
                afterStock: product.stock,
                beforeReserved: beforeReserved.get(product.id) ?? 0,
                afterReserved: afterReserved.get(product.id) ?? 0,
                referenceId: next.id,
                referenceNo: next.reservationNo,
                reason: status === "completed" ? "预定完成出库" : "取消预定释放库存",
                remark: next.remark,
                createTime: next.updateTime,
              }
            )
          );
        });
        const date = toLocalDateKey();
        persistJsonTransaction([
          { file: RESERVATIONS_FILE, data: nextReservations },
          { file: PRODUCTS_FILE, data: nextProducts },
          movementChange(date, movements),
        ]);
        return success(
          inventoryResult(nextProducts, nextReservations),
          status === "completed" ? "预定已完成并扣减库存" : "预定已取消"
        );
      } catch (error) {
        return failure(error);
      }
    },
  },
  {
    url: "business/stock-movements",
    method: ["GET"],
    body: ({ query }) => {
      try {
        ensureOpeningMovements();
        const { startDate, endDate, productId, type } = query;
        assertDateKey(startDate);
        assertDateKey(endDate);
        if (startDate > endDate) throw new Error("开始日期不能晚于结束日期");
        ensureDataDirectories();
        const movements = fs
          .readdirSync(MOVEMENTS_DIR)
          .filter((file) => file.endsWith(".json"))
          .map((file) => file.slice(0, -5))
          .filter((date) => DATE_PATTERN.test(date) && date >= startDate && date <= endDate)
          .flatMap((date) => readMovements(date))
          .filter((item) => !productId || item.productId === productId)
          .filter((item) => !type || item.type === type)
          .sort((first, second) => Date.parse(second.createTime) - Date.parse(first.createTime));
        return success(movements);
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
