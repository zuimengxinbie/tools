import request from "@/utils/request";

export interface TripRecord {
  time: string;
  content: string;
}

export type TripStatus = "planning" | "confirmed" | "completed";

export interface WeekendTrip {
  id: number;
  title: string;
  destination: string;
  date: string;
  duration: string;
  status: TripStatus;
  preparation: string[];
  review: string;
  records: TripRecord[];
  /** 行程评级：5=优 4=良 3=中 2=可 1=差 */
  rating?: number;
}

export type HolidayStatus = "planning" | "confirmed" | "completed";

export type CostCategory = "交通" | "住宿" | "餐饮" | "门票" | "购物" | "其他";

export interface CostItem {
  id: number;
  category: CostCategory;
  name: string;
  amount: number;
}

export type PrepCategory = "证件" | "电子" | "衣物" | "药品" | "食物" | "其他";

export interface PrepItem {
  id: number;
  name: string;
  category: PrepCategory;
  done: boolean;
}

export type CoordinationStatus = "pending" | "resolved";

export interface CoordinationItem {
  id: number;
  question: string;
  answer: string;
  status: CoordinationStatus;
}

export interface HolidayPlan {
  id: number;
  festival: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  members: number;
  transport: string;
  remark: string;
  /** 状态：规划中 / 已确认 / 已完成，默认 planning */
  status?: HolidayStatus;
  /** 实际花费，默认 0（汇总自 costItems） */
  actualCost?: number;
  /** 计划评级：5=优 1=差 */
  rating?: number;
  /** 出行后回顾 */
  review?: string;
  /** 费用明细 */
  costItems?: CostItem[];
  /** 出行准备清单 */
  preparation?: PrepItem[];
  /** 行程协调问答 */
  coordination?: CoordinationItem[];
}

const BASE = "/api/v1/travel";

const TravelAPI = {
  getWeekendList() {
    return request<any, WeekendTrip[]>({ url: `${BASE}/weekend`, method: "get" });
  },
  saveWeekendList(list: WeekendTrip[]) {
    return request<any, number>({ url: `${BASE}/weekend`, method: "put", data: list });
  },
  getHolidayList() {
    return request<any, HolidayPlan[]>({ url: `${BASE}/holiday`, method: "get" });
  },
  saveHolidayList(list: HolidayPlan[]) {
    return request<any, number>({ url: `${BASE}/holiday`, method: "put", data: list });
  },
};

export default TravelAPI;
