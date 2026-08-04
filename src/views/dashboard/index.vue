<template>
  <main class="dashboard-page">
    <section class="hero-panel" aria-labelledby="dashboard-greeting">
      <div class="hero-panel__grid" aria-hidden="true" />
      <div class="hero-panel__glow hero-panel__glow--one" aria-hidden="true" />
      <div class="hero-panel__glow hero-panel__glow--two" aria-hidden="true" />
      <div class="hero-copy">
        <div class="eyebrow">
          <i />
          PERSONAL OPERATING SYSTEM
        </div>
        <div class="identity-row">
          <div class="avatar-shell">
            <img v-if="avatarUrl" :src="avatarUrl" alt="用户头像" />
            <el-icon v-else><UserFilled /></el-icon>
          </div>
          <div>
            <p class="date-line">{{ formattedDate }}</p>
            <h1 id="dashboard-greeting">{{ greeting }}</h1>
          </div>
        </div>
        <p class="hero-message">{{ timeMessage }}</p>
        <div class="hero-actions">
          <button
            type="button"
            class="action-button action-button--primary"
            @click="go('/business/cashier')"
          >
            <el-icon><CoffeeCup /></el-icon>
            开始营业
            <el-icon class="action-button__arrow"><ArrowRight /></el-icon>
          </button>
          <button
            type="button"
            class="action-button action-button--ghost"
            @click="go('/calendar/unified')"
          >
            查看今日事务
          </button>
        </div>
      </div>
      <div class="cat-observatory" aria-hidden="true">
        <div class="cat-observatory__orbit cat-observatory__orbit--outer" />
        <div class="cat-observatory__orbit cat-observatory__orbit--inner" />
        <div class="cat-status">
          <span />
          OBSERVER CAT · ONLINE
        </div>
        <div class="cat-observatory__stage">
          <span class="cat-signal cat-signal--one" />
          <span class="cat-signal cat-signal--two" />
          <span class="cat-signal cat-signal--three" />
          <img class="cat-illustration" :src="catObservatoryImage" alt="" draggable="false" />
        </div>
        <div class="cat-observatory__caption">
          <span>{{ timeMode }}</span>
          <i />
          <span>{{ currentTime }}</span>
        </div>
      </div>
    </section>
    <section class="overview-section" aria-labelledby="overview-title">
      <header class="section-heading">
        <div>
          <p>LIVE OVERVIEW</p>
          <h2 id="overview-title">此刻，三条生活线正在发生</h2>
        </div>
        <span class="section-heading__note">数据来自现有工作模块</span>
      </header>
      <div class="overview-grid">
        <article
          class="overview-card overview-card--coffee"
          role="link"
          tabindex="0"
          aria-label="进入咖啡摊经营数据"
          @click="go('/business/statistics')"
          @keydown.enter="go('/business/statistics')"
          @keydown.space.prevent="go('/business/statistics')"
        >
          <div class="overview-card__beam" />
          <header class="overview-card__header">
            <div class="module-mark">
              <el-icon><CoffeeCup /></el-icon>
            </div>
            <div>
              <p>COFFEE STALL</p>
              <h3>咖啡摊经营</h3>
            </div>
            <el-icon class="card-arrow"><ArrowRight /></el-icon>
          </header>
          <div v-if="businessState === 'loading'" class="loading-lines" aria-label="正在加载">
            <i />
            <i />
            <i />
          </div>
          <div v-else-if="businessState === 'error'" class="state-message">
            <strong>经营数据暂时离线</strong>
            <span>{{ businessError }}</span>
            <button type="button" @click.stop="loadBusiness">
              <el-icon><RefreshRight /></el-icon>
              重试
            </button>
          </div>
          <div v-else class="overview-card__content">
            <span class="metric-label">今日营收</span>
            <strong class="metric-value">{{ formatMoney(businessSummary.revenue) }}</strong>
            <div class="metric-foot">
              <span>
                <i class="pulse-dot" />
                {{ activeOrderText }}
              </span>
              <button type="button" @click.stop="go('/business/cashier')">
                <el-icon><ShoppingCart /></el-icon>
                进入收银台
              </button>
            </div>
          </div>
        </article>
        <article
          class="overview-card overview-card--travel"
          role="link"
          tabindex="0"
          aria-label="进入行程规划"
          @click="go(nextTrip?.route ?? '/travel/weekend')"
          @keydown.enter="go(nextTrip?.route ?? '/travel/weekend')"
          @keydown.space.prevent="go(nextTrip?.route ?? '/travel/weekend')"
        >
          <div class="overview-card__beam" />
          <header class="overview-card__header">
            <div class="module-mark">
              <el-icon><Location /></el-icon>
            </div>
            <div>
              <p>NEXT JOURNEY</p>
              <h3>行程规划</h3>
            </div>
            <el-icon class="card-arrow"><ArrowRight /></el-icon>
          </header>
          <div v-if="travelState === 'loading'" class="loading-lines" aria-label="正在加载">
            <i />
            <i />
            <i />
          </div>
          <div v-else-if="travelState === 'error'" class="state-message">
            <strong>行程信号暂时中断</strong>
            <span>{{ travelError }}</span>
            <button type="button" @click.stop="loadTravel">
              <el-icon><RefreshRight /></el-icon>
              重试
            </button>
          </div>
          <div v-else class="overview-card__content">
            <template v-if="nextTrip">
              <span class="metric-label">{{ tripCountdownText }}</span>
              <strong class="metric-title">{{ nextTrip.title }}</strong>
              <div class="metric-foot">
                <span class="truncate-line">
                  <el-icon><Location /></el-icon>
                  {{ nextTrip.destination }}
                </span>
                <time :datetime="nextTrip.date">{{ formatShortDate(nextTrip.date) }}</time>
              </div>
            </template>
            <template v-else>
              <span class="metric-label">下一站</span>
              <strong class="metric-title">暂无近期行程</strong>
              <div class="metric-foot">
                <span>留一点空白，等灵感出现</span>
                <b>去规划</b>
              </div>
            </template>
          </div>
        </article>
        <article
          class="overview-card overview-card--affairs"
          role="link"
          tabindex="0"
          aria-label="进入事务管理"
          @click="go('/affairs/todolist')"
          @keydown.enter="go('/affairs/todolist')"
          @keydown.space.prevent="go('/affairs/todolist')"
        >
          <div class="overview-card__beam" />
          <header class="overview-card__header">
            <div class="module-mark">
              <el-icon><Tickets /></el-icon>
            </div>
            <div>
              <p>FOCUS QUEUE</p>
              <h3>事务管理</h3>
            </div>
            <el-icon class="card-arrow"><ArrowRight /></el-icon>
          </header>
          <div v-if="affairsState === 'loading'" class="loading-lines" aria-label="正在加载">
            <i />
            <i />
            <i />
          </div>
          <div v-else-if="affairsState === 'error'" class="state-message">
            <strong>事务队列暂时离线</strong>
            <span>{{ affairsError }}</span>
            <button type="button" @click.stop="loadAffairs">
              <el-icon><RefreshRight /></el-icon>
              重试
            </button>
          </div>
          <div v-else class="overview-card__content">
            <span class="metric-label">{{ todoDueText }}</span>
            <strong class="metric-title">
              {{ affairsSummary.nextTodo?.title ?? "手头没有未完成事项" }}
            </strong>
            <div class="metric-foot">
              <span>{{ affairsSummary.openCount }} 项正在推进</span>
              <b :class="{ 'is-danger': affairsSummary.overdueCount > 0 }">
                {{
                  affairsSummary.overdueCount > 0
                    ? `${affairsSummary.overdueCount} 项逾期`
                    : "节奏良好"
                }}
              </b>
            </div>
          </div>
        </article>
      </div>
    </section>
    <section class="recent-section" aria-labelledby="recent-title">
      <header class="section-heading section-heading--recent">
        <div>
          <p>RECENT PATHS</p>
          <h2 id="recent-title">最近访问</h2>
        </div>
        <button
          v-if="recentMenus.length"
          type="button"
          class="clear-button"
          @click="handleClearRecentMenus"
        >
          清空记录
        </button>
      </header>
      <div v-if="recentMenus.length" class="recent-grid">
        <button
          v-for="(item, index) in recentMenus"
          :key="item.path"
          type="button"
          class="recent-item"
          :style="{ '--item-index': index }"
          @click="go(item.path)"
        >
          <span class="recent-item__icon">
            <el-icon v-if="item.icon?.startsWith('el-icon-')">
              <component :is="item.icon.replace('el-icon-', '')" />
            </el-icon>
            <i v-else-if="item.icon" :class="`i-svg:${item.icon}`" />
            <el-icon v-else><Menu /></el-icon>
          </span>
          <span class="recent-item__copy">
            <strong>{{ item.title }}</strong>
            <small>{{ formatVisitTime(item.visitedAt) }}</small>
          </span>
          <el-icon class="recent-item__arrow"><ArrowRight /></el-icon>
        </button>
      </div>
      <div v-else class="recent-empty">
        <div class="paw-mark" aria-hidden="true">
          <i />
          <i />
          <i />
          <b />
        </div>
        <strong>足迹还没有落在这里</strong>
        <span>访问过的功能会自动成为你的快捷路径</span>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { ElMessageBox } from "element-plus";
import {
  ArrowRight,
  CoffeeCup,
  Location,
  Menu,
  RefreshRight,
  ShoppingCart,
  Tickets,
  UserFilled,
} from "@element-plus/icons-vue";
import { useUserStore } from "@/stores/user";
import { useRecentMenus } from "@/composables";
import catObservatoryImage from "@/assets/images/dashboard/cat-observatory.webp";
import { useDashboardOverview } from "./composables/useDashboardOverview";

defineOptions({ name: "Dashboard", inheritAttrs: false });

const router = useRouter();
const userStore = useUserStore();
const { recentMenus, clearRecentMenus, formatVisitTime } = useRecentMenus();
const {
  now,
  businessState,
  travelState,
  affairsState,
  businessError,
  travelError,
  affairsError,
  businessSummary,
  nextTrip,
  affairsSummary,
  loadBusiness,
  loadTravel,
  loadAffairs,
} = useDashboardOverview();

const nickname = computed(() => userStore.userInfo.nickname?.trim() || "主理人");
const avatarUrl = computed(() => userStore.userInfo.avatar || "");
const hour = computed(() => now.value.getHours());
const formattedDate = computed(() =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(now.value)
);
const currentTime = computed(() =>
  new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now.value)
);

const greeting = computed(() => {
  if (hour.value < 6) return `夜深了，${nickname.value}`;
  if (hour.value < 12) return `早上好，${nickname.value}`;
  if (hour.value < 18) return `下午好，${nickname.value}`;
  return `晚上好，${nickname.value}`;
});
const timeMessage = computed(() => {
  if (hour.value < 6) return "让未完成的事暂时休眠，灵感会在明天重新亮起。";
  if (hour.value < 12) return "把今天调到合适的浓度，清醒、从容，然后出发。";
  if (hour.value < 18) return "保持自己的节奏，让经营、远方与生活各自向前。";
  return "把一天轻轻收拢，重要的事已经在正确的位置。";
});
const timeMode = computed(() => {
  if (hour.value < 6) return "DREAM MODE";
  if (hour.value < 12) return "MORNING MODE";
  if (hour.value < 18) return "FLOW MODE";
  return "EVENING MODE";
});
const activeOrderText = computed(() =>
  businessSummary.value.activeOrders
    ? `${businessSummary.value.activeOrders} 单正在流转`
    : "今日队列清爽"
);
const tripCountdownText = computed(() => {
  const days = nextTrip.value?.daysUntil;
  if (days === undefined) return "下一站";
  if (days === 0) return "今天出发";
  if (days === 1) return "明天出发";
  return `${days} 天后出发`;
});
const todoDueText = computed(() => {
  const todo = affairsSummary.value.nextTodo;
  const days = affairsSummary.value.dueDays;
  if (!todo) return "当前节奏";
  if (days === null) return "未设置截止日期";
  if (days < 0) return `已逾期 ${Math.abs(days)} 天`;
  if (days === 0) return "今天截止";
  if (days === 1) return "明天截止";
  return `${days} 天后截止`;
});

function formatMoney(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatShortDate(date: string): string {
  if (!date) return "日期待定";
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(
    new Date(`${date}T00:00:00`)
  );
}

function go(path: string) {
  void router.push(path);
}

async function handleClearRecentMenus() {
  try {
    await ElMessageBox.confirm("清空后将无法恢复这些访问足迹。", "确认清空最近访问？", {
      type: "warning",
      confirmButtonText: "确认清空",
      cancelButtonText: "保留记录",
    });
    clearRecentMenus();
  } catch {
    // 用户取消时保持原有记录。
  }
}
</script>

<style lang="scss" scoped>
.dashboard-page {
  --dash-ink: #15213f;
  --dash-muted: #687593;
  --dash-line: rgb(103 135 181 / 16%);
  --dash-glass: rgb(255 255 255 / 72%);
  --dash-glass-strong: rgb(255 255 255 / 88%);
  --dash-shadow: 0 24px 70px rgb(58 87 132 / 12%);
  --dash-blue: #5789ff;
  --dash-cyan: #55cde2;
  --dash-danger: #e8687b;

  position: relative;
  min-height: 100%;
  padding: clamp(16px, 2.1vw, 30px);
  overflow: hidden;
  color: var(--dash-ink);
  background:
    radial-gradient(circle at 86% 4%, rgb(146 196 255 / 19%), transparent 32%),
    radial-gradient(circle at 4% 35%, rgb(181 159 255 / 13%), transparent 29%),
    linear-gradient(145deg, #f8fbff 0%, #f5f7fd 48%, #f9fbff 100%);
}

:global(html.dark) .dashboard-page {
  --dash-ink: #f1f5ff;
  --dash-muted: #9eabc5;
  --dash-line: rgb(159 185 235 / 14%);
  --dash-glass: rgb(20 30 53 / 68%);
  --dash-glass-strong: rgb(24 35 61 / 88%);
  --dash-shadow: 0 28px 80px rgb(0 0 0 / 28%);
  --dash-blue: #75a0ff;
  --dash-cyan: #68d5e8;
  --dash-danger: #ff8595;

  background:
    radial-gradient(circle at 86% 4%, rgb(74 123 211 / 20%), transparent 34%),
    radial-gradient(circle at 4% 35%, rgb(108 81 180 / 17%), transparent 31%),
    linear-gradient(145deg, #0f1728 0%, #111a2d 48%, #0d1424 100%);
}

button {
  font: inherit;
}
.hero-panel,
.overview-card,
.recent-section {
  border: 1px solid var(--dash-line);
  box-shadow: var(--dash-shadow);
}

.hero-panel {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  min-height: 350px;
  overflow: hidden;
  background: linear-gradient(135deg, var(--dash-glass-strong), var(--dash-glass));
  border-radius: 30px;
  isolation: isolate;
  animation: dashboard-reveal 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.hero-panel::after {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  content: "";
  background: linear-gradient(
    115deg,
    rgb(255 255 255 / 38%),
    transparent 32% 72%,
    rgb(118 166 255 / 10%)
  );
}
.hero-panel__grid {
  position: absolute;
  inset: 0;
  z-index: -2;
  background-image:
    linear-gradient(var(--dash-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--dash-line) 1px, transparent 1px);
  background-size: 38px 38px;
  opacity: 0.4;
  mask-image: linear-gradient(90deg, transparent 4%, #000 48%, transparent 96%);
}
.hero-panel__glow {
  position: absolute;
  z-index: -1;
  width: 280px;
  height: 280px;
  pointer-events: none;
  border-radius: 50%;
  filter: blur(6px);
}
.hero-panel__glow--one {
  top: -150px;
  left: 31%;
  background: rgb(127 180 255 / 18%);
}
.hero-panel__glow--two {
  right: -70px;
  bottom: -190px;
  background: rgb(154 130 255 / 21%);
}
.hero-copy {
  z-index: 1;
  align-self: center;
  padding: clamp(32px, 4vw, 62px);
}
.eyebrow,
.cat-status,
.cat-observatory__caption,
.section-heading p,
.overview-card__header p {
  letter-spacing: 0.16em;
}
.eyebrow {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 28px;
  font-size: 11px;
  font-weight: 700;
  color: var(--dash-blue);
}
.eyebrow i {
  width: 6px;
  height: 6px;
  background: var(--dash-cyan);
  border-radius: 50%;
  box-shadow:
    0 0 0 5px rgb(85 205 226 / 13%),
    0 0 18px var(--dash-cyan);
  animation: status-pulse 2.4s ease-in-out infinite;
}
.identity-row {
  display: flex;
  gap: 18px;
  align-items: center;
}
.identity-row h1 {
  margin: 3px 0 0;
  font-size: clamp(29px, 3.2vw, 48px);
  font-weight: 650;
  line-height: 1.15;
  letter-spacing: -0.045em;
}
.avatar-shell {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 58px;
  height: 58px;
  overflow: hidden;
  font-size: 24px;
  color: var(--dash-blue);
  background: linear-gradient(145deg, rgb(255 255 255 / 80%), rgb(152 192 255 / 28%));
  border: 1px solid rgb(255 255 255 / 70%);
  border-radius: 19px;
  box-shadow:
    0 12px 30px rgb(65 95 145 / 16%),
    inset 0 0 0 4px rgb(255 255 255 / 25%);
}
.avatar-shell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.date-line {
  margin: 0;
  font-size: 13px;
  color: var(--dash-muted);
}
.hero-message {
  max-width: 570px;
  margin: 22px 0 0;
  font-size: 15px;
  line-height: 1.85;
  color: var(--dash-muted);
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}
.action-button {
  display: inline-flex;
  gap: 9px;
  align-items: center;
  height: 44px;
  padding: 0 18px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-ink);
  cursor: pointer;
  background: rgb(255 255 255 / 38%);
  border: 1px solid var(--dash-line);
  border-radius: 14px;
  transition:
    transform 220ms ease,
    box-shadow 220ms ease,
    background-color 220ms ease;
}
.action-button:hover {
  background: rgb(255 255 255 / 65%);
  box-shadow: 0 12px 30px rgb(64 102 159 / 12%);
  transform: translateY(-2px);
}
.action-button--primary {
  color: #fff;
  background: linear-gradient(135deg, #4d7ff2, #776eea);
  border-color: transparent;
  box-shadow: 0 12px 28px rgb(83 105 224 / 26%);
}
.action-button--primary:hover {
  background: linear-gradient(135deg, #5689fa, #8177f2);
}
:global(html.dark) .action-button--ghost:hover {
  background: rgb(255 255 255 / 8%);
}
.action-button__arrow {
  margin-left: 5px;
}

.cat-observatory {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 350px;
}
.cat-observatory__orbit {
  position: absolute;
  border: 1px solid rgb(113 160 223 / 18%);
  border-radius: 50%;
}
.cat-observatory__orbit--outer {
  width: min(33vw, 410px);
  height: min(33vw, 410px);
  background: radial-gradient(
    circle at 37% 27%,
    rgb(255 255 255 / 52%),
    rgb(117 169 241 / 9%) 48%,
    transparent 70%
  );
  box-shadow:
    inset 0 0 70px rgb(116 163 230 / 10%),
    0 24px 80px rgb(72 111 171 / 10%);
  animation: observatory-orbit 24s linear infinite;
}
.cat-observatory__orbit--outer::before,
.cat-observatory__orbit--outer::after {
  position: absolute;
  content: "";
  border-radius: 50%;
}
.cat-observatory__orbit--outer::before {
  inset: 12%;
  border: 1px dashed rgb(95 154 234 / 22%);
}
.cat-observatory__orbit--outer::after {
  top: 9%;
  left: 18%;
  width: 8px;
  height: 8px;
  background: var(--dash-cyan);
  box-shadow:
    0 0 0 6px rgb(85 205 226 / 10%),
    0 0 22px rgb(85 205 226 / 55%);
}
.cat-observatory__orbit--inner {
  width: min(27vw, 330px);
  height: min(27vw, 330px);
  border-color: rgb(255 255 255 / 58%);
  box-shadow: inset 18px 12px 48px rgb(255 255 255 / 18%);
  transform: rotate(-14deg) scaleY(0.76);
}
.cat-status {
  position: absolute;
  top: 36px;
  right: 40px;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 11px;
  font-size: 9px;
  font-weight: 700;
  color: var(--dash-muted);
  background: var(--dash-glass-strong);
  border: 1px solid var(--dash-line);
  border-radius: 999px;
  backdrop-filter: blur(14px);
}
.cat-status span {
  width: 5px;
  height: 5px;
  background: #63d9bd;
  border-radius: 50%;
  box-shadow: 0 0 10px #63d9bd;
}
.cat-observatory__stage {
  position: relative;
  z-index: 1;
  width: min(35vw, 420px);
  isolation: isolate;
  animation: cat-breathe 5s ease-in-out infinite;
}
.cat-observatory__stage::after {
  position: absolute;
  right: 8%;
  bottom: 2%;
  left: 9%;
  z-index: -1;
  height: 15%;
  content: "";
  background: rgb(37 74 135 / 24%);
  border-radius: 50%;
  filter: blur(18px);
  transform: scaleY(0.42);
}
.cat-illustration {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: auto;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 20px 24px rgb(17 30 57 / 22%)) drop-shadow(0 0 18px rgb(90 151 255 / 10%));
}
.cat-signal {
  position: absolute;
  z-index: 2;
  width: 5px;
  height: 5px;
  pointer-events: none;
  background: var(--dash-cyan);
  border-radius: 50%;
  box-shadow: 0 0 14px var(--dash-cyan);
  animation: cat-signal 2.8s ease-in-out infinite;
}
.cat-signal--one {
  top: 16%;
  left: 12%;
}
.cat-signal--two {
  top: 27%;
  right: 8%;
  animation-delay: -900ms;
}
.cat-signal--three {
  right: 18%;
  bottom: 18%;
  width: 3px;
  height: 3px;
  animation-delay: -1.8s;
}
.cat-observatory__caption {
  position: absolute;
  right: 50%;
  bottom: 27px;
  z-index: 2;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 14px;
  font-size: 9px;
  font-weight: 700;
  color: var(--dash-muted);
  white-space: nowrap;
  background: var(--dash-glass-strong);
  border: 1px solid var(--dash-line);
  border-radius: 999px;
  backdrop-filter: blur(14px);
  transform: translateX(50%);
}
.cat-observatory__caption i {
  width: 20px;
  height: 1px;
  background: var(--dash-line);
}
.overview-section,
.recent-section {
  margin-top: 28px;
}
.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 15px;
}
.section-heading p {
  margin: 0 0 7px;
  font-size: 9px;
  font-weight: 800;
  color: var(--dash-blue);
}
.section-heading h2 {
  margin: 0;
  font-size: clamp(18px, 2vw, 24px);
  font-weight: 650;
  letter-spacing: -0.025em;
}
.section-heading__note {
  font-size: 12px;
  color: var(--dash-muted);
}
.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.overview-card {
  --card-accent: var(--dash-blue);

  position: relative;
  min-width: 0;
  min-height: 254px;
  padding: 22px;
  overflow: hidden;
  cursor: pointer;
  outline: none;
  background: linear-gradient(145deg, var(--dash-glass-strong), var(--dash-glass));
  border-radius: 22px;
  transition:
    transform 250ms ease,
    border-color 250ms ease,
    box-shadow 250ms ease;
  animation: dashboard-reveal 650ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.overview-card::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: "";
  background: radial-gradient(
    circle at 0 0,
    color-mix(in srgb, var(--card-accent) 13%, transparent),
    transparent 43%
  );
}
.overview-card:hover,
.overview-card:focus-visible {
  border-color: color-mix(in srgb, var(--card-accent) 35%, transparent);
  box-shadow: 0 28px 70px rgb(56 86 139 / 17%);
  transform: translateY(-5px);
}
.overview-card:hover .card-arrow,
.overview-card:focus-visible .card-arrow {
  color: var(--card-accent);
  transform: translateX(3px);
}
.overview-card:hover .overview-card__beam,
.overview-card:focus-visible .overview-card__beam {
  transform: translateX(120%) rotate(18deg);
}
.overview-card--coffee {
  --card-accent: #5b87ee;
  animation-delay: 80ms;
}
.overview-card--travel {
  --card-accent: #8a76ef;
  animation-delay: 150ms;
}
.overview-card--affairs {
  --card-accent: #49b8cd;
  animation-delay: 220ms;
}
.overview-card__beam {
  position: absolute;
  top: -70px;
  left: -45%;
  width: 35%;
  height: 400px;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 34%), transparent);
  transform: rotate(18deg);
  transition: transform 800ms cubic-bezier(0.22, 1, 0.36, 1);
}
.overview-card__header {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
}
.overview-card__header p,
.overview-card__header h3 {
  margin: 0;
}
.overview-card__header p {
  margin-bottom: 3px;
  font-size: 8px;
  font-weight: 800;
  color: var(--dash-muted);
}
.overview-card__header h3 {
  font-size: 15px;
  font-weight: 650;
}
.module-mark {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  font-size: 19px;
  color: var(--card-accent);
  background: color-mix(in srgb, var(--card-accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--card-accent) 18%, transparent);
  border-radius: 13px;
}
.card-arrow {
  color: var(--dash-muted);
  transition:
    color 200ms ease,
    transform 200ms ease;
}

.overview-card__content {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 156px;
  padding-top: 26px;
}
.metric-label {
  margin-bottom: 7px;
  font-size: 12px;
  color: var(--dash-muted);
}
.metric-value {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: clamp(32px, 3vw, 43px);
  font-weight: 670;
  line-height: 1.12;
  letter-spacing: -0.055em;
  white-space: nowrap;
}
.metric-title {
  display: -webkit-box;
  min-height: 54px;
  overflow: hidden;
  -webkit-line-clamp: 2;
  font-size: clamp(21px, 2.2vw, 28px);
  font-weight: 650;
  line-height: 1.25;
  letter-spacing: -0.035em;
  -webkit-box-orient: vertical;
}
.metric-foot {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  padding-top: 14px;
  margin-top: 18px;
  font-size: 11px;
  color: var(--dash-muted);
  border-top: 1px solid var(--dash-line);
}
.metric-foot > span {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
}
.metric-foot button {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  padding: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--card-accent);
  cursor: pointer;
  background: transparent;
  border: 0;
}
.metric-foot b,
.metric-foot time {
  flex: 0 0 auto;
  font-weight: 650;
  color: var(--card-accent);
}
.metric-foot .is-danger {
  color: var(--dash-danger);
}
.truncate-line {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pulse-dot {
  width: 6px;
  height: 6px;
  background: #64d2ba;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgb(100 210 186 / 12%);
}
.loading-lines,
.state-message {
  position: relative;
  min-height: 156px;
  margin-top: 26px;
}
.loading-lines {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.loading-lines i {
  display: block;
  height: 12px;
  margin-top: 10px;
  background: linear-gradient(90deg, var(--dash-line), rgb(255 255 255 / 45%), var(--dash-line));
  background-size: 220% 100%;
  border-radius: 999px;
  animation: skeleton-flow 1.5s ease infinite;
}
.loading-lines i:first-child {
  width: 38%;
  height: 10px;
}
.loading-lines i:nth-child(2) {
  width: 74%;
  height: 34px;
}
.loading-lines i:last-child {
  width: 100%;
}
.state-message {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.state-message strong {
  margin-bottom: 7px;
  font-size: 17px;
}
.state-message span {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  color: var(--dash-muted);
  white-space: nowrap;
}
.state-message button {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  width: fit-content;
  padding: 7px 11px;
  margin-top: 16px;
  font-size: 11px;
  color: var(--card-accent);
  cursor: pointer;
  background: color-mix(in srgb, var(--card-accent) 9%, transparent);
  border: 1px solid color-mix(in srgb, var(--card-accent) 17%, transparent);
  border-radius: 9px;
}
.recent-section {
  padding: clamp(20px, 2.5vw, 32px);
  background: linear-gradient(145deg, var(--dash-glass-strong), var(--dash-glass));
  border-radius: 26px;
  animation: dashboard-reveal 650ms 280ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.section-heading--recent {
  align-items: center;
}
.clear-button {
  padding: 8px 12px;
  font-size: 11px;
  color: var(--dash-muted);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--dash-line);
  border-radius: 10px;
  transition:
    color 200ms ease,
    border-color 200ms ease,
    background-color 200ms ease;
}
.clear-button:hover {
  color: var(--dash-danger);
  background: rgb(232 104 123 / 6%);
  border-color: rgb(232 104 123 / 24%);
}
.recent-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.recent-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 11px;
  align-items: center;
  min-width: 0;
  padding: 13px;
  color: var(--dash-ink);
  text-align: left;
  cursor: pointer;
  background: rgb(255 255 255 / 26%);
  border: 1px solid var(--dash-line);
  border-radius: 15px;
  transition:
    background-color 200ms ease,
    transform 200ms ease,
    border-color 200ms ease;
  animation: recent-reveal 500ms calc(var(--item-index) * 45ms + 320ms) both;
}
.recent-item:hover,
.recent-item:focus-visible {
  outline: none;
  background: color-mix(in srgb, var(--dash-blue) 7%, var(--dash-glass-strong));
  border-color: rgb(87 137 255 / 22%);
  transform: translateY(-2px);
}
.recent-item:hover .recent-item__arrow,
.recent-item:focus-visible .recent-item__arrow {
  color: var(--dash-blue);
  transform: translateX(2px);
}
:global(html.dark) .recent-item {
  background: rgb(255 255 255 / 3%);
}
.recent-item__icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  font-size: 17px;
  color: var(--dash-blue);
  background: rgb(87 137 255 / 9%);
  border-radius: 11px;
}
.recent-item__copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.recent-item__copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  font-weight: 620;
  white-space: nowrap;
}
.recent-item__copy small {
  font-size: 10px;
  color: var(--dash-muted);
}
.recent-item__arrow {
  font-size: 12px;
  color: var(--dash-muted);
  transition:
    color 200ms ease,
    transform 200ms ease;
}
.recent-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  color: var(--dash-muted);
}
.recent-empty strong {
  margin-top: 12px;
  font-size: 14px;
  color: var(--dash-ink);
}
.recent-empty span {
  margin-top: 5px;
  font-size: 11px;
}
.paw-mark {
  position: relative;
  width: 48px;
  height: 42px;
  color: var(--dash-blue);
}
.paw-mark i,
.paw-mark b {
  position: absolute;
  display: block;
  background: currentcolor;
  border-radius: 50%;
}
.paw-mark i {
  top: 3px;
  width: 11px;
  height: 14px;
}
.paw-mark i:first-child {
  left: 5px;
  transform: rotate(-25deg);
}
.paw-mark i:nth-child(2) {
  top: 0;
  left: 19px;
}
.paw-mark i:nth-child(3) {
  right: 4px;
  transform: rotate(25deg);
}
.paw-mark b {
  bottom: 0;
  left: 10px;
  width: 30px;
  height: 25px;
  opacity: 0.75;
}
@keyframes dashboard-reveal {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes recent-reveal {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes status-pulse {
  50% {
    opacity: 0.55;
    transform: scale(0.75);
  }
}
@keyframes cat-breathe {
  50% {
    transform: translateY(-4px) scale(1.008);
  }
}
@keyframes cat-signal {
  0%,
  100% {
    opacity: 0.25;
    transform: scale(0.72);
  }
  50% {
    opacity: 1;
    transform: scale(1.35);
  }
}
@keyframes observatory-orbit {
  to {
    transform: rotate(360deg);
  }
}
@keyframes skeleton-flow {
  to {
    background-position: -220% 0;
  }
}

@media (max-width: 1100px) {
  .hero-panel {
    grid-template-columns: minmax(0, 1fr) 330px;
  }
  .cat-observatory__orbit--outer {
    width: 330px;
    height: 330px;
  }
  .cat-observatory__orbit--inner {
    width: 270px;
    height: 270px;
  }
  .cat-observatory__stage {
    width: 340px;
  }
  .recent-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .hero-panel {
    grid-template-columns: 1fr 265px;
    min-height: 320px;
  }
  .hero-copy {
    padding: 32px;
  }
  .cat-observatory {
    min-height: 320px;
  }
  .cat-observatory__orbit--outer {
    width: 270px;
    height: 270px;
  }
  .cat-observatory__orbit--inner {
    width: 220px;
    height: 220px;
  }
  .cat-observatory__stage {
    width: 280px;
  }
  .cat-status {
    top: 24px;
    right: 20px;
  }
  .overview-grid {
    grid-template-columns: 1fr;
  }
  .overview-card {
    min-height: 230px;
  }
  .overview-card__content,
  .loading-lines,
  .state-message {
    min-height: 130px;
  }
}

@media (max-width: 640px) {
  .dashboard-page {
    padding: 12px;
  }
  .hero-panel {
    display: block;
    min-height: 480px;
    border-radius: 24px;
  }
  .hero-copy {
    position: relative;
    z-index: 3;
    padding: 27px 24px 0;
  }
  .eyebrow {
    margin-bottom: 20px;
  }
  .identity-row {
    gap: 13px;
  }
  .identity-row h1 {
    font-size: 28px;
  }
  .avatar-shell {
    width: 50px;
    height: 50px;
    border-radius: 16px;
  }
  .hero-message {
    margin-top: 16px;
    font-size: 13px;
    line-height: 1.7;
  }
  .hero-actions {
    margin-top: 20px;
  }
  .action-button {
    height: 40px;
    padding: 0 14px;
  }
  .cat-observatory {
    position: absolute;
    right: -20px;
    bottom: -12px;
    width: 280px;
    min-height: 245px;
    opacity: 0.93;
  }
  .cat-observatory__orbit--outer {
    width: 250px;
    height: 250px;
  }
  .cat-observatory__orbit--inner {
    width: 205px;
    height: 205px;
  }
  .cat-observatory__stage {
    width: 260px;
  }
  .cat-status {
    display: none;
  }
  .cat-observatory__caption {
    right: 48%;
    bottom: 6px;
  }
  .section-heading__note {
    display: none;
  }
  .overview-section,
  .recent-section {
    margin-top: 20px;
  }
  .overview-grid {
    gap: 12px;
  }
  .overview-card {
    padding: 19px;
    border-radius: 19px;
  }
  .recent-section {
    padding: 20px;
    border-radius: 22px;
  }
  .recent-grid {
    grid-template-columns: 1fr;
  }
  .recent-item {
    padding: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-panel,
  .overview-card,
  .recent-section,
  .recent-item,
  .cat-observatory__stage,
  .cat-observatory__orbit--outer,
  .cat-signal,
  .eyebrow i,
  .loading-lines i {
    animation: none !important;
  }
  .overview-card,
  .recent-item,
  .action-button,
  .card-arrow,
  .recent-item__arrow,
  .overview-card__beam {
    transition: none !important;
  }
}
</style>
