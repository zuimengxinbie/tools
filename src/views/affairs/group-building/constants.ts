import type { CommuteType, TicketType, Gender, RoomType } from "@/api/affairs";

export type ElTagType = "primary" | "success" | "warning" | "info" | "danger";

export interface DictMeta<K extends string> {
  key: K;
  label: string;
  tagType: ElTagType | "";
}

export const commuteTypeMap: Record<CommuteType, DictMeta<CommuteType>> = {
  self_drive: { key: "self_drive", label: "自驾", tagType: "primary" },
  shuttle: { key: "shuttle", label: "班车", tagType: "success" },
  other: { key: "other", label: "其他", tagType: "info" },
};

export const ticketTypeMap: Record<TicketType, DictMeta<TicketType>> = {
  unified: { key: "unified", label: "统一购票", tagType: "primary" },
  self: { key: "self", label: "自购", tagType: "warning" },
  none: { key: "none", label: "不需要", tagType: "info" },
};

export const genderMap: Record<Gender, DictMeta<Gender>> = {
  male: { key: "male", label: "男", tagType: "primary" },
  female: { key: "female", label: "女", tagType: "danger" },
};

export const roomTypeMap: Record<RoomType, DictMeta<RoomType>> = {
  standard: { key: "standard", label: "标间", tagType: "primary" },
  family: { key: "family", label: "家庭", tagType: "warning" },
  king: { key: "king", label: "大床", tagType: "success" },
};

export const commuteTypeOptions = Object.values(commuteTypeMap);
export const ticketTypeOptions = Object.values(ticketTypeMap);
export const genderOptions = Object.values(genderMap);
export const roomTypeOptions = Object.values(roomTypeMap);

/** 18 位身份证简单校验（不计算校验码，只校验格式） */
export const isValidIdCard = (v: string) =>
  /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(v);

/** 身份证脱敏：前 6 + **** + 后 4 */
export const maskIdCard = (v: string) => {
  if (!v) return "";
  if (v.length <= 10) return v;
  return `${v.slice(0, 6)}********${v.slice(-4)}`;
};

export const nowStr = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/** 反查字典：传入 label/key 任意一种返回 key，无法识别返回 null */
export const reverseDict = <K extends string>(
  map: Record<K, DictMeta<K>>,
  raw: string
): K | null => {
  if (!raw) return null;
  const text = raw.trim();
  const keys = Object.keys(map) as K[];
  for (const k of keys) {
    if (k === text.toLowerCase() || map[k].label === text) return k;
  }
  return null;
};
