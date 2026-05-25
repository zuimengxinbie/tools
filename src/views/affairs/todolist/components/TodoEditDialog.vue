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
        <el-col :span="8">
          <el-form-item label="截止日期">
            <el-date-picker
              v-model="form.dueDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择截止日期"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="提醒时间">
            <el-date-picker
              v-model="form.remindAt"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm"
              format="YYYY-MM-DD HH:mm"
              placeholder="选择提醒时间"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="重复">
            <el-select v-model="form.repeat" style="width: 100%">
              <el-option v-for="(v, k) in repeatMap" :key="k" :label="v.label" :value="k" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="16">
          <el-form-item label="进度">
            <el-slider v-model="form.progress" :min="0" :max="100" :step="5" show-input />
          </el-form-item>
        </el-col>
        <el-col :span="8">
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
import { categoryMap, priorityMap, statusMap, repeatMap } from "../constants";

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

const form = reactive<TodoItem>({ ...props.data });
const formRef = ref<FormInstance>();
const loading = ref(false);

watch(
  () => props.data,
  (val) => {
    Object.assign(form, JSON.parse(JSON.stringify(val)));
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
    // 过滤掉空的子任务
    const payload: TodoItem = JSON.parse(JSON.stringify(form));
    payload.checklist = payload.checklist.filter((c) => c.title.trim());
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
</style>
