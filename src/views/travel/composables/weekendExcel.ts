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

const toStatusLabel = (status: TripStatus): string => STATUS_LABEL_MAP[status] || status;

const recordsToText = (records: TripRecord[]): string => {
  if (!records?.length) return "[]";
  return JSON.stringify(records);
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
