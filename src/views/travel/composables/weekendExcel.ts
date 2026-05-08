import ExcelJS from "exceljs";
import type { TripRecord, TripStatus, WeekendTrip } from "@/api/travel";

export const WEEKEND_EXCEL_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const SHEET_NAME = "周末出行";

const HEADERS = [
  "行程名称",
  "目的地",
  "出行日期",
  "时长",
  "状态",
  "出行准备",
  "行程回顾",
  "行程评级",
  "行程记录",
] as const;

const STATUS_LABEL_MAP: Record<TripStatus, string> = {
  planning: "规划中",
  confirmed: "已确认",
  completed: "已完成",
};

const STATUS_VALUE_MAP: Record<string, TripStatus> = {
  planning: "planning",
  规划中: "planning",
  confirmed: "confirmed",
  已确认: "confirmed",
  completed: "completed",
  已完成: "completed",
};

export interface ImportWeekendResult {
  rows: Omit<WeekendTrip, "id">[];
  errors: string[];
}

const normalizeText = (value: unknown): string => {
  if (value == null) return "";
  return String(value).trim();
};

const parseDelimitedText = (value: string): string[] => {
  if (!value) return [];
  const parts = value.split(/[·,，、;；\n]+/);
  const result: string[] = [];
  for (const part of parts) {
    const item = part.trim();
    if (item && !result.includes(item)) result.push(item);
  }
  return result;
};

const toStatusLabel = (status: TripStatus): string => STATUS_LABEL_MAP[status] || status;

const toStatusValue = (rawStatus: string): TripStatus | null => {
  const key = rawStatus.trim().toLowerCase();
  return STATUS_VALUE_MAP[key] ?? null;
};

const parseDateValue = (value: unknown): string => {
  if (value == null || value === "") return "";

  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = `${value.getMonth() + 1}`.padStart(2, "0");
    const d = `${value.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (typeof value === "number") {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (Number.isNaN(date.getTime())) return "";
    const y = date.getUTCFullYear();
    const m = `${date.getUTCMonth() + 1}`.padStart(2, "0");
    const d = `${date.getUTCDate()}`.padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const text = normalizeText(value);
  if (!text) return "";
  const onlyDate = text.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(onlyDate)) return onlyDate;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  const y = parsed.getFullYear();
  const m = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const d = `${parsed.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseRecords = (raw: string): TripRecord[] | null => {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return null;
    const result: TripRecord[] = [];
    for (const item of data) {
      if (!item || typeof item !== "object") return null;
      const time = normalizeText((item as { time?: unknown }).time);
      const content = normalizeText((item as { content?: unknown }).content);
      if (!time || !content) return null;
      result.push({ time, content });
    }
    return result;
  } catch {
    return null;
  }
};

const recordsToText = (records: TripRecord[]): string => {
  if (!records?.length) return "[]";
  return JSON.stringify(records);
};

export const buildWeekendTemplateBuffer = async (): Promise<ArrayBuffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(SHEET_NAME);

  worksheet.addRow(HEADERS);
  worksheet.getRow(1).font = { bold: true };

  worksheet.addRow([
    "示例：西湖踏青",
    "杭州·西湖",
    "2026-05-01",
    "1 天",
    "规划中",
    "热水壶、车钥匙、大疆、两手机",
    "湖边散步和拍照，体验不错",
    4,
    '[{"time":"2026-05-01 09:30","content":"到达景区"}]',
  ]);

  worksheet.columns = [
    { width: 22 },
    { width: 22 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 28 },
    { width: 36 },
    { width: 10 },
    { width: 48 },
  ];

  const note = workbook.addWorksheet("填写说明");
  note.addRow(["列名", "说明"]);
  note.getRow(1).font = { bold: true };
  note.addRows([
    ["状态", "支持：规划中/planning、已确认/confirmed、已完成/completed"],
    ["出行日期", "建议格式 YYYY-MM-DD"],
    ["出行准备", "可用 顿号、逗号、分号 分隔"],
    ["行程评级", "0-5 之间的整数，0 表示未评级"],
    ["行程记录", 'JSON 数组，如 [{"time":"2026-05-01 09:30","content":"到达景区"}]'],
    ["导入策略", "按 行程名称+出行日期 去重；命中则更新，不命中则新增"],
    ["错误处理", "若任一行有错误，将整体拒绝导入"],
  ]);
  note.columns = [{ width: 20 }, { width: 90 }];

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
};

export const buildWeekendExportBuffer = async (list: WeekendTrip[]): Promise<ArrayBuffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(SHEET_NAME);

  worksheet.addRow(HEADERS);
  worksheet.getRow(1).font = { bold: true };

  for (const row of list) {
    worksheet.addRow([
      row.title ?? "",
      row.destination ?? "",
      row.date ?? "",
      row.duration ?? "",
      toStatusLabel(row.status),
      (row.preparation ?? []).join("、"),
      row.review ?? "",
      row.rating ?? 0,
      recordsToText(row.records ?? []),
    ]);
  }

  worksheet.columns = [
    { width: 22 },
    { width: 22 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 28 },
    { width: 36 },
    { width: 10 },
    { width: 48 },
  ];

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
};

export const parseWeekendExcelFile = async (file: File): Promise<ImportWeekendResult> => {
  const workbook = new ExcelJS.Workbook();
  const fileBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(fileBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { rows: [], errors: ["未找到工作表，请使用模板文件"] };
  }

  const rows: Omit<WeekendTrip, "id">[] = [];
  const errors: string[] = [];

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const title = normalizeText(row.getCell(1).value);
    const destination = normalizeText(row.getCell(2).value);
    const date = parseDateValue(row.getCell(3).value);
    const duration = normalizeText(row.getCell(4).value);
    const statusRaw = normalizeText(row.getCell(5).value);
    const preparationRaw = normalizeText(row.getCell(6).value);
    const review = normalizeText(row.getCell(7).value);
    const ratingRaw = normalizeText(row.getCell(8).value);
    const recordsRaw = normalizeText(row.getCell(9).value);

    const isEmptyRow =
      !title &&
      !destination &&
      !date &&
      !duration &&
      !statusRaw &&
      !preparationRaw &&
      !review &&
      !ratingRaw &&
      !recordsRaw;
    if (isEmptyRow) return;

    const rowErrors: string[] = [];
    if (!title) rowErrors.push("行程名称不能为空");
    if (!destination) rowErrors.push("目的地不能为空");
    if (!date) rowErrors.push("出行日期格式不正确，需为 YYYY-MM-DD");
    if (!duration) rowErrors.push("时长不能为空");

    const status = toStatusValue(statusRaw);
    if (!status)
      rowErrors.push("状态无效，仅支持 规划中/planning、已确认/confirmed、已完成/completed");

    const preparation = parseDelimitedText(preparationRaw);

    const rating = ratingRaw === "" ? 0 : Number(ratingRaw);
    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
      rowErrors.push("行程评级必须是 0-5 的整数");
    }

    const records = parseRecords(recordsRaw);
    if (records === null) {
      rowErrors.push("行程记录必须是 JSON 数组，且每项包含 time 与 content");
    }

    if (rowErrors.length) {
      errors.push(`第 ${rowNumber} 行：${rowErrors.join("；")}`);
      return;
    }

    rows.push({
      title,
      destination,
      date,
      duration,
      status: status as TripStatus,
      preparation,
      review,
      records: records ?? [],
      rating,
    });
  });

  return { rows, errors };
};

export interface MergeWeekendResult {
  merged: WeekendTrip[];
  createdCount: number;
  updatedCount: number;
}

const toMergeKey = (item: Pick<WeekendTrip, "title" | "date">): string =>
  `${(item.title || "").trim().toLowerCase()}::${(item.date || "").trim()}`;

export const mergeWeekendTrips = (
  current: WeekendTrip[],
  importedRows: Omit<WeekendTrip, "id">[]
): MergeWeekendResult => {
  const merged = current.map((item) => ({ ...item }));
  const indexMap = new Map<string, number>();
  for (let i = 0; i < merged.length; i++) {
    indexMap.set(toMergeKey(merged[i]), i);
  }

  let maxId = merged.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
  let createdCount = 0;
  let updatedCount = 0;

  for (const item of importedRows) {
    const key = toMergeKey(item);
    const idx = indexMap.get(key);
    if (idx != null) {
      const old = merged[idx];
      merged[idx] = { ...old, ...item, id: old.id };
      updatedCount += 1;
      continue;
    }

    maxId += 1;
    const next: WeekendTrip = { id: maxId, ...item };
    merged.unshift(next);
    indexMap.set(toMergeKey(next), 0);
    createdCount += 1;
  }

  return { merged, createdCount, updatedCount };
};

export const downloadArrayBufferFile = (
  data: ArrayBuffer,
  fileName: string,
  mimeType: string
): void => {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};
