import type { Ref } from "vue";
import { ElMessageBox } from "element-plus";
import { onBeforeRouteLeave } from "vue-router";

/**
 * dirty 守卫：
 * - 刷新/关闭浏览器时弹原生确认；
 * - 切路由时弹 ElMessageBox 二次确认。
 */
export function useDirtyGuard(
  dirty: Ref<boolean>,
  message = "有未保存的修改，确定要离开吗？修改将会丢失。"
) {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (!dirty.value) return;
    e.preventDefault();
    e.returnValue = "";
  };

  onMounted(() => {
    window.addEventListener("beforeunload", handleBeforeUnload);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
  });

  onBeforeRouteLeave(async () => {
    if (!dirty.value) return true;
    try {
      await ElMessageBox.confirm(message, "提示", {
        type: "warning",
        confirmButtonText: "离开",
        cancelButtonText: "留下",
      });
      return true;
    } catch {
      return false;
    }
  });
}
