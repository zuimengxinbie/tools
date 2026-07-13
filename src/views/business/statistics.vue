<template>
  <div v-loading="store.loading || store.historyLoading" class="statistics-page">
    <header class="page-header">
      <div>
        <p>DAILY BUSINESS REVIEW</p>
        <h1>经营数据</h1>
        <span>收入、订单和商品销量一目了然</span>
      </div>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        unlink-panels
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        :shortcuts="dateShortcuts"
      />
    </header>

    <section class="overview-grid">
      <article class="overview-card is-revenue">
        <div class="overview-card__top">
          <span>营业收入</span>
          <i>
            <el-icon><Wallet /></el-icon>
          </i>
        </div>
        <strong>
          <small>¥</small>
          {{ formatMoney(summary.revenue) }}
        </strong>
        <p>已排除作废订单</p>
      </article>
      <article class="overview-card is-orders">
        <div class="overview-card__top">
          <span>有效订单</span>
          <i>
            <el-icon><Tickets /></el-icon>
          </i>
        </div>
        <strong>
          {{ summary.orders }}
          <small>单</small>
        </strong>
        <p>平均客单 ¥{{ formatMoney(summary.average) }}</p>
      </article>
      <article class="overview-card is-cups">
        <div class="overview-card__top">
          <span>售出商品</span>
          <i>
            <el-icon><CoffeeCup /></el-icon>
          </i>
        </div>
        <strong>
          {{ summary.items }}
          <small>份</small>
        </strong>
        <p>{{ completedCount }} 单已完成出餐</p>
      </article>
    </section>

    <section class="analytics-grid">
      <article class="ranking-card">
        <div class="section-heading">
          <div>
            <p>TOP PRODUCTS</p>
            <h2>热销排行</h2>
          </div>
          <el-tag type="success" effect="plain">TOP 5</el-tag>
        </div>
        <div v-if="topProducts.length" class="ranking-list">
          <div v-for="(item, index) in topProducts" :key="item.productId" class="ranking-item">
            <span :class="['ranking-item__number', { 'is-top': index < 3 }]">{{ index + 1 }}</span>
            <div class="ranking-item__body">
              <div>
                <strong>{{ item.name }}</strong>
                <span>{{ item.quantity }} 份</span>
              </div>
              <span class="ranking-item__track">
                <i :style="{ width: `${(item.quantity / maxSales) * 100}%` }"></i>
              </span>
            </div>
            <strong class="ranking-item__amount">¥{{ formatMoney(item.amount) }}</strong>
          </div>
        </div>
        <el-empty v-else description="所选日期暂无销售数据" />
      </article>

      <article class="stock-card">
        <div class="section-heading">
          <div>
            <p>STOCK WATCH</p>
            <h2>备货提醒</h2>
          </div>
          <span>{{ lowStockProducts.length }} 项需关注</span>
        </div>
        <div v-if="lowStockProducts.length" class="stock-list">
          <div v-for="product in lowStockProducts" :key="product.id">
            <span class="stock-list__icon">
              <el-icon><Warning /></el-icon>
            </span>
            <div>
              <strong>{{ product.name }}</strong>
              <small>预警值 {{ product.warningStock }}</small>
            </div>
            <p>
              <strong>{{ product.stock }}</strong>
              份
            </p>
          </div>
        </div>
        <div v-else class="stock-safe">
          <el-icon><CircleCheck /></el-icon>
          <strong>库存状态良好</strong>
          <span>暂时没有需要补货的商品</span>
        </div>
      </article>
    </section>

    <section class="history-card">
      <div class="section-heading">
        <div>
          <p>ORDER HISTORY</p>
          <h2>历史订单</h2>
        </div>
        <span>共 {{ filteredOrders.length }} 条记录</span>
      </div>
      <el-table :data="filteredOrders" table-layout="fixed">
        <el-table-column label="取餐号" min-width="110">
          <template #default="{ row }">
            <strong class="order-number">{{ row.orderNo }}</strong>
          </template>
        </el-table-column>
        <el-table-column label="下单时间" min-width="175">
          <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="商品明细" min-width="280">
          <template #default="{ row }">
            <span class="item-summary">{{ formatItems(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="金额" min-width="115">
          <template #default="{ row }">
            <strong>¥{{ formatMoney(row.totalAmount) }}</strong>
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="105">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" effect="light" round>
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" text @click="showOrderDetail(row)">查看详情</el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty description="所选日期暂无订单" /></template>
      </el-table>
    </section>

    <el-dialog v-model="detailVisible" title="订单详情" width="540px">
      <template v-if="selectedOrder">
        <div class="detail-header">
          <div>
            <small>取餐号</small>
            <strong>{{ selectedOrder.orderNo }}</strong>
          </div>
          <el-tag :type="statusMeta[selectedOrder.status].type" effect="light" round>
            {{ statusMeta[selectedOrder.status].label }}
          </el-tag>
        </div>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="下单时间">
            {{ formatDateTime(selectedOrder.createTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="订单备注">
            {{ selectedOrder.remark || "无" }}
          </el-descriptions-item>
        </el-descriptions>
        <div class="detail-items">
          <div v-for="item in selectedOrder.items" :key="item.productId">
            <span>{{ item.productName }} × {{ item.quantity }}</span>
            <strong>¥{{ formatMoney(item.productPrice * item.quantity) }}</strong>
          </div>
          <div class="detail-items__total">
            <span>订单合计</span>
            <strong>¥{{ formatMoney(selectedOrder.totalAmount) }}</strong>
          </div>
        </div>
      </template>
      <template #footer>
        <el-button type="primary" @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "BusinessStatistics" });

import { CircleCheck, CoffeeCup, Tickets, Wallet, Warning } from "@element-plus/icons-vue";
import type { TagProps } from "element-plus";
import { toLocalDateKey, useBusinessStore } from "@/stores/business";
import type { BusinessOrder, OrderStatus } from "./types";

const store = useBusinessStore();
const today = toLocalDateKey();
const dateRange = ref<[string, string]>([today, today]);
const detailVisible = ref(false);
const selectedOrder = ref<BusinessOrder>();

const dateShortcuts = [
  {
    text: "今天",
    value: () => {
      const now = new Date();
      return [now, now];
    },
  },
  {
    text: "最近 7 天",
    value: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 6);
      return [start, end];
    },
  },
  {
    text: "本月",
    value: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth(), 1);
      return [start, end];
    },
  },
];

const statusMeta: Record<OrderStatus, { label: string; type: TagProps["type"] }> = {
  pending: { label: "待制作", type: "info" },
  making: { label: "制作中", type: "warning" },
  completed: { label: "已完成", type: "success" },
  voided: { label: "已作废", type: "danger" },
};

const filteredOrders = computed(() =>
  store.historyOrders.filter((order) => {
    if (!dateRange.value?.length) return true;
    const key = toLocalDateKey(order.createTime);
    return key >= dateRange.value[0] && key <= dateRange.value[1];
  })
);
const validOrders = computed(() =>
  filteredOrders.value.filter((order) => order.status !== "voided")
);
const summary = computed(() => {
  const revenue = validOrders.value.reduce((sum, order) => sum + order.totalAmount, 0);
  const items = validOrders.value.reduce(
    (sum, order) => sum + order.items.reduce((count, item) => count + item.quantity, 0),
    0
  );
  return {
    revenue,
    orders: validOrders.value.length,
    items,
    average: validOrders.value.length ? revenue / validOrders.value.length : 0,
  };
});
const completedCount = computed(
  () => filteredOrders.value.filter((order) => order.status === "completed").length
);
const topProducts = computed(() => {
  const sales = new Map<
    string,
    { productId: string; name: string; quantity: number; amount: number }
  >();
  validOrders.value.forEach((order) => {
    order.items.forEach((item) => {
      const current = sales.get(item.productId) ?? {
        productId: item.productId,
        name: item.productName,
        quantity: 0,
        amount: 0,
      };
      current.quantity += item.quantity;
      current.amount += item.productPrice * item.quantity;
      sales.set(item.productId, current);
    });
  });
  return [...sales.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
});
const maxSales = computed(() => topProducts.value[0]?.quantity ?? 1);
const lowStockProducts = computed(() =>
  store.products
    .filter((item) => item.status === 1 && item.stock <= item.warningStock)
    .sort((a, b) => a.stock - b.stock)
);

function formatMoney(value: number): string {
  return value.toFixed(2);
}

function getStatusType(status: OrderStatus): TagProps["type"] {
  return statusMeta[status].type;
}

function getStatusLabel(status: OrderStatus): string {
  return statusMeta[status].label;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatItems(order: BusinessOrder): string {
  return order.items.map((item) => `${item.productName} × ${item.quantity}`).join("，");
}

function showOrderDetail(order: BusinessOrder): void {
  selectedOrder.value = order;
  detailVisible.value = true;
}

watch(
  () => dateRange.value,
  (range) => {
    if (!range?.length) return;
    store.loadOrders(range[0], range[1]).catch(() => undefined);
  },
  { immediate: true }
);

onMounted(() => {
  store.initialize().catch(() => undefined);
});
</script>

<style lang="scss" scoped>
.statistics-page {
  min-height: calc(100vh - 104px);
  padding: 24px;
  color: #302a26;
  background: linear-gradient(135deg, rgb(237 242 234 / 70%), transparent 35%), #f6f4f0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  p,
  h1,
  span {
    margin: 0;
  }

  p {
    font-size: 12px;
    font-weight: 800;
    color: #557661;
    letter-spacing: 0.15em;
  }

  h1 {
    margin: 4px 0;
    font-size: 32px;
  }

  span {
    color: #827871;
  }
}

.overview-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 15px;
  margin-bottom: 15px;
}

.overview-card {
  padding: 22px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e9e5df;
  border-radius: 18px;
  box-shadow: 0 12px 30px rgb(67 50 40 / 5%);

  > strong {
    display: block;
    margin: 15px 0 7px;
    font-size: 36px;
    line-height: 1;

    small {
      font-size: 16px;
    }
  }

  > p {
    margin: 0;
    font-size: 12px;
    color: #8c837d;
  }

  &.is-revenue {
    color: #fff;
    background: #3f6750;
    border-color: #3f6750;

    > p {
      color: rgb(255 255 255 / 70%);
    }

    .overview-card__top i {
      color: #fff;
      background: rgb(255 255 255 / 15%);
    }
  }
}

.overview-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;

  > span {
    font-size: 14px;
    font-weight: 700;
  }

  i {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    font-style: normal;
    color: #52745f;
    background: #edf3ec;
    border-radius: 12px;
  }
}

.analytics-grid {
  display: grid;
  grid-template-columns: minmax(520px, 1.5fr) minmax(330px, 0.75fr);
  gap: 15px;
  margin-bottom: 15px;
}

.ranking-card,
.stock-card,
.history-card {
  padding: 20px;
  background: #fff;
  border: 1px solid #e9e5df;
  border-radius: 18px;
  box-shadow: 0 12px 30px rgb(67 50 40 / 5%);
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;

  p,
  h2 {
    margin: 0;
  }

  p {
    font-size: 10px;
    font-weight: 800;
    color: #718779;
    letter-spacing: 0.14em;
  }

  h2 {
    margin-top: 3px;
    font-size: 20px;
  }

  > span {
    font-size: 12px;
    color: #958b84;
  }
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ranking-item {
  display: grid;
  grid-template-columns: 34px 1fr 80px;
  gap: 12px;
  align-items: center;
}

.ranking-item__number {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  font-size: 12px;
  font-weight: 800;
  color: #8d847d;
  background: #f3f0ec;
  border-radius: 9px;

  &.is-top {
    color: #fff;
    background: #567863;
  }
}

.ranking-item__body {
  > div {
    display: flex;
    justify-content: space-between;
    margin-bottom: 7px;

    span {
      font-size: 12px;
      color: #847a73;
    }
  }
}

.ranking-item__track {
  display: block;
  height: 6px;
  overflow: hidden;
  background: #eeeae5;
  border-radius: 999px;

  i {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #54765f, #8fb197);
    border-radius: inherit;
  }
}

.ranking-item__amount {
  text-align: right;
}

.stock-list {
  display: flex;
  flex-direction: column;
  gap: 9px;

  > div {
    display: grid;
    grid-template-columns: 40px 1fr auto;
    gap: 10px;
    align-items: center;
    padding: 11px;
    background: #fff7f0;
    border-radius: 12px;
  }

  > div > div {
    display: flex;
    flex-direction: column;

    small {
      font-size: 11px;
      color: #9c8b80;
    }
  }

  p {
    margin: 0;
    color: #a75543;

    strong {
      font-size: 21px;
    }
  }
}

.stock-list__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  color: #bc664f;
  background: #ffe7dc;
  border-radius: 10px;
}

.stock-safe {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 230px;
  color: #7c927f;

  .el-icon {
    margin-bottom: 12px;
    font-size: 46px;
  }

  span {
    margin-top: 6px;
    font-size: 12px;
    color: #9a918b;
  }
}

.order-number {
  font-size: 18px;
  color: #42644f;
  letter-spacing: 0.04em;
}

.item-summary {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  margin-bottom: 16px;
  background: #eef3ec;
  border-radius: 14px;

  > div {
    display: flex;
    flex-direction: column;

    small {
      color: #7f8c82;
    }

    strong {
      font-size: 27px;
      color: #3f6750;
    }
  }
}

.detail-items {
  padding-top: 14px;

  > div {
    display: flex;
    justify-content: space-between;
    padding: 8px 2px;
  }
}

.detail-items__total {
  padding-top: 14px !important;
  margin-top: 6px;
  font-size: 18px;
  border-top: 1px solid #e8e3dd;

  strong {
    font-size: 22px;
    color: #3f6750;
  }
}

@media (width <= 1000px) {
  .analytics-grid,
  .overview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
