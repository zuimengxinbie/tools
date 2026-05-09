import ExcelJS from "exceljs";
import type {
  HolidayPlan,
  HolidayStatus,
  CostItem,
  CostCategory,
  PrepItem,
  PrepCategory,
  CoordinationItem,
  CoordinationStatus,
  CostEstimateType,
} from "@/api/travel";

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

const STATUS_VALUE_MAP: Record<string, HolidayStatus> = {
  planning: "planning",
  规划中: "planning",
  confirmed: "confirmed",
  已确认: "confirmed",
  completed: "completed",
  已完成: "completed",
};

const COST_CATEGORIES: CostCategory[] = ["交通", "住宿", "餐饮", "门票", "购物", "其他"];
const PREP_CATEGORIES: PrepCategory[] = ["证件", "电子", "衣物", "药品", "食物", "其他"];
const COORD_STATUS_VALUES: CoordinationStatus[] = ["pending", "resolved"];
const COST_ESTIMATE_VALUES: CostEstimateType[] = ["estimated", "confirmed"];

export interface ImportHolidayResult {
  rows: Omit<HolidayPlan, "id">[];
  errors: string[];
}

export interface MergeHolidayResult {
  merged: HolidayPlan[];
  createdCount: number;
  updatedCount: number;
}

const normalizeText = (value: unknown): string => {
  if (value == null) return "";
  return String(value).trim();
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

const parseNumber = (value: unknown): number | null => {
  if (value == null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const toStatusLabel = (status: HolidayStatus): string => STATUS_LABEL_MAP[status] || status;

const toStatusValue = (rawStatus: string): HolidayStatus | null => {
  const key = rawStatus.trim().toLowerCase();
  return STATUS_VALUE_MAP[key] ?? null;
};

const stringifyJson = (value: unknown): string => {
  if (value == null) return "[]";
  return JSON.stringify(value);
};

const parseJsonArray = (raw: string): unknown[] | null => {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return null;
    return data;
  } catch {
    return null;
  }
};

const normalizeCostItems = (items: unknown[]): CostItem[] | null => {
  const result: CostItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as Partial<CostItem>;
    if (!item || typeof item !== "object") return null;
    const category = normalizeText(item.category);
    if (!COST_CATEGORIES.includes(category as CostCategory)) return null;
    const name = normalizeText(item.name);
    if (!name) return null;
    const amount = Number(item.amount);
    if (!Number.isFinite(amount) || amount < 0) return null;
    const estimateTypeRaw = normalizeText(item.estimateType || "estimated") || "estimated";
    if (!COST_ESTIMATE_VALUES.includes(estimateTypeRaw as CostEstimateType)) return null;

    result.push({
      id: Number(item.id) || i + 1,
      category: category as CostCategory,
      name,
      amount,
      estimateType: estimateTypeRaw as CostEstimateType,
    });
  }
  return result;
};

const normalizePrepItems = (items: unknown[]): PrepItem[] | null => {
  const result: PrepItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as Partial<PrepItem>;
    if (!item || typeof item !== "object") return null;
    const category = normalizeText(item.category);
    if (!PREP_CATEGORIES.includes(category as PrepCategory)) return null;
    const name = normalizeText(item.name);
    if (!name) return null;

    result.push({
      id: Number(item.id) || i + 1,
      name,
      category: category as PrepCategory,
      done: Boolean(item.done),
    });
  }
  return result;
};

const normalizeCoordinationItems = (items: unknown[]): CoordinationItem[] | null => {
  const result: CoordinationItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as Partial<CoordinationItem>;
    if (!item || typeof item !== "object") return null;
    const question = normalizeText(item.question);
    const answer = normalizeText(item.answer);
    const status = normalizeText(item.status || "pending") as CoordinationStatus;
    if (!question || !answer) return null;
    if (!COORD_STATUS_VALUES.includes(status)) return null;

    result.push({
      id: Number(item.id) || i + 1,
      question,
      answer,
      status,
    });
  }
  return result;
};

const calcActualCost = (costItems: CostItem[], actualCost: number): number => {
  if (costItems.length) {
    return costItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }
  return actualCost;
};

export const buildHolidayTemplateBuffer = async (): Promise<ArrayBuffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(SHEET_NAME);

  worksheet.addRow(HEADERS);
  worksheet.getRow(1).font = { bold: true };

  worksheet.addRow([
    "端午节",
    "杭州·西湖",
    "2026-06-19",
    "2026-06-21",
    2600,
    2,
    "高铁",
    "规划中",
    0,
    0,
    "<p>示例备注</p>",
    '[{"id":1,"category":"交通","name":"往返高铁","amount":800,"estimateType":"estimated"}]',
    '[{"id":1,"name":"身份证","category":"证件","done":false}]',
    '[{"id":1,"question":"是否住景区内","answer":"先住景区外","status":"pending"}]',
  ]);

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

  const note = workbook.addWorksheet("填写说明");
  note.addRow(["列名", "说明"]);
  note.getRow(1).font = { bold: true };
  note.addRows([
    ["状态", "支持：规划中/planning、已确认/confirmed、已完成/completed"],
    ["开始日期/结束日期", "建议格式 YYYY-MM-DD"],
    ["预算/人数/实际花费", "必须是数字；人数建议 >=1"],
    ["行程评级", "0-5 的整数，0 表示未评分"],
    ["费用明细(JSON)", "JSON 数组，每项字段：category,name,amount,estimateType，可含 id"],
    ["准备清单(JSON)", "JSON 数组，每项字段：name,category,done，可含 id"],
    ["协调问答(JSON)", "JSON 数组，每项字段：question,answer,status，可含 id"],
    ["导入策略", "按 节日+开始日期+目的地 去重；命中更新，不命中新建"],
    ["错误处理", "若任一行有错误，将整体拒绝导入"],
  ]);
  note.columns = [{ width: 20 }, { width: 100 }];

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
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

export const parseHolidayExcelFile = async (file: File): Promise<ImportHolidayResult> => {
  const workbook = new ExcelJS.Workbook();
  const fileBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(fileBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { rows: [], errors: ["未找到工作表，请使用模板文件"] };
  }

  const rows: Omit<HolidayPlan, "id">[] = [];
  const errors: string[] = [];

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const festival = normalizeText(row.getCell(1).value);
    const destination = normalizeText(row.getCell(2).value);
    const startDate = parseDateValue(row.getCell(3).value);
    const endDate = parseDateValue(row.getCell(4).value);
    const budgetRaw = row.getCell(5).value;
    const membersRaw = row.getCell(6).value;
    const transport = normalizeText(row.getCell(7).value);
    const statusRaw = normalizeText(row.getCell(8).value);
    const ratingRaw = row.getCell(9).value;
    const actualCostRaw = row.getCell(10).value;
    const remark = normalizeText(row.getCell(11).value);
    const costRaw = normalizeText(row.getCell(12).value);
    const prepRaw = normalizeText(row.getCell(13).value);
    const coordRaw = normalizeText(row.getCell(14).value);

    const isEmptyRow =
      !festival &&
      !destination &&
      !startDate &&
      !endDate &&
      normalizeText(budgetRaw) === "" &&
      normalizeText(membersRaw) === "" &&
      !transport &&
      !statusRaw &&
      normalizeText(ratingRaw) === "" &&
      normalizeText(actualCostRaw) === "" &&
      !remark &&
      !costRaw &&
      !prepRaw &&
      !coordRaw;
    if (isEmptyRow) return;

    const rowErrors: string[] = [];

    if (!festival) rowErrors.push("节日不能为空");
    if (!destination) rowErrors.push("目的地不能为空");
    if (!startDate) rowErrors.push("开始日期格式不正确，需为 YYYY-MM-DD");
    if (!endDate) rowErrors.push("结束日期格式不正确，需为 YYYY-MM-DD");
    if (startDate && endDate && endDate < startDate) {
      rowErrors.push("结束日期不能早于开始日期");
    }

    const budget = parseNumber(budgetRaw);
    if (budget == null || budget < 0) rowErrors.push("预算必须是大于等于 0 的数字");

    const members = parseNumber(membersRaw);
    if (members == null || !Number.isInteger(members) || members < 1) {
      rowErrors.push("出行人数必须是大于等于 1 的整数");
    }

    if (!transport) rowErrors.push("交通方式不能为空");

    const status = toStatusValue(statusRaw);
    if (!status) {
      rowErrors.push("状态无效，仅支持 规划中/planning、已确认/confirmed、已完成/completed");
    }

    const ratingNumber = parseNumber(ratingRaw);
    if (
      ratingNumber == null ||
      !Number.isInteger(ratingNumber) ||
      ratingNumber < 0 ||
      ratingNumber > 5
    ) {
      rowErrors.push("行程评级必须是 0-5 的整数");
    }

    const actualCostNumber = parseNumber(actualCostRaw);
    if (actualCostNumber == null || actualCostNumber < 0) {
      rowErrors.push("实际花费必须是大于等于 0 的数字");
    }

    const costJson = parseJsonArray(costRaw);
    if (costJson == null) rowErrors.push("费用明细(JSON) 解析失败，必须是 JSON 数组");

    const prepJson = parseJsonArray(prepRaw);
    if (prepJson == null) rowErrors.push("准备清单(JSON) 解析失败，必须是 JSON 数组");

    const coordJson = parseJsonArray(coordRaw);
    if (coordJson == null) rowErrors.push("协调问答(JSON) 解析失败，必须是 JSON 数组");

    const costItems = normalizeCostItems(costJson ?? []);
    if (costItems == null) rowErrors.push("费用明细(JSON) 字段不合法");

    const preparation = normalizePrepItems(prepJson ?? []);
    if (preparation == null) rowErrors.push("准备清单(JSON) 字段不合法");

    const coordination = normalizeCoordinationItems(coordJson ?? []);
    if (coordination == null) rowErrors.push("协调问答(JSON) 字段不合法");

    if (rowErrors.length) {
      errors.push(`第 ${rowNumber} 行：${rowErrors.join("；")}`);
      return;
    }

    const actualCost = calcActualCost(costItems ?? [], actualCostNumber ?? 0);

    rows.push({
      festival,
      destination,
      startDate,
      endDate,
      budget: budget ?? 0,
      members: members ?? 1,
      transport,
      remark,
      status: status as HolidayStatus,
      actualCost,
      rating: ratingNumber ?? 0,
      review: "",
      costItems: costItems ?? [],
      preparation: preparation ?? [],
      coordination: coordination ?? [],
    });
  });

  return { rows, errors };
};

const toMergeKey = (item: Pick<HolidayPlan, "festival" | "startDate" | "destination">): string =>
  `${(item.festival || "").trim().toLowerCase()}::${(item.startDate || "").trim()}::${(
    item.destination || ""
  )
    .trim()
    .toLowerCase()}`;

export const mergeHolidayPlans = (
  current: HolidayPlan[],
  importedRows: Omit<HolidayPlan, "id">[]
): MergeHolidayResult => {
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
      merged[idx] = { ...old, ...item, id: old.id, review: old.review ?? "" };
      updatedCount += 1;
      continue;
    }

    maxId += 1;
    const next: HolidayPlan = { id: maxId, ...item, review: "" };
    merged.unshift(next);
    indexMap.set(toMergeKey(next), 0);
    createdCount += 1;
  }

  return { merged, createdCount, updatedCount };
};
