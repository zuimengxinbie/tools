import type { RouteLocationRaw } from "vue-router";

export type CalendarSource =
  | "todo"
  | "reminder"
  | "requirement"
  | "weekend"
  | "holiday"
  | "reservation";

export type CalendarSourceGroup = "affairs" | "travel" | "business";
export type CalendarEventStatus = "active" | "completed" | "cancelled";

export interface UnifiedCalendarEvent {
  id: string;
  entityId: string;
  source: CalendarSource;
  group: CalendarSourceGroup;
  title: string;
  subtitle: string;
  date: string;
  endDate?: string;
  time?: string;
  status: CalendarEventStatus;
  route: RouteLocationRaw;
}

export interface CalendarDay {
  date: string;
  day: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}
