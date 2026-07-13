<template>
  <div v-loading="store.loading" class="cashier-page">
    <header class="cashier-page__header">
      <div>
        <p class="cashier-page__eyebrow">COFFEE STALL · POS</p>
        <h1>今日收银台</h1>
        <p>快速点单、自动扣减库存，并同步到制作队列</p>
      </div>
      <div class="cashier-page__header-actions">
        <div class="cashier-page__date">
          <el-icon><Clock /></el-icon>
          <span>{{ currentDateText }}</span>
        </div>
        <el-button :icon="Box" size="large" @click="openQuickRestock">快捷入库</el-button>
      </div>
    </header>

    <main class="cashier-layout">
      <section class="panel product-panel">
        <div class="panel__heading">
          <div>
            <span class="panel__step">01</span>
            <h2>选择商品</h2>
          </div>
          <span class="panel__hint">点击卡片加入订单</span>
        </div>

        <div class="category-tabs">
          <button
            v-for="category in categoryOptions"
            :key="category"
            type="button"
            :class="['category-tab', { 'is-active': activeCategory === category }]"
            @click="activeCategory = category"
          >
            {{ category }}
          </button>
        </div>

        <div v-if="filteredProducts.length" class="product-grid">
          <button
            v-for="product in filteredProducts"
            :key="product.id"
            type="button"
            :class="['product-card', { 'is-sold-out': product.availableStock === 0 }]"
            :disabled="product.availableStock === 0"
            @click="addToCart(product)"
          >
            <span class="product-card__icon">
              <el-icon><Coffee /></el-icon>
            </span>
            <span class="product-card__content">
              <strong>{{ product.name }}</strong>
              <small :class="{ 'is-low': product.availableStock <= product.warningStock }">
                {{ product.availableStock === 0 ? "已售罄" : `可售 ${product.availableStock} 份` }}
                <template v-if="product.reservedStock">· 预留 {{ product.reservedStock }}</template>
              </small>
            </span>
            <span class="product-card__price">¥{{ formatMoney(product.price) }}</span>
          </button>
        </div>
        <el-empty v-else description="当前分类暂无上架商品" />
      </section>

      <section class="panel order-panel">
        <div class="panel__heading">
          <div>
            <span class="panel__step">02</span>
            <h2>当前订单</h2>
          </div>
          <el-tag effect="plain" round>{{ cartCount }} 份</el-tag>
        </div>

        <div v-if="cartDetails.length" class="cart-list">
          <article v-for="item in cartDetails" :key="item.productId" class="cart-item">
            <div class="cart-item__info">
              <strong>{{ item.product.name }}</strong>
              <span>¥{{ formatMoney(item.product.price) }}</span>
            </div>
            <div class="quantity-control">
              <el-button circle :icon="Minus" @click="decreaseQuantity(item.productId)" />
              <strong>{{ item.quantity }}</strong>
              <el-button
                circle
                :icon="Plus"
                :disabled="item.quantity >= item.product.availableStock"
                @click="increaseQuantity(item.productId)"
              />
            </div>
            <strong class="cart-item__subtotal">
              ¥{{ formatMoney(item.product.price * item.quantity) }}
            </strong>
            <el-button
              class="cart-item__remove"
              text
              type="danger"
              :icon="Delete"
              @click="removeFromCart(item.productId)"
            />
          </article>
        </div>
        <div v-else class="empty-cart">
          <span>
            <el-icon><ShoppingCart /></el-icon>
          </span>
          <strong>订单还是空的</strong>
          <p>从左侧选择顾客需要的商品</p>
        </div>

        <div class="remark-box">
          <div class="remark-box__title">
            <span>订单备注</span>
            <small>可多选</small>
          </div>
          <div class="remark-tags">
            <el-check-tag
              v-for="tag in quickRemarks"
              :key="tag"
              :checked="selectedRemarks.includes(tag)"
              @change="toggleRemark(tag)"
            >
              {{ tag }}
            </el-check-tag>
          </div>
          <el-input
            v-model="customRemark"
            maxlength="40"
            show-word-limit
            placeholder="其他要求，例如：打包、晚一点做"
          />
        </div>

        <div class="checkout-box">
          <div class="checkout-box__queue">
            <span>下一取餐号</span>
            <strong>{{ store.nextOrderNo() }}</strong>
          </div>
          <div class="checkout-box__total">
            <span>应收合计</span>
            <strong>
              <small>¥</small>
              {{ formatMoney(cartTotal) }}
            </strong>
          </div>
          <el-button
            class="checkout-button"
            type="primary"
            size="large"
            :disabled="cart.length === 0"
            :loading="submitting"
            @click="submitOrder"
          >
            确认下单
            <el-icon class="el-icon--right"><ArrowRight /></el-icon>
          </el-button>
        </div>
      </section>

      <section class="panel queue-panel">
        <div class="panel__heading">
          <div>
            <span class="panel__step">03</span>
            <h2>制作队列</h2>
          </div>
          <span class="live-indicator">
            <i></i>
            {{ productionQueue.length }} 单进行中
          </span>
        </div>

        <div v-if="productionQueue.length" class="queue-list">
          <article
            v-for="order in productionQueue"
            :key="order.id"
            :class="['queue-card', `is-${order.status}`]"
          >
            <div class="queue-card__top">
              <strong>{{ order.orderNo }}</strong>
              <el-tag :type="order.status === 'making' ? 'warning' : 'info'" effect="light" round>
                {{ order.status === "making" ? "制作中" : "待制作" }}
              </el-tag>
              <time>{{ formatTime(order.createTime) }}</time>
            </div>
            <div class="queue-card__items">
              <span v-for="item in order.items" :key="item.productId">
                {{ item.productName }} × {{ item.quantity }}
              </span>
            </div>
            <p v-if="order.remark" class="queue-card__remark">备注：{{ order.remark }}</p>
            <div class="queue-card__actions">
              <el-button
                v-if="order.status === 'pending'"
                type="warning"
                plain
                :loading="processingOrderId === order.id"
                @click="startOrder(order.id)"
              >
                开始制作
              </el-button>
              <el-button
                type="success"
                :icon="Check"
                :loading="processingOrderId === order.id"
                @click="completeOrder(order.id)"
              >
                出餐完成
              </el-button>
              <el-button type="danger" text @click="voidOrder(order.id, order.orderNo)">
                作废
              </el-button>
            </div>
          </article>
        </div>
        <div v-else class="empty-queue">
          <el-icon><Finished /></el-icon>
          <strong>队列已清空</strong>
          <span>可以稍微歇一会儿了</span>
        </div>
      </section>
    </main>

    <el-dialog v-model="restockVisible" title="快捷入库" width="440px">
      <el-form label-position="top">
        <el-form-item label="选择商品">
          <el-select v-model="restockForm.productId" filterable placeholder="请选择要补货的商品">
            <el-option
              v-for="product in store.products"
              :key="product.id"
              :label="`${product.name}（当前 ${product.stock}）`"
              :value="product.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="入库数量">
          <el-input-number v-model="restockForm.quantity" :min="1" :max="999" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="restockVisible = false">取消</el-button>
        <el-button type="primary" :loading="restocking" @click="submitRestock">确认入库</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "BusinessCashier" });

import {
  ArrowRight,
  Box,
  Check,
  Clock,
  Coffee,
  Delete,
  Finished,
  Minus,
  Plus,
  ShoppingCart,
} from "@element-plus/icons-vue";
import { useBusinessStore } from "@/stores/business";
import type { CartItem, Product } from "./types";

const store = useBusinessStore();
const activeCategory = ref("全部");
const cart = ref<CartItem[]>([]);
const quickRemarks = ["少糖", "去冰", "少冰", "热饮"];
const selectedRemarks = ref<string[]>([]);
const customRemark = ref("");
const submitting = ref(false);
const restocking = ref(false);
const processingOrderId = ref("");
const restockVisible = ref(false);
const restockForm = reactive({ productId: "", quantity: 10 });

const currentDateText = new Intl.DateTimeFormat("zh-CN", {
  month: "long",
  day: "numeric",
  weekday: "short",
}).format(new Date());

const categoryOptions = computed(() => ["全部", ...store.categories]);
const filteredProducts = computed(() =>
  store.activeProducts.filter(
    (product) => activeCategory.value === "全部" || product.category === activeCategory.value
  )
);
const cartDetails = computed(() =>
  cart.value
    .map((item) => ({
      ...item,
      product: store.products.find((product) => product.id === item.productId),
    }))
    .filter((item): item is CartItem & { product: Product } => Boolean(item.product))
);
const cartCount = computed(() => cart.value.reduce((sum, item) => sum + item.quantity, 0));
const cartTotal = computed(() =>
  cartDetails.value.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
);
const productionQueue = computed(() =>
  [...store.activeOrders].sort(
    (first, second) => new Date(first.createTime).getTime() - new Date(second.createTime).getTime()
  )
);
const orderRemark = computed(() =>
  [...selectedRemarks.value, customRemark.value.trim()].filter(Boolean).join("、")
);

function formatMoney(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function addToCart(product: Product): void {
  const item = cart.value.find((cartItem) => cartItem.productId === product.id);
  if (item) {
    if (item.quantity >= product.availableStock) {
      ElMessage.warning(`${product.name} 当前仅可售 ${product.availableStock} 份`);
      return;
    }
    item.quantity += 1;
  } else {
    cart.value.push({ productId: product.id, quantity: 1 });
  }
}

function increaseQuantity(productId: string): void {
  const product = store.products.find((item) => item.id === productId);
  const item = cart.value.find((cartItem) => cartItem.productId === productId);
  if (product && item && item.quantity < product.availableStock) item.quantity += 1;
}

function decreaseQuantity(productId: string): void {
  const item = cart.value.find((cartItem) => cartItem.productId === productId);
  if (!item) return;
  if (item.quantity === 1) {
    removeFromCart(productId);
  } else {
    item.quantity -= 1;
  }
}

function removeFromCart(productId: string): void {
  cart.value = cart.value.filter((item) => item.productId !== productId);
}

function toggleRemark(tag: string): void {
  selectedRemarks.value = selectedRemarks.value.includes(tag)
    ? selectedRemarks.value.filter((item) => item !== tag)
    : [...selectedRemarks.value, tag];
}

async function submitOrder(): Promise<void> {
  submitting.value = true;
  try {
    const order = await store.createOrder(cart.value, orderRemark.value);
    cart.value = [];
    selectedRemarks.value = [];
    customRemark.value = "";
    await ElMessageBox.alert(`订单已进入制作队列，请叫号 ${order.orderNo}`, "下单成功", {
      confirmButtonText: "继续点单",
      type: "success",
    });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "下单失败");
  } finally {
    submitting.value = false;
  }
}

async function startOrder(id: string): Promise<void> {
  processingOrderId.value = id;
  try {
    await store.changeOrderStatus(id, "making");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "状态更新失败");
  } finally {
    processingOrderId.value = "";
  }
}

async function completeOrder(id: string): Promise<void> {
  processingOrderId.value = id;
  try {
    await store.changeOrderStatus(id, "completed");
    ElMessage.success("已完成出餐");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "状态更新失败");
  } finally {
    processingOrderId.value = "";
  }
}

async function voidOrder(id: string, orderNo: string): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认作废 ${orderNo}？订单库存将自动退回。`, "作废订单", {
      type: "warning",
      confirmButtonText: "确认作废",
      cancelButtonText: "取消",
    });
    processingOrderId.value = id;
    await store.voidOrder(id);
    ElMessage.success("订单已作废，库存已回滚");
  } catch (error) {
    if (error instanceof Error) ElMessage.error(error.message);
  } finally {
    processingOrderId.value = "";
  }
}

function openQuickRestock(): void {
  restockForm.productId = store.products[0]?.id ?? "";
  restockForm.quantity = 10;
  restockVisible.value = true;
}

async function submitRestock(): Promise<void> {
  restocking.value = true;
  try {
    await store.restockProduct(restockForm.productId, restockForm.quantity);
    restockVisible.value = false;
    ElMessage.success("入库成功，收银台库存已同步");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "入库失败");
  } finally {
    restocking.value = false;
  }
}

onMounted(() => {
  store.initialize().catch(() => undefined);
});
</script>

<style lang="scss" scoped>
.cashier-page {
  min-height: calc(100vh - 104px);
  padding: 22px;
  color: #352a24;
  background: radial-gradient(circle at 0 0, rgb(226 238 219 / 85%), transparent 28%), #f5f3ee;
}

.cashier-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  h1 {
    margin: 2px 0 4px;
    font-size: clamp(26px, 2vw, 36px);
    line-height: 1.15;
  }

  p:last-child {
    margin: 0;
    color: #756b64;
  }
}

.cashier-page__eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  color: #477458;
  letter-spacing: 0.16em;
}

.cashier-page__header-actions,
.cashier-page__date {
  display: flex;
  gap: 12px;
  align-items: center;
}

.cashier-page__date {
  padding: 10px 14px;
  color: #6a5f58;
  background: rgb(255 255 255 / 65%);
  border: 1px solid rgb(80 62 50 / 10%);
  border-radius: 12px;
}

.cashier-layout {
  display: grid;
  grid-template-columns: minmax(430px, 1.35fr) minmax(330px, 0.95fr) minmax(320px, 0.85fr);
  gap: 16px;
  align-items: start;
}

.panel {
  min-height: 680px;
  padding: 20px;
  background: rgb(255 255 255 / 92%);
  border: 1px solid rgb(70 55 45 / 8%);
  border-radius: 20px;
  box-shadow: 0 16px 40px rgb(66 48 37 / 7%);
}

.panel__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;

  > div {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  h2 {
    margin: 0;
    font-size: 20px;
  }
}

.panel__step {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  background: #477458;
  border-radius: 10px;
}

.panel__hint {
  font-size: 12px;
  color: #9a918a;
}

.category-tabs {
  display: flex;
  gap: 8px;
  padding-bottom: 14px;
  overflow-x: auto;
}

.category-tab {
  flex: 0 0 auto;
  padding: 8px 15px;
  font-weight: 600;
  color: #70665f;
  cursor: pointer;
  background: #f4f1ec;
  border: 0;
  border-radius: 999px;

  &.is-active {
    color: #fff;
    background: #352a24;
  }
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.product-card {
  position: relative;
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 12px;
  min-height: 92px;
  padding: 15px;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: #faf8f4;
  border: 1px solid #ece6df;
  border-radius: 16px;
  transition: 0.18s ease;

  &:hover:not(:disabled) {
    background: #fff;
    border-color: #8aaa94;
    box-shadow: 0 10px 20px rgb(71 116 88 / 10%);
    transform: translateY(-2px);
  }

  &.is-sold-out {
    cursor: not-allowed;
    opacity: 0.55;
    filter: grayscale(1);
  }
}

.product-card__icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  font-size: 24px;
  color: #477458;
  background: #e8f0e7;
  border-radius: 14px;
}

.product-card__content {
  display: flex;
  flex-direction: column;
  gap: 6px;

  strong {
    font-size: 16px;
  }

  small {
    color: #8c837c;

    &.is-low {
      font-weight: 700;
      color: #c95c4c;
    }
  }
}

.product-card__price {
  position: absolute;
  right: 14px;
  bottom: 12px;
  font-size: 18px;
  font-weight: 800;
}

.order-panel {
  display: flex;
  flex-direction: column;
}

.cart-list {
  max-height: 280px;
  overflow: auto;
  border-top: 1px solid #eee8e2;
}

.cart-item {
  position: relative;
  display: grid;
  grid-template-columns: minmax(90px, 1fr) auto auto;
  gap: 10px;
  align-items: center;
  padding: 14px 30px 14px 0;
  border-bottom: 1px solid #eee8e2;
}

.cart-item__info {
  display: flex;
  flex-direction: column;
  gap: 4px;

  span {
    font-size: 12px;
    color: #918780;
  }
}

.quantity-control {
  display: flex;
  gap: 8px;
  align-items: center;

  strong {
    min-width: 18px;
    text-align: center;
  }
}

.cart-item__subtotal {
  min-width: 48px;
  text-align: right;
}

.cart-item__remove {
  position: absolute;
  top: 7px;
  right: -8px;
}

.empty-cart,
.empty-queue {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 210px;
  color: #9a918a;

  > span:first-child {
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    margin-bottom: 12px;
    font-size: 30px;
    color: #789282;
    background: #eef2ec;
    border-radius: 50%;
  }

  strong {
    color: #5c514a;
  }

  p {
    margin: 6px 0 0;
    font-size: 13px;
  }
}

.remark-box {
  padding-top: 18px;
  margin-top: auto;
  border-top: 1px solid #eee8e2;
}

.remark-box__title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-weight: 700;

  small {
    font-weight: 400;
    color: #a69e97;
  }
}

.remark-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 10px;
}

.checkout-box {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding-top: 18px;
  margin-top: 18px;
  border-top: 1px dashed #d9d0c8;
}

.checkout-box__queue,
.checkout-box__total {
  display: flex;
  flex-direction: column;
  gap: 2px;

  span {
    font-size: 12px;
    color: #8a8078;
  }
}

.checkout-box__queue strong {
  font-size: 26px;
  letter-spacing: 0.06em;
}

.checkout-box__total {
  text-align: right;

  strong {
    font-size: 30px;
    color: #477458;

    small {
      margin-right: 2px;
      font-size: 14px;
    }
  }
}

.checkout-button {
  grid-column: 1 / -1;
  height: 48px;
  font-size: 16px;
  font-weight: 800;
  border-radius: 13px;
}

.live-indicator {
  font-size: 12px;
  color: #7c736c;

  i {
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-right: 6px;
    background: #5f9d73;
    border-radius: 50%;
    box-shadow: 0 0 0 4px rgb(95 157 115 / 12%);
  }
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 610px;
  padding-right: 3px;
  overflow: auto;
}

.queue-card {
  padding: 15px;
  background: #faf8f4;
  border: 1px solid #ece5de;
  border-left: 4px solid #a5aaa4;
  border-radius: 14px;

  &.is-making {
    background: #fffaf0;
    border-left-color: #d69b45;
  }
}

.queue-card__top {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 8px;
  align-items: center;

  > strong {
    font-size: 26px;
  }

  time {
    font-size: 12px;
    color: #9a918a;
    text-align: right;
  }
}

.queue-card__items {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 11px 0;
  font-weight: 600;
  color: #544943;
}

.queue-card__remark {
  padding: 8px 10px;
  margin: 0 0 11px;
  font-size: 12px;
  color: #a05042;
  background: #fff0e9;
  border-radius: 8px;
}

.queue-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

.empty-queue {
  min-height: 500px;

  > .el-icon {
    margin-bottom: 14px;
    font-size: 54px;
    color: #83a08d;
  }

  span {
    margin-top: 6px;
    font-size: 13px;
  }
}

:deep(.el-select) {
  width: 100%;
}

@media (width <= 1550px) {
  .cashier-layout {
    grid-template-columns: minmax(420px, 1.25fr) minmax(330px, 0.95fr);
  }

  .queue-panel {
    grid-column: 1 / -1;
    min-height: auto;
  }

  .queue-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    max-height: none;
  }

  .empty-queue {
    min-height: 180px;
  }
}

@media (width <= 980px) {
  .cashier-layout {
    grid-template-columns: 1fr;
  }

  .queue-panel {
    grid-column: auto;
  }

  .queue-list {
    grid-template-columns: 1fr;
  }

  .cashier-page__header {
    align-items: flex-start;
  }

  .cashier-page__date {
    display: none;
  }
}
</style>
