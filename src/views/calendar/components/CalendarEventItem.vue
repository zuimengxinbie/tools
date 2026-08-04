<template>
  <button
    type="button"
    class="calendar-event"
    :class="[
      `is-${event.group}`,
      `is-${event.status}`,
      { 'is-overdue': overdue, 'has-conflict': conflict, 'is-compact': compact },
    ]"
    @click="$emit('open', event)"
  >
    <span class="calendar-event__mark" />
    <span class="calendar-event__body">
      <span class="calendar-event__meta">
        <time v-if="showDate">{{ formatDate(event.date) }}</time>
        <time v-if="event.time">{{ event.time }}</time>
        <span>{{ sourceLabel[event.source] }}</span>
      </span>
      <strong>{{ event.title }}</strong>
      <small>{{ event.subtitle }}</small>
    </span>
    <span class="calendar-event__badges">
      <em v-if="conflict">冲突</em>
      <em v-if="overdue" class="is-danger">逾期</em>
      <em v-else-if="event.status === 'completed'" class="is-success">完成</em>
      <em v-else-if="event.status === 'cancelled'">取消</em>
      <el-icon><ArrowRight /></el-icon>
    </span>
  </button>
</template>

<script setup lang="ts">
import { ArrowRight } from "@element-plus/icons-vue";
import type { CalendarSource, UnifiedCalendarEvent } from "../types";

withDefaults(
  defineProps<{
    event: UnifiedCalendarEvent;
    overdue?: boolean;
    conflict?: boolean;
    showDate?: boolean;
    compact?: boolean;
  }>(),
  { overdue: false, conflict: false, showDate: false, compact: false }
);

defineEmits<{ open: [event: UnifiedCalendarEvent] }>();

const sourceLabel: Record<CalendarSource, string> = {
  todo: "待办截止",
  reminder: "待办提醒",
  requirement: "个人需求",
  weekend: "周末行程",
  holiday: "假日行程",
  reservation: "咖啡预定",
};

function formatDate(value: string): string {
  return `${Number(value.slice(5, 7))}月${Number(value.slice(8, 10))}日`;
}
</script>

<style scoped lang="scss">
.calendar-event {
  --event-color: #6b8afd;
  --event-soft: rgb(107 138 253 / 10%);

  display: grid;
  grid-template-columns: 4px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: stretch;
  width: 100%;
  padding: 13px 14px;
  color: var(--el-text-color-regular);
  text-align: left;
  cursor: pointer;
  background: var(--event-soft);
  border: 1px solid transparent;
  border-radius: 13px;
  transition: 0.2s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--event-color) 38%, transparent);
    transform: translateY(-1px);
  }

  &.is-travel {
    --event-color: #20b6a4;
    --event-soft: rgb(32 182 164 / 10%);
  }

  &.is-business {
    --event-color: #d58a3a;
    --event-soft: rgb(213 138 58 / 11%);
  }

  &.is-completed,
  &.is-cancelled {
    opacity: 0.72;
    filter: saturate(0.45);
  }

  &.is-overdue {
    --event-color: #e55f70;
    --event-soft: rgb(229 95 112 / 10%);
  }

  &.has-conflict {
    border-color: rgb(230 162 60 / 45%);
  }
}

.calendar-event__mark {
  background: var(--event-color);
  border-radius: 4px;
}

.calendar-event__body {
  min-width: 0;

  strong,
  small {
    display: block;
  }

  strong {
    margin-top: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--el-text-color-primary);
    white-space: nowrap;
  }

  small {
    margin-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }
}

.calendar-event__meta {
  display: flex;
  gap: 7px;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--event-color);
  letter-spacing: 0.04em;

  time + time::before,
  time + span::before {
    margin-right: 7px;
    color: var(--el-text-color-placeholder);
    content: "·";
  }
}

.calendar-event__badges {
  display: flex;
  gap: 6px;
  align-items: center;

  em {
    padding: 2px 6px;
    font-size: 11px;
    font-style: normal;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color);
    border-radius: 999px;

    &.is-danger {
      color: var(--el-color-danger);
      background: var(--el-color-danger-light-9);
    }

    &.is-success {
      color: var(--el-color-success);
      background: var(--el-color-success-light-9);
    }
  }

  .el-icon {
    color: var(--el-text-color-placeholder);
  }
}

.calendar-event.is-compact {
  padding: 10px 11px;

  .calendar-event__body small,
  .calendar-event__badges em {
    display: none;
  }
}
</style>
