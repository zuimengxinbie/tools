import type { CostCategory, PrepCategory, PrepItem } from "@/api/travel";

/**
 * 生成不重复的数字 id：取列表中最大 id +1，保证连击不撞 id。
 */
export const genTripId = (list: ReadonlyArray<{ id: number }>): number => {
  const ids = list.map((t) => Number(t.id) || 0);
  return (ids.length ? Math.max(...ids) : 0) + 1;
};

/**
 * 将目的地字符串拆成多个 tag：支持 -、·、/、,、，、、 与空格分隔。
 */
export const splitDestination = (text: string): string[] => {
  if (!text) return [];
  return text
    .split(/[-·/,，、\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
};

/**
 * 计算两个 YYYY-MM-DD 之间的天数（含首尾）。
 */
export const calcDays = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return 0;
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
};

/**
 * 距出行开始日期的天数：
 *  > 0 表示还有 N 天
 *  = 0 表示今天出发
 *  < 0 表示已开始 / 已结束
 */
export const daysUntil = (start: string): number => {
  if (!start) return Number.NaN;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  return Math.round((s.getTime() - today.getTime()) / 86400000);
};

/**
 * 常见节日预设（可手填覆盖），列表页节日 emoji 也来自这里。
 */
export interface FestivalPreset {
  label: string;
  emoji: string;
}

export const FESTIVAL_PRESETS: FestivalPreset[] = [
  { label: "元旦", emoji: "🎆" },
  { label: "春节", emoji: "🏮" },
  { label: "元宵节", emoji: "🥮" },
  { label: "清明节", emoji: "🌸" },
  { label: "劳动节", emoji: "🛠️" },
  { label: "五一劳动节", emoji: "🛠️" },
  { label: "端午节", emoji: "🛶" },
  { label: "中秋节", emoji: "🌕" },
  { label: "国庆节", emoji: "🇨🇳" },
  { label: "圣诞节", emoji: "🎄" },
];

/* ---------------- 自定义节日（持久化到 localStorage） ---------------- */

const CUSTOM_FESTIVAL_KEY = "travel:custom-festivals";

/** 从 localStorage 读取用户自定义节日 */
export const loadCustomFestivals = (): FestivalPreset[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_FESTIVAL_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (it): it is FestivalPreset =>
        it && typeof it.label === "string" && typeof it.emoji === "string"
    );
  } catch {
    return [];
  }
};

/** 写回 localStorage */
export const saveCustomFestivals = (list: FestivalPreset[]): void => {
  try {
    localStorage.setItem(CUSTOM_FESTIVAL_KEY, JSON.stringify(list));
  } catch {
    /* 忽略写入失败（隐私模式 / 配额满） */
  }
};

/** 是否为内置预设（用于禁止删除） */
export const isBuiltInFestival = (label: string): boolean =>
  FESTIVAL_PRESETS.some((p) => p.label === label);

/**
 * 根据节日名匹配 emoji（找不到返回 🎉）
 * @param name 节日名
 * @param extras 额外的自定义节日列表（一般来自 useFestivalOptions().customs）
 */
export const getFestivalEmoji = (name: string, extras: FestivalPreset[] = []): string => {
  if (!name) return "🎉";
  const hit = [...FESTIVAL_PRESETS, ...extras].find((p) => name.includes(p.label));
  return hit?.emoji ?? "🎉";
};

/* ---------------- 费用 ---------------- */

/** 费用类目顺序与配色（与 ECharts 饼图 / tag 共用） */
export const COST_CATEGORIES: { label: CostCategory; color: string }[] = [
  { label: "交通", color: "#409eff" },
  { label: "住宿", color: "#67c23a" },
  { label: "餐饮", color: "#e6a23c" },
  { label: "门票", color: "#f56c6c" },
  { label: "购物", color: "#9b59b6" },
  { label: "其他", color: "#909399" },
];

const CUSTOM_COST_COLORS = ["#5c6bc0", "#26a69a", "#ab47bc", "#ef6c00", "#8d6e63", "#78909c"];

/** 自定义类目使用由名称稳定计算的颜色，保证列表与图表配色一致 */
export const getCostColor = (cat: CostCategory): string => {
  const presetColor = COST_CATEGORIES.find((item) => item.label === cat)?.color;
  if (presetColor) return presetColor;

  const hash = Array.from(cat).reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0);
  return CUSTOM_COST_COLORS[hash % CUSTOM_COST_COLORS.length];
};

/* ---------------- 出行准备 ---------------- */

export const PREP_CATEGORIES: PrepCategory[] = ["证件", "电子", "衣物", "药品", "食物", "其他"];

/** 必带项（默认勾选 + 不可删除） */
export const REQUIRED_PREP_NAMES = ["身份证", "手机", "充电宝"];
export const isRequiredPrep = (name: string) => REQUIRED_PREP_NAMES.includes(name);

/** 默认必带准备项（新增计划时填入） */
export const buildDefaultPreparation = (): PrepItem[] => [
  { id: 1, name: "身份证", category: "证件", done: false },
  { id: 2, name: "手机", category: "电子", done: false },
  { id: 3, name: "充电宝", category: "电子", done: false },
];

/** 准备清单模板：点击即填充对应项目 */
export const PREP_TEMPLATES: { label: string; items: Omit<PrepItem, "id">[] }[] = [
  {
    label: "国内 5 天",
    items: [
      { name: "身份证", category: "证件", done: false },
      { name: "手机", category: "电子", done: false },
      { name: "充电宝", category: "电子", done: false },
      { name: "充电线", category: "电子", done: false },
      { name: "换洗衣物", category: "衣物", done: false },
      { name: "雨伞", category: "衣物", done: false },
      { name: "牙刷牙膏", category: "其他", done: false },
      { name: "感冒药", category: "药品", done: false },
      { name: "创可贴", category: "药品", done: false },
    ],
  },
  {
    label: "花鸟岛游",
    items: [
      { name: "身份证", category: "证件", done: false },
      { name: "手机", category: "电子", done: true },
      { name: "充电宝", category: "电子", done: false },
      { name: "相机", category: "电子", done: false },
      { name: "大疆", category: "电子", done: false },
      { name: "充电器", category: "电子", done: false },
      { name: "车钥匙", category: "电子", done: false },
      { name: "厚外套", category: "衣物", done: false },
      { name: "感冒药", category: "药品", done: false },
      { name: "水果", category: "食物", done: false },
      { name: "喂猫", category: "其他", done: false },
      { name: "热水壶", category: "其他", done: false },
      { name: "洗漱用品", category: "其他", done: false },
      { name: "雨伞", category: "其他", done: false },
    ],
  },
];

/** 在已有列表上追加模板项（去重，按 name 比较） */
export const mergePrepTemplate = (
  existing: PrepItem[],
  tpl: Omit<PrepItem, "id">[]
): PrepItem[] => {
  const result = [...existing];
  let nextId = (existing.reduce((m, p) => Math.max(m, p.id), 0) || 0) + 1;
  for (const item of tpl) {
    if (result.some((p) => p.name === item.name)) continue;
    result.push({ ...item, id: nextId++ });
  }
  return result;
};
