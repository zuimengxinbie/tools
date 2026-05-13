import type { TodoCategory, TodoPriority, TodoStatus, TodoRepeat } from "@/api/affairs";

export type ElTagType = "primary" | "success" | "warning" | "info" | "danger";

export interface CategoryMeta {
  label: string;
  tagType: ElTagType | "";
  icon: string;
}

export const categoryMap: Record<TodoCategory, CategoryMeta> = {
  work: { label: "工作", tagType: "primary", icon: "el-icon-Briefcase" },
  study: { label: "学习", tagType: "success", icon: "el-icon-Reading" },
  life: { label: "生活", tagType: "info", icon: "el-icon-House" },
  health: { label: "健康", tagType: "warning", icon: "el-icon-FirstAidKit" },
  family: { label: "家庭", tagType: "danger", icon: "el-icon-Avatar" },
  finance: { label: "财务", tagType: "warning", icon: "el-icon-Money" },
  shopping: { label: "购物", tagType: "info", icon: "el-icon-ShoppingCart" },
  hobby: { label: "兴趣", tagType: "success", icon: "el-icon-Football" },
  other: { label: "其他", tagType: "", icon: "el-icon-More" },
};

export const priorityMap: Record<
  TodoPriority,
  { label: string; tagType: ElTagType; weight: number }
> = {
  urgent: { label: "紧急", tagType: "danger", weight: 4 },
  high: { label: "高", tagType: "warning", weight: 3 },
  medium: { label: "中", tagType: "primary", weight: 2 },
  low: { label: "低", tagType: "info", weight: 1 },
};

export const statusMap: Record<TodoStatus, { label: string; tagType: ElTagType }> = {
  todo: { label: "待办", tagType: "info" },
  doing: { label: "进行中", tagType: "primary" },
  done: { label: "已完成", tagType: "success" },
  cancelled: { label: "已取消", tagType: "danger" },
};

export const repeatMap: Record<TodoRepeat, { label: string }> = {
  none: { label: "不重复" },
  daily: { label: "每日" },
  weekly: { label: "每周" },
  monthly: { label: "每月" },
};

/** 排序选项 */
export const sortOptions = [
  { value: "dueDate", label: "按截止日期" },
  { value: "priority", label: "按优先级" },
  { value: "createdAt", label: "按创建时间" },
] as const;

export type SortKey = (typeof sortOptions)[number]["value"];

/** 工具：今日 / 过期判断（基于 YYYY-MM-DD 字符串） */
export const todayStr = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const isOverdue = (dueDate: string, status: TodoStatus) => {
  if (!dueDate) return false;
  if (status === "done" || status === "cancelled") return false;
  return dueDate < todayStr();
};

export const isToday = (dueDate: string) => !!dueDate && dueDate === todayStr();

export const isSoon = (dueDate: string, status: TodoStatus, days = 3) => {
  if (!dueDate) return false;
  if (status === "done" || status === "cancelled") return false;
  const today = new Date(todayStr());
  const due = new Date(dueDate);
  const diff = (due.getTime() - today.getTime()) / 86400000;
  return diff >= 0 && diff <= days;
};

export const nowStr = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
