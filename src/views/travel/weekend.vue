<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>
            周末出游计划
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
            <el-dropdown @command="handleExportCommand">
              <el-button>
                导出
                <el-icon class="el-icon--right">
                  <ArrowDown />
                </el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="download-excel">下载为 Excel 文件</el-dropdown-item>
                  <el-dropdown-item command="download-template">下载导入模板</el-dropdown-item>
                  <el-dropdown-item divided command="download-json">
                    下载为 JSON 文件
                  </el-dropdown-item>
                  <el-dropdown-item command="copy-json">复制到剪贴板</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button @click="openImportDialog">导入 Excel</el-button>
            <el-button type="primary" @click="handleAdd">新增行程</el-button>
          </div>
        </div>
      </template>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索行程名称 / 目的地"
          clearable
          style="width: 260px"
        >
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 140px">
          <el-option v-for="(s, k) in statusMap" :key="k" :label="s.label" :value="k" />
        </el-select>
        <el-button @click="handleResetFilter">重置</el-button>
        <span class="filter-count">共 {{ filteredList.length }} 条</span>
      </div>

      <el-table
        v-loading="loading"
        :data="pagedList"
        border
        stripe
        :default-sort="{ prop: 'date', order: 'descending' }"
        :row-class-name="rowClassName"
        empty-text="暂无行程，点击右上角「新增行程」开始记录"
      >
        <el-table-column label="#" type="index" width="60" align="center" />
        <el-table-column label="行程名称" prop="title" min-width="120" />
        <el-table-column label="目的地" prop="destination" min-width="160">
          <template #default="{ row }">
            <template v-if="row.destination">
              <el-tag
                v-for="(d, i) in splitDestination(row.destination)"
                :key="`${d}-${i}`"
                size="small"
                type="success"
                effect="plain"
                class="mr-1 mb-1"
              >
                {{ d }}
              </el-tag>
            </template>
            <span v-else class="text-placeholder">—</span>
          </template>
        </el-table-column>
        <el-table-column
          label="出行日期"
          prop="date"
          width="140"
          sortable
          :sort-method="(a: TripItem, b: TripItem) => (a.date || '').localeCompare(b.date || '')"
        />
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
              <el-tag
                v-for="(item, i) in row.preparation"
                :key="`${item}-${i}`"
                size="small"
                type="info"
                class="mr-1 mb-1"
              >
                {{ item }}
              </el-tag>
            </template>
            <span v-else class="text-placeholder">—</span>
          </template>
        </el-table-column>
        <el-table-column label="行程记录" width="110" align="center">
          <template #default="{ row }">
            <el-badge
              :value="row.records?.length || 0"
              :show-zero="false"
              :offset="[5, 8]"
              type="primary"
              class="records-badge"
            >
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
              <el-tag
                size="small"
                :style="{
                  color: getRatingColor(row.rating),
                  borderColor: getRatingColor(row.rating),
                }"
                effect="plain"
              >
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

      <!-- 分页 -->
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

    <!-- 查看详情 -->
    <el-dialog v-model="viewVisible" title="行程详情" width="800px" destroy-on-close>
      <template v-if="currentTrip">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="行程名称">{{ currentTrip.title }}</el-descriptions-item>
          <el-descriptions-item label="目的地">
            <template v-if="currentTrip.destination">
              <el-tag
                v-for="(d, i) in splitDestination(currentTrip.destination)"
                :key="`${d}-${i}`"
                size="small"
                type="success"
                effect="plain"
                class="mr-1 mb-1"
              >
                {{ d }}
              </el-tag>
            </template>
            <span v-else class="text-placeholder">—</span>
          </el-descriptions-item>
          <el-descriptions-item label="出行日期">{{ currentTrip.date }}</el-descriptions-item>
          <el-descriptions-item label="时长">{{ currentTrip.duration }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusMap[currentTrip.status].type">
              {{ statusMap[currentTrip.status].label }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="出行准备" :span="2">
            <template v-if="currentTrip.preparation.length">
              <el-tag
                v-for="(item, i) in currentTrip.preparation"
                :key="`${item}-${i}`"
                size="small"
                class="mr-1 mb-1"
              >
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
        <template v-if="currentTrip.records.length">
          <!-- 单天：保持原样的扉平时间轴（按时间升序） -->
          <el-timeline v-if="!isMultiDay">
            <el-timeline-item
              v-for="(r, i) in sortedRecords"
              :key="`${r.time}-${i}`"
              :timestamp="r.time"
              placement="top"
            >
              {{ r.content }}
            </el-timeline-item>
          </el-timeline>

          <!-- 多天：按天分组 -->
          <div v-else class="record-day-groups">
            <div v-for="group in groupedRecords" :key="group.date" class="record-day-group">
              <div class="record-day-title">
                <el-tag type="primary" effect="plain" size="small">
                  {{ group.date }}
                </el-tag>
                <span class="record-day-index">第 {{ group.dayIndex }} 天</span>
                <span class="record-day-count">共 {{ group.items.length }} 条</span>
              </div>
              <el-timeline>
                <el-timeline-item
                  v-for="(r, i) in group.items"
                  :key="`${r.time}-${i}`"
                  :timestamp="getRecordTime(r.time) || r.time"
                  placement="top"
                >
                  {{ r.content }}
                </el-timeline-item>
              </el-timeline>
            </div>
          </div>
        </template>
        <el-empty v-else description="暂无行程记录" :image-size="80" />
      </template>

      <template #footer>
        <el-button @click="viewVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 新增 / 编辑 -->
    <el-dialog
      v-model="editVisible"
      :title="isEdit ? '编辑行程' : '新增行程'"
      width="800px"
      destroy-on-close
    >
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="行程名称" prop="title">
              <el-input v-model="editForm.title" placeholder="如：西湖踏青" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="目的地" prop="destination">
              <el-select
                v-model="destinationTags"
                multiple
                filterable
                allow-create
                default-first-option
                :reserve-keyword="false"
                placeholder="输入后回车，可选历史目的地"
                no-data-text="输入后回车即可添加"
                style="width: 100%"
              >
                <el-option v-for="d in destinationSuggestions" :key="d" :label="d" :value="d" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="出行日期" prop="date">
              <el-date-picker
                v-model="editForm.date"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择日期"
                style="width: 100%"
              />
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
                <el-input
                  v-model="preparationInput"
                  placeholder="输入准备物品，回车或点击添加"
                  @keyup.enter="addPreparation"
                />
                <el-button type="primary" @click="addPreparation">添加</el-button>
              </div>
              <div v-if="editForm.preparation.length" class="tag-list">
                <el-tag
                  v-for="(item, i) in editForm.preparation"
                  :key="`${item}-${i}`"
                  :closable="!isRequiredPreparation(item)"
                  :type="isRequiredPreparation(item) ? 'danger' : undefined"
                  :effect="isRequiredPreparation(item) ? 'plain' : 'light'"
                  @close="removePreparation(i)"
                >
                  <span v-if="isRequiredPreparation(item)" class="required-mark">*</span>
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
              <el-input
                v-model="editForm.review"
                type="textarea"
                :rows="3"
                placeholder="行程结束后填写总结、感受..."
              />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="行程记录">
              <div class="input-row">
                <el-date-picker
                  v-model="recordInput.time"
                  type="datetime"
                  value-format="YYYY-MM-DD HH:mm"
                  format="YYYY-MM-DD HH:mm"
                  placeholder="时间"
                  style="width: 200px"
                />
                <el-input
                  v-model="recordInput.content"
                  placeholder="记录内容"
                  @keyup.enter="addRecord"
                />
                <el-button type="primary" @click="addRecord">添加</el-button>
              </div>
              <el-table
                v-if="editForm.records.length"
                :data="editForm.records"
                size="small"
                border
                class="mt-2"
              >
                <el-table-column label="时间" prop="time" width="170" />
                <el-table-column label="内容" prop="content" />
                <el-table-column label="操作" width="80" align="center">
                  <template #default="{ $index }">
                    <el-button type="danger" link @click="removeRecord($index)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importVisible" title="导入周末出行（Excel）" width="620px" destroy-on-close>
      <el-upload
        v-model:file-list="importFiles"
        class="w-full"
        accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        :drag="true"
        :limit="1"
        :auto-upload="false"
        :on-exceed="handleImportFileExceed"
      >
        <div class="el-upload__text">将文件拖到此处，或点击上传</div>
        <template #tip>
          <div class="el-upload__tip">
            仅支持 .xlsx / .xls；按「行程名称+出行日期」去重更新；任一错误将整批拒绝
          </div>
        </template>
      </el-upload>

      <el-alert
        title="字段要求：title、destination、date、duration、status、preparation、review、rating、records"
        type="info"
        :closable="false"
        style="margin-top: 12px"
      />

      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" :loading="importLoading" @click="handleImportExcel">
          确定导入
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importErrorVisible" title="导入失败" width="700px" destroy-on-close>
      <el-alert
        :title="`本次导入共 ${importErrorList.length} 条错误，已整批拒绝`"
        type="error"
        :closable="false"
      />
      <el-table :data="importErrorRows" style="width: 100%; margin-top: 12px" max-height="420">
        <el-table-column type="index" label="#" width="60" align="center" />
        <el-table-column prop="message" label="错误信息" min-width="560" />
      </el-table>
      <template #footer>
        <el-button type="primary" @click="importErrorVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import type { FormInstance, FormRules, UploadUserFile } from "element-plus";
import TravelAPI, { type WeekendTrip, type TripRecord, type TripStatus } from "@/api/travel";
import { useDirtyGuard } from "./composables/useDirtyGuard";
import { genTripId, splitDestination } from "./composables/helpers";
import {
  WEEKEND_EXCEL_MIME,
  buildWeekendExportBuffer,
  buildWeekendTemplateBuffer,
  downloadArrayBufferFile,
  mergeWeekendTrips,
  parseWeekendExcelFile,
} from "./composables/weekendExcel";

defineOptions({ name: "WeekendTrip" });

type TripItem = WeekendTrip;

/** 行程列表：从 `/api/v1/travel/weekend` 拉取，对应 mock/data/weekend-trips.json */
const tripList = ref<TripItem[]>([]);
const loading = ref(false);

/** 未保存的本地修改标记，离开前可提示 */
const dirty = ref(false);
useDirtyGuard(dirty);

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

/** 必选出行准备项（不可删除，新建时默认带上） */
const REQUIRED_PREPARATIONS = ["热水壶", "车钥匙", "大疆", "两手机"];
const isRequiredPreparation = (item: string) => REQUIRED_PREPARATIONS.includes(item);

/* ---------------- 筛选 / 分页 ---------------- */
const searchKeyword = ref("");
const statusFilter = ref<TripStatus | "">("");
const currentPage = ref(1);
const pageSize = ref(10);

/** 当前命中筛选条件的行程列表（不含分页） */
const filteredList = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase();
  const status = statusFilter.value;
  return tripList.value.filter((t) => {
    if (status && t.status !== status) return false;
    if (!kw) return true;
    return (
      (t.title || "").toLowerCase().includes(kw) || (t.destination || "").toLowerCase().includes(kw)
    );
  });
});

/** 当前页要展示的行程 */
const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredList.value.slice(start, start + pageSize.value);
});

/** 筛选条件变化时回到第 1 页 */
watch([searchKeyword, statusFilter], () => {
  currentPage.value = 1;
});

/** 数据变少导致当前页越界时自动回退 */
watch(filteredList, (list) => {
  const maxPage = Math.max(1, Math.ceil(list.length / pageSize.value));
  if (currentPage.value > maxPage) currentPage.value = maxPage;
});

const handleResetFilter = () => {
  searchKeyword.value = "";
  statusFilter.value = "";
};

/* ---------------- 行高亮 ---------------- */
const highlightId = ref<number | null>(null);
let highlightTimer: ReturnType<typeof setTimeout> | null = null;

const rowClassName = ({ row }: { row: TripItem }) =>
  row.id === highlightId.value ? "is-highlight" : "";

const flashHighlight = (id: number) => {
  highlightId.value = id;
  if (highlightTimer) clearTimeout(highlightTimer);
  highlightTimer = setTimeout(() => {
    highlightId.value = null;
    highlightTimer = null;
  }, 3000);
};

/** 在 filteredList 中跳转到指定 id 所在的页 */
const jumpToRow = (id: number) => {
  const idx = filteredList.value.findIndex((t) => t.id === id);
  if (idx < 0) return;
  currentPage.value = Math.floor(idx / pageSize.value) + 1;
};

/* ---------------- 查看 ---------------- */
const viewVisible = ref(false);
const currentTrip = ref<TripItem | null>(null);

const handleView = (row: TripItem) => {
  currentTrip.value = row;
  viewVisible.value = true;
};

/** 取 time 字段的日期部分（兼容 "YYYY-MM-DD HH:mm" 与 "YYYY-MM-DD"） */
const getRecordDate = (time: string) => (time || "").slice(0, 10);

/** 取 time 字段的时间部分；若只有日期则返回空串 */
const getRecordTime = (time: string) => {
  const t = (time || "").slice(11);
  return t ? t : "";
};

/** 单天行程的记录：按时间升序 */
const sortedRecords = computed(() => {
  const list = currentTrip.value?.records ?? [];
  return [...list].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
});

/** 按日期分组的行程记录；按日期升序，每天内部按时间升序，附加 dayIndex（第 N 天） */
const groupedRecords = computed(() => {
  const list = currentTrip.value?.records ?? [];
  const map = new Map<string, TripRecord[]>();
  for (const r of list) {
    const d = getRecordDate(r.time) || "未指定日期";
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(r);
  }
  return Array.from(map, ([date, items]) => ({
    date,
    items: [...items].sort((a, b) => (a.time || "").localeCompare(b.time || "")),
  }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((g, i) => ({ ...g, dayIndex: i + 1 }));
});

/** 是否多天行程：分组后超过 1 个日期 */
const isMultiDay = computed(() => groupedRecords.value.length > 1);

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
  preparation: [...REQUIRED_PREPARATIONS],
  review: "",
  records: [],
  rating: 0,
});

const editForm = reactive<TripItem>(defaultForm());
const preparationInput = ref("");
const recordInput = reactive<TripRecord>({ time: "", content: "" });

const editRules: FormRules = {
  title: [{ required: true, message: "请输入行程名称", trigger: "blur" }],
  destination: [{ required: true, message: "请输入目的地", trigger: "change" }],
  date: [{ required: true, message: "请选择出行日期", trigger: "change" }],
  duration: [{ required: true, message: "请输入时长", trigger: "blur" }],
  status: [{ required: true, message: "请选择状态", trigger: "change" }],
};

/** 目的地标签数组（与字符串字段双向同步，使用 · 作为持久化分隔符） */
const destinationTags = computed<string[]>({
  get: () => splitDestination(editForm.destination || ""),
  set: (tags) => {
    // 清洗：去重、去空、去前后空格
    const cleaned: string[] = [];
    for (const t of tags) {
      const v = (t || "").trim();
      if (v && !cleaned.includes(v)) cleaned.push(v);
    }
    editForm.destination = cleaned.join("·");
  },
});

/** 目的地历史建议（来自所有现有行程，去重） */
const destinationSuggestions = computed<string[]>(() => {
  const set = new Set<string>();
  for (const t of tripList.value) {
    for (const d of splitDestination(t.destination || "")) {
      set.add(d);
    }
  }
  // 排除当前已选，避免下拉里看到重复项
  for (const t of destinationTags.value) set.delete(t);
  return [...set].sort();
});

const resetForm = (row?: TripItem) => {
  Object.assign(editForm, row ? JSON.parse(JSON.stringify(row)) : defaultForm());
  // 编辑时补齐缺失的必选项，保证以前的老数据也带上
  for (const item of REQUIRED_PREPARATIONS) {
    if (!editForm.preparation.includes(item)) editForm.preparation.unshift(item);
  }
  preparationInput.value = "";
  recordInput.time = "";
  recordInput.content = "";
};

const handleAdd = () => {
  isEdit.value = false;
  resetForm();
  editForm.id = genTripId(tripList.value);
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
  const item = editForm.preparation[index];
  if (isRequiredPreparation(item)) {
    ElMessage.warning(`「${item}」为必选项，不可移除`);
    return;
  }
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
      ElMessage.success("修改成功（点击「保存到 Mock 文件」生效）");
    } else {
      tripList.value.unshift(payload);
      ElMessage.success("新增成功（点击「保存到 Mock 文件」生效）");
    }
    dirty.value = true;
    editVisible.value = false;
    nextTick(() => {
      jumpToRow(payload.id);
      flashHighlight(payload.id);
    });
  } finally {
    editLoading.value = false;
  }
};

/* ---------------- 删除 ---------------- */
const handleDelete = async (row: TripItem) => {
  await ElMessageBox.confirm(`确认删除行程「${row.title}」？`, "提示", { type: "warning" });
  tripList.value = tripList.value.filter((t) => t.id !== row.id);
  dirty.value = true;
  ElMessage.success("已删除（点击「保存到 Mock 文件」生效）");
};

onBeforeUnmount(() => {
  if (highlightTimer) clearTimeout(highlightTimer);
});

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

const handleDownloadExcel = async () => {
  const buffer = await buildWeekendExportBuffer(tripList.value);
  downloadArrayBufferFile(buffer, `weekend-trips-${Date.now()}.xlsx`, WEEKEND_EXCEL_MIME);
  ElMessage.success("已导出 Excel 文件");
};

const handleDownloadExcelTemplate = async () => {
  const buffer = await buildWeekendTemplateBuffer();
  downloadArrayBufferFile(buffer, "weekend-trips-template.xlsx", WEEKEND_EXCEL_MIME);
  ElMessage.success("已下载导入模板");
};

const handleExportCommand = async (command: string) => {
  if (command === "download-excel") {
    await handleDownloadExcel();
    return;
  }
  if (command === "download-template") {
    await handleDownloadExcelTemplate();
    return;
  }
  if (command === "download-json") {
    handleDownloadMock();
    return;
  }
  if (command === "copy-json") {
    await handleCopyMock();
  }
};

const importVisible = ref(false);
const importLoading = ref(false);
const importFiles = ref<UploadUserFile[]>([]);
const importErrorVisible = ref(false);
const importErrorList = ref<string[]>([]);

const importErrorRows = computed(() => importErrorList.value.map((message) => ({ message })));

const openImportDialog = () => {
  importFiles.value = [];
  importVisible.value = true;
};

const handleImportFileExceed = () => {
  ElMessage.warning("只能上传一个文件");
};

const handleImportExcel = async () => {
  const first = importFiles.value[0];
  const file = first?.raw as File | undefined;
  if (!file) {
    ElMessage.warning("请先选择 Excel 文件");
    return;
  }

  importLoading.value = true;
  try {
    const { rows, errors } = await parseWeekendExcelFile(file);
    if (errors.length > 0) {
      importErrorList.value = errors;
      importErrorVisible.value = true;
      ElMessage.error("导入失败，存在错误数据");
      return;
    }

    const { merged, createdCount, updatedCount } = mergeWeekendTrips(tripList.value, rows);
    tripList.value = merged;
    dirty.value = true;
    importVisible.value = false;
    importFiles.value = [];
    ElMessage.success(`导入成功：新增 ${createdCount} 条，更新 ${updatedCount} 条`);
  } finally {
    importLoading.value = false;
  }
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

.required-mark {
  margin-right: 2px;
  font-weight: 600;
  color: var(--el-color-danger);
}

.rating-cell {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
}

.record-day-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.record-day-group + .record-day-group {
  padding-top: 8px;
  border-top: 1px dashed var(--el-border-color-lighter);
}

.record-day-title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.record-day-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* 行程记录角标：避免数字被列右边界遮挡 */
.records-badge {
  margin-right: 12px;
}

.records-badge :deep(.el-badge__content) {
  z-index: 2;
}

.record-day-index {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.filter-bar {
  display: flex;
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

/* \u65b0\u589e/\u7f16\u8f91\u540e\u7684\u9ad8\u4eae\u52a8\u753b */
:deep(.el-table__row.is-highlight) td {
  background-color: var(--el-color-primary-light-9) !important;
  animation: row-flash 3s ease-out;
}

@keyframes row-flash {
  0% {
    background-color: var(--el-color-primary-light-7);
  }

  60% {
    background-color: var(--el-color-primary-light-9);
  }

  100% {
    background-color: transparent;
  }
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
