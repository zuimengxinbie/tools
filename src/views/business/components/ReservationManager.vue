<template>
  <div class="reservation-manager">
    <div class="manager-toolbar">
      <div>
        <el-select v-model="statusFilter" style="width: 150px">
          <el-option label="全部状态" value="all" />
          <el-option label="预定中" value="active" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        <span>预定只锁定可售库存，完成时直接扣减实物库存</span>
      </div>
      <el-button type="primary" :icon="Plus" @click="openDialog()">新增预定</el-button>
    </div>

    <el-table :data="filteredReservations" table-layout="fixed">
      <el-table-column label="预定编号" min-width="170">
        <template #default="{ row }">
          <strong>{{ row.reservationNo }}</strong>
        </template>
      </el-table-column>
      <el-table-column prop="customer" label="预定人 / 来源" min-width="150" />
      <el-table-column label="商品明细" min-width="260">
        <template #default="{ row }">{{ formatItems(row) }}</template>
      </el-table-column>
      <el-table-column label="预计取货" min-width="170">
        <template #default="{ row }">{{ formatDateTime(row.pickupTime) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="105">
        <template #default="{ row }">
          <el-tag :type="getStatusMeta(row.status).type" effect="light" round>
            {{ getStatusMeta(row.status).label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="245" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 'active'">
            <el-button text :icon="Edit" @click="openDialog(row)">编辑</el-button>
            <el-button text type="success" @click="completeReservation(row)">完成</el-button>
            <el-button text type="danger" @click="cancelReservation(row)">取消</el-button>
          </template>
          <span v-else class="finished-hint">{{ row.remark || "记录已归档" }}</span>
        </template>
      </el-table-column>
      <template #empty><el-empty description="暂无预定记录" /></template>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑预定' : '新增预定'"
      width="680px"
      destroy-on-close
    >
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="预定人 / 来源" required>
            <el-input v-model="form.customer" maxlength="30" placeholder="例如：张先生、美团预定" />
          </el-form-item>
          <el-form-item label="预计取货时间" required>
            <el-date-picker
              v-model="form.pickupTime"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ss"
              placeholder="选择日期和时间"
            />
          </el-form-item>
        </div>

        <el-form-item label="预定商品" required>
          <div class="reservation-items">
            <div v-for="(item, index) in form.items" :key="index" class="reservation-item">
              <el-select v-model="item.productId" filterable placeholder="选择商品">
                <el-option
                  v-for="product in store.activeProducts"
                  :key="product.id"
                  :label="`${product.name}（可售 ${availableForEditing(product.id)}）`"
                  :value="product.id"
                  :disabled="isSelectedByOtherRow(product.id, index)"
                />
              </el-select>
              <el-input-number v-model="item.quantity" :min="1" :max="9999" />
              <span>份</span>
              <el-button
                circle
                text
                type="danger"
                :icon="Delete"
                :disabled="form.items.length === 1"
                @click="form.items.splice(index, 1)"
              />
            </div>
            <el-button plain :icon="Plus" @click="form.items.push({ productId: '', quantity: 1 })">
              添加商品
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
            maxlength="100"
            show-word-limit
            placeholder="取货要求或联系方式等补充信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="saveReservation">
          保存预定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Delete, Edit, Plus } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox, type TagProps } from "element-plus";
import { useBusinessStore } from "@/stores/business";
import type { Reservation, ReservationStatus } from "../types";

const store = useBusinessStore();
const statusFilter = ref<ReservationStatus | "all">("all");
const dialogVisible = ref(false);
const editingId = ref("");
const submitting = ref(false);
const form = reactive({
  customer: "",
  pickupTime: "",
  remark: "",
  items: [{ productId: "", quantity: 1 }],
});

const statusMeta: Record<ReservationStatus, { label: string; type: TagProps["type"] }> = {
  active: { label: "预定中", type: "warning" },
  completed: { label: "已完成", type: "success" },
  cancelled: { label: "已取消", type: "info" },
};
const filteredReservations = computed(() =>
  store.reservations.filter(
    (item) => statusFilter.value === "all" || item.status === statusFilter.value
  )
);
const editingReservation = computed(() =>
  store.reservations.find((item) => item.id === editingId.value)
);

function defaultPickupTime(): string {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}:00`;
}

function openDialog(reservation?: Reservation): void {
  editingId.value = reservation?.id ?? "";
  Object.assign(form, {
    customer: reservation?.customer ?? "",
    pickupTime: reservation ? toLocalDateTime(reservation.pickupTime) : defaultPickupTime(),
    remark: reservation?.remark ?? "",
    items: reservation
      ? reservation.items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
      : [{ productId: "", quantity: 1 }],
  });
  dialogVisible.value = true;
}

function toLocalDateTime(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}:00`;
}

function availableForEditing(productId: string): number {
  const product = store.products.find((item) => item.id === productId);
  const ownQuantity =
    editingReservation.value?.items.find((item) => item.productId === productId)?.quantity ?? 0;
  return (product?.availableStock ?? 0) + ownQuantity;
}

function isSelectedByOtherRow(productId: string, rowIndex: number): boolean {
  return form.items.some((item, index) => index !== rowIndex && item.productId === productId);
}

async function saveReservation(): Promise<void> {
  const items = form.items.filter((item) => item.productId && item.quantity > 0);
  if (!form.customer.trim() || !form.pickupTime || !items.length) {
    ElMessage.warning("请填写预定人、取货时间并选择商品");
    return;
  }
  submitting.value = true;
  try {
    const payload = {
      customer: form.customer.trim(),
      pickupTime: form.pickupTime,
      remark: form.remark.trim(),
      items,
    };
    if (editingId.value) await store.updateReservation(editingId.value, payload);
    else await store.addReservation(payload);
    dialogVisible.value = false;
    ElMessage.success(editingId.value ? "预定已更新" : "预定已创建");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "保存预定失败");
  } finally {
    submitting.value = false;
  }
}

async function completeReservation(reservation: Reservation): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确认完成 ${reservation.reservationNo}？对应实物库存将直接扣减，且不计入营业收入。`,
      "完成预定",
      { type: "warning" }
    );
    await store.changeReservationStatus(reservation.id, "completed");
    ElMessage.success("预定已完成，实物库存已扣减");
  } catch (error) {
    if (error instanceof Error) ElMessage.error(error.message);
  }
}

async function cancelReservation(reservation: Reservation): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确认取消 ${reservation.reservationNo}？预留库存将立即释放。`,
      "取消预定",
      { type: "warning" }
    );
    await store.changeReservationStatus(reservation.id, "cancelled");
    ElMessage.success("预定已取消，可售库存已恢复");
  } catch (error) {
    if (error instanceof Error) ElMessage.error(error.message);
  }
}

function formatItems(reservation: Reservation): string {
  return reservation.items.map((item) => `${item.productName} × ${item.quantity}`).join("，");
}

function getStatusMeta(status: ReservationStatus) {
  return statusMeta[status];
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
</script>

<style scoped lang="scss">
.manager-toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;

  > div {
    display: flex;
    gap: 14px;
    align-items: center;
  }
  span {
    font-size: 13px;
    color: #8a8078;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.reservation-items {
  width: 100%;
}
.reservation-item {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 140px auto 34px;
  gap: 9px;
  align-items: center;
  margin-bottom: 10px;
}

.finished-hint {
  font-size: 12px;
  color: #999;
}
:deep(.el-date-editor) {
  width: 100%;
}
</style>
