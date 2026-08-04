<template>
  <main v-loading="loading" class="calendar-page">
    <header class="calendar-hero">
      <div>
        <p>DAILY COORDINATION</p>
        <h1>日程中心</h1>
        <span>{{ fullTodayLabel }} · 把事务、远方和经营安排在同一条时间线上</span>
      </div>
      <div class="hero-actions">
        <span v-if="lastUpdatedAt">更新于 {{ formatTime(lastUpdatedAt) }}</span>
        <el-button :icon="Refresh" :loading="loading" @click="load(true)">刷新数据</el-button>
      </div>
    </header>

    <section class="summary-grid">
      <article>
        <span class="summary-icon is-blue"><Calendar /></span>
        <div>
          <small>今日安排</small>
          <strong>{{ todayEvents.length }}</strong>
        </div>
        <em>项</em>
      </article>
      <article :class="{ 'has-warning': overdueEvents.length }">
        <span class="summary-icon is-red"><WarningFilled /></span>
        <div>
          <small>已逾期</small>
          <strong>{{ overdueEvents.length }}</strong>
        </div>
        <em>项</em>
      </article>
      <article>
        <span class="summary-icon is-green"><Sunrise /></span>
        <div>
          <small>未来 7 天</small>
          <strong>{{ upcomingEvents.length }}</strong>
        </div>
        <em>项</em>
      </article>
      <article :class="{ 'has-warning': conflictIds.size }">
        <span class="summary-icon is-orange"><BellFilled /></span>
        <div>
          <small>时间冲突</small>
          <strong>{{ conflictIds.size }}</strong>
        </div>
        <em>项</em>
      </article>
    </section>

    <section class="control-bar">
      <div class="view-switch" aria-label="日历视图">
        <button
          v-for="option in viewOptions"
          :key="option.value"
          type="button"
          :class="{ active: viewMode === option.value }"
          @click="viewMode = option.value"
        >
          {{ option.label }}
        </button>
      </div>
      <div class="source-filters">
        <span>显示：</span>
        <button
          v-for="group in groupOptions"
          :key="group.value"
          type="button"
          :class="[`is-${group.value}`, { active: enabledGroups.includes(group.value) }]"
          :aria-pressed="enabledGroups.includes(group.value)"
          @click="toggleGroup(group.value)"
        >
          <i />
          {{ group.label }}
        </button>
      </div>
    </section>

    <el-alert
      v-if="errors.length"
      class="load-alert"
      title="部分数据暂时未能载入"
      :description="errors.join('；')"
      type="warning"
      show-icon
      :closable="false"
    />

    <template v-if="viewMode === 'today'">
      <section class="today-layout">
        <article class="panel today-panel">
          <div class="panel-heading">
            <div>
              <p>TODAY TIMELINE</p>
              <h2>今天</h2>
            </div>
            <span :class="{ 'is-dense': activeEventCount(todayKey) >= 3 }">
              {{ densityLabel(todayKey) }}
            </span>
          </div>

          <div v-if="todayEvents.length" class="event-list">
            <CalendarEventItem
              v-for="event in todayEvents"
              :key="event.id"
              :event="event"
              :overdue="isEventOverdue(event, todayKey)"
              :conflict="conflictIds.has(event.id)"
              @open="openEvent"
            />
          </div>
          <div v-else class="empty-state">
            <el-icon><Coffee /></el-icon>
            <strong>今天没有明确安排</strong>
            <span>留一点空白，也是一种计划。</span>
          </div>
        </article>

        <aside class="today-side">
          <article class="panel overdue-panel">
            <div class="panel-heading compact">
              <div>
                <p>NEEDS ATTENTION</p>
                <h2>逾期事项</h2>
              </div>
              <el-tag v-if="overdueEvents.length" type="danger" effect="plain" round>
                {{ overdueEvents.length }} 项
              </el-tag>
            </div>
            <div v-if="overdueEvents.length" class="event-list compact-list">
              <CalendarEventItem
                v-for="event in overdueEvents.slice(0, 6)"
                :key="event.id"
                :event="event"
                overdue
                show-date
                compact
                @open="openEvent"
              />
            </div>
            <el-empty v-else :image-size="60" description="没有逾期事项" />
          </article>

          <article class="panel upcoming-panel">
            <div class="panel-heading compact">
              <div>
                <p>NEXT SEVEN DAYS</p>
                <h2>接下来</h2>
              </div>
              <span>未来 7 天</span>
            </div>
            <div v-if="upcomingEvents.length" class="event-list compact-list">
              <CalendarEventItem
                v-for="event in upcomingEvents.slice(0, 8)"
                :key="event.id"
                :event="event"
                :conflict="conflictIds.has(event.id)"
                show-date
                compact
                @open="openEvent"
              />
            </div>
            <el-empty v-else :image-size="60" description="未来一周暂无安排" />
          </article>
        </aside>
      </section>
    </template>

    <template v-else>
      <section class="calendar-layout">
        <article class="panel calendar-panel">
          <div class="calendar-toolbar">
            <el-button circle :icon="ArrowLeft" aria-label="上一周期" @click="movePeriod(-1)" />
            <div>
              <p>{{ viewMode === "month" ? "MONTH VIEW" : "WEEK VIEW" }}</p>
              <h2>{{ calendarTitle }}</h2>
            </div>
            <div class="calendar-toolbar__actions">
              <el-button @click="goToday">今天</el-button>
              <el-button circle :icon="ArrowRight" aria-label="下一周期" @click="movePeriod(1)" />
            </div>
          </div>

          <div class="weekday-row">
            <span v-for="weekday in weekdays" :key="weekday">{{ weekday }}</span>
          </div>
          <div class="calendar-grid" :class="{ 'is-week': viewMode === 'week' }">
            <article
              v-for="day in displayDays"
              :key="day.date"
              class="day-cell"
              :class="{
                'is-outside': !day.inCurrentMonth,
                'is-today': day.isToday,
                'is-selected': selectedDate === day.date,
                'is-dense': activeEventCount(day.date) >= 3,
              }"
            >
              <header>
                <button type="button" @click="selectedDate = day.date">{{ day.day }}</button>
                <span v-if="hasConflict(day.date)">冲突</span>
                <span v-else-if="activeEventCount(day.date) >= 3">密集</span>
              </header>
              <div class="day-events">
                <button
                  v-for="event in eventsForDate(day.date).slice(0, viewMode === 'month' ? 3 : 7)"
                  :key="`${day.date}-${event.id}`"
                  type="button"
                  class="event-chip"
                  :class="[
                    `is-${event.group}`,
                    {
                      'is-overdue': isEventOverdue(event, todayKey),
                      'is-completed': event.status !== 'active',
                      'has-conflict': conflictIds.has(event.id),
                    },
                  ]"
                  :title="`${event.time ? `${event.time} ` : ''}${event.title}`"
                  @click.stop="openEvent(event)"
                >
                  <time v-if="event.time">{{ event.time }}</time>
                  <span>{{ event.title }}</span>
                </button>
                <button
                  v-if="hiddenEventCount(day.date) > 0"
                  type="button"
                  class="more-events"
                  @click="selectedDate = day.date"
                >
                  还有 {{ hiddenEventCount(day.date) }} 项
                </button>
              </div>
            </article>
          </div>
        </article>

        <aside class="panel selected-panel">
          <div class="panel-heading compact">
            <div>
              <p>SELECTED DATE</p>
              <h2>{{ selectedDateLabel }}</h2>
            </div>
            <span :class="{ 'is-dense': activeEventCount(selectedDate) >= 3 }">
              {{ densityLabel(selectedDate) }}
            </span>
          </div>
          <div v-if="selectedDateEvents.length" class="event-list compact-list">
            <CalendarEventItem
              v-for="event in selectedDateEvents"
              :key="event.id"
              :event="event"
              :overdue="isEventOverdue(event, todayKey)"
              :conflict="conflictIds.has(event.id)"
              @open="openEvent"
            />
          </div>
          <div v-else class="empty-state small">
            <el-icon><Calendar /></el-icon>
            <strong>这一天没有安排</strong>
          </div>
        </aside>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ArrowLeft,
  ArrowRight,
  BellFilled,
  Calendar,
  Coffee,
  Refresh,
  Sunrise,
  WarningFilled,
} from "@element-plus/icons-vue";
import CalendarEventItem from "./components/CalendarEventItem.vue";
import {
  addDays,
  fromDateKey,
  isEventOverdue,
  toDateKey,
  useUnifiedCalendar,
} from "./composables/useUnifiedCalendar";
import type { CalendarDay, CalendarSourceGroup, UnifiedCalendarEvent } from "./types";

defineOptions({ name: "UnifiedCalendar" });

type ViewMode = "today" | "month" | "week";

const router = useRouter();
const viewMode = ref<ViewMode>("today");
const {
  now,
  todayKey,
  enabledGroups,
  conflictIds,
  todayEvents,
  overdueEvents,
  upcomingEvents,
  loading,
  errors,
  lastUpdatedAt,
  eventsForDate,
  activeEventCount,
  toggleGroup,
  load,
} = useUnifiedCalendar();

const anchorDate = ref(todayKey.value);
const selectedDate = ref(todayKey.value);
const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const viewOptions: Array<{ value: ViewMode; label: string }> = [
  { value: "today", label: "今天" },
  { value: "month", label: "月视图" },
  { value: "week", label: "周视图" },
];
const groupOptions: Array<{ value: CalendarSourceGroup; label: string }> = [
  { value: "affairs", label: "事务" },
  { value: "travel", label: "行程" },
  { value: "business", label: "咖啡预定" },
];

const fullTodayLabel = computed(() =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(now.value)
);

function createCalendarDay(date: string, anchorMonth: number): CalendarDay {
  const value = fromDateKey(date);
  return {
    date,
    day: value.getDate(),
    inCurrentMonth: value.getMonth() === anchorMonth,
    isToday: date === todayKey.value,
  };
}

const monthDays = computed(() => {
  const anchor = fromDateKey(anchorDate.value);
  const firstDay = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const start = addDays(toDateKey(firstDay), -mondayOffset);
  return Array.from({ length: 42 }, (_, index) =>
    createCalendarDay(addDays(start, index), anchor.getMonth())
  );
});

const weekDays = computed(() => {
  const anchor = fromDateKey(anchorDate.value);
  const mondayOffset = (anchor.getDay() + 6) % 7;
  const start = addDays(anchorDate.value, -mondayOffset);
  return Array.from({ length: 7 }, (_, index) =>
    createCalendarDay(addDays(start, index), anchor.getMonth())
  );
});

const displayDays = computed(() => (viewMode.value === "month" ? monthDays.value : weekDays.value));
const selectedDateEvents = computed(() => eventsForDate(selectedDate.value));
const selectedDateLabel = computed(() =>
  new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" }).format(
    fromDateKey(selectedDate.value)
  )
);
const calendarTitle = computed(() => {
  const anchor = fromDateKey(anchorDate.value);
  if (viewMode.value === "month") {
    return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(anchor);
  }
  const days = weekDays.value;
  return `${formatShortDate(days[0].date)} — ${formatShortDate(days[6].date)}`;
});

function formatShortDate(value: string): string {
  return `${Number(value.slice(5, 7))}月${Number(value.slice(8, 10))}日`;
}

function formatTime(value: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function densityLabel(date: string): string {
  const count = activeEventCount(date);
  if (hasConflict(date)) return "存在时间冲突";
  if (count >= 3) return `${count} 项 · 日程密集`;
  if (count > 0) return `${count} 项待推进`;
  return "节奏轻松";
}

function hasConflict(date: string): boolean {
  return eventsForDate(date).some((event) => conflictIds.value.has(event.id));
}

function hiddenEventCount(date: string): number {
  const limit = viewMode.value === "month" ? 3 : 7;
  return Math.max(0, eventsForDate(date).length - limit);
}

function movePeriod(direction: -1 | 1): void {
  const anchor = fromDateKey(anchorDate.value);
  if (viewMode.value === "month") {
    anchor.setMonth(anchor.getMonth() + direction, 1);
    anchorDate.value = toDateKey(anchor);
  } else {
    anchorDate.value = addDays(anchorDate.value, direction * 7);
  }
  selectedDate.value = anchorDate.value;
}

function goToday(): void {
  anchorDate.value = todayKey.value;
  selectedDate.value = todayKey.value;
}

function openEvent(event: UnifiedCalendarEvent): void {
  void router.push(event.route);
}
</script>

<style scoped lang="scss">
.calendar-page {
  --calendar-blue: #6688f6;
  --calendar-green: #20aa98;
  --calendar-orange: #d58a3a;
  --calendar-red: #df6072;

  min-height: calc(100vh - 84px);
  padding: clamp(18px, 2vw, 28px);
  color: var(--el-text-color-primary);
  background:
    radial-gradient(circle at 92% 4%, rgb(102 136 246 / 12%), transparent 28%),
    var(--el-bg-color-page);
}

.calendar-hero {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  justify-content: space-between;

  p,
  h1 {
    margin: 0;
  }

  p {
    margin-bottom: 5px;
    font-size: 12px;
    font-weight: 800;
    color: var(--calendar-blue);
    letter-spacing: 0.16em;
  }

  h1 {
    font-size: 30px;
  }

  span {
    display: block;
    margin-top: 7px;
    color: var(--el-text-color-secondary);
  }
}

.hero-actions {
  display: flex;
  gap: 12px;
  align-items: center;

  span {
    margin: 0;
    font-size: 12px;
  }
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 22px;

  article {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 13px;
    align-items: center;
    padding: 18px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 16px;
    box-shadow: var(--el-box-shadow-lighter);

    &.has-warning {
      border-color: rgb(223 96 114 / 28%);
    }

    div {
      min-width: 0;
    }

    small,
    strong {
      display: block;
    }

    small {
      color: var(--el-text-color-secondary);
    }

    strong {
      margin-top: 2px;
      font-size: 26px;
    }

    em {
      font-size: 12px;
      font-style: normal;
      color: var(--el-text-color-placeholder);
    }
  }
}

.summary-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  font-size: 20px;
  color: var(--calendar-blue);
  background: rgb(102 136 246 / 10%);
  border-radius: 12px;

  &.is-red {
    color: var(--calendar-red);
    background: rgb(223 96 114 / 10%);
  }
  &.is-green {
    color: var(--calendar-green);
    background: rgb(32 170 152 / 10%);
  }
  &.is-orange {
    color: var(--calendar-orange);
    background: rgb(213 138 58 / 11%);
  }
}

.control-bar {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  margin: 18px 0;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
}

.view-switch {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--el-fill-color-light);
  border-radius: 10px;

  button {
    padding: 7px 17px;
    color: var(--el-text-color-secondary);
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 8px;

    &.active {
      font-weight: 700;
      color: var(--calendar-blue);
      background: var(--el-bg-color);
      box-shadow: 0 4px 12px rgb(55 79 130 / 10%);
    }
  }
}

.source-filters {
  display: flex;
  gap: 7px;
  align-items: center;

  > span {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  button {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 6px 10px;
    color: var(--el-text-color-secondary);
    cursor: pointer;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 999px;
    opacity: 0.5;

    &.active {
      opacity: 1;
    }
    i {
      width: 7px;
      height: 7px;
      background: var(--calendar-blue);
      border-radius: 50%;
    }
    &.is-travel i {
      background: var(--calendar-green);
    }
    &.is-business i {
      background: var(--calendar-orange);
    }
  }
}

.load-alert {
  margin-bottom: 18px;
}

.panel {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 17px;
  box-shadow: var(--el-box-shadow-lighter);
}

.today-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(360px, 0.75fr);
  gap: 18px;
}

.today-panel,
.overdue-panel,
.upcoming-panel,
.selected-panel {
  padding: 22px;
}

.today-side {
  display: grid;
  gap: 18px;
}

.panel-heading {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;

  p,
  h2 {
    margin: 0;
  }
  p {
    margin-bottom: 4px;
    font-size: 11px;
    font-weight: 800;
    color: var(--calendar-blue);
    letter-spacing: 0.14em;
  }
  h2 {
    font-size: 21px;
  }
  > span {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
  > span.is-dense {
    font-weight: 700;
    color: var(--el-color-warning);
  }
  &.compact {
    margin-bottom: 14px;
  }
}

.event-list {
  display: grid;
  gap: 10px;
}
.compact-list {
  gap: 8px;
}

.empty-state {
  display: grid;
  place-items: center;
  align-content: center;
  min-height: 280px;
  color: var(--el-text-color-secondary);

  .el-icon {
    margin-bottom: 12px;
    font-size: 36px;
    color: var(--calendar-blue);
  }
  strong {
    color: var(--el-text-color-primary);
  }
  span {
    margin-top: 6px;
  }
  &.small {
    min-height: 180px;
  }
}

.calendar-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 18px;
  align-items: start;
}

.calendar-panel {
  overflow: hidden;
}

.calendar-toolbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 20px 22px;
  text-align: center;
  border-bottom: 1px solid var(--el-border-color-lighter);

  p,
  h2 {
    margin: 0;
  }
  p {
    margin-bottom: 3px;
    font-size: 10px;
    font-weight: 800;
    color: var(--calendar-blue);
    letter-spacing: 0.13em;
  }
  h2 {
    font-size: 20px;
  }
}

.calendar-toolbar__actions {
  display: flex;
  gap: 8px;
}

.weekday-row,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.weekday-row {
  background: var(--el-fill-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);

  span {
    padding: 9px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-align: center;
  }
}

.day-cell {
  min-width: 0;
  min-height: 132px;
  padding: 8px;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:nth-child(7n) {
    border-right: 0;
  }
  &.is-outside {
    background: var(--el-fill-color-lighter);
    opacity: 0.62;
  }
  &.is-selected {
    box-shadow: inset 0 0 0 2px rgb(102 136 246 / 36%);
  }
  &.is-dense {
    background: rgb(230 162 60 / 4%);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;

    button {
      width: 27px;
      height: 27px;
      color: var(--el-text-color-regular);
      cursor: pointer;
      background: transparent;
      border: 0;
      border-radius: 50%;
    }

    span {
      font-size: 10px;
      font-weight: 700;
      color: var(--el-color-warning);
    }
  }

  &.is-today header button {
    font-weight: 700;
    color: #fff;
    background: var(--calendar-blue);
  }
}

.calendar-grid.is-week .day-cell {
  min-height: 440px;
}

.day-events {
  display: grid;
  gap: 4px;
}

.event-chip {
  --chip-color: var(--calendar-blue);

  display: flex;
  gap: 4px;
  align-items: center;
  min-width: 0;
  padding: 5px 6px;
  color: var(--el-text-color-regular);
  text-align: left;
  cursor: pointer;
  background: rgb(102 136 246 / 9%);
  border: 0;
  border-left: 3px solid var(--chip-color);
  border-radius: 5px;

  &.is-travel {
    --chip-color: var(--calendar-green);
    background: rgb(32 170 152 / 9%);
  }
  &.is-business {
    --chip-color: var(--calendar-orange);
    background: rgb(213 138 58 / 10%);
  }
  &.is-overdue {
    --chip-color: var(--calendar-red);
    background: rgb(223 96 114 / 9%);
  }
  &.is-completed {
    opacity: 0.62;
    filter: saturate(0.3);
  }
  &.has-conflict {
    outline: 1px solid rgb(230 162 60 / 45%);
  }

  time {
    flex: 0 0 auto;
    font-size: 10px;
    font-weight: 700;
    color: var(--chip-color);
  }
  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 11px;
    white-space: nowrap;
  }
}

.more-events {
  padding: 3px 4px;
  font-size: 10px;
  color: var(--calendar-blue);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.selected-panel {
  position: sticky;
  top: 16px;
}

@media (width <= 1180px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .today-layout,
  .calendar-layout {
    grid-template-columns: 1fr;
  }
  .selected-panel {
    position: static;
  }
}

@media (width <= 760px) {
  .calendar-hero,
  .control-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .source-filters {
    flex-wrap: wrap;
  }
  .weekday-row span {
    font-size: 10px;
  }
  .day-cell {
    min-height: 104px;
    padding: 5px;
  }
  .event-chip time {
    display: none;
  }
}
</style>
