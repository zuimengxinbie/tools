import { computed, onMounted, ref } from "vue";
import { useNow } from "@vueuse/core";
import TravelAPI, { type HolidayPlan, type WeekendTrip } from "@/api/travel";
import AffairsAPI, { type TodoItem } from "@/api/affairs";
import { useBusinessStore } from "@/stores/business";

export type DashboardLoadState = "loading" | "ready" | "error";

interface UpcomingTrip {
  id: number;
  type: "weekend" | "holiday";
  title: string;
  destination: string;
  date: string;
  daysUntil: number;
  route: "/travel/weekend" | "/travel/holiday";
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateDistance(date: string, now: Date): number {
  if (!date) return Number.POSITIVE_INFINITY;
  const target = new Date(`${date}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "数据暂时未能抵达";
}

export function useDashboardOverview() {
  const businessStore = useBusinessStore();
  const now = useNow({ interval: 60_000 });
  const businessState = ref<DashboardLoadState>("loading");
  const travelState = ref<DashboardLoadState>("loading");
  const affairsState = ref<DashboardLoadState>("loading");
  const businessError = ref("");
  const travelError = ref("");
  const affairsError = ref("");
  const weekendTrips = ref<WeekendTrip[]>([]);
  const holidayTrips = ref<HolidayPlan[]>([]);
  const todos = ref<TodoItem[]>([]);

  const businessSummary = computed(() => {
    const validOrders = businessStore.orders.filter((order) => order.status !== "voided");
    const revenue = validOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const activeOrders = businessStore.orders.filter(
      (order) => order.status === "pending" || order.status === "making"
    ).length;
    return { revenue, activeOrders };
  });

  const nextTrip = computed<UpcomingTrip | null>(() => {
    const today = toLocalDateKey(now.value);
    const candidates: UpcomingTrip[] = [
      ...weekendTrips.value
        .filter((trip) => trip.status !== "completed" && trip.date >= today)
        .map((trip) => ({
          id: trip.id,
          type: "weekend" as const,
          title: trip.title || "周末出游",
          destination: trip.destination || "目的地待定",
          date: trip.date,
          daysUntil: dateDistance(trip.date, now.value),
          route: "/travel/weekend" as const,
        })),
      ...holidayTrips.value
        .filter((trip) => (trip.status ?? "planning") !== "completed" && trip.startDate >= today)
        .map((trip) => ({
          id: trip.id,
          type: "holiday" as const,
          title: trip.festival || "假日出游",
          destination: trip.destination || "目的地待定",
          date: trip.startDate,
          daysUntil: dateDistance(trip.startDate, now.value),
          route: "/travel/holiday" as const,
        })),
    ];
    return candidates.sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
  });

  const affairsSummary = computed(() => {
    const activeTodos = todos.value.filter(
      (todo) => todo.status !== "done" && todo.status !== "cancelled"
    );
    const orderedTodos = [...activeTodos].sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      if (a.starred !== b.starred) return a.starred ? -1 : 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    const overdueCount = activeTodos.filter(
      (todo) => todo.dueDate && dateDistance(todo.dueDate, now.value) < 0
    ).length;
    const nextTodo = orderedTodos[0] ?? null;
    return {
      nextTodo,
      openCount: activeTodos.length,
      overdueCount,
      dueDays: nextTodo?.dueDate ? dateDistance(nextTodo.dueDate, now.value) : null,
    };
  });
  async function loadBusiness() {
    businessState.value = "loading";
    businessError.value = "";
    try {
      await businessStore.initialize();
      businessState.value = "ready";
    } catch (error) {
      businessError.value = getErrorMessage(error);
      businessState.value = "error";
    }
  }

  async function loadTravel() {
    travelState.value = "loading";
    travelError.value = "";
    const [weekendResult, holidayResult] = await Promise.allSettled([
      TravelAPI.getWeekendList(),
      TravelAPI.getHolidayList(),
    ]);
    if (weekendResult.status === "fulfilled") weekendTrips.value = weekendResult.value || [];
    if (holidayResult.status === "fulfilled") holidayTrips.value = holidayResult.value || [];
    if (weekendResult.status === "rejected" && holidayResult.status === "rejected") {
      travelError.value = getErrorMessage(weekendResult.reason);
      travelState.value = "error";
      return;
    }
    travelState.value = "ready";
  }

  async function loadAffairs() {
    affairsState.value = "loading";
    affairsError.value = "";
    try {
      todos.value = (await AffairsAPI.getTodos()) || [];
      affairsState.value = "ready";
    } catch (error) {
      affairsError.value = getErrorMessage(error);
      affairsState.value = "error";
    }
  }

  onMounted(() => {
    void Promise.allSettled([loadBusiness(), loadTravel(), loadAffairs()]);
  });

  return {
    now,
    businessState,
    travelState,
    affairsState,
    businessError,
    travelError,
    affairsError,
    businessSummary,
    nextTrip,
    affairsSummary,
    loadBusiness,
    loadTravel,
    loadAffairs,
  };
}
