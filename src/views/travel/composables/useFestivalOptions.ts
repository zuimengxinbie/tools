import {
  FESTIVAL_PRESETS,
  isBuiltInFestival,
  loadCustomFestivals,
  saveCustomFestivals,
  type FestivalPreset,
} from "./helpers";

/**
 * 节日选项管理：内置预设 + 用户自定义（localStorage 持久化）。
 *
 * 使用：
 * ```ts
 * const { allFestivals, customFestivals, addCustom, removeCustom } = useFestivalOptions();
 * ```
 */
export function useFestivalOptions() {
  const customFestivals = ref<FestivalPreset[]>(loadCustomFestivals());

  /** 预设 + 自定义 合并选项 */
  const allFestivals = computed<FestivalPreset[]>(() => [
    ...FESTIVAL_PRESETS,
    ...customFestivals.value,
  ]);

  /**
   * 添加自定义节日
   * @returns 是否添加成功（重名 / 内置项会拒绝）
   */
  const addCustom = (item: FestivalPreset): boolean => {
    const label = item.label.trim();
    const emoji = (item.emoji || "🎉").trim();
    if (!label) return false;
    if (allFestivals.value.some((f) => f.label === label)) return false;
    customFestivals.value.push({ label, emoji });
    saveCustomFestivals(customFestivals.value);
    return true;
  };

  /** 移除自定义节日（内置项不可移除） */
  const removeCustom = (label: string): boolean => {
    if (isBuiltInFestival(label)) return false;
    const before = customFestivals.value.length;
    customFestivals.value = customFestivals.value.filter((f) => f.label !== label);
    if (customFestivals.value.length === before) return false;
    saveCustomFestivals(customFestivals.value);
    return true;
  };

  return {
    customFestivals,
    allFestivals,
    addCustom,
    removeCustom,
    isBuiltInFestival,
  };
}
