import ExcelJS from "exceljs";
import type { GroupBuildingSignup } from "@/api/affairs";
import {
  commuteTypeMap,
  ticketTypeMap,
  genderMap,
  roomTypeMap,
  isValidIdCard,
  reverseDict,
} from "../constants";

export const GROUP_BUILDING_EXCEL_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const SHEET_NAME = "团建报名";

const HEADERS = [
  "填报人",
  "手机号",
  "归属",
  "出行人数",
  "身份证号",
  "通勤方式",
  "购票方式",
  "去程",
  "去程班次&座次",
  "返程",
  "返程班次&座次",
  "性别",
  "房型",
  "酒店",
  "交通费用",
  "住宿费用",
  "餐费",
  "其他费用",
  "备注",
] as const;

const COL_WIDTHS = [14, 14, 18, 10, 22, 12, 12, 22, 26, 12, 26, 8, 10, 14, 10, 10, 10, 10, 20];

export interface ImportGroupBuildingResult {
  rows: Omit<GroupBuildingSignup, "id" | "createdAt" | "updatedAt">[];
  errors: string[];
}

const normalizeText = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "object" && "text" in (value as object)) {
    // ExcelJS rich text
    const rt = (value as { text?: unknown }).text;
    if (rt != null) return String(rt).trim();
  }
  return String(value).trim();
};

/** 校验手机号格式（11位数字） */
const isValidPhone = (v: string) => /^1[3-9]\d{9}$/.test(v);

export const buildGroupBuildingTemplateBuffer = async (): Promise<ArrayBuffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(SHEET_NAME);

  worksheet.addRow(HEADERS);
  worksheet.getRow(1).font = { bold: true };

  worksheet.addRow([
    "张三",
    "13800138000",
    "运营系统前端组",
    1,
    "320311199001011234",
    "自驾",
    "统一购票",
    "11:30 - 13:20 左右到",
    "班次：19300 上舱 1号",
    "15:50",
    "班次：48491 普舱3 100号",
    "男",
    "标间",
    "雀舍渔家",
    280,
    350,
    150,
    50,
    "备注示例",
  ]);

  worksheet.columns = COL_WIDTHS.map((w) => ({ width: w }));

  const note = workbook.addWorksheet("填写说明");
  note.addRow(["列名", "说明"]);
  note.getRow(1).font = { bold: true };
  note.addRows([
    ["填报人", "姓名，如 张三"],
    ["手机号", "11 位手机号，如 13800138000"],
    ["出行人数", "正整数"],
    ["身份证号", "18 位有效身份证（可为空）"],
    [
      "通勤方式",
      "支持：自驾 / 班车 / 其他（也支持英文 key: self_drive / shuttle / other），为空默认其他",
    ],
    ["购票方式", "支持：统一购票 / 自购 / 不需要（unified / self / none）"],
    ["性别", "支持：男 / 女（male / female）"],
    ["房型", "支持：标间 / 家庭 / 大床（standard / family / king）"],
    ["费用字段", "交通费用/住宿费用/餐费/其他费用，均为数字（元），可为空默认 0"],
    ["导入策略", "按 手机号 去重；命中则更新，不命中则新增"],
    ["错误处理", "若任一行有错误，将整体拒绝导入"],
  ]);
  note.columns = [{ width: 20 }, { width: 80 }];

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
};

export const buildGroupBuildingExportBuffer = async (
  list: GroupBuildingSignup[]
): Promise<ArrayBuffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(SHEET_NAME);

  worksheet.addRow(HEADERS);
  worksheet.getRow(1).font = { bold: true };

  for (const row of list) {
    worksheet.addRow([
      row.reporterName ?? "",
      row.phone ?? "",
      row.department ?? "",
      row.headcount ?? 0,
      row.idCard ?? "",
      commuteTypeMap[row.commuteType]?.label ?? row.commuteType,
      ticketTypeMap[row.ticketType]?.label ?? row.ticketType,
      row.outboundTime ?? "",
      row.outboundSeat ?? "",
      row.returnTime ?? "",
      row.returnSeat ?? "",
      genderMap[row.gender]?.label ?? row.gender,
      roomTypeMap[row.roomType]?.label ?? row.roomType,
      row.hotel ?? "",
      row.ticketFee ?? 0,
      row.accommodationFee ?? 0,
      row.mealFee ?? 0,
      row.otherFee ?? 0,
      row.remark ?? "",
    ]);
  }

  worksheet.columns = COL_WIDTHS.map((w) => ({ width: w }));

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
};

export const parseGroupBuildingExcelFile = async (
  file: File
): Promise<ImportGroupBuildingResult> => {
  const workbook = new ExcelJS.Workbook();
  const fileBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(fileBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { rows: [], errors: ["未找到工作表，请使用模板文件"] };
  }

  const rows: ImportGroupBuildingResult["rows"] = [];
  const errors: string[] = [];

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const reporterName = normalizeText(row.getCell(1).value);
    const phone = normalizeText(row.getCell(2).value);
    const department = normalizeText(row.getCell(3).value);
    const headcountRaw = normalizeText(row.getCell(4).value);
    const idCard = normalizeText(row.getCell(5).value);
    const commuteRaw = normalizeText(row.getCell(6).value);
    const ticketRaw = normalizeText(row.getCell(7).value);
    const outboundTime = normalizeText(row.getCell(8).value);
    const outboundSeat = normalizeText(row.getCell(9).value);
    const returnTime = normalizeText(row.getCell(10).value);
    const returnSeat = normalizeText(row.getCell(11).value);
    const genderRaw = normalizeText(row.getCell(12).value);
    const roomRaw = normalizeText(row.getCell(13).value);
    const hotel = normalizeText(row.getCell(14).value);
    const ticketFeeRaw = normalizeText(row.getCell(15).value);
    const accommodationFeeRaw = normalizeText(row.getCell(16).value);
    const mealFeeRaw = normalizeText(row.getCell(17).value);
    const otherFeeRaw = normalizeText(row.getCell(18).value);
    const remark = normalizeText(row.getCell(19).value);

    const isEmpty =
      !reporterName &&
      !phone &&
      !department &&
      !headcountRaw &&
      !idCard &&
      !commuteRaw &&
      !ticketRaw &&
      !outboundTime &&
      !outboundSeat &&
      !returnTime &&
      !returnSeat &&
      !genderRaw &&
      !roomRaw &&
      !hotel &&
      !ticketFeeRaw &&
      !accommodationFeeRaw &&
      !mealFeeRaw &&
      !otherFeeRaw &&
      !remark;
    if (isEmpty) return;

    const rowErrors: string[] = [];

    if (!reporterName) rowErrors.push("填报人不能为空");

    if (!phone) rowErrors.push("手机号不能为空");
    else if (!isValidPhone(phone)) rowErrors.push("手机号格式不正确（需 11 位）");

    if (!department) rowErrors.push("归属不能为空");

    const headcount = headcountRaw === "" ? NaN : Number(headcountRaw);
    if (!Number.isInteger(headcount) || headcount <= 0) {
      rowErrors.push("出行人数必须为正整数");
    }

    // 身份证号可为空，但如果填了就需要校验格式
    if (idCard && !isValidIdCard(idCard)) rowErrors.push("身份证号格式不正确（需 18 位）");

    // 通勤方式为空时默认"其他"
    const commuteType = commuteRaw ? reverseDict(commuteTypeMap, commuteRaw) : "other";
    if (commuteRaw && !commuteType) rowErrors.push("通勤方式无效，仅支持 自驾 / 班车 / 其他");

    const ticketType = reverseDict(ticketTypeMap, ticketRaw);
    if (!ticketType) rowErrors.push("购票方式无效，仅支持 统一购票 / 自购 / 不需要");

    const gender = reverseDict(genderMap, genderRaw);
    if (!gender) rowErrors.push("性别无效，仅支持 男 / 女");

    const roomType = reverseDict(roomTypeMap, roomRaw);
    if (!roomType) rowErrors.push("房型无效，仅支持 标间 / 家庭 / 大床");

    if (!hotel) rowErrors.push("酒店不能为空");

    // 费用字段：可为空默认 0，但如果填了就必须是有效数字
    const ticketFee = ticketFeeRaw === "" ? 0 : Number(ticketFeeRaw);
    if (ticketFeeRaw && (Number.isNaN(ticketFee) || ticketFee < 0)) {
      rowErrors.push("交通费用必须为有效数字");
    }
    const accommodationFee = accommodationFeeRaw === "" ? 0 : Number(accommodationFeeRaw);
    if (accommodationFeeRaw && (Number.isNaN(accommodationFee) || accommodationFee < 0)) {
      rowErrors.push("住宿费用必须为有效数字");
    }
    const mealFee = mealFeeRaw === "" ? 0 : Number(mealFeeRaw);
    if (mealFeeRaw && (Number.isNaN(mealFee) || mealFee < 0)) {
      rowErrors.push("餐费必须为有效数字");
    }
    const otherFee = otherFeeRaw === "" ? 0 : Number(otherFeeRaw);
    if (otherFeeRaw && (Number.isNaN(otherFee) || otherFee < 0)) {
      rowErrors.push("其他费用必须为有效数字");
    }

    if (rowErrors.length) {
      errors.push(`第 ${rowNumber} 行：${rowErrors.join("；")}`);
      return;
    }

    rows.push({
      reporterName,
      phone,
      department,
      headcount,
      idCard,
      commuteType: commuteType || "other",
      ticketType: ticketType!,
      outboundTime,
      outboundSeat,
      returnTime,
      returnSeat,
      gender: gender!,
      roomType: roomType!,
      hotel,
      ticketFee: ticketFee || 0,
      accommodationFee: accommodationFee || 0,
      mealFee: mealFee || 0,
      otherFee: otherFee || 0,
      remark,
    });
  });

  return { rows, errors };
};

export interface MergeGroupBuildingResult {
  merged: GroupBuildingSignup[];
  createdCount: number;
  updatedCount: number;
}

const toMergeKey = (item: { phone: string }) => `${(item.phone || "").trim()}`;

export const mergeGroupBuildingSignups = (
  current: GroupBuildingSignup[],
  importedRows: ImportGroupBuildingResult["rows"],
  nowText: string
): MergeGroupBuildingResult => {
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
      merged[idx] = { ...old, ...item, id: old.id, createdAt: old.createdAt, updatedAt: nowText };
      updatedCount += 1;
      continue;
    }

    maxId += 1;
    const next: GroupBuildingSignup = {
      id: maxId,
      ...item,
      createdAt: nowText,
      updatedAt: nowText,
    };
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
