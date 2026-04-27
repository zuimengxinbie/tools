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
