<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>
            待办清单
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
            <el-button type="primary" @click="handleAdd">新增待办</el-button>
          </div>
        </div>
      </template>

      <!-- 分类 Tabs -->
      <el-tabs v-model="categoryTab" class="category-tabs">
        <el-tab-pane name="all">
          <template #label>
            全部
            <el-badge :value="todoList.length" :max="999" class="tab-badge" type="info" />
          </template>
        </el-tab-pane>
        <el-tab-pane v-for="(meta, key) in categoryMap" :key="key" :name="key">
          <template #label>
            {{ meta.label }}
            <el-badge
              :value="categoryCount[key] || 0"
              :max="999"
              class="tab-badge"
              :type="meta.tagType || 'info'"
            />
          </template>
        </el-tab-pane>
      </el-tabs>

      <!-- 消费统计卡片 -->
      <div class="cost-summary-bar">
        <div class="cost-stat">
          <span class="cost-label">已筛选待办消费</span>
          <span class="cost-value">¥{{ filteredCostStats.spent.toFixed(2) }}</span>
          <span v-if="filteredCostStats.budget > 0" class="cost-budget-total">
            / ¥{{ filteredCostStats.budget.toFixed(2) }}
            <span :class="filteredCostStats.statusClass">
              ({{ filteredCostStats.percent.toFixed(0) }}%)
            </span>
          </span>
        </div>
        <el-divider direction="vertical" />
        <div class="cost-stat">
          <span class="cost-label">全部待办消费</span>
          <span class="cost-value">¥{{ totalCostStats.spent.toFixed(2) }}</span>
          <span v-if="totalCostStats.budget > 0" class="cost-budget-total">
            / ¥{{ totalCostStats.budget.toFixed(2) }}
          </span>
        </div>
      </div>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索标题 / 标签 / 描述"
          clearable
          style="width: 240px"
        >
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
        <el-select v-model="priorityFilter" placeholder="优先级" clearable style="width: 110px">
          <el-option v-for="(v, k) in priorityMap" :key="k" :label="v.label" :value="k" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 120px">
          <el-option v-for="(v, k) in statusMap" :key="k" :label="v.label" :value="k" />
        </el-select>
        <el-date-picker
          v-model="dueRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="~"
          start-placeholder="截止开始"
          end-placeholder="截止结束"
          style="width: 240px"
        />
        <el-select v-model="sortKey" style="width: 130px">
          <el-option
            v-for="opt in sortOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-button @click="handleResetFilter">重置</el-button>
        <el-divider direction="vertical" />
        <el-checkbox v-model="onlyStarred">仅星标</el-checkbox>
        <el-checkbox v-model="onlyOverdue">仅过期</el-checkbox>
        <el-checkbox v-model="onlyToday">仅今天</el-checkbox>
        <span class="filter-count">共 {{ filteredList.length }} 条</span>
      </div>

      <!-- 批量操作栏 -->
      <div v-if="selectedRows.length" class="batch-bar">
        <span>已选 {{ selectedRows.length }} 项</span>
        <el-button type="success" size="small" @click="handleBatchDone">批量完成</el-button>
        <el-button type="danger" size="small" @click="handleBatchDelete">批量删除</el-button>
        <el-button size="small" @click="clearSelection">取消选择</el-button>
      </div>

      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="pagedList"
        border
        stripe
        row-key="id"
        :row-class-name="rowClassName"
        empty-text="暂无待办，点击右上角「新增待办」开始记录"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="44" align="center" />
        <el-table-column label="#" type="index" width="50" align="center" />
        <el-table-column label="" width="44" align="center">
          <template #default="{ row }: { row: TodoItem }">
            <el-icon class="star-toggle" :class="{ active: row.starred }" @click="toggleStar(row)">
              <StarFilled v-if="row.starred" />
              <Star v-else />
            </el-icon>
          </template>
        </el-table-column>
        <el-table-column label="标题" min-width="220">
          <template #default="{ row }: { row: TodoItem }">
            <el-button
              type="primary"
              link
              :class="{ 'done-text': row.status === 'done' }"
              @click="handleView(row)"
            >
              {{ row.title }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="90" align="center">
          <template #default="{ row }: { row: TodoItem }">
            <el-tag :type="categoryMap[row.category]?.tagType || ''" size="small">
              {{ categoryMap[row.category]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="80" align="center">
          <template #default="{ row }: { row: TodoItem }">
            <el-tag :type="priorityMap[row.priority]?.tagType" size="small" effect="plain">
              {{ priorityMap[row.priority]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }: { row: TodoItem }">
            <el-tag :type="statusMap[row.status]?.tagType" size="small">
              {{ statusMap[row.status]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="140">
          <template #default="{ row }: { row: TodoItem }">
            <el-progress
              :percentage="row.progress"
              :stroke-width="10"
              :status="row.status === 'done' ? 'success' : undefined"
            />
          </template>
        </el-table-column>
        <el-table-column label="截止日期" width="120" align="center">
          <template #default="{ row }: { row: TodoItem }">
            <span :class="dueDateClass(row)">
              {{ row.dueDate || "—" }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="标签" min-width="140">
          <template #default="{ row }: { row: TodoItem }">
            <template v-if="row.tags?.length">
              <el-tag
                v-for="t in row.tags.slice(0, 2)"
                :key="t"
                size="small"
                type="info"
                effect="plain"
                class="mr-1"
              >
                {{ t }}
              </el-tag>
              <el-tooltip v-if="row.tags.length > 2" :content="row.tags.slice(2).join('、')">
                <el-tag size="small" effect="plain">+{{ row.tags.length - 2 }}</el-tag>
              </el-tooltip>
            </template>
            <span v-else class="text-placeholder">—</span>
          </template>
        </el-table-column>
        <el-table-column label="子任务" width="80" align="center">
          <template #default="{ row }: { row: TodoItem }">
            <span v-if="row.checklist?.length">
              {{ row.checklist.filter((c) => c.done).length }}/{{ row.checklist.length }}
            </span>
            <span v-else class="text-placeholder">—</span>
          </template>
        </el-table-column>
        <el-table-column label="消费" width="120" align="right">
          <template #default="{ row }: { row: TodoItem }">
            <span v-if="getRowCost(row) > 0 || row.budget" class="cost-cell">
              <span class="cost-spent">¥{{ getRowCost(row).toFixed(0) }}</span>
              <span v-if="row.budget" class="cost-budget">/{{ row.budget }}</span>
            </span>
            <span v-else class="text-placeholder">—</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createdAt" width="160" />
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }: { row: TodoItem }">
            <el-button
              v-if="row.status !== 'done'"
              type="success"
              link
              @click="handleMarkDone(row)"
            >
              完成
            </el-button>
            <el-button v-else type="info" link @click="handleReopen(row)">重开</el-button>
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="warning" link @click="handleClone(row)">复制</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="filteredList.length"
          :page-sizes="[10, 20, 50, 100]"
          background
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </el-card>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="currentTodo?.title ?? ''"
      size="680px"
      destroy-on-close
    >
      <TodoDetail v-if="currentTodo" :todo="currentTodo" @update="handleDetailUpdate" />
    </el-drawer>

    <!-- 新增 / 编辑弹窗 -->
    <TodoEditDialog
      v-model="editVisible"
      :is-edit="isEdit"
      :data="editData"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { Search, Star, StarFilled } from "@element-plus/icons-vue";
import AffairsAPI, {
  type TodoItem,
  type TodoCategory,
  type TodoPriority,
  type TodoStatus,
} from "@/api/affairs";
import {
  categoryMap,
  priorityMap,
  statusMap,
  repeatMap,
  sortOptions,
  type SortKey,
  isOverdue,
  isToday,
  isSoon,
  nowStr,
} from "./constants";
import TodoEditDialog from "./components/TodoEditDialog.vue";
import TodoDetail from "./components/TodoDetail.vue";

defineOptions({ name: "Todolist" });

/* ---------------- 数据加载 ---------------- */
const todoList = ref<TodoItem[]>([]);
const loading = ref(false);
const dirty = ref(false);
const saving = ref(false);

const loadList = async () => {
  loading.value = true;
  try {
    const list = (await AffairsAPI.getTodos()) || [];
    todoList.value = list;
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
    await AffairsAPI.saveTodos(JSON.parse(JSON.stringify(todoList.value)));
    dirty.value = false;
    ElMessage.success("已保存到 mock/data/todolist.json");
  } finally {
    saving.value = false;
  }
};

/* ---------------- 筛选 / 分页 / 排序 ---------------- */
const categoryTab = ref<TodoCategory | "all">("all");
const searchKeyword = ref("");
const priorityFilter = ref<TodoPriority | "">("");
const statusFilter = ref<TodoStatus | "">("");
const dueRange = ref<[string, string] | null>(null);
const onlyStarred = ref(false);
const onlyOverdue = ref(false);
const onlyToday = ref(false);
const sortKey = ref<SortKey>("dueDate");
const currentPage = ref(1);
const pageSize = ref(10);

/** 各分类计数（基于 todoList，不受其它筛选影响） */
const categoryCount = computed(() => {
  const map: Record<string, number> = {};
  for (const t of todoList.value) {
    map[t.category] = (map[t.category] || 0) + 1;
  }
  return map;
});

/* ---------------- 消费统计 ---------------- */
// 兼容读取：新 expenses[] + 旧 checklist[].cost
const getRowCost = (row: TodoItem) => {
  const expensesCost = (row.expenses ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const legacyCost = (row.checklist ?? []).reduce((sum, c) => sum + (c.cost ?? 0), 0);
  return expensesCost + legacyCost;
};

const totalCostStats = computed(() => {
  let spent = 0;
  let budget = 0;
  for (const t of todoList.value) {
    spent += getRowCost(t);
    budget += t.budget ?? 0;
  }
  return { spent, budget };
});

const filteredCostStats = computed(() => {
  let spent = 0;
  let budget = 0;
  for (const t of filteredList.value) {
    spent += getRowCost(t);
    budget += t.budget ?? 0;
  }
  const percent = budget > 0 ? (spent / budget) * 100 : 0;
  const statusClass = percent > 100 ? "cost-over" : percent > 80 ? "cost-warning" : "cost-normal";
  return { spent, budget, percent, statusClass };
});

const filteredList = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase();
  const list = todoList.value.filter((t) => {
    if (categoryTab.value !== "all" && t.category !== categoryTab.value) return false;
    if (priorityFilter.value && t.priority !== priorityFilter.value) return false;
    if (statusFilter.value && t.status !== statusFilter.value) return false;
    if (onlyStarred.value && !t.starred) return false;
    if (onlyOverdue.value && !isOverdue(t.dueDate, t.status)) return false;
    if (onlyToday.value && !isToday(t.dueDate)) return false;
    if (dueRange.value && dueRange.value[0] && dueRange.value[1]) {
      if (!t.dueDate) return false;
      if (t.dueDate < dueRange.value[0] || t.dueDate > dueRange.value[1]) return false;
    }
    if (kw) {
      const hay =
        t.title.toLowerCase() +
        " " +
        (t.description || "").toLowerCase() +
        " " +
        (t.tags || []).join(" ").toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    return true;
  });

  // 排序：星标置顶 + 选定排序字段
  const sorted = [...list].sort((a, b) => {
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    if (sortKey.value === "priority") {
      return priorityMap[b.priority].weight - priorityMap[a.priority].weight;
    }
    if (sortKey.value === "createdAt") {
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    }
    // 默认 dueDate：空日期排最后
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
  return sorted;
});

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredList.value.slice(start, start + pageSize.value);
});

watch(
  [
    categoryTab,
    searchKeyword,
    priorityFilter,
    statusFilter,
    dueRange,
    onlyStarred,
    onlyOverdue,
    onlyToday,
    sortKey,
  ],
  () => {
    currentPage.value = 1;
  }
);

watch(filteredList, (list) => {
  const maxPage = Math.max(1, Math.ceil(list.length / pageSize.value));
  if (currentPage.value > maxPage) currentPage.value = maxPage;
});

const handleResetFilter = () => {
  searchKeyword.value = "";
  priorityFilter.value = "";
  statusFilter.value = "";
  dueRange.value = null;
  onlyStarred.value = false;
  onlyOverdue.value = false;
  onlyToday.value = false;
  sortKey.value = "dueDate";
};

/* ---------------- 行样式 ---------------- */
const rowClassName = ({ row }: { row: TodoItem }) => {
  if (row.status === "done") return "row-done";
  if (row.status === "cancelled") return "row-cancelled";
  if (isOverdue(row.dueDate, row.status)) return "row-overdue";
  return "";
};

const dueDateClass = (row: TodoItem) => {
  if (isOverdue(row.dueDate, row.status)) return "due-overdue";
  if (isToday(row.dueDate)) return "due-today";
  if (isSoon(row.dueDate, row.status)) return "due-soon";
  return "";
};

/* ---------------- 选择 / 批量操作 ---------------- */
const tableRef = ref();
const selectedRows = ref<TodoItem[]>([]);

const handleSelectionChange = (rows: TodoItem[]) => {
  selectedRows.value = rows;
};

const clearSelection = () => {
  tableRef.value?.clearSelection();
};

const handleBatchDone = async () => {
  await ElMessageBox.confirm(`确认将所选 ${selectedRows.value.length} 项标记为已完成？`, "提示", {
    type: "warning",
  });
  const ids = new Set(selectedRows.value.map((r) => r.id));
  todoList.value = todoList.value.map((t) =>
    ids.has(t.id)
      ? { ...t, status: "done", progress: 100, finishedAt: nowStr(), updatedAt: nowStr() }
      : t
  );
  dirty.value = true;
  clearSelection();
  ElMessage.success("已批量完成（点击「保存到 Mock 文件」生效）");
};

const handleBatchDelete = async () => {
  await ElMessageBox.confirm(`确认删除所选 ${selectedRows.value.length} 项？`, "提示", {
    type: "warning",
  });
  const ids = new Set(selectedRows.value.map((r) => r.id));
  todoList.value = todoList.value.filter((t) => !ids.has(t.id));
  dirty.value = true;
  clearSelection();
  ElMessage.success("已批量删除（点击「保存到 Mock 文件」生效）");
};

/* ---------------- 详情抽屉 ---------------- */
const drawerVisible = ref(false);
const currentTodo = ref<TodoItem | null>(null);

const handleView = (row: TodoItem) => {
  currentTodo.value = JSON.parse(JSON.stringify(row));
  drawerVisible.value = true;
};

const handleDetailUpdate = (updated: TodoItem) => {
  const idx = todoList.value.findIndex((r) => r.id === updated.id);
  if (idx > -1) {
    const total = updated.checklist?.length ?? 0;
    const done = updated.checklist?.filter((c) => c.done).length ?? 0;
    if (total > 0) updated.progress = Math.round((done / total) * 100);
    updated.updatedAt = nowStr();
    todoList.value[idx] = updated;
    currentTodo.value = JSON.parse(JSON.stringify(updated));
    dirty.value = true;
  }
};

/* ---------------- 新增 / 编辑 / 复制 ---------------- */
const editVisible = ref(false);
const isEdit = ref(false);
const editData = ref<TodoItem>(defaultTodo());

function defaultTodo(): TodoItem {
  return {
    id: 0,
    title: "",
    category: "work",
    priority: "medium",
    status: "todo",
    dueDate: "",
    remindAt: "",
    tags: [],
    progress: 0,
    repeat: "none",
    starred: false,
    description: "",
    checklist: [],
    expenses: [],
    createdAt: "",
    updatedAt: "",
    finishedAt: "",
    budget: undefined,
  };
}

const nextId = () => (todoList.value.reduce((m, t) => Math.max(m, t.id), 0) || 0) + 1;

const handleAdd = () => {
  isEdit.value = false;
  editData.value = defaultTodo();
  editVisible.value = true;
};

const handleEdit = (row: TodoItem) => {
  isEdit.value = true;
  editData.value = JSON.parse(JSON.stringify(row));
  editVisible.value = true;
};

const handleClone = (row: TodoItem) => {
  const copy: TodoItem = JSON.parse(JSON.stringify(row));
  copy.id = nextId();
  copy.title = `${row.title} (副本)`;
  copy.status = "todo";
  copy.progress = 0;
  copy.finishedAt = "";
  copy.createdAt = nowStr();
  copy.updatedAt = nowStr();
  copy.checklist = (copy.checklist || []).map((c) => ({ ...c, done: false }));
  todoList.value.unshift(copy);
  dirty.value = true;
  ElMessage.success("已复制（点击「保存到 Mock 文件」生效）");
};

const handleSubmit = (payload: TodoItem) => {
  // 状态联动
  if (payload.status === "done") {
    payload.progress = 100;
    if (!payload.finishedAt) payload.finishedAt = nowStr();
  } else {
    payload.finishedAt = "";
  }

  if (!isEdit.value) {
    payload.id = nextId();
    payload.createdAt = nowStr();
    payload.updatedAt = nowStr();
    todoList.value.unshift(payload);
    ElMessage.success("新增成功（点击「保存到 Mock 文件」生效）");
  } else {
    payload.updatedAt = nowStr();
    const idx = todoList.value.findIndex((r) => r.id === payload.id);
    if (idx > -1) todoList.value[idx] = payload;
    ElMessage.success("修改成功（点击「保存到 Mock 文件」生效）");
  }
  dirty.value = true;
  editVisible.value = false;
};

/* ---------------- 行内操作 ---------------- */
const toggleStar = (row: TodoItem) => {
  const idx = todoList.value.findIndex((r) => r.id === row.id);
  if (idx > -1) {
    todoList.value[idx] = { ...todoList.value[idx], starred: !todoList.value[idx].starred };
    dirty.value = true;
  }
};

const handleMarkDone = (row: TodoItem) => {
  const idx = todoList.value.findIndex((r) => r.id === row.id);
  if (idx > -1) {
    todoList.value[idx] = {
      ...todoList.value[idx],
      status: "done",
      progress: 100,
      finishedAt: nowStr(),
      updatedAt: nowStr(),
    };
    dirty.value = true;
    ElMessage.success("已标记完成");
  }
};

const handleReopen = (row: TodoItem) => {
  const idx = todoList.value.findIndex((r) => r.id === row.id);
  if (idx > -1) {
    const item = todoList.value[idx];
    const total = item.checklist?.length ?? 0;
    const done = item.checklist?.filter((c) => c.done).length ?? 0;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    todoList.value[idx] = {
      ...item,
      status: "doing",
      progress,
      finishedAt: "",
      updatedAt: nowStr(),
    };
    dirty.value = true;
    ElMessage.success("已重新开启");
  }
};

const handleDelete = async (row: TodoItem) => {
  await ElMessageBox.confirm(`确认删除待办「${row.title}」？`, "提示", { type: "warning" });
  todoList.value = todoList.value.filter((r) => r.id !== row.id);
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

.category-tabs {
  margin-bottom: 4px;

  .tab-badge {
    margin-left: 6px;
  }
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

.batch-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 8px;
  font-size: 13px;
  background: var(--el-color-primary-light-9);
  border-radius: 4px;
}

.text-placeholder {
  color: var(--el-text-color-placeholder);
}

.mr-1 {
  margin-right: 4px;
}

.star-toggle {
  font-size: 18px;
  color: var(--el-text-color-placeholder);
  cursor: pointer;
  transition: color 0.2s;

  &.active,
  &:hover {
    color: #f7ba2a;
  }
}

.done-text {
  color: var(--el-text-color-placeholder) !important;
  text-decoration: line-through;
}

.due-overdue {
  font-weight: 600;
  color: var(--el-color-danger);
}

.due-today {
  font-weight: 600;
  color: var(--el-color-primary);
}

.due-soon {
  color: var(--el-color-warning);
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

:deep(.row-done) {
  --el-table-tr-bg-color: var(--el-fill-color-lighter);
}

:deep(.row-cancelled) {
  --el-table-tr-bg-color: var(--el-fill-color-lighter);
  opacity: 0.7;
}

:deep(.row-overdue) {
  --el-table-tr-bg-color: var(--el-color-danger-light-9);
}

/* 消费统计卡片 */
.cost-summary-bar {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 10px 16px;
  margin-bottom: 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.cost-stat {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 13px;
}

.cost-label {
  color: var(--el-text-color-secondary);
}

.cost-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-color-warning);
}

.cost-budget-total {
  color: var(--el-text-color-secondary);
}

.cost-cell {
  font-size: 13px;
}

.cost-spent {
  font-weight: 500;
  color: var(--el-color-warning);
}

.cost-budget {
  color: var(--el-text-color-secondary);
}

.cost-normal {
  color: var(--el-color-success);
}

.cost-warning {
  color: var(--el-color-warning);
}

.cost-over {
  color: var(--el-color-danger);
}
</style>
