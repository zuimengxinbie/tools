<template>
  <div class="backup-page">
    <header class="page-header">
      <div>
        <p>DATA SAFETY</p>
        <h1>全量备份与恢复</h1>
        <span>将事务、行程和咖啡摊经营数据保存为一个可恢复的 JSON 快照</span>
      </div>
      <el-tag type="success" effect="plain" size="large">本地文件 · 不上传云端</el-tag>
    </header>

    <el-alert
      title="恢复会以备份快照完整替换当前业务数据"
      description="系统会先自动下载一份当前数据的安全备份；恢复写入失败时，服务端会回滚原文件。"
      type="warning"
      :closable="false"
      show-icon
    />

    <section class="action-grid">
      <article class="action-card export-card">
        <div class="action-card__icon">
          <el-icon><Download /></el-icon>
        </div>
        <div class="action-card__content">
          <p>STEP 01</p>
          <h2>导出当前数据</h2>
          <span>生成带版本与创建时间的完整快照，建议在重要修改前主动保存。</span>
        </div>
        <div class="scope-list">
          <div v-for="scope in scopes" :key="scope.name">
            <el-icon><CircleCheckFilled /></el-icon>
            <span>{{ scope.name }}</span>
            <small>{{ scope.description }}</small>
          </div>
        </div>
        <el-button
          type="primary"
          size="large"
          :loading="exporting"
          :disabled="restoring"
          @click="handleExport"
        >
          <el-icon><Download /></el-icon>
          下载全量备份
        </el-button>
      </article>

      <article class="action-card restore-card">
        <div class="action-card__icon">
          <el-icon><UploadFilled /></el-icon>
        </div>
        <div class="action-card__content">
          <p>STEP 02</p>
          <h2>选择备份恢复</h2>
          <span>仅接受本项目生成、格式完整且不超过 20 MB 的 JSON 备份。</span>
        </div>

        <input
          ref="fileInput"
          class="file-input"
          type="file"
          accept="application/json,.json"
          @change="handleFileChange"
        />
        <button class="file-picker" type="button" :disabled="restoring" @click="openFilePicker">
          <el-icon><FolderOpened /></el-icon>
          <span>
            <strong>{{ selectedFileName || "选择备份文件" }}</strong>
            <small>{{ selectedFileName ? "点击可重新选择" : "从本机选择 .json 文件" }}</small>
          </span>
        </button>

        <el-alert
          v-if="parseError"
          class="parse-alert"
          :title="parseError"
          type="error"
          :closable="false"
          show-icon
        />

        <el-button
          type="danger"
          size="large"
          plain
          :loading="restoring"
          :disabled="!selectedBackup || exporting"
          @click="handleRestore"
        >
          <el-icon><RefreshLeft /></el-icon>
          确认恢复此备份
        </el-button>
      </article>
    </section>

    <section v-if="preview" class="preview-card">
      <div class="section-heading">
        <div>
          <p>RESTORE PREVIEW</p>
          <h2>恢复内容预览</h2>
        </div>
        <el-tag type="success" effect="dark">格式校验通过</el-tag>
      </div>

      <div class="preview-meta">
        <div>
          <span>备份创建时间</span>
          <strong>{{ formatBackupTime(preview.createdAt) }}</strong>
        </div>
        <div>
          <span>数据文件</span>
          <strong>{{ preview.fileCount }} 个</strong>
        </div>
        <div>
          <span>数据记录</span>
          <strong>{{ preview.recordCount }} 条</strong>
        </div>
        <div>
          <span>备份版本</span>
          <strong>V{{ selectedBackup?.schemaVersion }}</strong>
        </div>
      </div>

      <div class="module-grid">
        <article v-for="module in preview.modules" :key="module.key">
          <div>
            <span>{{ module.label }}</span>
            <small>{{ module.fileCount }} 个数据文件</small>
          </div>
          <strong>
            {{ module.recordCount }}
            <small>条</small>
          </strong>
        </article>
      </div>

      <el-collapse class="file-details">
        <el-collapse-item title="查看备份中的数据文件">
          <div class="file-list">
            <code v-for="entry in selectedBackup?.files" :key="entry.path">{{ entry.path }}</code>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  CircleCheckFilled,
  Download,
  FolderOpened,
  RefreshLeft,
  UploadFilled,
} from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import BackupAPI, { type FullBackupDocument } from "@/api/backup";
import { createBackupPreview, parseBackupDocument, validateBackupFileSize } from "./utils";

defineOptions({ name: "FullBackup" });

const scopes = [
  { name: "事务管理", description: "需求、待办、团建" },
  { name: "行程规划", description: "周末与假日行程" },
  { name: "咖啡摊经营", description: "商品、订单、预定、库存流水" },
];

const fileInput = ref<HTMLInputElement>();
const selectedFileName = ref("");
const selectedBackup = ref<FullBackupDocument>();
const parseError = ref("");
const exporting = ref(false);
const restoring = ref(false);
const preview = computed(() =>
  selectedBackup.value ? createBackupPreview(selectedBackup.value) : undefined
);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "操作失败，请稍后重试";
}

function filenameTimestamp(value = new Date()): string {
  const parts = [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
    String(value.getHours()).padStart(2, "0"),
    String(value.getMinutes()).padStart(2, "0"),
    String(value.getSeconds()).padStart(2, "0"),
  ];
  return `${parts.slice(0, 3).join("")}-${parts.slice(3).join("")}`;
}

function downloadBackup(document: FullBackupDocument, prefix = "tools-full-backup"): void {
  const blob = new Blob([`${JSON.stringify(document, null, 2)}\n`], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = `${prefix}-${filenameTimestamp()}.json`;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function formatBackupTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

async function handleExport(): Promise<void> {
  if (exporting.value || restoring.value) return;
  exporting.value = true;
  try {
    const document = await BackupAPI.exportFullBackup();
    downloadBackup(document);
    ElMessage.success(`已导出 ${document.files.length} 个数据文件`);
  } catch (error) {
    ElMessage.error(errorMessage(error));
  } finally {
    exporting.value = false;
  }
}

function openFilePicker(): void {
  if (!restoring.value) fileInput.value?.click();
}

async function handleFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  selectedBackup.value = undefined;
  selectedFileName.value = file?.name ?? "";
  parseError.value = "";
  if (!file) return;

  try {
    validateBackupFileSize(file);
    selectedBackup.value = parseBackupDocument(JSON.parse(await file.text()));
  } catch (error) {
    parseError.value = errorMessage(error);
  }
}

async function handleRestore(): Promise<void> {
  if (!selectedBackup.value || restoring.value || exporting.value) return;
  const backup = selectedBackup.value;
  try {
    await ElMessageBox.confirm(
      `将使用 ${formatBackupTime(backup.createdAt)} 的快照替换当前全部业务数据。系统会先下载当前数据的安全备份，是否继续？`,
      "确认全量恢复",
      {
        type: "warning",
        confirmButtonText: "下载安全备份并恢复",
        cancelButtonText: "取消",
        distinguishCancelAndClose: true,
      }
    );
  } catch {
    return;
  }

  restoring.value = true;
  try {
    const safetyBackup = await BackupAPI.exportFullBackup();
    downloadBackup(safetyBackup, "tools-before-restore");
    const result = await BackupAPI.restoreFullBackup(backup);
    ElMessage.success(`已恢复 ${result.fileCount} 个数据文件，页面即将刷新`);
    window.setTimeout(() => window.location.reload(), 1200);
  } catch (error) {
    ElMessage.error(errorMessage(error));
  } finally {
    restoring.value = false;
  }
}
</script>

<style scoped lang="scss">
.backup-page {
  min-height: calc(100vh - 84px);
  padding: 24px;
  background:
    radial-gradient(circle at 90% 8%, rgb(64 158 255 / 10%), transparent 30%),
    var(--el-bg-color-page);
}

.page-header {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;

  p,
  h1 {
    margin: 0;
  }

  p {
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 700;
    color: var(--el-color-primary);
    letter-spacing: 0.16em;
  }

  h1 {
    font-size: 28px;
    color: var(--el-text-color-primary);
  }

  span {
    display: block;
    margin-top: 8px;
    color: var(--el-text-color-secondary);
  }
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.action-card,
.preview-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 18px;
  box-shadow: var(--el-box-shadow-light);
}

.action-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 410px;
  padding: 28px;
  overflow: hidden;

  &::after {
    position: absolute;
    right: -46px;
    bottom: -70px;
    width: 180px;
    height: 180px;
    content: "";
    background: rgb(64 158 255 / 6%);
    border-radius: 50%;
  }

  > .el-button {
    z-index: 1;
    width: 100%;
    min-height: 44px;
    margin-top: auto;
  }
}

.restore-card::after {
  background: rgb(245 108 108 / 6%);
}

.action-card__icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  font-size: 26px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 15px;
}

.restore-card .action-card__icon {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.action-card__content {
  p,
  h2 {
    margin: 0;
  }

  p {
    margin-bottom: 5px;
    font-size: 12px;
    font-weight: 700;
    color: var(--el-text-color-placeholder);
    letter-spacing: 0.14em;
  }

  h2 {
    font-size: 21px;
    color: var(--el-text-color-primary);
  }

  span {
    display: block;
    margin-top: 8px;
    line-height: 1.7;
    color: var(--el-text-color-secondary);
  }
}

.scope-list {
  display: grid;
  gap: 10px;

  div {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 9px;
    align-items: center;
    padding: 10px 12px;
    color: var(--el-text-color-regular);
    background: var(--el-fill-color-light);
    border-radius: 10px;
  }

  .el-icon {
    color: var(--el-color-success);
  }

  small {
    color: var(--el-text-color-secondary);
  }
}

.file-input {
  display: none;
}

.file-picker {
  display: flex;
  gap: 14px;
  align-items: center;
  width: 100%;
  padding: 17px;
  color: var(--el-text-color-regular);
  text-align: left;
  cursor: pointer;
  background: var(--el-fill-color-blank);
  border: 1px dashed var(--el-border-color);
  border-radius: 12px;
  transition: 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .el-icon {
    flex: 0 0 auto;
    font-size: 28px;
    color: var(--el-color-primary);
  }

  span,
  small {
    display: block;
  }

  strong {
    display: block;
    max-width: 390px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    margin-top: 4px;
    color: var(--el-text-color-secondary);
  }
}

.parse-alert {
  margin-top: -8px;
}

.preview-card {
  padding: 26px;
  margin-top: 20px;
}

.section-heading {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  justify-content: space-between;

  p,
  h2 {
    margin: 0;
  }

  p {
    margin-bottom: 5px;
    font-size: 12px;
    font-weight: 700;
    color: var(--el-color-success);
    letter-spacing: 0.14em;
  }
}

.preview-meta {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 22px;

  div {
    padding: 14px;
    background: var(--el-fill-color-light);
    border-radius: 10px;
  }

  span,
  strong {
    display: block;
  }

  span {
    margin-bottom: 6px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  strong {
    color: var(--el-text-color-primary);
  }
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;

  article {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    padding: 18px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;
  }

  span,
  small {
    display: block;
  }

  span {
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  small {
    margin-top: 4px;
    font-weight: 400;
    color: var(--el-text-color-secondary);
  }

  > article > strong {
    font-size: 24px;
    color: var(--el-color-primary);
    white-space: nowrap;
  }
}

.file-details {
  margin-top: 18px;
}

.file-list {
  display: grid;
  gap: 7px;

  code {
    padding: 8px 10px;
    color: var(--el-text-color-regular);
    background: var(--el-fill-color-light);
    border-radius: 6px;
  }
}

@media (width <= 900px) {
  .action-grid {
    grid-template-columns: 1fr;
  }

  .preview-meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 600px) {
  .backup-page {
    padding: 16px;
  }

  .page-header,
  .section-heading {
    flex-direction: column;
  }

  .preview-meta,
  .module-grid {
    grid-template-columns: 1fr;
  }
}
</style>
