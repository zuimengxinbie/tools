<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import TravelAPI, { type WeekendTrip, type TripRecord, type TripStatus } from "@/api/travel";

defineOptions({ name: "WeekendTrip" });

type TripItem = WeekendTrip;

/** 行程列表：从 `/api/v1/travel/weekend` 拉取，对应 mock/data/weekend-trips.json */
const tripList = ref<TripItem[]>([]);
const loading = ref(false);

/** 未保存的本地修改标记，离开前可提示 */
const dirty = ref(false);

const loadList = async () => {
  loading.value = true;
  try {
    tripList.value = (await TravelAPI.getWeekendList()) || [];
    dirty.value = false;
  } finally {
    loading.value = false;
  }
};

onMounted(loadList);

const statusMap: Record<TripStatus, { label: string; type: "primary" | "success" | "info" }> = {
  planning: { label: "规划中", type: "primary" },
  confirmed: { label: "已确认", type: "success" },
  completed: { label: "已完成", type: "info" },
};

/** 行程评级：5=优，1=差 */
const ratingTexts = ["差", "可", "中", "良", "优"];
const ratingColors = ["#f56c6c", "#e6a23c", "#e6a23c", "#67c23a", "#409eff"];
const getRatingLabel = (v?: number) => (v && v >= 1 && v <= 5 ? ratingTexts[v - 1] : "");
const getRatingColor = (v?: number) => (v && v >= 1 && v <= 5 ? ratingColors[v - 1] : "");

/* ---------------- 查看 ---------------- */
const viewVisible = ref(false);
const currentTrip = ref<TripItem | null>(null);

const handleView = (row: TripItem) => {
  currentTrip.value = row;
  viewVisible.value = true;
};

/* ---------------- 编辑 / 新增 ---------------- */
const editVisible = ref(false);
const editFormRef = ref<FormInstance>();
const editLoading = ref(false);
const isEdit = ref(false);

const defaultForm = (): TripItem => ({
  id: 0,
  title: "",
  destination: "",
  date: "",
  duration: "",
  status: "planning",
  preparation: [],
  review: "",
  records: [],
  rating: 0,
});

const editForm = reactive<TripItem>(defaultForm());
const preparationInput = ref("");
const recordInput = reactive<TripRecord>({ time: "", content: "" });

const editRules: FormRules = {
  title: [{ required: true, message: "请输入行程名称", trigger: "blur" }],
  destination: [{ required: true, message: "请输入目的地", trigger: "blur" }],
  date: [{ required: true, message: "请选择出行日期", trigger: "change" }],
  duration: [{ required: true, message: "请输入时长", trigger: "blur" }],
  status: [{ required: true, message: "请选择状态", trigger: "change" }],
};

const resetForm = (row?: TripItem) => {
  Object.assign(editForm, row ? JSON.parse(JSON.stringify(row)) : defaultForm());
  preparationInput.value = "";
  recordInput.time = "";
  recordInput.content = "";
};

const handleAdd = () => {
  isEdit.value = false;
  resetForm();
  editForm.id = Date.now();
  editVisible.value = true;
};

const handleEdit = (row: TripItem) => {
  isEdit.value = true;
  resetForm(row);
  editVisible.value = true;
};

const addPreparation = () => {
  const val = preparationInput.value.trim();
  if (!val) return;
  if (editForm.preparation.includes(val)) {
    ElMessage.warning("该准备项已存在");
    return;
  }
  editForm.preparation.push(val);
  preparationInput.value = "";
};

const removePreparation = (index: number) => {
  editForm.preparation.splice(index, 1);
};

const addRecord = () => {
  if (!recordInput.time || !recordInput.content.trim()) {
    ElMessage.warning("请填写完整的时间和内容");
    return;
  }
  editForm.records.push({ time: recordInput.time, content: recordInput.content.trim() });
  recordInput.time = "";
  recordInput.content = "";
};

const removeRecord = (index: number) => {
  editForm.records.splice(index, 1);
};

const handleSubmit = async () => {
  if (!editFormRef.value) return;
  await editFormRef.value.validate();

  editLoading.value = true;
  try {
    const payload: TripItem = JSON.parse(JSON.stringify(editForm));
    const idx = tripList.value.findIndex((t) => t.id === payload.id);
    if (idx > -1) {
      tripList.value[idx] = payload;
      ElMessage.success("修改成功（未落盘，点击右上角保存到 Mock 文件）");
    } else {
      tripList.value.unshift(payload);
      ElMessage.success("新增成功（未落盘，点击右上角保存到 Mock 文件）");
    }
    dirty.value = true;
    editVisible.value = false;
  } finally {
    editLoading.value = false;
  }
};

/* ---------------- 删除 ---------------- */
const handleDelete = async (row: TripItem) => {
  await ElMessageBox.confirm(`确认删除行程「${row.title}」？`, "提示", { type: "warning" });
  tripList.value = tripList.value.filter((t) => t.id !== row.id);
  dirty.value = true;
  ElMessage.success("删除成功（未落盘）");
};

/* ---------------- 保存/导出 Mock 数据 ---------------- */
const saving = ref(false);

/** 直接写入 mock/data/weekend-trips.json */
const handleSaveToMock = async () => {
  saving.value = true;
  try {
    await TravelAPI.saveWeekendList(JSON.parse(JSON.stringify(tripList.value)));
    dirty.value = false;
    ElMessage.success("已保存到 mock/data/weekend-trips.json");
  } finally {
    saving.value = false;
  }
};

/** 放弃本地修改，重新从 mock 文件加载 */
const handleReload = async () => {
  if (dirty.value) {
    await ElMessageBox.confirm("有未保存的修改，确定要重新加载吗？", "提示", {
      type: "warning",
    });
  }
  await loadList();
  ElMessage.success("已重新加载");
};

const buildMockSnippet = () => JSON.stringify(tripList.value, null, 2);

const handleDownloadMock = () => {
  const blob = new Blob([buildMockSnippet()], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `weekend-trips-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  ElMessage.success("已导出 JSON 文件");
};

const handleCopyMock = async () => {
  const text = buildMockSnippet();
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制到剪贴板");
  } catch {
    ElMessageBox.alert(text, "复制失败，请手动复制以下内容", {
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
            周末出游计划
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
            <el-button type="primary" @click="handleAdd">新增行程</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tripList" border stripe>
        <el-table-column label="#" type="index" width="60" align="center" />
        <el-table-column label="行程名称" prop="title" min-width="120" />
        <el-table-column label="目的地" prop="destination" min-width="140" />
        <el-table-column label="出行日期" prop="date" width="120" />
        <el-table-column label="时长" prop="duration" width="90" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status as TripStatus].type">
              {{ statusMap[row.status as TripStatus].label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="出行准备" min-width="180">
          <template #default="{ row }">
            <template v-if="row.preparation?.length">
              <el-tag v-for="item in row.preparation" :key="item" size="small" type="info" class="mr-1 mb-1">
                {{ item }}
              </el-tag>
            </template>
            <span v-else class="text-placeholder">—</span>
          </template>
        </el-table-column>
        <el-table-column label="行程记录" width="100" align="center">
          <template #default="{ row }">
            <el-badge :value="row.records?.length || 0" :show-zero="false" type="primary">
              <el-button link type="primary" @click="handleView(row)">
                <el-icon :size="16">
                  <Document />
                </el-icon>
              </el-button>
            </el-badge>
          </template>
        </el-table-column>
        <el-table-column label="行程回顾" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.review">{{ row.review }}</span>
            <span v-else class="text-placeholder">未填写</span>
          </template>
        </el-table-column>
        <el-table-column label="行程评级" width="180" align="center">
          <template #default="{ row }">
            <div v-if="row.rating" class="rating-cell">
              <el-rate :model-value="row.rating" disabled size="small" />
              <el-tag size="small"
                :style="{ color: getRatingColor(row.rating), borderColor: getRatingColor(row.rating) }" effect="plain">
                {{ getRatingLabel(row.rating) }}
              </el-tag>
            </div>
            <span v-else class="text-placeholder">未评级</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">查看</el-button>
            <el-button type="success" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 查看详情 -->
    <el-dialog v-model="viewVisible" title="行程详情" width="640px" destroy-on-close>
      <template v-if="currentTrip">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="行程名称">{{ currentTrip.title }}</el-descriptions-item>
          <el-descriptions-item label="目的地">{{ currentTrip.destination }}</el-descriptions-item>
          <el-descriptions-item label="出行日期">{{ currentTrip.date }}</el-descriptions-item>
          <el-descriptions-item label="时长">{{ currentTrip.duration }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusMap[currentTrip.status].type">
              {{ statusMap[currentTrip.status].label }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="出行准备" :span="2">
            <template v-if="currentTrip.preparation.length">
              <el-tag v-for="item in currentTrip.preparation" :key="item" size="small" class="mr-1 mb-1">
                {{ item }}
              </el-tag>
            </template>
            <span v-else class="text-placeholder">暂无</span>
          </el-descriptions-item>
          <el-descriptions-item label="行程评级" :span="2">
            <div v-if="currentTrip.rating" class="rating-cell">
              <el-rate :model-value="currentTrip.rating" disabled show-text :texts="ratingTexts" />
            </div>
            <span v-else class="text-placeholder">暂未评级</span>
          </el-descriptions-item>
          <el-descriptions-item label="行程回顾" :span="2">
            <span v-if="currentTrip.review">{{ currentTrip.review }}</span>
            <span v-else class="text-placeholder">暂未填写</span>
          </el-descriptions-item>
        </el-descriptions>

        <div class="section-title">行程记录</div>
        <el-timeline v-if="currentTrip.records.length">
          <el-timeline-item v-for="(r, i) in currentTrip.records" :key="i" :timestamp="r.time" placement="top">
            {{ r.content }}
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无行程记录" :image-size="80" />
      </template>

      <template #footer>
        <el-button @click="viewVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 新增 / 编辑 -->
    <el-dialog v-model="editVisible" :title="isEdit ? '编辑行程' : '新增行程'" width="720px" destroy-on-close>
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="行程名称" prop="title">
              <el-input v-model="editForm.title" placeholder="如：西湖踏青" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="目的地" prop="destination">
              <el-input v-model="editForm.destination" placeholder="如：杭州·西湖" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="出行日期" prop="date">
              <el-date-picker v-model="editForm.date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期"
                style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="时长" prop="duration">
              <el-input v-model="editForm.duration" placeholder="如：1 天" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态" prop="status">
              <el-select v-model="editForm.status" style="width: 100%">
                <el-option v-for="(s, k) in statusMap" :key="k" :label="s.label" :value="k" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="出行准备">
              <div class="input-row">
                <el-input v-model="preparationInput" placeholder="输入准备物品，回车或点击添加" @keyup.enter="addPreparation" />
                <el-button type="primary" @click="addPreparation">添加</el-button>
              </div>
              <div v-if="editForm.preparation.length" class="tag-list">
                <el-tag v-for="(item, i) in editForm.preparation" :key="item" closable @close="removePreparation(i)">
                  {{ item }}
                </el-tag>
              </div>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="行程评级">
              <el-rate v-model="editForm.rating" show-text :texts="ratingTexts" />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="行程回顾">
              <el-input v-model="editForm.review" type="textarea" :rows="3" placeholder="行程结束后填写总结、感受..." />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="行程记录">
              <div class="input-row">
                <el-date-picker v-model="recordInput.time" type="datetime" value-format="YYYY-MM-DD HH:mm"
                  format="YYYY-MM-DD HH:mm" placeholder="时间" style="width: 200px" />
                <el-input v-model="recordInput.content" placeholder="记录内容" @keyup.enter="addRecord" />
                <el-button type="primary" @click="addRecord">添加</el-button>
              </div>
              <el-table v-if="editForm.records.length" :data="editForm.records" size="small" border class="mt-2">
                <el-table-column label="时间" prop="time" width="170" />
                <el-table-column label="内容" prop="content" />
                <el-table-column label="操作" width="80" align="center">
                  <template #default="{ $index }">
                    <el-button type="danger" link @click="removeRecord($index)">
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
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

.section-title {
  margin: 16px 0 12px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.input-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.rating-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.mr-1 {
  margin-right: 4px;
}

.mb-1 {
  margin-bottom: 4px;
}

.mt-2 {
  margin-top: 8px;
}
</style>
