import { computed, onMounted, ref } from "vue";
import { useNow } from "@vueuse/core";
import AffairsAPI, { type Requirement, type TodoItem } from "@/api/affairs";
import TravelAPI, { type HolidayPlan, type WeekendTrip } from "@/api/travel";
import { useBusinessStore } from "@/stores/business";
import type { Reservation } from "@/views/business/types";
import type { CalendarEventStatus, CalendarSourceGroup, UnifiedCalendarEvent } from "../types";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toDateKey(value: string | Date = new Date()): string {
  if (typeof value === "string") {
    const direct = value.slice(0, 10);
    if (DATE_KEY_PATTERN.test(direct)) return direct;
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromDateKey(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

export function addDays(value: string, amount: number): string {
  const date = fromDateKey(value);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

export function dateTimeParts(value: string): { date: string; time?: string } {
  const direct = value.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
  if (direct) return { date: direct[1], time: direct[2] };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "" };
  return {
    date: toDateKey(date),
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  };
}

export function isEventOnDate(event: UnifiedCalendarEvent, date: string): boolean {
  return event.date <= date && (event.endDate || event.date) >= date;
}

export function isEventOverdue(event: UnifiedCalendarEvent, today: string): boolean {
  return event.status === "active" && (event.endDate || event.date) < today;
}

export function sortCalendarEvents(
  events: UnifiedCalendarEvent[],
  today: string
): UnifiedCalendarEvent[] {
  return [...events].sort((left, right) => {
    const leftOverdue = isEventOverdue(left, today);
    const rightOverdue = isEventOverdue(right, today);
    if (leftOverdue !== rightOverdue) return leftOverdue ? -1 : 1;
    if (left.status !== right.status) return left.status === "active" ? -1 : 1;
    const dateOrder = left.date.localeCompare(right.date);
    if (dateOrder !== 0) return dateOrder;
    if (left.time && right.time) return left.time.localeCompare(right.time);
    if (left.time) return -1;
    if (right.time) return 1;
    return left.title.localeCompare(right.title, "zh-CN");
  });
}

function todoStatus(todo: TodoItem): CalendarEventStatus {
  if (todo.status === "done") return "completed";
  if (todo.status === "cancelled") return "cancelled";
  return "active";
}

function requirementStatus(requirement: Requirement): CalendarEventStatus {
  return requirement.status === "done" || requirement.status === "closed" ? "completed" : "active";
}

function reservationStatus(reservation: Reservation): CalendarEventStatus {
  if (reservation.status === "completed") return "completed";
  if (reservation.status === "cancelled") return "cancelled";
  return "active";
}

function todoEvents(todos: TodoItem[]): UnifiedCalendarEvent[] {
  return todos.flatMap((todo) => {
    const events: UnifiedCalendarEvent[] = [];
    const status = todoStatus(todo);
    if (todo.dueDate) {
      events.push({
        id: `todo-due-${todo.id}`,
        entityId: String(todo.id),
        source: "todo",
        group: "affairs",
        title: todo.title,
        subtitle: `待办截止 · ${todo.progress || 0}%`,
        date: todo.dueDate,
        status,
        route: { path: "/affairs/todolist", query: { calendarId: String(todo.id) } },
      });
    }
    if (todo.remindAt) {
      const reminder = dateTimeParts(todo.remindAt);
      if (reminder.date) {
        events.push({
          id: `todo-reminder-${todo.id}`,
          entityId: String(todo.id),
          source: "reminder",
          group: "affairs",
          title: todo.title,
          subtitle: "待办提醒",
          date: reminder.date,
          time: reminder.time,
          status,
          route: { path: "/affairs/todolist", query: { calendarId: String(todo.id) } },
        });
      }
    }
    return events;
  });
}

function requirementEvents(requirements: Requirement[]): UnifiedCalendarEvent[] {
  return requirements
    .filter((requirement) => requirement.dueDate)
    .map((requirement) => ({
      id: `requirement-${requirement.id}`,
      entityId: String(requirement.id),
      source: "requirement" as const,
      group: "affairs" as const,
      title: requirement.title,
      subtitle: `个人需求 · ${requirement.assignee || "未指派"}`,
      date: requirement.dueDate,
      status: requirementStatus(requirement),
      route: {
        path: "/affairs/requirements",
        query: { calendarId: String(requirement.id) },
      },
    }));
}

function weekendEvents(trips: WeekendTrip[]): UnifiedCalendarEvent[] {
  return trips
    .filter((trip) => trip.date)
    .map((trip) => ({
      id: `weekend-${trip.id}`,
      entityId: String(trip.id),
      source: "weekend" as const,
      group: "travel" as const,
      title: trip.title || "周末出游",
      subtitle: trip.destination || "目的地待定",
      date: trip.date,
      status: trip.status === "completed" ? ("completed" as const) : ("active" as const),
      route: { path: "/travel/weekend", query: { calendarId: String(trip.id) } },
    }));
}

function holidayEvents(plans: HolidayPlan[]): UnifiedCalendarEvent[] {
  return plans
    .filter((plan) => plan.startDate)
    .map((plan) => ({
      id: `holiday-${plan.id}`,
      entityId: String(plan.id),
      source: "holiday" as const,
      group: "travel" as const,
      title: plan.festival || "假日出游",
      subtitle: plan.destination || "目的地待定",
      date: plan.startDate,
      endDate: plan.endDate && plan.endDate >= plan.startDate ? plan.endDate : plan.startDate,
      status: plan.status === "completed" ? ("completed" as const) : ("active" as const),
      route: { path: "/travel/holiday", query: { calendarId: String(plan.id) } },
    }));
}

function reservationEvents(reservations: Reservation[]): UnifiedCalendarEvent[] {
  return reservations.flatMap((reservation) => {
    const pickup = dateTimeParts(reservation.pickupTime);
    if (!pickup.date) return [];
    return [
      {
        id: `reservation-${reservation.id}`,
        entityId: reservation.id,
        source: "reservation" as const,
        group: "business" as const,
        title: `${reservation.customer} · ${reservation.reservationNo}`,
        subtitle: reservation.items
          .map((item) => `${item.productName}×${item.quantity}`)
          .join("，"),
        date: pickup.date,
        time: pickup.time,
        status: reservationStatus(reservation),
        route: {
          path: "/business/inventory",
          query: { tab: "reservations", calendarId: reservation.id },
        },
      },
    ];
  });
}

export function useUnifiedCalendar() {
  const businessStore = useBusinessStore();
  const now = useNow({ interval: 60_000 });
  const todos = ref<TodoItem[]>([]);
  const requirements = ref<Requirement[]>([]);
  const weekendTrips = ref<WeekendTrip[]>([]);
  const holidayPlans = ref<HolidayPlan[]>([]);
  const loading = ref(false);
  const errors = ref<string[]>([]);
  const lastUpdatedAt = ref<Date>();
  const enabledGroups = ref<CalendarSourceGroup[]>(["affairs", "travel", "business"]);

  const todayKey = computed(() => toDateKey(now.value));
  const allEvents = computed(() =>
    sortCalendarEvents(
      [
        ...todoEvents(todos.value),
        ...requirementEvents(requirements.value),
        ...weekendEvents(weekendTrips.value),
        ...holidayEvents(holidayPlans.value),
        ...reservationEvents(businessStore.reservations),
      ],
      todayKey.value
    )
  );
  const events = computed(() =>
    allEvents.value.filter((event) => enabledGroups.value.includes(event.group))
  );

  const conflictIds = computed(() => {
    const timed = new Map<string, UnifiedCalendarEvent[]>();
    events.value
      .filter((event) => event.status === "active" && event.time)
      .forEach((event) => {
        const key = `${event.date}-${event.time}`;
        timed.set(key, [...(timed.get(key) ?? []), event]);
      });
    return new Set(
      [...timed.values()]
        .filter((group) => group.length > 1)
        .flatMap((group) => group.map((event) => event.id))
    );
  });

  const todayEvents = computed(() =>
    events.value.filter((event) => isEventOnDate(event, todayKey.value))
  );
  const overdueEvents = computed(() =>
    events.value.filter((event) => isEventOverdue(event, todayKey.value))
  );
  const upcomingEvents = computed(() => {
    const start = addDays(todayKey.value, 1);
    const end = addDays(todayKey.value, 7);
    return events.value.filter(
      (event) => event.status === "active" && event.date >= start && event.date <= end
    );
  });

  function eventsForDate(date: string): UnifiedCalendarEvent[] {
    return sortCalendarEvents(
      events.value.filter((event) => isEventOnDate(event, date)),
      todayKey.value
    );
  }

  function activeEventCount(date: string): number {
    return eventsForDate(date).filter((event) => event.status === "active").length;
  }

  function toggleGroup(group: CalendarSourceGroup): void {
    enabledGroups.value = enabledGroups.value.includes(group)
      ? enabledGroups.value.filter((item) => item !== group)
      : [...enabledGroups.value, group];
  }

  async function load(forceBusiness = false): Promise<void> {
    if (loading.value) return;
    loading.value = true;
    errors.value = [];
    const results = await Promise.allSettled([
      AffairsAPI.getTodos(),
      AffairsAPI.getRequirements(),
      TravelAPI.getWeekendList(),
      TravelAPI.getHolidayList(),
      businessStore.initialize(forceBusiness),
    ]);

    if (results[0].status === "fulfilled") todos.value = results[0].value || [];
    else errors.value.push("待办数据加载失败");
    if (results[1].status === "fulfilled") requirements.value = results[1].value || [];
    else errors.value.push("个人需求加载失败");
    if (results[2].status === "fulfilled") weekendTrips.value = results[2].value || [];
    else errors.value.push("周末行程加载失败");
    if (results[3].status === "fulfilled") holidayPlans.value = results[3].value || [];
    else errors.value.push("假日行程加载失败");
    if (results[4].status === "rejected") errors.value.push("咖啡预定加载失败");

    lastUpdatedAt.value = new Date();
    loading.value = false;
  }

  onMounted(() => void load());

  return {
    now,
    todayKey,
    events,
    enabledGroups,
    conflictIds,
    todayEvents,
    overdueEvents,
    upcomingEvents,
    loading,
    errors,
    lastUpdatedAt,
    eventsForDate,
    activeEventCount,
    toggleGroup,
    load,
  };
}
