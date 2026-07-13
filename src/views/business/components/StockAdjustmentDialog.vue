<template>
  <el-dialog v-model="visible" title="调整库存" width="520px" destroy-on-close>
    <template v-if="product">
      <div class="stock-summary">
        <div>
          <small>实物库存</small>
          <strong>{{ product.stock }}</strong>
        </div>
        <div>
          <small>预留库存</small>
          <strong>{{ product.reservedStock }}</strong>
        </div>
        <div>
          <small>可售库存</small>
          <strong>{{ product.availableStock }}</strong>
        </div>
      </div>

      <el-form label-position="top">
        <el-form-item label="调整方式" required>
          <el-radio-group v-model="form.mode">
            <el-radio-button value="loss">损耗 / 报废</el-radio-button>
            <el-radio-button value="stocktake">盘点修正</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="form.mode === 'loss' ? '减少数量' : '盘点后的实物库存'" required>
          <el-input-number
            v-model="form.quantity"
            :min="form.mode === 'loss' ? 1 : 0"
            :max="9999"
          />
        </el-form-item>
        <el-form-item label="调整原因" required>
          <el-select
            v-model="form.reason"
            placeholder="请选择或输入调整原因"
            filterable
            allow-create
          >
            <el-option
              v-for="reason in reasonOptions"
              :key="reason"
              :label="reason"
              :value="reason"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="补充说明">
          <el-input
            v-model="form.remark"
            type="textarea"
            maxlength="100"
            show-word-limit
            :rows="3"
            placeholder="例如：破损原因、盘点批次"
          />
        </el-form-item>
      </el-form>

      <div :class="['adjustment-preview', { 'is-invalid': !canSubmit }]">
        <span>调整后</span>
        <strong>
          实物 {{ previewStock }} · 预留 {{ product.reservedStock }} · 可售 {{ previewAvailable }}
        </strong>
        <small v-if="previewStock < product.reservedStock">调整后实物库存不能低于预留库存</small>
      </div>
    </template>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">
        确认调整
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { useBusinessStore } from "@/stores/business";
import type { Product, StockAdjustmentMode } from "../types";

const props = defineProps<{ modelValue: boolean; product?: Product }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean]; success: [] }>();
const store = useBusinessStore();
const submitting = ref(false);
const form = reactive({
  mode: "loss" as StockAdjustmentMode,
  quantity: 1,
  reason: "",
  remark: "",
});

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});
const reasonOptions = computed(() =>
  form.mode === "loss"
    ? ["商品损坏", "制作损耗", "过期报废", "其他损耗"]
    : ["日常盘点", "录入修正", "交接盘点"]
);
const previewStock = computed(() => {
  if (!props.product) return 0;
  return form.mode === "loss" ? props.product.stock - form.quantity : form.quantity;
});
const previewAvailable = computed(() =>
  props.product ? Math.max(0, previewStock.value - props.product.reservedStock) : 0
);
const canSubmit = computed(
  () =>
    Boolean(props.product && form.reason.trim()) &&
    Number.isInteger(form.quantity) &&
    form.quantity >= (form.mode === "loss" ? 1 : 0) &&
    previewStock.value >= (props.product?.reservedStock ?? 0) &&
    previewStock.value !== props.product?.stock
);

watch(
  () => [props.modelValue, props.product?.id],
  ([open]) => {
    if (!open) return;
    Object.assign(form, { mode: "loss", quantity: 1, reason: "", remark: "" });
  }
);

watch(
  () => form.mode,
  (mode) => {
    form.quantity = mode === "loss" ? 1 : (props.product?.stock ?? 0);
    form.reason = "";
  }
);

async function submit(): Promise<void> {
  if (!props.product || !canSubmit.value) return;
  const delta = previewStock.value - props.product.stock;
  try {
    await ElMessageBox.confirm(
      `确认将“${props.product.name}”的实物库存从 ${props.product.stock} 调整为 ${previewStock.value}（${delta > 0 ? "+" : ""}${delta}）？`,
      "确认库存调整",
      { type: "warning" }
    );
  } catch {
    return;
  }
  submitting.value = true;
  try {
    await store.adjustStock(props.product.id, {
      mode: form.mode,
      quantity: form.quantity,
      reason: form.reason.trim(),
      remark: form.remark.trim(),
    });
    ElMessage.success("库存已调整并记录流水");
    visible.value = false;
    emit("success");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "库存调整失败");
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped lang="scss">
.stock-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;

  div {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 14px;
    background: #f7f5f1;
    border-radius: 12px;
  }

  small {
    color: #8a8078;
  }
  strong {
    font-size: 24px;
    color: #3f7252;
  }
}

.adjustment-preview {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 13px 15px;
  color: #356348;
  background: #edf5ef;
  border-radius: 10px;

  &.is-invalid {
    color: #b84b42;
    background: #fff0ee;
  }
  small {
    font-size: 12px;
  }
}

:deep(.el-select),
:deep(.el-input-number) {
  width: 100%;
}
</style>
