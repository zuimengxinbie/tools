<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>
            团建规划
            <el-tag v-if="dirty" type="warning" size="small" class="dirty-tag">未保存</el-tag>
          </span>
          <div class="header-actions">
            <el-tooltip content="放弃本地修改，重新从 mock 文件加载" placement="top">
              <el-button @click="handleReload">重新加载</el-button>
            </el-tooltip>
            <el-button @click="handleDownloadTemplate">下载模板</el-button>
            <el-button @click="openImportDialog">导入 Excel</el-button>
            <el-button @click="handleExportExcel">导出 Excel</el-button>
            <el-button
              type="success"
              :loading="saving"
              :disabled="!dirty"
              @click="handleSaveToMock"
            >
              保存到 Mock 文件
            </el-button>
            <el-button type="primary" @click="handleAdd">新增报名</el-button>
          </div>
        </div>
      </template>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索 姓名 / 手机号 / 部门 / 酒店"
          clearable
          style="width: 260px"
        >
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
        <el-select v-model="departmentFilter" placeholder="部门" clearable style="width: 180px">
          <el-option v-for="d in departmentOptions" :key="d" :label="d" :value="d" />
        </el-select>
        <el-select v-model="commuteFilter" placeholder="通勤方式" clearable style="width: 130px">
          <el-option v-for="o in commuteTypeOptions" :key="o.key" :label="o.label" :value="o.key" />
        </el-select>
        <el-select v-model="ticketFilter" placeholder="购票方式" clearable style="width: 130px">
          <el-option v-for="o in ticketTypeOptions" :key="o.key" :label="o.label" :value="o.key" />
        </el-select>
        <el-select v-model="genderFilter" placeholder="性别" clearable style="width: 100px">
          <el-option v-for="o in genderOptions" :key="o.key" :label="o.label" :value="o.key" />
        </el-select>
        <el-select v-model="roomFilter" placeholder="房型" clearable style="width: 110px">
          <el-option v-for="o in roomTypeOptions" :key="o.key" :label="o.label" :value="o.key" />
        </el-select>
        <el-select v-model="hotelFilter" placeholder="酒店" clearable style="width: 160px">
          <el-option v-for="h in hotelOptions" :key="h" :label="h" :value="h" />
        </el-select>
        <el-button @click="handleResetFilter">重置</el-button>
        <span class="filter-count">
          共 {{ filteredList.length }} 条 / 出行人数合计 {{ totalHeadcount }} / 费用总计 ¥
          <b class="fee-total">{{ totalFee.toFixed(2) }}</b>
        </span>
      </div>

      <!-- 批量操作栏 -->
      <div v-if="selectedRows.length" class="batch-bar">
        <span>已选 {{ selectedRows.length }} 项</span>
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
        empty-text="暂无报名记录，点击右上角「新增报名」开始登记"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="44" align="center" fixed="left" />
        <el-table-column label="#" type="index" width="50" align="center" fixed="left" />
        <el-table-column label="填报人" min-width="100" fixed="left">
          <template #default="{ row }: { row: GroupBuildingSignup }">
            <el-button type="primary" link @click="handleView(row)">
              {{ row.reporterName }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="手机号" prop="phone" min-width="130" />
        <el-table-column label="归属" prop="department" min-width="140" />
        <el-table-column label="出行人数" prop="headcount" width="90" align="center" />
        <el-table-column label="身份证号" min-width="180">
          <template #default="{ row }: { row: GroupBuildingSignup }">
            <template v-if="row.idCard">
              <span>{{ maskIdCard(row.idCard) }}</span>
              <el-tooltip :content="row.idCard" placement="top">
                <el-icon class="info-icon">
                  <View />
                </el-icon>
              </el-tooltip>
            </template>
            <span v-else class="text-placeholder">—</span>
          </template>
        </el-table-column>
        <el-table-column label="通勤方式" width="100" align="center">
          <template #default="{ row }: { row: GroupBuildingSignup }">
            <el-tag :type="commuteTypeMap[row.commuteType]?.tagType || ''" size="small">
              {{ commuteTypeMap[row.commuteType]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="购票方式" width="100" align="center">
          <template #default="{ row }: { row: GroupBuildingSignup }">
            <el-tag :type="ticketTypeMap[row.ticketType]?.tagType || ''" size="small">
              {{ ticketTypeMap[row.ticketType]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="去程" prop="outboundTime" min-width="170" />
        <el-table-column
          label="去程班次&座次"
          prop="outboundSeat"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column label="返程" prop="returnTime" min-width="100" />
        <el-table-column
          label="返程班次&座次"
          prop="returnSeat"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column label="性别" width="70" align="center">
          <template #default="{ row }: { row: GroupBuildingSignup }">
            <el-tag :type="genderMap[row.gender]?.tagType || ''" size="small" effect="plain">
              {{ genderMap[row.gender]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="房型" width="80" align="center">
          <template #default="{ row }: { row: GroupBuildingSignup }">
            <el-tag :type="roomTypeMap[row.roomType]?.tagType || ''" size="small">
              {{ roomTypeMap[row.roomType]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="酒店" prop="hotel" min-width="120" />
        <el-table-column label="交通费" prop="ticketFee" width="90" align="right">
          <template #default="{ row }: { row: GroupBuildingSignup }">
            ¥{{ (row.ticketFee || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="住宿费" prop="accommodationFee" width="90" align="right">
          <template #default="{ row }: { row: GroupBuildingSignup }">
            ¥{{ (row.accommodationFee || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="餐费" prop="mealFee" width="80" align="right">
          <template #default="{ row }: { row: GroupBuildingSignup }">
            ¥{{ (row.mealFee || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="其他费" prop="otherFee" width="80" align="right">
          <template #default="{ row }: { row: GroupBuildingSignup }">
            ¥{{ (row.otherFee || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="个人小计" width="100" align="right">
          <template #default="{ row }: { row: GroupBuildingSignup }">
            <span class="fee-total">¥{{ calcPersonTotal(row).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="备注" prop="remark" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }: { row: GroupBuildingSignup }">
            <el-button type="primary" link @click="handleView(row)">查看</el-button>
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
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
      :title="currentRow ? currentRow.reporterName : '详情'"
      size="560px"
      destroy-on-close
    >
      <template v-if="currentRow">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="填报人">
            {{ currentRow.reporterName }}
          </el-descriptions-item>
          <el-descriptions-item label="手机号">
            {{ currentRow.phone }}
          </el-descriptions-item>
          <el-descriptions-item label="归属">
            {{ currentRow.department }}
          </el-descriptions-item>
          <el-descriptions-item label="出行人数">
            {{ currentRow.headcount }}
          </el-descriptions-item>
          <el-descriptions-item label="身份证号" :span="2">
            {{ currentRow.idCard || "—" }}
          </el-descriptions-item>
          <el-descriptions-item label="通勤方式">
            {{ commuteTypeMap[currentRow.commuteType]?.label }}
          </el-descriptions-item>
          <el-descriptions-item label="购票方式">
            {{ ticketTypeMap[currentRow.ticketType]?.label }}
          </el-descriptions-item>
          <el-descriptions-item label="性别">
            {{ genderMap[currentRow.gender]?.label }}
          </el-descriptions-item>
          <el-descriptions-item label="房型">
            {{ roomTypeMap[currentRow.roomType]?.label }}
          </el-descriptions-item>
          <el-descriptions-item label="酒店" :span="2">
            {{ currentRow.hotel }}
          </el-descriptions-item>
          <el-descriptions-item label="交通费用">
            ¥{{ (currentRow.ticketFee || 0).toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="住宿费用">
            ¥{{ (currentRow.accommodationFee || 0).toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="餐费">
            ¥{{ (currentRow.mealFee || 0).toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="其他费用">
            ¥{{ (currentRow.otherFee || 0).toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="个人费用小计" :span="2">
            <span class="fee-total">¥{{ calcPersonTotal(currentRow).toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="去程" :span="2">
            {{ currentRow.outboundTime }}
          </el-descriptions-item>
          <el-descriptions-item label="去程班次&座次" :span="2">
            {{ currentRow.outboundSeat }}
          </el-descriptions-item>
          <el-descriptions-item label="返程" :span="2">
            {{ currentRow.returnTime }}
          </el-descriptions-item>
          <el-descriptions-item label="返程班次&座次" :span="2">
            {{ currentRow.returnSeat }}
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">
            {{ currentRow.remark || "—" }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ currentRow.createdAt }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ currentRow.updatedAt }}
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>

    <!-- 编辑 / 新增弹窗 -->
    <el-dialog
      v-model="editVisible"
      :title="isEdit ? '编辑团建报名' : '新增团建报名'"
      width="780px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form
        ref="formRef"
        :model="editData"
        :rules="rules"
        label-width="110px"
        label-position="right"
      >
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="填报人姓名" prop="reporterName">
              <el-input v-model="editData.reporterName" placeholder="如：张三" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="editData.phone" placeholder="如：13800138000" maxlength="11" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="归属" prop="department">
              <el-input v-model="editData.department" placeholder="如：运营系统前端组" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="出行人数" prop="headcount">
              <el-input-number v-model="editData.headcount" :min="1" :max="99" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="身份证号">
              <el-input
                v-model="editData.idCard"
                placeholder="18 位身份证号（可不填）"
                maxlength="18"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="通勤方式" prop="commuteType">
              <el-select v-model="editData.commuteType" style="width: 100%">
                <el-option
                  v-for="o in commuteTypeOptions"
                  :key="o.key"
                  :label="o.label"
                  :value="o.key"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="购票方式" prop="ticketType">
              <el-select v-model="editData.ticketType" style="width: 100%">
                <el-option
                  v-for="o in ticketTypeOptions"
                  :key="o.key"
                  :label="o.label"
                  :value="o.key"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="性别" prop="gender">
              <el-select v-model="editData.gender" style="width: 100%">
                <el-option
                  v-for="o in genderOptions"
                  :key="o.key"
                  :label="o.label"
                  :value="o.key"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="房型" prop="roomType">
              <el-select v-model="editData.roomType" style="width: 100%">
                <el-option
                  v-for="o in roomTypeOptions"
                  :key="o.key"
                  :label="o.label"
                  :value="o.key"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="酒店" prop="hotel">
              <el-input v-model="editData.hotel" placeholder="如：雀舍渔家" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="去程时间" prop="outboundTime">
              <el-input v-model="editData.outboundTime" placeholder="11:30 - 13:20 左右到" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="返程时间" prop="returnTime">
              <el-input v-model="editData.returnTime" placeholder="15:50" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="去程班次&座次" prop="outboundSeat">
              <el-input v-model="editData.outboundSeat" placeholder="班次：19300 上舱 10号" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="返程班次&座次" prop="returnSeat">
              <el-input v-model="editData.returnSeat" placeholder="班次：48491 普舱3 459号" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-divider content-position="left">费用信息</el-divider>
          </el-col>
          <el-col :span="6">
            <el-form-item label="交通费用">
              <el-input-number
                v-model="editData.ticketFee"
                :min="0"
                :precision="2"
                :controls="false"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="住宿费用">
              <el-input-number
                v-model="editData.accommodationFee"
                :min="0"
                :precision="2"
                :controls="false"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="餐费">
              <el-input-number
                v-model="editData.mealFee"
                :min="0"
                :precision="2"
                :controls="false"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="其他费用">
              <el-input-number
                v-model="editData.otherFee"
                :min="0"
                :precision="2"
                :controls="false"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24" class="fee-summary">
            <span>个人费用小计：</span>
            <span class="fee-total">¥{{ editPersonTotal.toFixed(2) }}</span>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input
                v-model="editData.remark"
                type="textarea"
                :rows="2"
                placeholder="可填写：儿童跟着、特殊餐食等"
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

    <!-- 导入弹窗 -->
    <el-dialog v-model="importVisible" title="导入团建报名（Excel）" width="620px" destroy-on-close>
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
            仅支持 .xlsx / .xls；按「手机号」去重更新；任一错误将整批拒绝
          </div>
        </template>
      </el-upload>

      <el-alert
        title="填报人、手机号为必填；通勤/购票/性别/房型 支持中文或英文 key；通勤方式空时默认其他"
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
import { Search, View } from "@element-plus/icons-vue";
import AffairsAPI, {
  type GroupBuildingSignup,
  type CommuteType,
  type TicketType,
  type Gender,
  type RoomType,
} from "@/api/affairs";
import {
  commuteTypeMap,
  commuteTypeOptions,
  ticketTypeMap,
  ticketTypeOptions,
  genderMap,
  genderOptions,
  roomTypeMap,
  roomTypeOptions,
  maskIdCard,
  nowStr,
} from "./constants";
import {
  GROUP_BUILDING_EXCEL_MIME,
  buildGroupBuildingExportBuffer,
  buildGroupBuildingTemplateBuffer,
  downloadArrayBufferFile,
  mergeGroupBuildingSignups,
  parseGroupBuildingExcelFile,
} from "./composables/groupBuildingExcel";

defineOptions({ name: "GroupBuilding" });

/* ---------------- 数据加载 ---------------- */
const list = ref<GroupBuildingSignup[]>([]);
const loading = ref(false);
const dirty = ref(false);
const saving = ref(false);

const loadList = async () => {
  loading.value = true;
  try {
    list.value = (await AffairsAPI.getGroupBuildings()) || [];
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
    await AffairsAPI.saveGroupBuildings(JSON.parse(JSON.stringify(list.value)));
    dirty.value = false;
    ElMessage.success("已保存到 mock/data/group-building.json");
  } finally {
    saving.value = false;
  }
};

/* ---------------- 筛选 ---------------- */
const searchKeyword = ref("");
const departmentFilter = ref("");
const commuteFilter = ref<CommuteType | "">("");
const ticketFilter = ref<TicketType | "">("");
const genderFilter = ref<Gender | "">("");
const roomFilter = ref<RoomType | "">("");
const hotelFilter = ref("");
const currentPage = ref(1);
const pageSize = ref(10);

const departmentOptions = computed(() =>
  Array.from(new Set(list.value.map((r) => r.department).filter(Boolean)))
);
const hotelOptions = computed(() =>
  Array.from(new Set(list.value.map((r) => r.hotel).filter(Boolean)))
);

const filteredList = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase();
  return list.value.filter((r) => {
    if (departmentFilter.value && r.department !== departmentFilter.value) return false;
    if (commuteFilter.value && r.commuteType !== commuteFilter.value) return false;
    if (ticketFilter.value && r.ticketType !== ticketFilter.value) return false;
    if (genderFilter.value && r.gender !== genderFilter.value) return false;
    if (roomFilter.value && r.roomType !== roomFilter.value) return false;
    if (hotelFilter.value && r.hotel !== hotelFilter.value) return false;
    if (kw) {
      const hay = `${r.reporterName} ${r.phone} ${r.department} ${r.hotel}`.toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    return true;
  });
});

const totalHeadcount = computed(() =>
  filteredList.value.reduce((sum, r) => sum + (Number(r.headcount) || 0), 0)
);

/** 计算单人费用小计 */
const calcPersonTotal = (row: GroupBuildingSignup) =>
  (row.ticketFee || 0) + (row.accommodationFee || 0) + (row.mealFee || 0) + (row.otherFee || 0);

/** 筛选后所有人费用总计 */
const totalFee = computed(() => filteredList.value.reduce((sum, r) => sum + calcPersonTotal(r), 0));

/** 编辑弹窗中的个人小计 */
const editPersonTotal = computed(
  () =>
    (editData.value.ticketFee || 0) +
    (editData.value.accommodationFee || 0) +
    (editData.value.mealFee || 0) +
    (editData.value.otherFee || 0)
);

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredList.value.slice(start, start + pageSize.value);
});

watch(
  [
    searchKeyword,
    departmentFilter,
    commuteFilter,
    ticketFilter,
    genderFilter,
    roomFilter,
    hotelFilter,
  ],
  () => {
    currentPage.value = 1;
  }
);

watch(filteredList, (l) => {
  const maxPage = Math.max(1, Math.ceil(l.length / pageSize.value));
  if (currentPage.value > maxPage) currentPage.value = maxPage;
});

const handleResetFilter = () => {
  searchKeyword.value = "";
  departmentFilter.value = "";
  commuteFilter.value = "";
  ticketFilter.value = "";
  genderFilter.value = "";
  roomFilter.value = "";
  hotelFilter.value = "";
};

/* ---------------- 选择 / 批量 ---------------- */
const tableRef = ref();
const selectedRows = ref<GroupBuildingSignup[]>([]);

const handleSelectionChange = (rows: GroupBuildingSignup[]) => {
  selectedRows.value = rows;
};

const clearSelection = () => {
  tableRef.value?.clearSelection();
};

const handleBatchDelete = async () => {
  await ElMessageBox.confirm(`确认删除所选 ${selectedRows.value.length} 项？`, "提示", {
    type: "warning",
  });
  const ids = new Set(selectedRows.value.map((r) => r.id));
  list.value = list.value.filter((r) => !ids.has(r.id));
  dirty.value = true;
  clearSelection();
  ElMessage.success("已批量删除（点击「保存到 Mock 文件」生效）");
};

/* ---------------- 详情 ---------------- */
const drawerVisible = ref(false);
const currentRow = ref<GroupBuildingSignup | null>(null);

const handleView = (row: GroupBuildingSignup) => {
  currentRow.value = JSON.parse(JSON.stringify(row));
  drawerVisible.value = true;
};

/* ---------------- 新增 / 编辑 ---------------- */
const editVisible = ref(false);
const editLoading = ref(false);
const isEdit = ref(false);
const formRef = ref<FormInstance>();

const defaultData = (): GroupBuildingSignup => ({
  id: 0,
  reporterName: "",
  phone: "",
  department: "",
  headcount: 1,
  idCard: "",
  commuteType: "self_drive",
  ticketType: "unified",
  outboundTime: "",
  outboundSeat: "",
  returnTime: "",
  returnSeat: "",
  gender: "male",
  roomType: "standard",
  hotel: "",
  ticketFee: 0,
  accommodationFee: 0,
  mealFee: 0,
  otherFee: 0,
  remark: "",
  createdAt: "",
  updatedAt: "",
});

const editData = ref<GroupBuildingSignup>(defaultData());

/** 手机号 11 位校验 */
const isValidPhone = (v: string) => /^1[3-9]\d{9}$/.test(v);

const rules: FormRules = {
  reporterName: [{ required: true, message: "请输入填报人姓名", trigger: "blur" }],
  phone: [
    { required: true, message: "请输入手机号", trigger: "blur" },
    {
      validator: (_r, v, cb) => {
        if (!v || isValidPhone(String(v))) cb();
        else cb(new Error("手机号格式不正确（需 11 位）"));
      },
      trigger: "blur",
    },
  ],
  department: [{ required: true, message: "请输入归属", trigger: "blur" }],
  headcount: [{ required: true, message: "请填写出行人数", trigger: "change" }],
  commuteType: [{ required: true, message: "请选择通勤方式", trigger: "change" }],
  ticketType: [{ required: true, message: "请选择购票方式", trigger: "change" }],
  gender: [{ required: true, message: "请选择性别", trigger: "change" }],
  roomType: [{ required: true, message: "请选择房型", trigger: "change" }],
  hotel: [{ required: true, message: "请填写酒店", trigger: "blur" }],
};

const nextId = () => (list.value.reduce((m, r) => Math.max(m, r.id), 0) || 0) + 1;

const resetForm = () => {
  formRef.value?.resetFields();
  editData.value = defaultData();
};

const handleAdd = () => {
  isEdit.value = false;
  editData.value = defaultData();
  editVisible.value = true;
};

const handleEdit = (row: GroupBuildingSignup) => {
  isEdit.value = true;
  editData.value = JSON.parse(JSON.stringify(row));
  editVisible.value = true;
};

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  editLoading.value = true;
  try {
    const payload = JSON.parse(JSON.stringify(editData.value)) as GroupBuildingSignup;
    if (!isEdit.value) {
      payload.id = nextId();
      payload.createdAt = nowStr();
      payload.updatedAt = nowStr();
      list.value.unshift(payload);
      ElMessage.success("新增成功（点击「保存到 Mock 文件」生效）");
    } else {
      payload.updatedAt = nowStr();
      const idx = list.value.findIndex((r) => r.id === payload.id);
      if (idx > -1) list.value[idx] = payload;
      ElMessage.success("修改成功（点击「保存到 Mock 文件」生效）");
    }
    dirty.value = true;
    editVisible.value = false;
  } finally {
    editLoading.value = false;
  }
};

const handleDelete = async (row: GroupBuildingSignup) => {
  await ElMessageBox.confirm(`确认删除「${row.reporterName}」的报名记录？`, "提示", {
    type: "warning",
  });
  list.value = list.value.filter((r) => r.id !== row.id);
  dirty.value = true;
  ElMessage.success("已删除（点击「保存到 Mock 文件」生效）");
};

/* ---------------- 导入 / 导出 ---------------- */
const handleDownloadTemplate = async () => {
  const buffer = await buildGroupBuildingTemplateBuffer();
  downloadArrayBufferFile(buffer, "group-building-template.xlsx", GROUP_BUILDING_EXCEL_MIME);
  ElMessage.success("已下载导入模板");
};

const handleExportExcel = async () => {
  const buffer = await buildGroupBuildingExportBuffer(list.value);
  downloadArrayBufferFile(buffer, `group-building-${Date.now()}.xlsx`, GROUP_BUILDING_EXCEL_MIME);
  ElMessage.success("已导出 Excel 文件");
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
    const { rows, errors } = await parseGroupBuildingExcelFile(file);
    if (errors.length > 0) {
      importErrorList.value = errors;
      importErrorVisible.value = true;
      ElMessage.error("导入失败，存在错误数据");
      return;
    }

    const { merged, createdCount, updatedCount } = mergeGroupBuildingSignups(
      list.value,
      rows,
      nowStr()
    );
    list.value = merged;
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
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.dirty-tag {
  margin-left: 8px;
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

.info-icon {
  margin-left: 4px;
  font-size: 14px;
  vertical-align: -2px;
  color: var(--el-text-color-secondary);
  cursor: help;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.fee-total {
  font-weight: 600;
  color: var(--el-color-danger);
}

.fee-summary {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 0;
  font-size: 14px;
}
</style>
