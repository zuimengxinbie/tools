<template>
  <div class="screenshot-container">
    <button class="screenshot-btn" :disabled="isCapturing" @click="captureScreenshot">
      {{ isCapturing ? "截图中..." : "截图" }}
    </button>

    <!-- 截图预览（可选） -->
    <div v-if="screenshotUrl" class="screenshot-preview">
      <img :src="screenshotUrl" alt="截图预览" />
      <div class="preview-actions">
        <button @click="downloadScreenshot">下载</button>
        <button @click="clearScreenshot">清除</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import html2canvas from "html2canvas";

const props: any = defineProps({
  // 目标元素的ref
  targetElement: {
    type: Object,
    required: true,
  },
  // 截图配置选项
  options: {
    type: Object,
    default: () => ({
      scale: 2, // 缩放比例，提高清晰度
      useCORS: true, // 处理跨域图片
      logging: false, // 禁用日志
      backgroundColor: "#ffffff", // 背景色
    }),
  },
  // 截图成功回调
  onCapture: {
    type: Function,
    default: (imageUrl: any) => {},
  },
});

const isCapturing: any = ref(false);
const screenshotUrl: any = ref(null);

const captureScreenshot = async () => {
  if (!props.targetElement) {
    console.error("目标元素不存在");
    return;
  }

  isCapturing.value = true;

  try {
    const canvas = await html2canvas(props.targetElement, props.options);
    const imageUrl = canvas.toDataURL("image/png");
    screenshotUrl.value = imageUrl;
    props.onCapture(imageUrl);
  } catch (error) {
    console.error("截图失败:", error);
  } finally {
    isCapturing.value = false;
  }
};

const downloadScreenshot = () => {
  if (!screenshotUrl.value) return;

  const link = document.createElement("a");
  link.href = screenshotUrl.value;
  link.download = `截图_${new Date().getTime()}.png`;
  link.click();
};

const clearScreenshot = () => {
  screenshotUrl.value = null;
};
</script>

<style scoped>
.screenshot-container {
  position: relative;
}

.screenshot-btn {
  padding: 8px 16px;
  font-size: 14px;
  color: white;
  cursor: pointer;
  background-color: #1890ff;
  border: none;
  border-radius: 4px;
}

.screenshot-btn:hover:not(:disabled) {
  background-color: #40a9ff;
}

.screenshot-btn:disabled {
  cursor: not-allowed;
  background-color: #ccc;
}

.screenshot-preview {
  padding: 16px;
  margin-top: 16px;
  background-color: #f8f9fa;
  border: 1px solid #eee;
  border-radius: 4px;
}

.screenshot-preview img {
  max-width: 100%;
  height: auto;
  border: 1px solid #ddd;
}

.preview-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.preview-actions button {
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.preview-actions button:hover {
  background-color: #e0e0e0;
}
</style>
