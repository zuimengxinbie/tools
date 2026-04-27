import fs from "node:fs";
import path from "node:path";
import { defineMock } from "./base";

/**
 * 行程规划 Mock
 *
 * 数据持久化到 `mock/data/*.json`：
 * - GET  /travel/weekend | /travel/holiday  → 读取 JSON 文件
 * - PUT  /travel/weekend | /travel/holiday  → 覆盖写入整份列表
 *
 * 这样在页面上编辑后点击"保存到 Mock"即可落盘，下次启动仍然保留。
 */

const DATA_DIR = path.resolve(process.cwd(), "mock/data");
const WEEKEND_FILE = path.join(DATA_DIR, "weekend-trips.json");
const HOLIDAY_FILE = path.join(DATA_DIR, "holiday-plans.json");

const readJson = (file: string) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return [];
  }
};

const writeJson = (file: string, data: unknown) => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
};

export default defineMock([
  // ---------------- 周末出游 ----------------
  {
    url: "travel/weekend",
    method: ["GET"],
    body: () => ({
      code: "00000",
      data: readJson(WEEKEND_FILE),
      msg: "一切ok",
    }),
  },
  {
    url: "travel/weekend",
    method: ["PUT"],
    body: ({ body }) => {
      const list = Array.isArray(body) ? body : [];
      writeJson(WEEKEND_FILE, list);
      return {
        code: "00000",
        data: list.length,
        msg: `已保存 ${list.length} 条周末出游数据到 mock/data/weekend-trips.json`,
      };
    },
  },

  // ---------------- 假日出游 ----------------
  {
    url: "travel/holiday",
    method: ["GET"],
    body: () => ({
      code: "00000",
      data: readJson(HOLIDAY_FILE),
      msg: "一切ok",
    }),
  },
  {
    url: "travel/holiday",
    method: ["PUT"],
    body: ({ body }) => {
      const list = Array.isArray(body) ? body : [];
      writeJson(HOLIDAY_FILE, list);
      return {
        code: "00000",
        data: list.length,
        msg: `已保存 ${list.length} 条假日出游数据到 mock/data/holiday-plans.json`,
      };
    },
  },
]);
