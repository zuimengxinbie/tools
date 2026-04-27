<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import TravelAPI, { type HolidayPlan } from "@/api/travel";

defineOptions({ name: "HolidayTrip" });

/** 计划列表：从 `/api/v1/travel/holiday` 拉取，对应 mock/data/holiday-plans.json */
const planList = ref<HolidayPlan[]>([]);
const loading = ref(false);
const dirty = ref(false);

const loadList = async () => {
  loading.value = true;
  try {
    planList.value = (await TravelAPI.getHolidayList()) || [];
    dirty.value = false;
  } finally {
    loading.value = false;
  }
};

onMounted(loadList);

const transportOptions = ["飞机", "高铁", "自驾", "飞机 + 自驾", "火车", "巴士"];

/* ---------------- 查看 ---------------- */
const viewVisible = ref(false);
const currentPlan = ref<HolidayPlan | null>(null);

const handleView = (plan: HolidayPlan) => {
  currentPlan.value = plan;
  viewVisible.value = true;
};

/* ---------------- 新增 / 编辑 ---------------- */
const editVisible = ref(false);
const editFormRef = ref<FormInstance>();
const editLoading = ref(false);
const isEdit = ref(false);

const defaultForm = (): HolidayPlan => ({
  id: 0,
  festival: "",
  destination: "",
  startDate: "",
  endDate: "",
  budget: 0,
  members: 1,
  transport: "",
  remark: "",
});

const editForm = reactive<HolidayPlan>(defaultForm());
const dateRange = ref<[string, string] | null>(null);

const editRules: FormRules = {
  festival: [{ required: true, message: "请输入节日名称", trigger: "blur" }],
  destination: [{ required: true, message: "请输入目的地", trigger: "blur" }],
  budget: [{ required: true, message: "请输入预算", trigger: "blur" }],
  members: [{ required: true, message: "请输入出行人数", trigger: "blur" }],
  transport: [{ required: true, message: "请选择交通方式", trigger: "change" }],
};

const resetForm = (plan?: HolidayPlan) => {
  Object.assign(editForm, plan ? JSON.parse(JSON.stringify(plan)) : defaultForm());
  dateRange.value = plan ? [plan.startDate, plan.endDate] : null;
};

const handleAdd = () => {
  isEdit.value = false;
  resetForm();
  editForm.id = Date.now();
  editVisible.value = true;
};

const handleEdit = (plan: HolidayPlan) => {
  isEdit.value = true;
  resetForm(plan);
  editVisible.value = true;
};

const handleSubmit = async () => {
  if (!editFormRef.value) return;
  await editFormRef.value.validate();

  if (!dateRange.value || !dateRange.value[0] || !dateRange.value[1]) {
    ElMessage.warning("请选择出行日期范围");
    return;
  }
  editForm.startDate = dateRange.value[0];
  editForm.endDate = dateRange.value[1];

  editLoading.value = true;
  try {
    const payload: HolidayPlan = JSON.parse(JSON.stringify(editForm));
    const idx = planList.value.findIndex((p) => p.id === payload.id);
    if (idx > -1) {
      planList.value[idx] = payload;
      ElMessage.success("修改成功（未落盘，点击右上角保存到 Mock 文件）");
    } else {
      planList.value.unshift(payload);
      ElMessage.success("新增成功（未落盘，点击右上角保存到 Mock 文件）");
    }
    dirty.value = true;
    editVisible.value = false;
  } finally {
    editLoading.value = false;
  }
};

/* ---------------- 删除 ---------------- */
const handleDelete = async (plan: HolidayPlan) => {
  await ElMessageBox.confirm(`确认删除「${plan.festival}」的出游计划？`, "提示", {
    type: "warning",
  });
  planList.value = planList.value.filter((p) => p.id !== plan.id);
  dirty.value = true;
  ElMessage.success("删除成功（未落盘）");
};

/* ---------------- 派生 ---------------- */
const calcDays = (start: string, end: string) => {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
};

/* ---------------- 保存/导出 Mock 数据 ---------------- */
const saving = ref(false);

/** 直接写入 mock/data/holiday-plans.json */
const handleSaveToMock = async () => {
  saving.value = true;
  try {
    await TravelAPI.saveHolidayList(JSON.parse(JSON.stringify(planList.value)));
    dirty.value = false;
    ElMessage.success("已保存到 mock/data/holiday-plans.json");
  } finally {
    saving.value = false;
  }
};

const handleReload = async () => {
  if (dirty.value) {
    await ElMessageBox.confirm("有未保存的修改，确定要重新加载吗？", "提示", {
      type: "warning",
    });
  }
  await loadList();
  ElMessage.success("已重新加载");
};

const buildMockSnippet = () => JSON.stringify(planList.value, null, 2);

const handleDownloadMock = () => {
  const blob = new Blob([buildMockSnippet()], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `holiday-plans-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  ElMessage.success("已导出 JSON 文件");
};

const handleCopyMock = async () => {
  const text = buildMockSnippet();
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制到剪贴板，可直接粘贴到 mock 文件中");
  } catch {
    ElMessageBox.alert(text, "复制失败，请手动复制以下内容", {
      customClass: "mock-export-alert",
      dangerouslyUseHTMLString: false,
    });
  }
};
</script>

<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>
            假日出游计划
            <el-tag v-if="dirty" type="warning" size="small" class="dirty-tag">
              未保存
            </el-tag>
          </span>
          <div class="header-actions">
            <el-tooltip content="放弃本地修改，重新从 mock 文件加载" placement="top">
              <el-button @click="handleReload">重新加载</el-button>
            </el-tooltip>
            <el-button type="success" :loading="saving" :disabled="!dirty" @click="handleSaveToMock">
              保存到 Mock 文件
            </el-button>
            <el-dropdown @command="(c: string) => c === 'download' ? handleDownloadMock() : handleCopyMock()">
              <el-button>
                导出 <el-icon class="el-icon--right">
                  <ArrowDown />
                </el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="download">下载为 JSON 文件</el-dropdown-item>
                  <el-dropdown-item command="copy">复制到剪贴板</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button type="primary" @click="handleAdd">新增计划</el-button>
          </div>
        </div>
      </template>

      <div v-loading="loading">
        <el-empty v-if="!planList.length && !loading" description="暂无计划" />

        <el-row :gutter="16">
          <el-col v-for="plan in planList" :key="plan.id" :xs="24" :sm="12" :lg="8">
            <el-card class="plan-card" shadow="hover">
              <template #header>
                <div class="plan-header">
                  <el-tag type="danger" effect="dark">{{ plan.festival }}</el-tag>
                  <span class="plan-days">
                    {{ plan.startDate }} ~ {{ plan.endDate }}
                    （{{ calcDays(plan.startDate, plan.endDate) }} 天）
                  </span>
                </div>
              </template>
              <div class="plan-body">
                <p><el-icon>
                    <Location />
                  </el-icon> 目的地：{{ plan.destination }}</p>
                <p><el-icon>
                    <User />
                  </el-icon> 出行人数：{{ plan.members }} 人</p>
                <p><el-icon>
                    <Wallet />
                  </el-icon> 预算：￥{{ plan.budget.toLocaleString() }}</p>
                <p><el-icon>
                    <Van />
                  </el-icon> 交通：{{ plan.transport || "—" }}</p>
              </div>
              <template #footer>
                <el-button type="primary" link @click="handleView(plan)">查看详情</el-button>
                <el-button type="success" link @click="handleEdit(plan)">编辑</el-button>
                <el-button type="danger" link @click="handleDelete(plan)">删除</el-button>
              </template>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- 查看详情 -->
    <el-dialog v-model="viewVisible" title="计划详情" width="600px" destroy-on-close>
      <template v-if="currentPlan">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="节日">
            <el-tag type="danger">{{ currentPlan.festival }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="目的地">
            {{ currentPlan.destination }}
          </el-descriptions-item>
          <el-descriptions-item label="开始日期">
            {{ currentPlan.startDate }}
          </el-descriptions-item>
          <el-descriptions-item label="结束日期">
            {{ currentPlan.endDate }}
          </el-descriptions-item>
          <el-descriptions-item label="天数">
            {{ calcDays(currentPlan.startDate, currentPlan.endDate) }} 天
          </el-descriptions-item>
          <el-descriptions-item label="交通方式">
            {{ currentPlan.transport || "—" }}
          </el-descriptions-item>
          <el-descriptions-item label="出行人数">
            {{ currentPlan.members }} 人
          </el-descriptions-item>
          <el-descriptions-item label="预算">
            ￥{{ currentPlan.budget.toLocaleString() }}
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">
            <span v-if="currentPlan.remark">{{ currentPlan.remark }}</span>
            <span v-else class="text-placeholder">暂无</span>
          </el-descriptions-item>
        </el-descriptions>
      </template>

      <template #footer>
        <el-button @click="viewVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 新增 / 编辑 -->
    <el-dialog v-model="editVisible" :title="isEdit ? '编辑计划' : '新增计划'" width="640px" destroy-on-close>
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="节日" prop="festival">
              <el-input v-model="editForm.festival" placeholder="如：五一劳动节" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="目的地" prop="destination">
              <el-input v-model="editForm.destination" placeholder="如：云南·大理" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="出行日期" required>
              <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至"
                start-placeholder="开始日期" end-placeholder="结束日期" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="出行人数" prop="members">
              <el-input-number v-model="editForm.members" :min="1" :max="999" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预算(￥)" prop="budget">
              <el-input-number v-model="editForm.budget" :min="0" :step="100" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="交通方式" prop="transport">
              <el-select v-model="editForm.transport" placeholder="请选择" allow-create filterable style="width: 100%">
                <el-option v-for="item in transportOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="editForm.remark" type="textarea" :rows="3" placeholder="注意事项、特色安排..." />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dirty-tag {
  margin-left: 8px;
}

.text-placeholder {
  color: var(--el-text-color-placeholder);
}

.plan-card {
  margin-bottom: 16px;

  .plan-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  .plan-body {
    p {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 6px 0;
      font-size: 14px;
    }
  }
}
</style>
