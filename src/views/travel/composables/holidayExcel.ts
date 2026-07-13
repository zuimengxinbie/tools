import ExcelJS from "exceljs";
import type { HolidayPlan, HolidayStatus } from "@/api/travel";

export const HOLIDAY_EXCEL_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const SHEET_NAME = "假日出游";

const HEADERS = [
  "节日",
  "目的地",
  "开始日期",
  "结束日期",
  "预算",
  "出行人数",
  "交通方式",
  "状态",
  "行程评级",
  "实际花费",
  "备注HTML",
  "费用明细(JSON)",
  "准备清单(JSON)",
  "协调问答(JSON)",
] as const;

const STATUS_LABEL_MAP: Record<HolidayStatus, string> = {
  planning: "规划中",
  confirmed: "已确认",
  completed: "已完成",
};

const toStatusLabel = (status: HolidayStatus): string => STATUS_LABEL_MAP[status] || status;

const stringifyJson = (value: unknown): string => {
  if (value == null) return "[]";
  return JSON.stringify(value);
};

export const buildHolidayExportBuffer = async (list: HolidayPlan[]): Promise<ArrayBuffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(SHEET_NAME);

  worksheet.addRow(HEADERS);
  worksheet.getRow(1).font = { bold: true };

  for (const row of list) {
    worksheet.addRow([
      row.festival ?? "",
      row.destination ?? "",
      row.startDate ?? "",
      row.endDate ?? "",
      row.budget ?? 0,
      row.members ?? 0,
      row.transport ?? "",
      toStatusLabel(row.status ?? "planning"),
      row.rating ?? 0,
      row.actualCost ?? 0,
      row.remark ?? "",
      stringifyJson(row.costItems ?? []),
      stringifyJson(row.preparation ?? []),
      stringifyJson(row.coordination ?? []),
    ]);
  }

  worksheet.columns = [
    { width: 12 },
    { width: 20 },
    { width: 14 },
    { width: 14 },
    { width: 10 },
    { width: 10 },
    { width: 12 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 26 },
    { width: 66 },
    { width: 56 },
    { width: 56 },
  ];

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
};
