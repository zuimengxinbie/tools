<template>
  <main class="prompt-library">
    <section class="hero-panel">
      <div>
        <p class="eyebrow">AI PRODUCTIVITY LIBRARY</p>
        <h1>提效话术库</h1>
        <p class="hero-description">沉淀可复用的话术模板，随时检索、复制和维护。</p>
      </div>
      <el-button type="primary" size="large" :icon="Plus" @click="handleCreate">新增话术</el-button>
    </section>

    <el-card class="filter-panel" shadow="never">
      <div class="filter-row">
        <el-input
          v-model="keyword"
          :prefix-icon="Search"
          clearable
          placeholder="搜索标题、正文或标签"
          class="keyword-input"
        />
        <el-select
          v-model="selectedTags"
          multiple
          clearable
          collapse-tags
          collapse-tags-tooltip
          placeholder="按标签筛选"
          class="tag-filter"
        >
          <el-option v-for="tag in availableTags" :key="tag" :label="tag" :value="tag" />
        </el-select>
        <el-button v-if="hasFilter" @click="clearFilters">清空筛选</el-button>
        <span class="result-count">{{ filteredPrompts.length }} / {{ prompts.length }} 条</span>
      </div>
    </el-card>

    <section class="content-panel">
      <el-skeleton v-if="loading" :rows="8" animated />

      <el-result v-else-if="loadError" icon="error" title="话术加载失败" :sub-title="loadError">
        <template #extra>
          <el-button type="primary" :icon="Refresh" @click="loadPrompts">重新加载</el-button>
        </template>
      </el-result>

      <el-empty v-else-if="prompts.length === 0" description="还没有话术，新增一条开始积累吧">
        <el-button type="primary" :icon="Plus" @click="handleCreate">新增话术</el-button>
      </el-empty>

      <el-empty v-else-if="filteredPrompts.length === 0" description="没有找到匹配的话术">
        <el-button @click="clearFilters">清空筛选</el-button>
      </el-empty>

      <div v-else class="prompt-grid">
        <el-card
          v-for="prompt in filteredPrompts"
          :key="prompt.id"
          class="prompt-card"
          shadow="hover"
        >
          <div class="card-heading">
            <h2 :title="prompt.title">{{ prompt.title }}</h2>
            <el-dropdown trigger="click">
              <el-button text circle aria-label="更多操作">
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :icon="EditPen" @click="handleEdit(prompt)">
                    编辑
                  </el-dropdown-item>
                  <el-dropdown-item
                    :icon="Delete"
                    divided
                    :disabled="deletingId === prompt.id"
                    @click="handleDelete(prompt)"
                  >
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <div v-if="prompt.tags.length" class="tag-list">
            <el-tag v-for="tag in prompt.tags" :key="tag" size="small" effect="plain">
              {{ tag }}
            </el-tag>
          </div>
          <div v-else class="tag-placeholder">未设置标签</div>

          <pre class="prompt-preview">{{ prompt.content }}</pre>

          <div class="card-footer">
            <span>更新于 {{ formatUpdatedAt(prompt.updatedAt) }}</span>
            <div class="card-actions">
              <el-button :icon="DocumentCopy" @click="handleCopy(prompt.content)">复制</el-button>
              <el-button type="primary" plain :icon="EditPen" @click="handleEdit(prompt)">
                编辑
              </el-button>
            </div>
          </div>
        </el-card>
      </div>
    </section>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑话术' : '新增话术'"
      width="min(760px, calc(100vw - 32px))"
      destroy-on-close
      :close-on-click-modal="false"
      :before-close="handleDialogBeforeClose"
      @closed="handleDialogClosed"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-position="top">
        <el-form-item label="标题" prop="title">
          <el-input
            v-model="form.title"
            maxlength="80"
            show-word-limit
            placeholder="请输入话术标题"
          />
        </el-form-item>

        <el-form-item label="标签" prop="tags">
          <el-select
            v-model="form.tags"
            multiple
            filterable
            allow-create
            default-first-option
            clearable
            placeholder="选择已有标签，或输入后回车创建"
            class="form-tag-select"
          >
            <el-option v-for="tag in availableTags" :key="tag" :label="tag" :value="tag" />
          </el-select>
        </el-form-item>

        <el-form-item label="话术正文" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :autosize="{ minRows: 14, maxRows: 24 }"
            resize="vertical"
            placeholder="输入可直接复制使用的话术内容"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :disabled="saving" @click="handleCancel">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import {
  Delete,
  DocumentCopy,
  EditPen,
  MoreFilled,
  Plus,
  Refresh,
  Search,
} from "@element-plus/icons-vue";
import AiPromptAPI, { type AiPrompt } from "@/api/ai";

defineOptions({ name: "AiAssistant" });

interface PromptForm {
  title: string;
  content: string;
  tags: string[];
}

const prompts = ref<AiPrompt[]>([]);
const loading = ref(false);
const loadError = ref("");
const keyword = ref("");
const selectedTags = ref<string[]>([]);
const deletingId = ref("");

const dialogVisible = ref(false);
const editingId = ref<string | null>(null);
const saving = ref(false);
const formRef = ref<FormInstance>();
const form = reactive<PromptForm>({ title: "", content: "", tags: [] });
let initialFormSnapshot = "";

const formRules: FormRules<PromptForm> = {
  title: [{ required: true, whitespace: true, message: "请输入话术标题", trigger: "blur" }],
  content: [{ required: true, whitespace: true, message: "请输入话术正文", trigger: "blur" }],
};

const availableTags = computed(() => {
  return [...new Set(prompts.value.flatMap((prompt) => prompt.tags))].sort((left, right) =>
    left.localeCompare(right, "zh-CN")
  );
});

const hasFilter = computed(() => Boolean(keyword.value.trim() || selectedTags.value.length));

const filteredPrompts = computed(() => {
  const searchText = keyword.value.trim().toLocaleLowerCase();
  const originalOrder = new Map(prompts.value.map((prompt, index) => [prompt.id, index]));

  return prompts.value
    .filter((prompt) => {
      const matchesKeyword =
        !searchText ||
        [prompt.title, prompt.content, ...prompt.tags]
          .join("\n")
          .toLocaleLowerCase()
          .includes(searchText);
      const matchesTags = selectedTags.value.every((tag) => prompt.tags.includes(tag));
      return matchesKeyword && matchesTags;
    })
    .sort((left, right) => {
      const timeDiff = toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
      return timeDiff || (originalOrder.get(left.id) ?? 0) - (originalOrder.get(right.id) ?? 0);
    });
});

function toTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatUpdatedAt(value: string): string {
  const timestamp = toTimestamp(value);
  if (!timestamp) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(timestamp);
}

function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function snapshotForm(): string {
  return JSON.stringify({
    title: form.title,
    content: form.content,
    tags: normalizeTags(form.tags),
  });
}

function createPromptId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function loadPrompts(): Promise<void> {
  loading.value = true;
  loadError.value = "";
  try {
    prompts.value = await AiPromptAPI.getPrompts();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : "请稍后重试";
  } finally {
    loading.value = false;
  }
}

function clearFilters(): void {
  keyword.value = "";
  selectedTags.value = [];
}

function openDialog(prompt?: AiPrompt): void {
  editingId.value = prompt?.id ?? null;
  form.title = prompt?.title ?? "";
  form.content = prompt?.content ?? "";
  form.tags = [...(prompt?.tags ?? [])];
  initialFormSnapshot = snapshotForm();
  dialogVisible.value = true;
  nextTick(() => formRef.value?.clearValidate());
}

function handleCreate(): void {
  openDialog();
}

function handleEdit(prompt: AiPrompt): void {
  openDialog(prompt);
}

async function confirmDiscardIfNeeded(): Promise<boolean> {
  if (saving.value || snapshotForm() === initialFormSnapshot) return true;
  try {
    await ElMessageBox.confirm("当前修改尚未保存，确定放弃吗？", "放弃未保存修改", {
      type: "warning",
      confirmButtonText: "放弃修改",
      cancelButtonText: "继续编辑",
    });
    return true;
  } catch {
    return false;
  }
}

function handleDialogBeforeClose(done: () => void): void {
  void confirmDiscardIfNeeded().then((confirmed) => {
    if (confirmed) done();
  });
}

async function handleCancel(): Promise<void> {
  if (await confirmDiscardIfNeeded()) dialogVisible.value = false;
}

function handleDialogClosed(): void {
  editingId.value = null;
  form.title = "";
  form.content = "";
  form.tags = [];
  initialFormSnapshot = "";
  formRef.value?.clearValidate();
}

async function handleSave(): Promise<void> {
  if (saving.value) return;
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  saving.value = true;
  const now = new Date().toISOString();
  const tags = normalizeTags(form.tags);
  const existing = editingId.value
    ? prompts.value.find((prompt) => prompt.id === editingId.value)
    : undefined;
  const savedPrompt: AiPrompt = existing
    ? {
        ...existing,
        title: form.title.trim(),
        content: form.content.trim(),
        tags,
        createdAt: existing.createdAt || now,
        updatedAt: now,
      }
    : {
        id: createPromptId(),
        title: form.title.trim(),
        content: form.content.trim(),
        tags,
        createdAt: now,
        updatedAt: now,
      };

  const nextList = existing
    ? prompts.value.map((prompt) => (prompt.id === existing.id ? savedPrompt : prompt))
    : [savedPrompt, ...prompts.value];

  try {
    await AiPromptAPI.savePrompts(nextList);
    prompts.value = nextList;
    initialFormSnapshot = snapshotForm();
    dialogVisible.value = false;
    ElMessage.success(existing ? "话术已更新" : "话术已新增");
  } catch {
    ElMessage.error("话术保存失败，请稍后重试");
  } finally {
    saving.value = false;
  }
}

async function handleDelete(prompt: AiPrompt): Promise<void> {
  if (deletingId.value) return;
  try {
    await ElMessageBox.confirm(`删除后无法恢复，确定删除「${prompt.title}」吗？`, "删除话术", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }

  deletingId.value = prompt.id;
  const nextList = prompts.value.filter((item) => item.id !== prompt.id);
  try {
    await AiPromptAPI.savePrompts(nextList);
    prompts.value = nextList;
    ElMessage.success("话术已删除");
  } catch {
    ElMessage.error("话术删除失败，请稍后重试");
  } finally {
    deletingId.value = "";
  }
}

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    if (!document.execCommand("copy")) throw new Error("copy failed");
  } finally {
    textarea.remove();
  }
}

async function handleCopy(content: string): Promise<void> {
  try {
    await writeClipboard(content);
    ElMessage.success("话术正文已复制");
  } catch {
    ElMessage.error("复制失败，请手动选择正文复制");
  }
}

onMounted(loadPrompts);
</script>

<style scoped lang="scss">
.prompt-library {
  min-height: 100%;
  padding: 24px;
  background:
    radial-gradient(circle at 90% 0%, rgb(124 92 255 / 10%), transparent 30%),
    var(--el-bg-color-page);
}

.hero-panel {
  display: flex;
  gap: 24px;
  align-items: flex-end;
  justify-content: space-between;
  padding: 30px 32px;
  color: #fff;
  background: linear-gradient(125deg, #25305f 0%, #5c4bd8 58%, #8d65f2 100%);
  border-radius: 18px;
  box-shadow: 0 16px 40px rgb(59 43 143 / 20%);

  h1 {
    margin: 4px 0 8px;
    font-size: 30px;
    line-height: 1.2;
  }
}

.eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  opacity: 0.7;
}

.hero-description {
  margin: 0;
  color: rgb(255 255 255 / 78%);
}

.filter-panel {
  margin-top: 18px;
  border: 0;
  border-radius: 14px;
}

.filter-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.keyword-input {
  width: min(360px, 100%);
}

.tag-filter {
  width: min(320px, 100%);
}

.result-count {
  margin-left: auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.content-panel {
  min-height: 360px;
  margin-top: 18px;
}

.prompt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 18px;
}

.prompt-card {
  height: 100%;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 16px;

  :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 22px;
  }
}

.card-heading {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;

  h2 {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 18px;
    line-height: 32px;
    color: var(--el-text-color-primary);
    white-space: nowrap;
  }
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 24px;
  margin-top: 10px;
}

.tag-placeholder {
  min-height: 24px;
  margin-top: 10px;
  font-size: 12px;
  line-height: 24px;
  color: var(--el-text-color-placeholder);
}

.prompt-preview {
  display: -webkit-box;
  flex: 1;
  min-height: 156px;
  padding: 16px;
  margin: 18px 0;
  overflow: hidden;
  -webkit-line-clamp: 7;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.65;
  color: var(--el-text-color-regular);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 12px;
  -webkit-box-orient: vertical;
}

.card-footer {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.card-actions {
  display: flex;
  gap: 8px;
}

.form-tag-select {
  width: 100%;
}

@media (max-width: 720px) {
  .prompt-library {
    padding: 14px;
  }

  .hero-panel {
    flex-direction: column;
    align-items: stretch;
    padding: 24px;

    h1 {
      font-size: 26px;
    }
  }

  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .keyword-input,
  .tag-filter {
    width: 100%;
  }

  .result-count {
    align-self: flex-end;
    margin-left: 0;
  }

  .prompt-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .card-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .card-actions {
    width: 100%;

    .el-button {
      flex: 1;
    }
  }
}
</style>
