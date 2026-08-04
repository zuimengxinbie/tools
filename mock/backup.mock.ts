import fs from "fs";
import path from "path";
import { defineMock } from "./base";

const BACKUP_FORMAT = "personal-tools-full-backup";
const SCHEMA_VERSION = 1;
const MAX_BACKUP_FILES = 1000;
const WORKSPACE_ROOT = path.resolve(process.cwd());
const MANAGED_ROOTS = [
  path.join(WORKSPACE_ROOT, "mock/data"),
  path.join(WORKSPACE_ROOT, "mock/business"),
];
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

interface BackupFileEntry {
  path: string;
  data: unknown;
}

interface FullBackupDocument {
  format: typeof BACKUP_FORMAT;
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  files: BackupFileEntry[];
}

function success<T>(data: T, msg = "一切ok") {
  return { code: "00000", data, msg };
}

function failure(error: unknown) {
  return {
    code: "B0400",
    data: null,
    msg: error instanceof Error ? error.message : "备份数据处理失败",
  };
}

function toPortablePath(file: string): string {
  return path.relative(WORKSPACE_ROOT, file).split(path.sep).join("/");
}

function listJsonFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return listJsonFiles(target);
    return entry.isFile() && entry.name.endsWith(".json") ? [target] : [];
  });
}

function listManagedFiles(): string[] {
  return MANAGED_ROOTS.flatMap(listJsonFiles).sort((left, right) =>
    toPortablePath(left).localeCompare(toPortablePath(right))
  );
}

function resolveManagedPath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  if (!normalized.endsWith(".json") || normalized.startsWith("/") || normalized.includes("..")) {
    throw new Error(`备份中包含非法文件路径：${relativePath}`);
  }
  const resolved = path.resolve(WORKSPACE_ROOT, normalized);
  const allowed = MANAGED_ROOTS.some((root) => resolved.startsWith(`${root}${path.sep}`));
  if (!allowed) throw new Error(`备份文件超出允许的数据目录：${relativePath}`);
  return resolved;
}

function assertJsonValue(value: unknown, relativePath: string): void {
  try {
    if (JSON.stringify(value) === undefined) throw new Error();
  } catch {
    throw new Error(`备份文件无法序列化：${relativePath}`);
  }
}

function validateBackupDocument(input: unknown): FullBackupDocument {
  if (!input || typeof input !== "object") throw new Error("备份文件内容无效");
  const candidate = input as Partial<FullBackupDocument>;
  if (candidate.format !== BACKUP_FORMAT) throw new Error("不是本项目生成的全量备份文件");
  if (candidate.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`不支持的备份版本：${String(candidate.schemaVersion)}`);
  }
  if (typeof candidate.createdAt !== "string" || Number.isNaN(Date.parse(candidate.createdAt))) {
    throw new Error("备份创建时间无效");
  }
  if (!Array.isArray(candidate.files) || candidate.files.length === 0) {
    throw new Error("备份文件中没有可恢复的数据");
  }
  if (candidate.files.length > MAX_BACKUP_FILES) throw new Error("备份文件数量超过安全限制");

  const paths = new Set<string>();
  const files = candidate.files.map((entry) => {
    if (!entry || typeof entry !== "object" || typeof entry.path !== "string") {
      throw new Error("备份文件列表格式无效");
    }
    const normalizedPath = toPortablePath(resolveManagedPath(entry.path));
    if (paths.has(normalizedPath)) throw new Error(`备份中存在重复文件：${normalizedPath}`);
    assertJsonValue(entry.data, normalizedPath);
    paths.add(normalizedPath);
    return { path: normalizedPath, data: entry.data };
  });

  const missing = REQUIRED_FILES.filter((required) => !paths.has(required));
  if (missing.length > 0) throw new Error(`备份缺少必要数据文件：${missing.join("、")}`);

  return {
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    createdAt: candidate.createdAt,
    files,
  };
}

function createBackupDocument(): FullBackupDocument {
  const files = listManagedFiles().map((file) => {
    try {
      return { path: toPortablePath(file), data: JSON.parse(fs.readFileSync(file, "utf-8")) };
    } catch {
      throw new Error(`数据文件格式错误：${toPortablePath(file)}`);
    }
  });
  return {
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    files,
  };
}

function restoreBackupDocument(document: FullBackupDocument): void {
  const currentFiles = listManagedFiles();
  const targetFiles = document.files.map((entry) => ({
    file: resolveManagedPath(entry.path),
    data: entry.data,
  }));
  const affectedFiles = new Set([...currentFiles, ...targetFiles.map((entry) => entry.file)]);
  const snapshots = [...affectedFiles].map((file) => ({
    file,
    existed: fs.existsSync(file),
    content: fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : "",
  }));
  const temporaryFiles: string[] = [];

  try {
    const prepared = targetFiles.map(({ file, data }, index) => {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const temporaryFile = `${file}.${process.pid}.${Date.now()}.${index}.restore.tmp`;
      fs.writeFileSync(temporaryFile, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
      temporaryFiles.push(temporaryFile);
      return { file, temporaryFile };
    });

    prepared.forEach(({ file, temporaryFile }) => fs.copyFileSync(temporaryFile, file));
    const targetSet = new Set(targetFiles.map((entry) => entry.file));
    currentFiles.filter((file) => !targetSet.has(file)).forEach((file) => fs.rmSync(file));
  } catch (error) {
    snapshots.reverse().forEach(({ file, existed, content }) => {
      try {
        if (existed) {
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, content, "utf-8");
        } else if (fs.existsSync(file)) {
          fs.rmSync(file);
        }
      } catch {
        // 尽力恢复所有快照，最终仍返回原始失败原因。
      }
    });
    throw error;
  } finally {
    temporaryFiles.forEach((file) => {
      if (fs.existsSync(file)) fs.rmSync(file);
    });
  }
}

export default defineMock([
  {
    url: "backup",
    method: ["GET"],
    body() {
      try {
        return success(createBackupDocument(), "全量备份已生成");
      } catch (error) {
        return failure(error);
      }
    },
  },
  {
    url: "backup",
    method: ["PUT"],
    body({ body }) {
      try {
        const document = validateBackupDocument(body);
        restoreBackupDocument(document);
        return success(
          { restoredAt: new Date().toISOString(), fileCount: document.files.length },
          "全量数据恢复成功"
        );
      } catch (error) {
        return failure(error);
      }
    },
  },
]);
