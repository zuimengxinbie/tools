import { ref } from "vue";

/**
 * 行高亮 hook：用于 el-table。
 * - flashHighlight(id) 标记某行高亮 3 秒
 * - rowClassName 传入 el-table 的 :row-class-name
 */
export function useHighlightRow<T extends { id: number | string }>(durationMs = 3000) {
  const highlightId = ref<number | string | null>(null);
  let timer: ReturnType<typeof setTimeout> | null = null;

  const rowClassName = ({ row }: { row: T }) =>
    row.id === highlightId.value ? "is-highlight" : "";

  const flashHighlight = (id: number | string) => {
    highlightId.value = id;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      highlightId.value = null;
      timer = null;
    }, durationMs);
  };

  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer);
  });

  return { highlightId, flashHighlight, rowClassName };
}
