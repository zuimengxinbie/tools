import request from "@/utils/request";

export const BACKUP_FORMAT = "personal-tools-full-backup" as const;
export const BACKUP_SCHEMA_VERSION = 1 as const;

export interface BackupFileEntry {
  path: string;
  data: unknown;
}

export interface FullBackupDocument {
  format: typeof BACKUP_FORMAT;
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  createdAt: string;
  files: BackupFileEntry[];
}

export interface RestoreResult {
  restoredAt: string;
  fileCount: number;
}

const BASE = "/api/v1/backup";

const BackupAPI = {
  exportFullBackup() {
    return request<any, FullBackupDocument>({ url: BASE, method: "get" });
  },
  restoreFullBackup(document: FullBackupDocument) {
    return request<any, RestoreResult>({ url: BASE, method: "put", data: document });
  },
};

export default BackupAPI;
