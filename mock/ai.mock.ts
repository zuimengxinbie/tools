import fs from "node:fs";
import path from "node:path";
import { defineMock } from "./base";

const DATA_DIR = path.resolve(process.cwd(), "mock/data");
const PROMPTS_FILE = path.join(DATA_DIR, "ai-prompts.json");

function readPrompts(): unknown[] {
  try {
    const data = JSON.parse(fs.readFileSync(PROMPTS_FILE, "utf-8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writePrompts(data: unknown[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temporaryFile = `${PROMPTS_FILE}.${process.pid}.${Date.now()}.tmp`;

  try {
    fs.writeFileSync(temporaryFile, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
    fs.renameSync(temporaryFile, PROMPTS_FILE);
  } finally {
    if (fs.existsSync(temporaryFile)) fs.rmSync(temporaryFile);
  }
}

export default defineMock([
  {
    url: "ai/prompts",
    method: ["GET"],
    body: () => ({
      code: "00000",
      data: readPrompts(),
      msg: "一切ok",
    }),
  },
  {
    url: "ai/prompts",
    method: ["PUT"],
    body: ({ body }) => {
      if (!Array.isArray(body)) {
        return { code: "B0400", data: null, msg: "话术数据格式无效" };
      }

      try {
        writePrompts(body);
        return {
          code: "00000",
          data: body.length,
          msg: `已保存 ${body.length} 条话术数据到 mock/data/ai-prompts.json`,
        };
      } catch (error) {
        return {
          code: "B0500",
          data: null,
          msg: error instanceof Error ? error.message : "话术数据保存失败",
        };
      }
    },
  },
]);
