/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */
<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>
            假日出游计划
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
            <el-dropdown
              @command="(c: string) => (c === 'download' ? handleDownloadMock() : handleCopyMock())"
            >
              <el-button>
                导出
                <el-icon class="el-icon--right">
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

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索节日 / 目的地 / 备注"
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
        <el-select v-model="yearFilter" placeholder="年份" clearable style="width: 130px">
          <el-option v-for="y in availableYears" :key="y" :label="`${y} 年`" :value="y" />
        </el-select>
        <el-button @click="handleResetFilter">重置</el-button>
        <span class="filter-count">共 {{ filteredList.length }} 个计划</span>
      </div>

      <div v-loading="loading">
        <el-empty v-if="!filteredList.length && !loading" description="暂无匹配的计划" />

        <el-collapse v-else v-model="expandedYears" class="year-groups">
          <el-collapse-item
            v-for="g in groupedByYear"
            :key="g.year ?? 'unscheduled'"
            :name="g.year ?? 'unscheduled'"
          >
            <template #title>
              <div class="year-group-header">
                <span class="year-group-title">{{ g.label }}</span>
                <el-tag size="small" type="info" effect="plain">{{ g.count }} 个计划</el-tag>
                <el-tag v-if="g.doneCount" size="small" type="success" effect="plain">
                  已完成 {{ g.doneCount }}
                </el-tag>
                <span class="year-group-stat">
                  花费 ￥{{ g.totalActual.toLocaleString() }}
                  <span class="text-placeholder">/</span>
                  预算 ￥{{ g.totalBudget.toLocaleString() }}
                </span>
              </div>
            </template>

            <el-row :gutter="16">
              <el-col v-for="plan in g.plans" :key="plan.id" :xs="24" :sm="12" :lg="8">
                <el-card
                  class="plan-card"
                  :class="{ 'is-highlight': plan.id === highlightId }"
                  shadow="hover"
                >
                  <template #header>
                    <div class="plan-header">
                      <div class="plan-header-left">
                        <el-tag type="danger" effect="dark">
                          <span class="plan-emoji">
                            {{ getFestivalEmoji(plan.festival, customFestivals) }}
                          </span>
                          {{ plan.festival }}
                        </el-tag>
                        <el-tag
                          :type="statusMap[plan.status ?? 'planning'].type"
                          size="small"
                          effect="plain"
                        >
                          {{ statusMap[plan.status ?? "planning"].label }}
                        </el-tag>
                      </div>
                      <el-tag :type="getCountdownTag(plan).type" size="small" effect="light">
                        {{ getCountdownTag(plan).text }}
                      </el-tag>
                    </div>
                    <div class="plan-days">
                      {{ plan.startDate }} ~ {{ plan.endDate }} （{{
                        calcDays(plan.startDate, plan.endDate)
                      }}
                      天）
                    </div>
                  </template>
                  <div class="plan-body">
                    <p>
                      <el-icon>
                        <Location />
                      </el-icon>
                      <span class="label">目的地：</span>
                      <span class="dest-tags">
                        <el-tag
                          v-for="(d, i) in splitDestination(plan.destination)"
                          :key="`${d}-${i}`"
                          size="small"
                          type="success"
                          effect="plain"
                          class="mr-1"
                        >
                          {{ d }}
                        </el-tag>
                        <span v-if="!plan.destination" class="text-placeholder">—</span>
                      </span>
                    </p>
                    <p>
                      <el-icon>
                        <User />
                      </el-icon>
                      <span class="label">出行人数：</span>
                      {{ plan.members }} 人
                    </p>
                    <p>
                      <el-icon>
                        <Van />
                      </el-icon>
                      <span class="label">交通：</span>
                      {{ plan.transport || "—" }}
                    </p>
                    <p class="budget-row">
                      <el-icon>
                        <Wallet />
                      </el-icon>
                      <span class="label">预算：</span>
                      <span>
                        ￥{{ plan.budget.toLocaleString() }} /
                        <b>￥{{ getActualCost(plan).toLocaleString() }}</b>
                      </span>
                    </p>
                    <el-progress
                      v-if="plan.budget"
                      :percentage="getCostPercent(plan)"
                      :status="
                        getCostPercent(plan) > 100
                          ? 'exception'
                          : getCostPercent(plan) >= 90
                            ? 'warning'
                            : 'success'
                      "
                      :stroke-width="6"
                      :show-text="false"
                      class="budget-progress"
                    />
                  </div>
                  <template #footer>
                    <el-button type="primary" link @click="handleView(plan)">查看详情</el-button>
                    <el-button type="success" link @click="handleEdit(plan)">编辑</el-button>
                    <el-button type="danger" link @click="handleDelete(plan)">删除</el-button>
                    <el-button type="warning" link @click="handleShare(plan)">分享</el-button>
                  </template>
                </el-card>
              </el-col>
            </el-row>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-card>

    <!-- 查看详情 -->
    <!-- 分享计划弹窗 -->
    <el-dialog v-model="shareDialogVisible" title="分享计划" width="820px" destroy-on-close>
      <el-collapse v-if="sharePlan" accordion>
        <el-collapse-item title="基础信息" name="basic">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="节日">
              <el-tag type="danger">
                <span class="plan-emoji">
                  {{ getFestivalEmoji(sharePlan.festival, customFestivals) }}
                </span>
                {{ sharePlan.festival }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="statusMap[sharePlan.status ?? 'planning'].type">
                {{ statusMap[sharePlan.status ?? "planning"].label }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="目的地" :span="2">
              <template v-if="sharePlan.destination">
                <el-tag
                  v-for="(d, i) in splitDestination(sharePlan.destination)"
                  :key="`${d}-${i}`"
                  size="small"
                  type="success"
                  effect="plain"
                  class="mr-1"
                >
                  {{ d }}
                </el-tag>
              </template>
              <span v-else class="text-placeholder">—</span>
            </el-descriptions-item>
            <el-descriptions-item label="开始日期">{{ sharePlan.startDate }}</el-descriptions-item>
            <el-descriptions-item label="结束日期">{{ sharePlan.endDate }}</el-descriptions-item>
            <el-descriptions-item label="天数">
              {{ calcDays(sharePlan.startDate, sharePlan.endDate) }} 天
            </el-descriptions-item>
            <el-descriptions-item label="交通方式">
              {{ sharePlan.transport || "—" }}
            </el-descriptions-item>
            <el-descriptions-item label="出行人数">{{ sharePlan.members }} 人</el-descriptions-item>
            <el-descriptions-item label="预算 / 实际">
              ￥{{ sharePlan.budget.toLocaleString() }} / ￥{{ getActualCost(sharePlan) }}
            </el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">
              <WangEditor
                v-if="hasShareText"
                v-model="sharePlan.remark"
                :read-only="true"
                :has-bar="false"
                height="400px"
              />
              <span v-else class="text-placeholder">暂无</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-collapse-item>
        <el-collapse-item title="费用明细" name="cost">
          <ECharts :options="shareCostChartOptions" height="240px" style="margin-bottom: 12px" />
          <div class="share-cost-summary" style="margin-bottom: 12px">
            <span>预估总额（预算）：￥{{ sharePlan.budget?.toLocaleString?.() ?? 0 }}</span>
            <span style="margin-left: 24px">
              实际总额：￥
              <b>{{ getActualCost(sharePlan) }}</b>
            </span>
          </div>
          <el-table :data="sharePlan.costItems ?? []" size="small" border empty-text="暂无费用明细">
            <el-table-column label="类目" width="100">
              <template #default="{ row }">
                <el-tag
                  size="small"
                  :style="{
                    color: getCostColor(row.category),
                    borderColor: getCostColor(row.category),
                  }"
                  effect="plain"
                >
                  {{ row.category }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="名称" prop="name" />
            <el-table-column label="金额" width="140" align="right">
              <template #default="{ row }">￥{{ row.amount.toLocaleString() }}</template>
            </el-table-column>
          </el-table>
        </el-collapse-item>
        <el-collapse-item title="出行准备" name="prep">
          <el-table
            :data="sharePlan.preparation ?? []"
            size="small"
            border
            empty-text="暂无准备清单"
          >
            <el-table-column label="完成" width="60" align="center">
              <template #default="{ row }">
                <el-checkbox v-model="row.done" disabled />
              </template>
            </el-table-column>
            <el-table-column label="类目" width="90">
              <template #default="{ row }">
                <el-tag size="small" type="info" effect="plain">{{ row.category }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="物品" prop="name">
              <template #default="{ row }">
                <span v-if="isRequiredPrep(row.name)" class="required-mark">*</span>
                {{ row.name }}
              </template>
            </el-table-column>
          </el-table>
        </el-collapse-item>
      </el-collapse>
      <template #footer>
        <el-button @click="shareDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="viewVisible" title="计划详情" width="820px" destroy-on-close>
      <template v-if="currentPlan">
        <el-tabs v-model="detailTab">
          <!-- 基础信息 -->
          <el-tab-pane label="基础信息" name="basic">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="节日">
                <el-tag type="danger">
                  <span class="plan-emoji">
                    {{ getFestivalEmoji(currentPlan.festival, customFestivals) }}
                  </span>
                  {{ currentPlan.festival }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="statusMap[currentPlan.status ?? 'planning'].type">
                  {{ statusMap[currentPlan.status ?? "planning"].label }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="目的地" :span="2">
                <template v-if="currentPlan.destination">
                  <el-tag
                    v-for="(d, i) in splitDestination(currentPlan.destination)"
                    :key="`${d}-${i}`"
                    size="small"
                    type="success"
                    effect="plain"
                    class="mr-1"
                  >
                    {{ d }}
                  </el-tag>
                </template>
                <span v-else class="text-placeholder">—</span>
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
              <el-descriptions-item label="预算 / 实际">
                ￥{{ currentPlan.budget.toLocaleString() }} / ￥{{
                  currentTotalCost.toLocaleString()
                }}
              </el-descriptions-item>
              <el-descriptions-item label="备注" :span="2">
                <WangEditor
                  v-if="hasRemarkText"
                  v-model="currentPlan.remark"
                  :read-only="true"
                  :has-bar="false"
                  height="400px"
                />
                <span v-else class="text-placeholder">暂无</span>
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <!-- 费用明细 -->
          <el-tab-pane name="cost">
            <template #label>
              <span>
                费用明细
                <el-badge
                  v-if="(currentPlan.costItems?.length ?? 0) > 0"
                  :value="currentPlan.costItems!.length"
                  type="primary"
                  class="tab-badge"
                />
              </span>
            </template>

            <div class="cost-summary">
              <div class="cost-stat">
                <div class="cost-stat-label">总预算</div>
                <div class="cost-stat-value" style="font-weight: 500">
                  ￥{{ currentPlan.budget.toLocaleString() }}
                </div>
              </div>
              <div class="cost-stat">
                <div class="cost-stat-label">已花费</div>
                <div class="cost-stat-value">￥{{ currentTotalCost.toLocaleString() }}</div>
              </div>
              <div class="cost-stat">
                <div class="cost-stat-label">人均（{{ currentPlan.members }} 人）</div>
                <div class="cost-stat-value">￥{{ currentPerCapita.toLocaleString() }}</div>
              </div>
              <div class="cost-stat">
                <div class="cost-stat-label">预算使用率</div>
                <el-progress
                  :percentage="getCostPercent(currentPlan)"
                  :status="
                    getCostPercent(currentPlan) > 100
                      ? 'exception'
                      : getCostPercent(currentPlan) >= 90
                        ? 'warning'
                        : 'success'
                  "
                  :stroke-width="10"
                />
              </div>
            </div>

            <template v-if="currentCostByCategory.length">
              <ECharts :options="currentCostChartOptions" height="280px" />

              <div class="cost-detail-list">
                <div v-for="g in currentCostGroups" :key="g.category" class="cost-group">
                  <div class="cost-group-header">
                    <el-tag
                      size="small"
                      :style="{ color: g.color, borderColor: g.color }"
                      effect="plain"
                    >
                      {{ g.category }}
                    </el-tag>
                    <span class="cost-group-subtotal">
                      小计 ￥{{ g.subtotal.toLocaleString() }}
                    </span>
                  </div>
                  <el-table :data="g.items" size="small" border>
                    <el-table-column label="名称" prop="name" />
                    <el-table-column label="金额" prop="amount" width="140" align="right">
                      <template #default="{ row }">￥{{ row.amount.toLocaleString() }}</template>
                    </el-table-column>
                  </el-table>
                </div>
              </div>
            </template>
            <el-empty v-else description="暂无费用明细，可在「编辑」中添加" :image-size="80" />
          </el-tab-pane>

          <!-- 出行准备 -->
          <el-tab-pane name="prep">
            <template #label>
              <span>
                出行准备
                <el-badge
                  v-if="currentPrepTotalCount > 0"
                  :value="`${currentPrepDoneCount}/${currentPrepTotalCount}`"
                  type="primary"
                  class="tab-badge"
                />
              </span>
            </template>

            <div class="prep-summary">
              <span class="prep-summary-text">
                完成度 {{ currentPrepDoneCount }} / {{ currentPrepTotalCount }}
              </span>
              <el-progress
                :percentage="
                  currentPrepTotalCount
                    ? Math.round((currentPrepDoneCount / currentPrepTotalCount) * 100)
                    : 0
                "
                :stroke-width="10"
                style="flex: 1"
              />
              <el-button size="small" @click="copyPendingPrep">复制未完成清单</el-button>
            </div>

            <template v-if="currentPrepGroups.length">
              <el-collapse v-model="detailPrepCollapse">
                <el-collapse-item
                  v-for="g in currentPrepGroups"
                  :key="g.category"
                  :name="g.category"
                >
                  <template #title>
                    <span class="prep-cat-title">
                      {{ g.category }}
                      <span class="prep-cat-count">
                        {{ g.items.filter((p) => p.done).length }} / {{ g.items.length }}
                      </span>
                    </span>
                  </template>
                  <div class="prep-list">
                    <el-checkbox
                      v-for="item in g.items"
                      :key="item.id"
                      :model-value="item.done"
                      :class="{ 'is-required': isRequiredPrep(item.name) }"
                      @change="togglePrepInDetail(item)"
                    >
                      <span v-if="isRequiredPrep(item.name)" class="required-mark">*</span>
                      {{ item.name }}
                    </el-checkbox>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </template>
            <el-empty v-else description="暂无准备清单，可在「编辑」中添加" :image-size="80" />
          </el-tab-pane>
        </el-tabs>
      </template>

      <template #footer>
        <el-button @click="viewVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 新增 / 编辑 -->
    <el-dialog
      v-model="editVisible"
      :title="isEdit ? '编辑计划' : '新增计划'"
      width="820px"
      destroy-on-close
    >
      <el-tabs v-model="editTab" class="edit-tabs">
        <!-- 基础信息 -->
        <el-tab-pane label="基础信息" name="basic">
          <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="100px">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="节日" prop="festival">
                  <div class="festival-field">
                    <el-select
                      v-model="editForm.festival"
                      placeholder="选择或输入"
                      allow-create
                      filterable
                      default-first-option
                      style="flex: 1"
                    >
                      <el-option-group label="内置节日">
                        <el-option
                          v-for="item in FESTIVAL_PRESETS"
                          :key="item.label"
                          :label="`${item.emoji} ${item.label}`"
                          :value="item.label"
                        />
                      </el-option-group>
                      <el-option-group v-if="customFestivals.length" label="我的自定义">
                        <el-option
                          v-for="item in customFestivals"
                          :key="item.label"
                          :label="`${item.emoji} ${item.label}`"
                          :value="item.label"
                        />
                      </el-option-group>
                    </el-select>
                    <el-button @click="festivalManagerVisible = true">
                      <el-icon>
                        <Plus />
                      </el-icon>
                      <span>自定义</span>
                    </el-button>
                  </div>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="状态" prop="status">
                  <el-select v-model="editForm.status" style="width: 100%">
                    <el-option v-for="(s, k) in statusMap" :key="k" :label="s.label" :value="k" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="24">
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
              <el-col :span="24">
                <el-form-item label="出行日期" required>
                  <el-date-picker
                    v-model="dateRange"
                    type="daterange"
                    value-format="YYYY-MM-DD"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="出行人数" prop="members">
                  <el-input-number
                    v-model="editForm.members"
                    :min="1"
                    :max="999"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="预算(￥)" prop="budget">
                  <el-input-number
                    v-model="editForm.budget"
                    :min="0"
                    :step="100"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="交通方式" prop="transport">
                  <el-select
                    v-model="editForm.transport"
                    placeholder="请选择"
                    allow-create
                    filterable
                    style="width: 100%"
                  >
                    <el-option
                      v-for="item in transportOptions"
                      :key="item"
                      :label="item"
                      :value="item"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="备注">
                  <WangEditor v-model="editForm.remark" height="400px" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-tab-pane>

        <!-- 费用明细 -->
        <el-tab-pane name="cost">
          <template #label>
            <span>
              费用明细
              <el-badge
                v-if="(editForm.costItems?.length ?? 0) > 0"
                :value="editForm.costItems!.length"
                type="primary"
                class="tab-badge"
              />
            </span>
          </template>

          <div class="edit-cost-summary">
            <span>已录入 ￥{{ editTotalCost.toLocaleString() }}</span>
            <span class="text-placeholder">/</span>
            <span>预算 ￥{{ editForm.budget.toLocaleString() }}</span>
            <span class="text-placeholder">·</span>
            <span>人均 ￥{{ editPerCapita.toLocaleString() }}（{{ editForm.members }} 人）</span>
          </div>

          <div class="cost-input-row">
            <el-select v-model="costInput.category" style="width: 120px">
              <el-option
                v-for="c in COST_CATEGORIES"
                :key="c.label"
                :label="c.label"
                :value="c.label"
              />
            </el-select>
            <el-input
              v-model="costInput.name"
              placeholder="费用名称，如「大理→丽江高铁」"
              @keyup.enter="addCostItem"
            />
            <el-input-number
              v-model="costInput.amount"
              :min="0"
              :step="50"
              controls-position="right"
              placeholder="金额"
              style="width: 160px"
            />
            <el-button type="primary" @click="addCostItem">添加</el-button>
          </div>

          <el-table
            :data="editForm.costItems ?? []"
            size="small"
            border
            class="mt-2"
            empty-text="暂无费用，添加一项试试"
          >
            <el-table-column label="类目" width="100">
              <template #default="{ row }">
                <el-tag
                  size="small"
                  :style="{
                    color: getCostColor(row.category),
                    borderColor: getCostColor(row.category),
                  }"
                  effect="plain"
                >
                  {{ row.category }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="名称" prop="name" />
            <el-table-column label="金额" width="140" align="right">
              <template #default="{ row }">￥{{ row.amount.toLocaleString() }}</template>
            </el-table-column>
            <el-table-column label="操作" width="80" align="center">
              <template #default="{ row }">
                <el-button type="danger" link @click="removeCostItem(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 出行准备 -->
        <el-tab-pane name="prep">
          <template #label>
            <span>
              出行准备
              <el-badge
                v-if="editPrepTotalCount > 0"
                :value="`${editPrepDoneCount}/${editPrepTotalCount}`"
                type="primary"
                class="tab-badge"
              />
            </span>
          </template>

          <div class="edit-prep-summary">
            <span>
              完成度 {{ editPrepDoneCount }} / {{ editPrepTotalCount }}（{{ editPrepPercent }}%）
            </span>
            <el-dropdown @command="(c: string) => applyPrepTemplate(c)">
              <el-button size="small">
                应用模板
                <el-icon class="el-icon--right">
                  <ArrowDown />
                </el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-for="t in PREP_TEMPLATES" :key="t.label" :command="t.label">
                    {{ t.label }}（{{ t.items.length }} 项）
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <div class="prep-input-row">
            <el-select v-model="prepInput.category" style="width: 110px">
              <el-option v-for="c in PREP_CATEGORIES" :key="c" :label="c" :value="c" />
            </el-select>
            <el-input
              v-model="prepInput.name"
              placeholder="物品名称，如「充电宝」"
              @keyup.enter="addPrepItem"
            />
            <el-button type="primary" @click="addPrepItem">添加</el-button>
          </div>

          <el-table
            :data="editForm.preparation ?? []"
            size="small"
            border
            class="mt-2"
            empty-text="暂无准备清单，先添加几项 / 应用模板"
          >
            <el-table-column label="完成" width="60" align="center">
              <template #default="{ row }">
                <el-checkbox v-model="row.done" />
              </template>
            </el-table-column>
            <el-table-column label="类目" width="90">
              <template #default="{ row }">
                <el-tag size="small" type="info" effect="plain">{{ row.category }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="物品" prop="name">
              <template #default="{ row }">
                <span v-if="isRequiredPrep(row.name)" class="required-mark">*</span>
                {{ row.name }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" align="center">
              <template #default="{ row }">
                <el-button
                  v-if="!isRequiredPrep(row.name)"
                  type="danger"
                  link
                  @click="removePrepItem(row)"
                >
                  删除
                </el-button>
                <span v-else class="text-placeholder">必带</span>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 自定义节日管理 -->
    <el-dialog v-model="festivalManagerVisible" title="自定义节日" width="520px" append-to-body>
      <div class="festival-add-row">
        <el-input
          v-model="newFestival.emoji"
          placeholder="emoji"
          maxlength="4"
          style="width: 80px"
        />
        <el-input
          v-model="newFestival.label"
          placeholder="节日名称，如「妈妈生日」"
          @keyup.enter="handleAddCustomFestival"
        />
        <el-button type="primary" @click="handleAddCustomFestival">
          <el-icon>
            <Plus />
          </el-icon>
          <span>添加</span>
        </el-button>
      </div>

      <el-divider>已添加（{{ customFestivals.length }}）</el-divider>

      <div v-if="!customFestivals.length" class="festival-empty">
        <el-empty description="还没有自定义节日" :image-size="60" />
      </div>
      <div v-else class="festival-list">
        <div v-for="item in customFestivals" :key="item.label" class="festival-row">
          <span class="festival-row-emoji">{{ item.emoji }}</span>
          <span class="festival-row-label">{{ item.label }}</span>
          <el-button
            type="danger"
            link
            size="small"
            @click="handleRemoveCustomFestival(item.label)"
          >
            移除
          </el-button>
        </div>
      </div>

      <el-divider>内置节日（不可删除）</el-divider>
      <div class="festival-builtin">
        <el-tag
          v-for="item in FESTIVAL_PRESETS"
          :key="item.label"
          type="info"
          effect="plain"
          size="small"
        >
          {{ item.emoji }} {{ item.label }}
        </el-tag>
      </div>

      <template #footer>
        <el-button type="primary" @click="festivalManagerVisible = false">完成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import WangEditor from "@/components/WangEditor/index.vue";
import type { FormInstance, FormRules } from "element-plus";
import TravelAPI, {
  type HolidayPlan,
  type HolidayStatus,
  type CostItem,
  type CostCategory,
  type PrepItem,
  type PrepCategory,
} from "@/api/travel";
import { useDirtyGuard } from "./composables/useDirtyGuard";
import {
  genTripId,
  splitDestination,
  calcDays,
  daysUntil,
  FESTIVAL_PRESETS,
  getFestivalEmoji,
  COST_CATEGORIES,
  getCostColor,
  PREP_CATEGORIES,
  REQUIRED_PREP_NAMES,
  isRequiredPrep,
  buildDefaultPreparation,
  PREP_TEMPLATES,
  mergePrepTemplate,
} from "./composables/helpers";
import { useFestivalOptions } from "./composables/useFestivalOptions";

defineOptions({ name: "HolidayTrip" });

const {
  customFestivals,
  allFestivals,
  addCustom: addCustomFestival,
  removeCustom: removeCustomFestival,
  isBuiltInFestival,
} = useFestivalOptions();

/** 计划列表：从 `/api/v1/travel/holiday` 拉取，对应 mock/data/holiday-plans.json */
const planList = ref<HolidayPlan[]>([]);
const loading = ref(false);
const dirty = ref(false);

useDirtyGuard(dirty);

const loadList = async () => {
  loading.value = true;
  try {
    const list = (await TravelAPI.getHolidayList()) || [];
    // 向后兼容：给老数据补齐 costItems / preparation
    planList.value = list.map((p) => ({
      ...p,
      costItems: p.costItems ?? [],
      preparation: p.preparation ?? [],
    }));
    dirty.value = false;
  } finally {
    loading.value = false;
  }
};

onMounted(loadList);

const transportOptions = [
  "飞机",
  "高铁",
  "自驾",
  "高铁 + 自驾",
  "飞机 + 自驾",
  "船 + 自驾",
  "火车",
  "巴士",
  "其他",
];

const statusMap: Record<HolidayStatus, { label: string; type: "primary" | "success" | "info" }> = {
  planning: { label: "规划中", type: "primary" },
  confirmed: { label: "已确认", type: "success" },
  completed: { label: "已完成", type: "info" },
};

/* ---------------- 筛选 ---------------- */
const searchKeyword = ref("");
const statusFilter = ref<HolidayStatus | "">("");
const currentYear = new Date().getFullYear();
const yearFilter = ref<number | "">(currentYear);

/** 解析出行年份（取 startDate 的年份） */
const getPlanYear = (p: HolidayPlan): number | null => {
  const y = parseInt((p.startDate || "").slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
};

/** 所有可选年份（去重，倒序） */
const availableYears = computed<number[]>(() => {
  const set = new Set<number>();
  for (const p of planList.value) {
    const y = getPlanYear(p);
    if (y) set.add(y);
  }
  return [...set].sort((a, b) => b - a);
});

const filteredList = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase();
  const status = statusFilter.value;
  const year = yearFilter.value;
  const list = planList.value.filter((p) => {
    if (status && (p.status ?? "planning") !== status) return false;
    if (year !== "" && getPlanYear(p) !== year) return false;
    if (!kw) return true;
    return (
      (p.festival || "").toLowerCase().includes(kw) ||
      (p.destination || "").toLowerCase().includes(kw) ||
      (p.remark || "").toLowerCase().includes(kw)
    );
  });
  // 默认按 startDate 倒序（最新在前）
  return [...list].sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
});

/** 按年份分组（年份倒序，未填日期归入「未排期」组） */
interface YearGroup {
  year: number | null;
  label: string;
  plans: HolidayPlan[];
  count: number;
  totalBudget: number;
  totalActual: number;
  doneCount: number;
}
const groupedByYear = computed<YearGroup[]>(() => {
  const map = new Map<number | "unscheduled", HolidayPlan[]>();
  for (const p of filteredList.value) {
    const y = getPlanYear(p);
    const key = y ?? "unscheduled";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  const groups: YearGroup[] = [];
  for (const [key, plans] of map.entries()) {
    const totalBudget = plans.reduce((s, p) => s + (Number(p.budget) || 0), 0);
    const totalActual = plans.reduce((s, p) => s + getActualCost(p), 0);
    const doneCount = plans.filter((p) => (p.status ?? "planning") === "completed").length;
    groups.push({
      year: key === "unscheduled" ? null : key,
      label: key === "unscheduled" ? "未排期" : `${key} 年`,
      plans,
      count: plans.length,
      totalBudget,
      totalActual,
      doneCount,
    });
  }
  // 年份倒序，未排期放最后
  return groups.sort((a, b) => {
    if (a.year === null) return 1;
    if (b.year === null) return -1;
    return b.year - a.year;
  });
});

/** 默认全部展开的年份 key 列表 */
const expandedYears = ref<(number | "unscheduled")[]>([]);
watch(
  groupedByYear,
  (groups) => {
    // 仅在初次或新增年份时补齐展开状态
    const allKeys = groups.map((g) => g.year ?? "unscheduled");
    const known = new Set(expandedYears.value);
    for (const k of allKeys) {
      if (!known.has(k)) expandedYears.value.push(k);
    }
  },
  { immediate: true }
);

const handleResetFilter = () => {
  searchKeyword.value = "";
  statusFilter.value = "";
  yearFilter.value = "";
};

/* ---------------- 派生 / 展示辅助 ---------------- */
/** 费用汇总：优先用 costItems，没有明细则回退 actualCost */
const getActualCost = (p: HolidayPlan): number => {
  if (p.costItems && p.costItems.length) {
    return p.costItems.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  }
  return p.actualCost || 0;
};

/** 准备完成度 0~100 */
const getPrepPercent = (p: HolidayPlan): number => {
  const list = p.preparation ?? [];
  if (!list.length) return 0;
  const done = list.filter((i) => i.done).length;
  return Math.round((done / list.length) * 100);
};

/** 超支进度：0~100，用 actualCost/budget */
const getCostPercent = (p: HolidayPlan): number => {
  if (!p.budget) return 0;
  return Math.min(200, Math.round((getActualCost(p) / p.budget) * 100));
};

/** 倒计时 tag（未出行 / 进行中 / 已结束） */
const getCountdownTag = (
  p: HolidayPlan
): { text: string; type: "primary" | "success" | "info" | "warning" | "danger" } => {
  const d = daysUntil(p.startDate);
  if (Number.isNaN(d)) return { text: "未设日期", type: "info" };
  if (d > 30) return { text: `还有 ${d} 天`, type: "info" };
  if (d > 7) return { text: `还有 ${d} 天`, type: "warning" };
  if (d > 0) return { text: `还有 ${d} 天`, type: "danger" };
  if (d === 0) return { text: "今天出发", type: "danger" };
  // d < 0：查看是否还在进行中
  const endDays = daysUntil(p.endDate);
  if (endDays >= 0) return { text: "进行中", type: "success" };
  return { text: "已结束", type: "info" };
};

/* ---------------- 查看 ---------------- */
const viewVisible = ref(false);
const currentPlan = ref<HolidayPlan | null>(null);

const handleView = (plan: HolidayPlan) => {
  currentPlan.value = plan;
  viewVisible.value = true;
};

/* ---------------- 高亮 ---------------- */
const highlightId = ref<number | null>(null);
let highlightTimer: ReturnType<typeof setTimeout> | null = null;
const flashHighlight = (id: number) => {
  highlightId.value = id;
  if (highlightTimer) clearTimeout(highlightTimer);
  highlightTimer = setTimeout(() => {
    highlightId.value = null;
    highlightTimer = null;
  }, 3000);
};
onBeforeUnmount(() => {
  if (highlightTimer) clearTimeout(highlightTimer);
});

/* ---------------- 新增 / 编辑 ---------------- */
const editVisible = ref(false);
const editFormRef = ref<FormInstance>();
const editLoading = ref(false);
const isEdit = ref(false);
const editTab = ref<"basic" | "cost" | "prep">("basic");
watch(editVisible, (v) => {
  if (v) editTab.value = "basic";
});

/** 目的地标签数组（与字符串字段双向同步，· 作为持久化分隔符） */
const destinationTags = computed<string[]>({
  get: () => splitDestination(editForm.destination || ""),
  set: (tags) => {
    const cleaned: string[] = [];
    for (const t of tags) {
      const v = (t || "").trim();
      if (v && !cleaned.includes(v)) cleaned.push(v);
    }
    editForm.destination = cleaned.join("·");
  },
});

/** 目的地历史建议（去重 + 排除已选） */
const destinationSuggestions = computed<string[]>(() => {
  const set = new Set<string>();
  for (const p of planList.value) {
    for (const d of splitDestination(p.destination || "")) {
      set.add(d);
    }
  }
  for (const t of destinationTags.value) set.delete(t);
  return [...set].sort();
});

/* ---------------- 自定义节日管理 ---------------- */
const festivalManagerVisible = ref(false);
const newFestival = reactive<{ label: string; emoji: string }>({
  label: "",
  emoji: "🎉",
});

const handleAddCustomFestival = () => {
  const label = newFestival.label.trim();
  if (!label) {
    ElMessage.warning("请输入节日名称");
    return;
  }
  if (!addCustomFestival({ label, emoji: newFestival.emoji || "🎉" })) {
    ElMessage.warning("该节日已存在");
    return;
  }
  ElMessage.success(`已添加「${label}」`);
  newFestival.label = "";
  newFestival.emoji = "🎉";
};

const handleRemoveCustomFestival = (label: string) => {
  if (removeCustomFestival(label)) {
    ElMessage.success(`已移除「${label}」`);
  }
};

const defaultForm = (): HolidayPlan => ({
  id: 0,
  festival: "",
  destination: "",
  startDate: "",
  endDate: "",
  budget: 0,
  members: 2,
  transport: "自驾",
  remark: "",
  status: "planning",
  actualCost: 0,
  rating: 0,
  review: "",
  costItems: [],
  preparation: buildDefaultPreparation(),
});

const editForm = reactive<HolidayPlan>(defaultForm());
const dateRange = ref<[string, string] | null>(null);

const editRules: FormRules = {
  festival: [{ required: true, message: "请输入节日名称", trigger: "blur" }],
  destination: [{ required: true, message: "请输入目的地", trigger: "blur" }],
  budget: [{ required: true, message: "请输入预算", trigger: "blur" }],
  members: [{ required: true, message: "请输入出行人数", trigger: "blur" }],
  transport: [{ required: true, message: "请选择交通方式", trigger: "change" }],
  status: [{ required: true, message: "请选择状态", trigger: "change" }],
};

// 判断 currentPlan.remark 中是否包含文字, 去除 HTML 标签后判断是否有非空字符
const hasRemarkText = computed(() => {
  const r = currentPlan.value?.remark || "";
  const text = r.replace(/<[^>]+>/g, "").trim();
  return text.length > 0;
});
const resetForm = (plan?: HolidayPlan) => {
  Object.assign(editForm, plan ? JSON.parse(JSON.stringify(plan)) : defaultForm());
  // 补齐可选字段默认值
  if (editForm.status == null) editForm.status = "planning";
  if (editForm.actualCost == null) editForm.actualCost = 0;
  if (editForm.rating == null) editForm.rating = 0;
  if (editForm.review == null) editForm.review = "";
  if (editForm.costItems == null) editForm.costItems = [];
  if (editForm.preparation == null) editForm.preparation = [];
  dateRange.value = plan ? [plan.startDate, plan.endDate] : null;
};

const handleAdd = () => {
  isEdit.value = false;
  resetForm();
  editForm.id = genTripId(planList.value);
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

  // 汇总费用 → actualCost
  editForm.actualCost = (editForm.costItems ?? []).reduce((s, c) => s + (Number(c.amount) || 0), 0);

  editLoading.value = true;
  try {
    const payload: HolidayPlan = JSON.parse(JSON.stringify(editForm));
    const idx = planList.value.findIndex((p) => p.id === payload.id);
    if (idx > -1) {
      planList.value[idx] = payload;
      ElMessage.success("修改成功（点击「保存到 Mock 文件」生效）");
    } else {
      planList.value.unshift(payload);
      ElMessage.success("新增成功（点击「保存到 Mock 文件」生效）");
    }
    dirty.value = true;
    editVisible.value = false;
    nextTick(() => flashHighlight(payload.id));
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
  ElMessage.success("已删除（点击「保存到 Mock 文件」生效）");
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

/* ---------------- 详情对话框 tabs ---------------- */
const detailTab = ref<"basic" | "cost" | "prep">("basic");
const detailPrepCollapse = ref<string[]>([...PREP_CATEGORIES]);
watch(viewVisible, (v) => {
  if (v) {
    detailTab.value = "basic";
    detailPrepCollapse.value = [...PREP_CATEGORIES];
  }
});

/** 当前查看计划的费用按类目分组（饼图数据） */
const currentCostByCategory = computed(() => {
  const items = currentPlan.value?.costItems ?? [];
  const map = new Map<CostCategory, number>();
  for (const c of items) {
    map.set(c.category, (map.get(c.category) ?? 0) + (Number(c.amount) || 0));
  }
  return COST_CATEGORIES.map(({ label, color }) => ({
    name: label,
    value: map.get(label) ?? 0,
    itemStyle: { color },
  })).filter((d) => d.value > 0);
});

/** 当前查看计划的费用饼图配置 */
const currentCostChartOptions = computed(() => ({
  tooltip: {
    trigger: "item",
    formatter: (params: any) =>
      `${params.name}<br/>￥${(params.value as number).toLocaleString()}（${params.percent}%）`,
  },
  legend: { bottom: 0, left: "center" },
  series: [
    {
      type: "pie",
      radius: ["40%", "65%"],
      center: ["50%", "45%"],
      avoidLabelOverlap: true,
      label: { show: true, formatter: "{b}\n￥{c}" },
      data: currentCostByCategory.value,
    },
  ],
}));

const currentTotalCost = computed(() => (currentPlan.value ? getActualCost(currentPlan.value) : 0));

const currentPerCapita = computed(() => {
  if (!currentPlan.value) return 0;
  const m = Math.max(1, currentPlan.value.members || 1);
  return Math.round((currentTotalCost.value / m) * 100) / 100;
});

/** 详情：按类目分组的明细列表（用于折叠展示） */
const currentCostGroups = computed(() => {
  const items = currentPlan.value?.costItems ?? [];
  return COST_CATEGORIES.map(({ label, color }) => {
    const list = items.filter((c) => c.category === label);
    const subtotal = list.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    return { category: label, color, items: list, subtotal };
  }).filter((g) => g.items.length > 0);
});

/** 详情：按类目分组的准备项 */
const currentPrepGroups = computed(() => {
  const list = currentPlan.value?.preparation ?? [];
  return PREP_CATEGORIES.map((cat) => ({
    category: cat,
    items: list.filter((p) => p.category === cat),
  })).filter((g) => g.items.length > 0);
});

const currentPrepDoneCount = computed(
  () => (currentPlan.value?.preparation ?? []).filter((p) => p.done).length
);
const currentPrepTotalCount = computed(() => (currentPlan.value?.preparation ?? []).length);

/* ---------------- 编辑：费用明细 ---------------- */
const costInput = reactive<{ category: CostCategory; name: string; amount: number }>({
  category: "交通",
  name: "",
  amount: 0,
});

const editTotalCost = computed(() =>
  (editForm.costItems ?? []).reduce((s, c) => s + (Number(c.amount) || 0), 0)
);

const editPerCapita = computed(() => {
  const m = Math.max(1, editForm.members || 1);
  return Math.round((editTotalCost.value / m) * 100) / 100;
});

const addCostItem = () => {
  if (!costInput.name.trim()) {
    ElMessage.warning("请输入费用名称");
    return;
  }
  if (!(costInput.amount > 0)) {
    ElMessage.warning("金额需大于 0");
    return;
  }
  const list = editForm.costItems ?? (editForm.costItems = []);
  const nextId = (list.reduce((m, c) => Math.max(m, c.id), 0) || 0) + 1;
  list.push({
    id: nextId,
    category: costInput.category,
    name: costInput.name.trim(),
    amount: Number(costInput.amount) || 0,
  });
  costInput.name = "";
  costInput.amount = 0;
};

const removeCostItem = (id: number) => {
  editForm.costItems = (editForm.costItems ?? []).filter((c) => c.id !== id);
};

/* ---------------- 编辑：出行准备 ---------------- */
const prepInput = reactive<{ category: PrepCategory; name: string }>({
  category: "其他",
  name: "",
});

const editPrepDoneCount = computed(() => (editForm.preparation ?? []).filter((p) => p.done).length);
const editPrepTotalCount = computed(() => (editForm.preparation ?? []).length);
const editPrepPercent = computed(() => {
  if (!editPrepTotalCount.value) return 0;
  return Math.round((editPrepDoneCount.value / editPrepTotalCount.value) * 100);
});

const addPrepItem = () => {
  if (!prepInput.name.trim()) {
    ElMessage.warning("请输入物品名称");
    return;
  }
  const list = editForm.preparation ?? (editForm.preparation = []);
  if (list.some((p) => p.name === prepInput.name.trim())) {
    ElMessage.warning("该物品已存在");
    return;
  }
  const nextId = (list.reduce((m, p) => Math.max(m, p.id), 0) || 0) + 1;
  list.push({
    id: nextId,
    name: prepInput.name.trim(),
    category: prepInput.category,
    done: false,
  });
  prepInput.name = "";
};

const removePrepItem = (item: PrepItem) => {
  if (isRequiredPrep(item.name)) {
    ElMessage.warning(`「${item.name}」为必带项，不可移除`);
    return;
  }
  editForm.preparation = (editForm.preparation ?? []).filter((p) => p.id !== item.id);
};

const applyPrepTemplate = (label: string) => {
  const tpl = PREP_TEMPLATES.find((t) => t.label === label);
  if (!tpl) return;
  editForm.preparation = mergePrepTemplate(editForm.preparation ?? [], tpl.items);
  ElMessage.success(`已应用「${label}」模板`);
};

/** 复制未勾选物品到剪贴板（适合发给同行人） */
const copyPendingPrep = async () => {
  const list = (currentPlan.value?.preparation ?? []).filter((p) => !p.done);
  if (!list.length) {
    ElMessage.success("已全部完成 🎉");
    return;
  }
  const text = list.map((p) => `[ ] ${p.name}（${p.category}）`).join("\n");
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(`已复制 ${list.length} 项未完成清单`);
  } catch {
    ElMessageBox.alert(text, "复制失败，请手动复制", {
      dangerouslyUseHTMLString: false,
    });
  }
};

/** 详情中切换勾选（直接改 currentPlan，触发 dirty） */
const togglePrepInDetail = (item: PrepItem) => {
  if (!currentPlan.value) return;
  const list = currentPlan.value.preparation ?? [];
  const target = list.find((p) => p.id === item.id);
  if (!target) return;
  target.done = !target.done;
  dirty.value = true;
};

/* ---------------- 分享对话框 ---------------- */
const shareDialogVisible = ref(false);
const sharePlan = ref<HolidayPlan | null>(null);
const handleShare = (plan: HolidayPlan) => {
  sharePlan.value = plan;
  shareDialogVisible.value = true;
};
const hasShareText = computed(() => {
  const r = sharePlan.value?.remark || "";
  const text = r.replace(/<[^>]+>/g, "").trim();
  return text.length > 0;
});

const shareCostByCategory = computed(() => {
  const items = sharePlan.value?.costItems ?? [];
  const map = new Map<string, number>();
  for (const c of items) {
    map.set(c.category, (map.get(c.category) ?? 0) + (Number(c.amount) || 0));
  }
  return COST_CATEGORIES.map(({ label, color }) => ({
    name: label,
    value: map.get(label) ?? 0,
    itemStyle: { color },
  })).filter((d) => d.value > 0);
});
const shareCostChartOptions = computed(() => ({
  tooltip: {
    trigger: "item",
    formatter: (params: any) =>
      `${params.name}<br/>￥${(params.value as number).toLocaleString()}（${params.percent}%）`,
  },
  legend: { bottom: 0, left: "center" },
  series: [
    {
      type: "pie",
      radius: ["40%", "65%"],
      center: ["50%", "45%"],
      avoidLabelOverlap: true,
      label: { show: true, formatter: "{b}\n￥{c}" },
      data: shareCostByCategory.value,
    },
  ],
}));
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

.plan-card {
  margin-bottom: 16px;
  transition:
    box-shadow 0.3s,
    background-color 0.4s;

  &.is-highlight {
    background-color: var(--el-color-primary-light-9);
    animation: card-flash 3s ease-out;
  }

  .plan-header {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
  }

  .plan-header-left {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .plan-emoji {
    margin-right: 2px;
  }

  .plan-days {
    margin-top: 6px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  .plan-body {
    p {
      display: flex;
      gap: 6px;
      align-items: center;
      margin: 6px 0;
      font-size: 14px;
    }

    .label {
      color: var(--el-text-color-secondary);
    }

    .dest-tags {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .budget-row {
      margin-top: 6px;
    }

    .budget-progress {
      margin: 4px 0 0 22px;
    }
  }
}

.filter-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
}

.filter-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.mr-1 {
  margin-right: 4px;
}

.mt-2 {
  margin-top: 8px;
}

/* ---------------- 年份分组 ---------------- */
.year-groups {
  border-top: none;
  border-bottom: none;

  :deep(.el-collapse-item__header) {
    height: 44px;
    padding: 0 4px;
    margin-bottom: 4px;
    font-size: 14px;
    background: var(--el-fill-color-light);
    border-radius: 4px;
  }

  :deep(.el-collapse-item__wrap) {
    border-bottom: none;
  }

  :deep(.el-collapse-item__content) {
    padding: 12px 0 4px;
  }
}

.year-group-header {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding-left: 8px;
}

.year-group-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.year-group-stat {
  margin-right: 12px;
  margin-left: auto;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* ---------------- 详情 / 编辑 tabs 共用 ---------------- */
.tab-badge {
  margin-left: 6px;

  :deep(.el-badge__content) {
    transform: translate(8px, -4px);
  }
}

.required-mark {
  margin-right: 2px;
  color: var(--el-color-danger);
}

/* ---------------- 详情：费用 ---------------- */
.cost-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 12px;

  .cost-stat {
    padding: 8px 12px;
    background: var(--el-fill-color-light);
    border-radius: 4px;
  }

  .cost-stat-label {
    margin-bottom: 4px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .cost-stat-value {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.cost-detail-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.cost-group {
  .cost-group-header {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 6px;
  }

  .cost-group-subtotal {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

/* ---------------- 详情：准备 ---------------- */
.prep-summary {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.prep-summary-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.prep-cat-title {
  font-weight: 600;
}

.prep-cat-count {
  margin-left: 8px;
  font-size: 12px;
  font-weight: normal;
  color: var(--el-text-color-secondary);
}

.prep-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 4px 0;

  .el-checkbox.is-required :deep(.el-checkbox__label) {
    font-weight: 600;
  }
}

/* ---------------- 编辑：费用 / 准备 ---------------- */
.edit-tabs :deep(.el-tabs__content) {
  padding-top: 8px;
}

.edit-cost-summary,
.edit-prep-summary {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.edit-prep-summary {
  justify-content: space-between;
}

.cost-input-row,
.prep-input-row {
  display: flex;
  gap: 8px;
}

/* ---------------- 自定义节日 ---------------- */
.festival-field {
  display: flex;
  gap: 8px;
  width: 100%;
}

.festival-add-row {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.festival-empty {
  padding: 8px 0;
}

.festival-list {
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

.festival-row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }

  .festival-row-emoji {
    width: 24px;
    font-size: 18px;
    text-align: center;
  }

  .festival-row-label {
    flex: 1;
    color: var(--el-text-color-primary);
  }
}

.festival-builtin {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

@keyframes card-flash {
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
</style>
