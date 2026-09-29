import request from "@/utils/request";

export interface AiPrompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

const BASE = "/api/v1/ai/prompts";

function normalizeDate(value: unknown): string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : "";
}

function normalizeTags(value: unknown): string[] {
  const tags = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return [
    ...new Set(
      tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
    ),
  ];
}

function normalizePrompt(value: unknown, index: number): AiPrompt {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const createdAt = normalizeDate(source.createdAt);
  const updatedAt = normalizeDate(source.updatedAt) || createdAt;

  return {
    ...source,
    id:
      typeof source.id === "string" && source.id.trim() ? source.id : `legacy-prompt-${index + 1}`,
    title: typeof source.title === "string" ? source.title : "",
    content: typeof source.content === "string" ? source.content : "",
    tags: normalizeTags(source.tags),
    createdAt,
    updatedAt,
  };
}

const AiPromptAPI = {
  async getPrompts(): Promise<AiPrompt[]> {
    const data = await request<any, unknown>({ url: BASE, method: "get" });
    return Array.isArray(data) ? data.map(normalizePrompt) : [];
  },

  savePrompts(list: AiPrompt[]) {
    return request<any, number>({ url: BASE, method: "put", data: list });
  },
};

export default AiPromptAPI;
