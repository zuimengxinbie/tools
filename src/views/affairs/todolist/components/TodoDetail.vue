<template>
  <div class="todo-detail">
    <el-descriptions :column="2" border size="small">
      <el-descriptions-item label="标题" :span="2">
        <span :class="{ 'done-text': todo.status === 'done' }">{{ todo.title }}</span>
        <el-icon v-if="todo.starred" class="star-icon" color="#f7ba2a">
          <StarFilled />
        </el-icon>
      </el-descriptions-item>
      <el-descriptions-item label="分类">
        <el-tag :type="categoryMap[todo.category]?.tagType || ''" size="small">
          {{ categoryMap[todo.category]?.label }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="优先级">
        <el-tag :type="priorityMap[todo.priority]?.tagType" size="small" effect="plain">
          {{ priorityMap[todo.priority]?.label }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag :type="statusMap[todo.status]?.tagType" size="small">
          {{ statusMap[todo.status]?.label }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="重复">
        {{ repeatMap[todo.repeat]?.label }}
      </el-descriptions-item>
      <el-descriptions-item label="截止日期">
        <span :class="dueClass">{{ todo.dueDate || "—" }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="提醒时间">
        {{ todo.remindAt || "—" }}
      </el-descriptions-item>
      <el-descriptions-item label="进度" :span="2">
        <el-progress
          :percentage="todo.progress"
          :status="todo.status === 'done' ? 'success' : undefined"
        />
      </el-descriptions-item>
      <el-descriptions-item label="标签" :span="2">
        <template v-if="todo.tags?.length">
          <el-tag
            v-for="t in todo.tags"
            :key="t"
            size="small"
            type="info"
            effect="plain"
            class="mr-1"
          >
            {{ t }}
          </el-tag>
        </template>
        <span v-else class="text-placeholder">—</span>
      </el-descriptions-item>
      <el-descriptions-item label="描述" :span="2">
        <span v-if="todo.description" class="desc-text">{{ todo.description }}</span>
        <span v-else class="text-placeholder">—</span>
      </el-descriptions-item>
    </el-descriptions>

    <div class="section-title">
      子任务
      <span v-if="todo.checklist?.length" class="section-count">
        ({{ doneCount }}/{{ todo.checklist.length }})
      </span>
    </div>
    <div v-if="todo.checklist?.length" class="checklist">
      <div v-for="item in todo.checklist" :key="item.id" class="checklist-item">
        <el-checkbox v-model="item.done" @change="emitUpdate" />
        <span :class="{ 'done-text': item.done }">{{ item.title }}</span>
        <span v-if="item.finishedAt" class="checklist-finished-at">
          （完成：{{ item.finishedAt }}）
        </span>
      </div>
    </div>
    <div v-else class="text-placeholder">暂无子任务</div>

    <div class="section-title">时间线</div>
    <el-timeline>
      <el-timeline-item :timestamp="todo.createdAt" placement="top">创建待办</el-timeline-item>
      <el-timeline-item
        v-if="todo.updatedAt && todo.updatedAt !== todo.createdAt"
        :timestamp="todo.updatedAt"
        placement="top"
      >
        最近更新
      </el-timeline-item>
      <el-timeline-item
        v-if="todo.finishedAt"
        :timestamp="todo.finishedAt"
        placement="top"
        type="success"
      >
        标记完成
      </el-timeline-item>
    </el-timeline>
  </div>
</template>

<script setup lang="ts">
import { StarFilled } from "@element-plus/icons-vue";
import type { TodoItem } from "@/api/affairs";
import { categoryMap, priorityMap, statusMap, repeatMap, isOverdue, isSoon } from "../constants";

interface Props {
  todo: TodoItem;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "update", value: TodoItem): void;
}>();

const doneCount = computed(() => props.todo.checklist?.filter((c) => c.done).length ?? 0);

const dueClass = computed(() => {
  if (isOverdue(props.todo.dueDate, props.todo.status)) return "due-overdue";
  if (isSoon(props.todo.dueDate, props.todo.status)) return "due-soon";
  return "";
});

const emitUpdate = () => {
  emit("update", JSON.parse(JSON.stringify(props.todo)));
};
</script>

<style lang="scss" scoped>
.todo-detail {
  padding: 8px 4px;
}

.star-icon {
  margin-left: 6px;
  vertical-align: middle;
}

.section-title {
  margin: 16px 0 8px;
  font-size: 14px;
  font-weight: 600;
}

.section-count {
  font-weight: normal;
  color: var(--el-text-color-secondary);
}

.checklist {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.checklist-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.done-text {
  color: var(--el-text-color-placeholder);
  text-decoration: line-through;
}

.checklist-finished-at {
  margin-left: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.desc-text {
  white-space: pre-wrap;
}

.text-placeholder {
  color: var(--el-text-color-placeholder);
}

.mr-1 {
  margin-right: 4px;
}

.due-overdue {
  font-weight: 600;
  color: var(--el-color-danger);
}

.due-soon {
  color: var(--el-color-warning);
}
</style>
