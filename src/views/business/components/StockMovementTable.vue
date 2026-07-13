<template>
  <div v-loading="store.movementLoading" class="movement-table">
    <div class="movement-toolbar">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
      />
      <el-select v-model="productId" clearable placeholder="全部商品" filterable>
        <el-option
          v-for="product in store.products"
          :key="product.id"
          :label="product.name"
          :value="product.id"
        />
      </el-select>
      <el-select v-model="movementType" clearable placeholder="全部类型">
        <el-option
          v-for="item in typeOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <el-button type="primary" :icon="Search" @click="loadMovements">查询</el-button>
      <span>流水只追加，不支持编辑或删除</span>
    </div>

    <el-table :data="store.stockMovements" table-layout="fixed">
      <el-table-column label="时间" min-width="165">
        <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column prop="productName" label="商品" min-width="130" />
      <el-table-column label="类型" min-width="125">
        <template #default="{ row }">
          <el-tag :type="getMovementMeta(row.type).tag" effect="light">
            {{ getMovementMeta(row.type).label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="实物变化" min-width="120">
        <template #default="{ row }">
          <strong :class="deltaClass(row.stockDelta)">{{ formatDelta(row.stockDelta) }}</strong>
          <small>{{ row.beforeStock }} → {{ row.afterStock }}</small>
        </template>
      </el-table-column>
      <el-table-column label="预留变化" min-width="120">
        <template #default="{ row }">
          <strong :class="deltaClass(row.reservedDelta)">
            {{ formatDelta(row.reservedDelta) }}
          </strong>
          <small>{{ row.beforeReserved }} → {{ row.afterReserved }}</small>
        </template>
      </el-table-column>
      <el-table-column prop="reason" label="原因" min-width="170" />
      <el-table-column label="关联单号" min-width="165">
        <template #default="{ row }">{{ row.referenceNo || "-" }}</template>
      </el-table-column>
      <el-table-column label="备注" min-width="160">
        <template #default="{ row }">{{ row.remark || "-" }}</template>
      </el-table-column>
      <template #empty><el-empty description="所选范围暂无库存流水" /></template>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { Search } from "@element-plus/icons-vue";
import type { TagProps } from "element-plus";
import { toLocalDateKey, useBusinessStore } from "@/stores/business";
import type { StockMovementType } from "../types";

const store = useBusinessStore();
const today = toLocalDateKey();
const start = new Date();
start.setDate(start.getDate() - 6);
const dateRange = ref<[string, string]>([toLocalDateKey(start), today]);
const productId = ref("");
const movementType = ref<StockMovementType | "">("");

const movementMeta: Record<StockMovementType, { label: string; tag: TagProps["type"] }> = {
  opening: { label: "期初库存", tag: "info" },
  restock: { label: "商品入库", tag: "success" },
  sale: { label: "普通销售", tag: "primary" },
  void_return: { label: "作废退回", tag: "warning" },
  reservation_lock: { label: "预定锁定", tag: "warning" },
  reservation_release: { label: "预定释放", tag: "info" },
  reservation_complete: { label: "预定完成", tag: "success" },
  loss: { label: "损耗报废", tag: "danger" },
  stocktake: { label: "盘点修正", tag: "primary" },
};
const typeOptions = Object.entries(movementMeta).map(([value, meta]) => ({
  value: value as StockMovementType,
  label: meta.label,
}));

async function loadMovements(): Promise<void> {
  if (!dateRange.value?.length) return;
  await store.loadStockMovements({
    startDate: dateRange.value[0],
    endDate: dateRange.value[1],
    productId: productId.value || undefined,
    type: movementType.value || undefined,
  });
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function getMovementMeta(type: StockMovementType) {
  return movementMeta[type];
}

function formatDelta(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function deltaClass(value: number): string {
  return value > 0 ? "is-positive" : value < 0 ? "is-negative" : "is-zero";
}

onMounted(() => loadMovements().catch(() => undefined));
</script>

<style scoped lang="scss">
.movement-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 18px;

  > span {
    margin-left: auto;
    font-size: 13px;
    color: #8a8078;
  }
  :deep(.el-select) {
    width: 180px;
  }
}

.el-table small {
  display: block;
  margin-top: 3px;
  color: #999;
}

.is-positive {
  color: #3d8b58;
}
.is-negative {
  color: #c65349;
}
.is-zero {
  color: #999;
}
</style>
