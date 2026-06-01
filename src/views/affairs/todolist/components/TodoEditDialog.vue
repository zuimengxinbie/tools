<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑待办' : '新增待办'"
    width="720px"
    destroy-on-close
    @close="handleClose"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-row :gutter="16">
        <el-col :span="24">
          <el-form-item label="标题" prop="title">
            <el-input
              v-model="form.title"
              placeholder="请输入待办标题"
              maxlength="100"
              show-word-limit
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="分类" prop="category">
            <el-select v-model="form.category" style="width: 100%">
              <el-option v-for="(v, k) in categoryMap" :key="k" :label="v.label" :value="k" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="优先级" prop="priority">
            <el-select v-model="form.priority" style="width: 100%">
              <el-option v-for="(v, k) in priorityMap" :key="k" :label="v.label" :value="k" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="状态" prop="status">
            <el-select v-model="form.status" style="width: 100%">
              <el-option v-for="(v, k) in statusMap" :key="k" :label="v.label" :value="k" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="截止日期">
            <el-date-picker
              v-model="form.dueDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择截止日期"
              style="width: 200px"
            />
          </el-form-item>
        </el-col>
        <el-col :span="10">
          <el-form-item label="进度">
            <div class="progress-display">
              <el-progress
                :percentage="computedProgress"
                :stroke-width="12"
                :status="computedProgress === 100 ? 'success' : undefined"
              />
              <span class="progress-hint">
                {{
                  form.checklist.length
                    ? `${doneCount}/${form.checklist.length} 子任务`
                    : "无子任务"
                }}
              </span>
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="预算">
            <el-input-number
              v-model="form.budget"
              :min="0"
              :precision="2"
              :controls="false"
              placeholder="元"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="星标">
            <el-switch v-model="form.starred" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="标签">
            <InputTag v-model="form.tags" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="描述">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="3"
              placeholder="补充详细描述..."
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="子任务">
            <div class="checklist-box">
              <div v-for="(item, idx) in form.checklist" :key="item.id" class="checklist-row">
                <el-checkbox v-model="item.done" />
                <el-input
                  v-model="item.title"
                  size="small"
                  placeholder="子任务内容"
                  :class="{ 'is-done': item.done }"
                  style="flex: 1"
                />
                <el-date-picker
                  v-model="item.finishedAt"
                  type="date"
                  size="small"
                  placeholder="完成时间"
                  value-format="YYYY-MM-DD"
                  :disabled-date="
                    (time: Date) =>
                      form.dueDate
                        ? time.getTime() > new Date(form.dueDate + ' 23:59:59').getTime()
                        : false
                  "
                  style="width: 140px"
                />
                <el-button type="danger" link :icon="Delete" @click="removeChecklist(idx)" />
              </div>
              <el-button type="primary" link :icon="Plus" @click="addChecklist">
                添加子任务
              </el-button>
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="消费记录">
            <div class="expenses-box">
              <div class="expenses-summary">
                <span>已消费：¥{{ totalExpense.toFixed(2) }}</span>
                <span v-if="form.budget" :class="expenseStatusClass">
                  / 预算 ¥{{ form.budget.toFixed(2) }}（{{ expensePercent.toFixed(0) }}%）
                </span>
              </div>
              <div v-for="(item, idx) in form.expenses" :key="item.id" class="expense-row">
                <el-input-number
                  v-model="item.amount"
                  size="small"
                  :min="0"
                  :precision="2"
                  :controls="false"
                  placeholder="金额"
                  style="width: 100px"
                />
                <el-input
                  v-model="item.remark"
                  size="small"
                  placeholder="消费备注"
                  style="flex: 1"
                />
                <el-date-picker
                  v-model="item.date"
                  type="date"
                  size="small"
                  placeholder="日期"
                  value-format="YYYY-MM-DD"
                  style="width: 140px"
                />
                <el-button type="danger" link :icon="Delete" @click="removeExpense(idx)" />
              </div>
              <el-button type="primary" link :icon="Plus" @click="addExpense">添加消费</el-button>
            </div>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { Delete, Plus } from "@element-plus/icons-vue";
import type { FormInstance, FormRules } from "element-plus";
import type { TodoItem } from "@/api/affairs";
import { categoryMap, priorityMap, statusMap, repeatMap, nowStr } from "../constants";

interface Props {
  modelValue: boolean;
  isEdit: boolean;
  data: TodoItem;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "submit", value: TodoItem): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const form = reactive<TodoItem>({ ...props.data, expenses: props.data.expenses ?? [] });
const formRef = ref<FormInstance>();
const loading = ref(false);

/* ---------------- 进度自动计算 ---------------- */
const doneCount = computed(() => form.checklist.filter((c) => c.done).length);
const computedProgress = computed(() => {
  const total = form.checklist.length;
  if (total === 0) return 0;
  return Math.round((doneCount.value / total) * 100);
});

// 同步 form.progress 以便提交时使用
watch(computedProgress, (val) => {
  form.progress = val;
});

/* ---------------- 消费记录 ---------------- */
const totalExpense = computed(() =>
  (form.expenses ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0)
);
const expensePercent = computed(() => (form.budget ? (totalExpense.value / form.budget) * 100 : 0));
const expenseStatusClass = computed(() => {
  if (expensePercent.value > 100) return "cost-over";
  if (expensePercent.value > 80) return "cost-warning";
  return "cost-normal";
});

const nextExpenseId = () => ((form.expenses ?? []).reduce((m, e) => Math.max(m, e.id), 0) || 0) + 1;

const addExpense = () => {
  if (!form.expenses) form.expenses = [];
  form.expenses.push({
    id: nextExpenseId(),
    amount: 0,
    remark: "",
    date: nowStr().slice(0, 10),
  });
};

const removeExpense = (idx: number) => {
  form.expenses?.splice(idx, 1);
};

watch(
  () => props.data,
  (val) => {
    const parsed = JSON.parse(JSON.stringify(val));
    parsed.expenses = parsed.expenses ?? [];
    Object.assign(form, parsed);
  },
  { deep: true }
);

const rules: FormRules = {
  title: [{ required: true, message: "请输入标题", trigger: "blur" }],
  category: [{ required: true, message: "请选择分类", trigger: "change" }],
  priority: [{ required: true, message: "请选择优先级", trigger: "change" }],
  status: [{ required: true, message: "请选择状态", trigger: "change" }],
};

const nextChecklistId = () => (form.checklist.reduce((m, c) => Math.max(m, c.id), 0) || 0) + 1;

const addChecklist = () => {
  form.checklist.push({
    id: nextChecklistId(),
    title: "",
    done: false,
    finishedAt: form.dueDate || "",
  });
};

const removeChecklist = (idx: number) => {
  form.checklist.splice(idx, 1);
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate();
  loading.value = true;
  try {
    // 过滤掉空的子任务和金额为0的消费
    const payload: TodoItem = JSON.parse(JSON.stringify(form));
    payload.checklist = payload.checklist.filter((c) => c.title.trim());
    payload.expenses = (payload.expenses ?? []).filter((e) => e.amount > 0 || e.remark.trim());
    // 根据子任务计算进度
    const total = payload.checklist.length;
    const done = payload.checklist.filter((c) => c.done).length;
    payload.progress = total > 0 ? Math.round((done / total) * 100) : 0;
    emit("submit", payload);
  } finally {
    loading.value = false;
  }
};

const handleClose = () => {
  formRef.value?.resetFields();
};
</script>

<style lang="scss" scoped>
.checklist-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.checklist-row {
  display: flex;
  gap: 8px;
  align-items: center;

  :deep(.is-done .el-input__inner) {
    color: var(--el-text-color-placeholder);
    text-decoration: line-through;
  }
}

.progress-display {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;

  .progress-hint {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.expenses-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.expenses-summary {
  padding: 4px 0;
  font-size: 13px;
  color: var(--el-text-color-regular);

  .cost-over {
    font-weight: 500;
    color: var(--el-color-danger);
  }

  .cost-warning {
    color: var(--el-color-warning);
  }

  .cost-normal {
    color: var(--el-color-success);
  }
}

.expense-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
