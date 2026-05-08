<template>
  <div class="req-detail">
    <el-tabs v-model="activeTab">
      <!-- ========== 基本信息 ========== -->
      <el-tab-pane label="基本信息" name="basic">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="标题" :span="2">{{ req.title }}</el-descriptions-item>
          <el-descriptions-item label="需求类型">
            <el-tag :type="typeMap[req.type]?.tagType" size="small">
              {{ typeMap[req.type]?.label }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag :type="priorityMap[req.priority]?.tagType" size="small" effect="plain">
              {{ priorityMap[req.priority]?.label }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusMap[req.status]?.tagType" size="small">
              {{ statusMap[req.status]?.label }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="截止日期">
            {{ req.dueDate || "—" }}
          </el-descriptions-item>
          <el-descriptions-item label="负责人">{{ req.assignee || "—" }}</el-descriptions-item>
          <el-descriptions-item label="协助人" :span="2">
            <template v-if="collaborators.length">
              <el-tag v-for="c in collaborators" :key="c" size="small" type="info" class="mr-1">
                {{ c }}
              </el-tag>
            </template>
            <span v-else class="text-placeholder">暂无</span>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ req.createdAt || "—" }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            <span v-if="req.description" style="white-space: pre-wrap">{{ req.description }}</span>
            <span v-else class="text-placeholder">暂无描述</span>
          </el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>

      <!-- ========== 子任务 ========== -->
      <el-tab-pane name="subtasks">
        <template #label>
          <span>
            子任务
            <el-badge
              v-if="req.subTasks?.length"
              :value="`${doneCount}/${req.subTasks.length}`"
              type="primary"
              class="tab-badge"
            />
          </span>
        </template>

        <!-- 进度 -->
        <div v-if="req.subTasks?.length" class="subtask-progress">
          <span class="subtask-progress-text">
            完成 {{ doneCount }} / {{ req.subTasks.length }}
          </span>
          <el-progress :percentage="donePercent" :stroke-width="8" style="flex: 1" />
        </div>

        <!-- 列表 -->
        <div class="subtask-list">
          <div
            v-for="task in req.subTasks"
            :key="task.id"
            class="subtask-row"
            :class="{ 'is-done': task.done }"
          >
            <el-checkbox :model-value="task.done" @change="() => toggleSubTask(task)" />
            <span class="subtask-title">{{ task.title }}</span>
            <span class="subtask-meta">
              <span v-if="task.assignee" class="subtask-assignee">@{{ task.assignee }}</span>
              <span v-if="task.dueDate" class="subtask-due">{{ task.dueDate }}</span>
            </span>
            <el-button type="danger" link size="small" @click="removeSubTask(task.id)">
              删除
            </el-button>
          </div>

          <el-empty v-if="!req.subTasks?.length" description="暂无子任务" :image-size="60" />
        </div>

        <!-- 新增行 -->
        <div class="subtask-add">
          <el-input
            v-model="subInput.title"
            placeholder="子任务标题，回车添加"
            style="flex: 1"
            @keyup.enter="addSubTask"
          />
          <el-input v-model="subInput.assignee" placeholder="负责人" style="width: 110px" />
          <el-date-picker
            v-model="subInput.dueDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="截止日期"
            style="width: 140px"
          />
          <el-button type="primary" @click="addSubTask">添加</el-button>
        </div>
      </el-tab-pane>

      <!-- ========== 评论 ========== -->
      <el-tab-pane name="comments">
        <template #label>
          <span>
            评论
            <el-badge
              v-if="req.comments?.length"
              :value="req.comments.length"
              type="info"
              class="tab-badge"
            />
          </span>
        </template>

        <div class="comment-list">
          <div v-for="c in req.comments" :key="c.id" class="comment-item">
            <div class="comment-header">
              <el-avatar :size="32" class="comment-avatar">
                {{ c.author?.slice(0, 1) || "?" }}
              </el-avatar>
              <span class="comment-author">{{ c.author }}</span>
              <span class="comment-time">{{ c.createdAt }}</span>
              <el-button type="danger" link size="small" @click="removeComment(c.id)">
                删除
              </el-button>
            </div>
            <div class="comment-body">{{ c.content }}</div>
          </div>
          <el-empty v-if="!req.comments?.length" description="暂无评论" :image-size="60" />
        </div>

        <!-- 发送框 -->
        <div class="comment-send">
          <el-input
            v-model="commentAuthor"
            placeholder="你的名字"
            style=" flex-shrink: 0;width: 120px"
          />
          <el-input
            v-model="commentContent"
            type="textarea"
            :rows="2"
            placeholder="写下你的评论..."
            style="flex: 1"
            @keydown.ctrl.enter="sendComment"
          />
          <el-button type="primary" :disabled="!commentContent.trim()" @click="sendComment">
            发送
          </el-button>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import type { Requirement, SubTask, Comment, ReqType, ReqPriority, ReqStatus } from "@/api/affairs";

const props = defineProps<{ requirement: Requirement }>();
const emit = defineEmits<{ (e: "update", val: Requirement): void }>();

/* 使用本地副本，变更通过 emit 通知父组件 */
const req = reactive<Requirement>(JSON.parse(JSON.stringify(props.requirement)));

/* 映射表 */
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

const activeTab = ref("basic");

/* -------- 工具 -------- */
const now = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const collaborators = computed(() =>
  Array.from(
    new Set((req.subTasks ?? []).map((task) => task.assignee?.trim()).filter(Boolean) as string[])
  )
);

const notifyUpdate = () => {
  req.collaborators = collaborators.value;
  emit("update", JSON.parse(JSON.stringify(req)));
};

/* -------- 子任务 -------- */
const doneCount = computed(() => (req.subTasks ?? []).filter((t) => t.done).length);
const donePercent = computed(() => {
  const total = req.subTasks?.length || 0;
  return total ? Math.round((doneCount.value / total) * 100) : 0;
});

const subInput = reactive<Omit<SubTask, "id" | "done">>({
  title: "",
  assignee: "",
  dueDate: "",
});

const toggleSubTask = (task: SubTask) => {
  task.done = !task.done;
  notifyUpdate();
};

const addSubTask = () => {
  if (!subInput.title.trim()) {
    ElMessage.warning("请输入子任务标题");
    return;
  }
  const list = req.subTasks ?? (req.subTasks = []);
  const nextId = (list.reduce((m, t) => Math.max(m, t.id), 0) || 0) + 1;
  list.push({
    id: nextId,
    title: subInput.title.trim(),
    done: false,
    assignee: subInput.assignee.trim(),
    dueDate: subInput.dueDate,
  });
  subInput.title = "";
  subInput.assignee = "";
  subInput.dueDate = "";
  notifyUpdate();
};

const removeSubTask = (id: number) => {
  req.subTasks = (req.subTasks ?? []).filter((t) => t.id !== id);
  notifyUpdate();
};

/* -------- 评论 -------- */
const commentAuthor = ref("");
const commentContent = ref("");

const sendComment = () => {
  if (!commentContent.value.trim()) return;
  const list = req.comments ?? (req.comments = []);
  const nextId = (list.reduce((m, c) => Math.max(m, c.id), 0) || 0) + 1;
  list.push({
    id: nextId,
    author: commentAuthor.value.trim() || "匿名",
    content: commentContent.value.trim(),
    createdAt: now(),
  } satisfies Comment);
  commentContent.value = "";
  notifyUpdate();
};

const removeComment = (id: number) => {
  req.comments = (req.comments ?? []).filter((c) => c.id !== id);
  notifyUpdate();
};
</script>

<style lang="scss" scoped>
.req-detail {
  padding: 0 4px;
}

.text-placeholder {
  color: var(--el-text-color-placeholder);
}

.mr-1 {
  margin-right: 4px;
}

/* ---- tab badge ---- */
.tab-badge {
  margin-left: 6px;

  :deep(.el-badge__content) {
    transform: translate(8px, -4px);
  }
}

/* ---- 子任务 ---- */
.subtask-progress {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.subtask-progress-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.subtask-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.subtask-row {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 6px 10px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  transition: background 0.2s;

  &.is-done .subtask-title {
    color: var(--el-text-color-disabled);
    text-decoration: line-through;
  }
}

.subtask-title {
  flex: 1;
  font-size: 14px;
}

.subtask-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.subtask-add {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-top: 8px;
  border-top: 1px dashed var(--el-border-color-lighter);
}

/* ---- 评论 ---- */
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.comment-item {
  padding: 10px 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.comment-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}

.comment-avatar {
  flex-shrink: 0;
  font-size: 13px;
  color: #fff;
  background: var(--el-color-primary);
}

.comment-author {
  font-size: 13px;
  font-weight: 600;
}

.comment-time {
  margin-left: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.comment-body {
  padding-left: 40px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
}

.comment-send {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding-top: 12px;
  border-top: 1px dashed var(--el-border-color-lighter);
}
</style>
