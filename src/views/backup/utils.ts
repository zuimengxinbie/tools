import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  type BackupFileEntry,
  type FullBackupDocument,
} from "@/api/backup";

const MAX_BACKUP_FILE_SIZE = 20 * 1024 * 1024;
const MAX_BACKUP_FILES = 1000;
const REQUIRED_FILES = [
  "mock/data/group-building.json",
  "mock/data/holiday-plans.json",
  "mock/data/requirements.json",
  "mock/data/todolist.json",
  "mock/data/weekend-trips.json",
  "mock/business/categories.json",
  "mock/business/products.json",
  "mock/business/reservations.json",
  "mock/business/stock-ledger.json",
];

export interface BackupModuleSummary {
  key: "affairs" | "travel" | "business";
  label: string;
  fileCount: number;
  recordCount: number;
}

export interface BackupPreview {
  createdAt: string;
  fileCount: number;
  recordCount: number;
  modules: BackupModuleSummary[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeManagedPath(value: string): string {
  const normalized = value.replace(/\\/g, "/");
  const allowedRoot =
    normalized.startsWith("mock/data/") || normalized.startsWith("mock/business/");
  if (
    !allowedRoot ||
    !normalized.endsWith(".json") ||
    normalized.startsWith("/") ||
    normalized.includes("..")
  ) {
    throw new Error(`包含非法数据路径：${value}`);
  }
  return normalized;
}

function parseEntry(value: unknown): BackupFileEntry {
  if (!isRecord(value) || typeof value.path !== "string" || !("data" in value)) {
    throw new Error("备份文件列表格式无效");
  }
  return { path: normalizeManagedPath(value.path), data: value.data };
}

export function validateBackupFileSize(file: File): void {
  if (file.size > MAX_BACKUP_FILE_SIZE) throw new Error("备份文件不能超过 20 MB");
  if (!file.name.toLowerCase().endsWith(".json")) throw new Error("请选择 JSON 备份文件");
}

export function parseBackupDocument(value: unknown): FullBackupDocument {
  if (!isRecord(value)) throw new Error("备份文件内容无效");
  if (value.format !== BACKUP_FORMAT) throw new Error("不是本项目生成的全量备份文件");
  if (value.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error(`暂不支持版本 ${String(value.schemaVersion)} 的备份文件`);
  }
  if (typeof value.createdAt !== "string" || Number.isNaN(Date.parse(value.createdAt))) {
    throw new Error("备份创建时间无效");
  }
  if (!Array.isArray(value.files) || value.files.length === 0) {
    throw new Error("备份文件中没有可恢复的数据");
  }
  if (value.files.length > MAX_BACKUP_FILES) throw new Error("备份文件数量超过安全限制");

  const files = value.files.map(parseEntry);
  const paths = new Set(files.map((entry) => entry.path));
  if (paths.size !== files.length) throw new Error("备份中存在重复的数据文件");
  const missing = REQUIRED_FILES.filter((required) => !paths.has(required));
  if (missing.length > 0) throw new Error(`备份不完整，缺少 ${missing.length} 个必要文件`);

  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: value.createdAt,
    files,
  };
}

function recordCount(entry: BackupFileEntry): number {
  if (Array.isArray(entry.data)) return entry.data.length;
  return entry.data === null || entry.data === undefined ? 0 : 1;
}

export function createBackupPreview(document: FullBackupDocument): BackupPreview {
  const definitions: Array<{
    key: BackupModuleSummary["key"];
    label: string;
    matches: (path: string) => boolean;
  }> = [
    {
      key: "affairs",
      label: "事务管理",
      matches: (path) =>
        ["requirements.json", "todolist.json", "group-building.json"].some((name) =>
          path.endsWith(`/data/${name}`)
        ),
    },
    {
      key: "travel",
      label: "行程规划",
      matches: (path) =>
        path.endsWith("/data/weekend-trips.json") || path.endsWith("/data/holiday-plans.json"),
    },
    { key: "business", label: "咖啡摊经营", matches: (path) => path.startsWith("mock/business/") },
  ];

  const modules = definitions.map((definition) => {
    const files = document.files.filter((entry) => definition.matches(entry.path));
    return {
      key: definition.key,
      label: definition.label,
      fileCount: files.length,
      recordCount: files.reduce((sum, entry) => sum + recordCount(entry), 0),
    };
  });

  return {
    createdAt: document.createdAt,
    fileCount: document.files.length,
    recordCount: modules.reduce((sum, module) => sum + module.recordCount, 0),
    modules,
  };
}
