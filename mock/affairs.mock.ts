import fs from "node:fs";
import path from "node:path";
import { defineMock } from "./base";

/**
 * 事务管理 Mock
 *
 * 数据持久化到 mock/data/requirements.json
 * - GET  affairs/requirements → 读取 JSON
 * - PUT  affairs/requirements → 覆盖写入整份列表
 */

const DATA_DIR = path.resolve(process.cwd(), "mock/data");
const REQUIREMENTS_FILE = path.join(DATA_DIR, "requirements.json");
const TODOLIST_FILE = path.join(DATA_DIR, "todolist.json");

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
  {
    url: "affairs/requirements",
    method: ["GET"],
    body: () => ({
      code: "00000",
      data: readJson(REQUIREMENTS_FILE),
      msg: "一切ok",
    }),
  },
  {
    url: "affairs/requirements",
    method: ["PUT"],
    body: ({ body }) => {
      const list = Array.isArray(body) ? body : [];
      writeJson(REQUIREMENTS_FILE, list);
      return {
        code: "00000",
        data: list.length,
        msg: `已保存 ${list.length} 条需求数据到 mock/data/requirements.json`,
      };
    },
  },
  {
    url: "affairs/todolist",
    method: ["GET"],
    body: () => ({
      code: "00000",
      data: readJson(TODOLIST_FILE),
      msg: "一切ok",
    }),
  },
  {
    url: "affairs/todolist",
    method: ["PUT"],
    body: ({ body }) => {
      const list = Array.isArray(body) ? body : [];
      writeJson(TODOLIST_FILE, list);
      return {
        code: "00000",
        data: list.length,
        msg: `已保存 ${list.length} 条待办数据到 mock/data/todolist.json`,
      };
    },
  },
]);
