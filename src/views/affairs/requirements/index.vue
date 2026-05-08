<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>
            个人需求面板
            <el-tag v-if="dirty" type="warning" size="small" class="dirty-tag">未保存</el-tag>
          </span>
          <div class="header-actions">
            <el-tooltip content="放弃本地修改，重新从 mock 文件加载" placement="top">
              <el-button @click="handleReload">重新加载</el-button>
            </el-tooltip>
            <el-button
              type="success"
              :loading="saving"
              :disabled="!dirty"
              @click="handleSaveToMock"
            >
              保存到 Mock 文件
            </el-button>
            <el-button type="primary" @click="handleAdd">新增需求</el-button>
          </div>
        </div>
      </template>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索标题 / 负责人"
          clearable
          style="width: 240px"
        >
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
        <el-select v-model="typeFilter" placeholder="需求类型" clearable style="width: 130px">
          <el-option v-for="(v, k) in typeMap" :key="k" :label="v.label" :value="k" />
        </el-select>
        <el-select v-model="priorityFilter" placeholder="优先级" clearable style="width: 110px">
          <el-option v-for="(v, k) in priorityMap" :key="k" :label="v.label" :value="k" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 120px">
          <el-option v-for="(v, k) in statusMap" :key="k" :label="v.label" :value="k" />
        </el-select>
        <el-button @click="handleResetFilter">重置</el-button>
        <span class="filter-count">共 {{ filteredList.length }} 条</span>
      </div>

      <el-table
        v-loading="loading"
        :data="pagedList"
        border
        stripe
        empty-text="暂无需求，点击右上角「新增需求」开始记录"
      >
        <el-table-column label="#" type="index" width="60" align="center" />
        <el-table-column label="标题" min-width="200">
          <template #default="{ row }: { row: Requirement }">
            <el-button type="primary" link @click="handleView(row)">{{ row.title }}</el-button>
          </template>
        </el-table-column>
        <el-table-column label="需求类型" width="110" align="center">
          <template #default="{ row }: { row: Requirement }">
            <el-tag :type="typeMap[row.type]?.tagType" size="small">
              {{ typeMap[row.type]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="100" align="center">
          <template #default="{ row }: { row: Requirement }">
            <el-tag :type="priorityMap[row.priority]?.tagType" size="small" effect="plain">
              {{ priorityMap[row.priority]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }: { row: Requirement }">
            <el-tag :type="statusMap[row.status]?.tagType" size="small">
              {{ statusMap[row.status]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="负责人" prop="assignee" width="100" />
        <el-table-column label="截止日期" prop="dueDate" width="120" />
        <el-table-column label="子任务" width="90" align="center">
          <template #default="{ row }: { row: Requirement }">
            <span v-if="row.subTasks?.length">
              {{ row.subTasks.filter((s: SubTask) => s.done).length }}/{{ row.subTasks.length }}
            </span>
            <span v-else class="text-placeholder">—</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createdAt" width="160" />
        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }: { row: Requirement }">
            <el-button type="primary" link @click="handleView(row)">查看</el-button>
            <el-button type="success" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="filteredList.length"
          :page-sizes="[10, 20, 50]"
          background
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </el-card>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="currentReq?.title ?? ''"
      size="760px"
      destroy-on-close
    >
      <RequirementDetail v-if="currentReq" :requirement="currentReq" @update="handleDetailUpdate" />
    </el-drawer>

    <!-- 新增 / 编辑弹窗 -->
    <el-dialog
      v-model="editVisible"
      :title="isEdit ? '编辑需求' : '新增需求'"
      width="640px"
      destroy-on-close
    >
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="90px">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="标题" prop="title">
              <el-input v-model="editForm.title" placeholder="请输入需求标题" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="需求类型" prop="type">
              <el-select v-model="editForm.type" style="width: 100%">
                <el-option v-for="(v, k) in typeMap" :key="k" :label="v.label" :value="k" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="优先级" prop="priority">
              <el-select v-model="editForm.priority" style="width: 100%">
                <el-option v-for="(v, k) in priorityMap" :key="k" :label="v.label" :value="k" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="editForm.status" style="width: 100%">
                <el-option v-for="(v, k) in statusMap" :key="k" :label="v.label" :value="k" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="截止日期">
              <el-date-picker
                v-model="editForm.dueDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择截止日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="负责人" prop="assignee">
              <el-input v-model="editForm.assignee" placeholder="请输入负责人姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="协助人">
              <div class="collaborator-box">
                <template v-if="editCollaborators.length">
                  <el-tag
                    v-for="name in editCollaborators"
                    :key="name"
                    size="small"
                    type="info"
                    class="mr-1"
                  >
                    {{ name }}
                  </el-tag>
                </template>
                <span v-else class="text-placeholder">暂无（来源于子任务负责人）</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="描述">
              <el-input
                v-model="editForm.description"
                type="textarea"
                :rows="4"
                placeholder="请输入需求描述..."
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import AffairsAPI, {
  type Requirement,
  type ReqType,
  type ReqPriority,
  type ReqStatus,
  type SubTask,
} from "@/api/affairs";
import RequirementDetail from "./components/RequirementDetail.vue";

defineOptions({ name: "Requirements" });

/* ---------------- 枚举映射 ---------------- */
const typeMap: Record<
  ReqType,
  { label: string; tagType: "primary" | "success" | "warning" | "info" }
> = {
  task: { label: "任务", tagType: "primary" },
  issue: { label: "问题", tagType: "warning" },
  suggestion: { label: "建议", tagType: "success" },
  other: { label: "其他", tagType: "info" },
};

const priorityMap: Record<
  ReqPriority,
  { label: string; tagType: "danger" | "warning" | "primary" | "info" }
> = {
  urgent: { label: "紧急", tagType: "danger" },
  high: { label: "高", tagType: "warning" },
  medium: { label: "中", tagType: "primary" },
  low: { label: "低", tagType: "info" },
};

const statusMap: Record<
  ReqStatus,
  { label: string; tagType: "info" | "primary" | "warning" | "success" | "danger" }
> = {
  pending: { label: "待处理", tagType: "info" },
  "in-progress": { label: "进行中", tagType: "primary" },
  review: { label: "待审核", tagType: "warning" },
  done: { label: "已完成", tagType: "success" },
  closed: { label: "已关闭", tagType: "danger" },
};

/* ---------------- 数据加载 ---------------- */
const requirementList = ref<Requirement[]>([]);
const loading = ref(false);
const dirty = ref(false);
const saving = ref(false);

const extractCollaboratorsFromSubTasks = (subTasks: SubTask[] = []) =>
  Array.from(new Set(subTasks.map((task) => task.assignee?.trim()).filter(Boolean) as string[]));

const loadList = async () => {
  loading.value = true;
  try {
    const list = (await AffairsAPI.getRequirements()) || [];
    requirementList.value = list.map((item) => ({
      ...item,
      collaborators: extractCollaboratorsFromSubTasks(item.subTasks || []),
    }));
    dirty.value = false;
  } finally {
    loading.value = false;
  }
};

onMounted(loadList);

const handleReload = async () => {
  if (dirty.value) {
    await ElMessageBox.confirm("有未保存的修改，确定要重新加载吗？", "提示", { type: "warning" });
  }
  await loadList();
  ElMessage.success("已重新加载");
};

const handleSaveToMock = async () => {
  saving.value = true;
  try {
    await AffairsAPI.saveRequirements(JSON.parse(JSON.stringify(requirementList.value)));
    dirty.value = false;
    ElMessage.success("已保存到 mock/data/requirements.json");
  } finally {
    saving.value = false;
  }
};

/* ---------------- 筛选 / 分页 ---------------- */
const searchKeyword = ref("");
const typeFilter = ref<ReqType | "">("");
const priorityFilter = ref<ReqPriority | "">("");
const statusFilter = ref<ReqStatus | "">("");
const currentPage = ref(1);
const pageSize = ref(10);

const filteredList = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase();
  return requirementList.value.filter((r) => {
    if (typeFilter.value && r.type !== typeFilter.value) return false;
    if (priorityFilter.value && r.priority !== priorityFilter.value) return false;
    if (statusFilter.value && r.status !== statusFilter.value) return false;
    if (kw) {
      return r.title.toLowerCase().includes(kw) || r.assignee.toLowerCase().includes(kw);
    }
    return true;
  });
});

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredList.value.slice(start, start + pageSize.value);
});

watch([searchKeyword, typeFilter, priorityFilter, statusFilter], () => {
  currentPage.value = 1;
});

watch(filteredList, (list) => {
  const maxPage = Math.max(1, Math.ceil(list.length / pageSize.value));
  if (currentPage.value > maxPage) currentPage.value = maxPage;
});

const handleResetFilter = () => {
  searchKeyword.value = "";
  typeFilter.value = "";
  priorityFilter.value = "";
  statusFilter.value = "";
};

/* ---------------- 查看（抽屉） ---------------- */
const drawerVisible = ref(false);
const currentReq = ref<Requirement | null>(null);

const handleView = (row: Requirement) => {
  currentReq.value = JSON.parse(JSON.stringify(row));
  drawerVisible.value = true;
};

/** 抽屉内子任务/评论变更后同步到列表 */
const handleDetailUpdate = (updated: Requirement) => {
  const merged: Requirement = {
    ...updated,
    collaborators: extractCollaboratorsFromSubTasks(updated.subTasks || []),
  };
  const idx = requirementList.value.findIndex((r) => r.id === updated.id);
  if (idx > -1) {
    requirementList.value[idx] = merged;
    currentReq.value = JSON.parse(JSON.stringify(merged));
    dirty.value = true;
  }
};

/* ---------------- 新增 / 编辑 ---------------- */
const editVisible = ref(false);
const editFormRef = ref<FormInstance>();
const editLoading = ref(false);
const isEdit = ref(false);

const defaultForm = (): Requirement => ({
  id: 0,
  title: "",
  type: "task",
  priority: "medium",
  status: "pending",
  description: "",
  assignee: "",
  collaborators: [],
  dueDate: "",
  createdAt: "",
  subTasks: [],
  comments: [],
});

const editForm = reactive<Requirement>(defaultForm());
const editCollaborators = computed(() => extractCollaboratorsFromSubTasks(editForm.subTasks || []));

const editRules: FormRules = {
  title: [{ required: true, message: "请输入标题", trigger: "blur" }],
  type: [{ required: true, message: "请选择需求类型", trigger: "change" }],
  priority: [{ required: true, message: "请选择优先级", trigger: "change" }],
  status: [{ required: true, message: "请选择状态", trigger: "change" }],
  assignee: [{ required: true, message: "请输入负责人", trigger: "blur" }],
};

const nextId = () => (requirementList.value.reduce((max, r) => Math.max(max, r.id), 0) || 0) + 1;

const now = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const handleAdd = () => {
  isEdit.value = false;
  Object.assign(editForm, defaultForm());
  editVisible.value = true;
};

const handleEdit = (row: Requirement) => {
  isEdit.value = true;
  Object.assign(editForm, JSON.parse(JSON.stringify(row)));
  editVisible.value = true;
};

const handleSubmit = async () => {
  if (!editFormRef.value) return;
  await editFormRef.value.validate();
  editLoading.value = true;
  try {
    const payload: Requirement = JSON.parse(JSON.stringify(editForm));
    payload.collaborators = extractCollaboratorsFromSubTasks(payload.subTasks || []);
    if (!isEdit.value) {
      payload.id = nextId();
      payload.createdAt = now();
      requirementList.value.unshift(payload);
      ElMessage.success("新增成功（点击「保存到 Mock 文件」生效）");
    } else {
      const idx = requirementList.value.findIndex((r) => r.id === payload.id);
      if (idx > -1) requirementList.value[idx] = payload;
      ElMessage.success("修改成功（点击「保存到 Mock 文件」生效）");
    }
    dirty.value = true;
    editVisible.value = false;
  } finally {
    editLoading.value = false;
  }
};

/* ---------------- 删除 ---------------- */
const handleDelete = async (row: Requirement) => {
  await ElMessageBox.confirm(`确认删除需求「${row.title}」？`, "提示", { type: "warning" });
  requirementList.value = requirementList.value.filter((r) => r.id !== row.id);
  dirty.value = true;
  ElMessage.success("已删除（点击「保存到 Mock 文件」生效）");
};
</script>

<style lang="scss" scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.dirty-tag {
  margin-left: 8px;
}

.text-placeholder {
  color: var(--el-text-color-placeholder);
}

.mr-1 {
  margin-right: 4px;
}

.collaborator-box {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  min-height: 32px;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.filter-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
