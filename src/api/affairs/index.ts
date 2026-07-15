import request from "@/utils/request";

export type ReqType = "task" | "issue" | "suggestion" | "other";
export type ReqPriority = "urgent" | "high" | "medium" | "low";
export type ReqStatus = "pending" | "in-progress" | "review" | "done" | "closed";

export interface SubTask {
  id: number;
  title: string;
  done: boolean;
  assignee: string;
  dueDate: string;
}

export interface Comment {
  id: number;
  author: string;
  content: string;
  createdAt: string;
}

export interface Requirement {
  id: number;
  title: string;
  type: ReqType;
  priority: ReqPriority;
  status: ReqStatus;
  description: string;
  assignee: string;
  /** 协作人列表，自由输入 */
  collaborators: string[];
  dueDate: string;
  createdAt: string;
  subTasks: SubTask[];
  comments: Comment[];
}

/* ---------------- 待办清单 Todolist ---------------- */
export type TodoCategory =
  | "work"
  | "study"
  | "life"
  | "health"
  | "family"
  | "finance"
  | "shopping"
  | "hobby"
  | "other";

export type TodoPriority = "urgent" | "high" | "medium" | "low";
export type TodoStatus = "todo" | "doing" | "done" | "cancelled";
export type TodoRepeat = "none" | "daily" | "weekly" | "monthly";

export interface ChecklistItem {
  id: number;
  title: string;
  done: boolean;
  /** 完成时间 YYYY-MM-DD，默认为截止日期 */
  finishedAt?: string;
  /** 该子任务的消费记录 */
  expenses: ExpenseItem[];
}

/** 子任务消费记录 */
export interface ExpenseItem {
  id: number;
  /** 金额（元） */
  amount: number;
  /** 备注 */
  remark: string;
  /** 日期 YYYY-MM-DD */
  date: string;
}

export interface TodoItem {
  id: number;
  title: string;
  category: TodoCategory;
  priority: TodoPriority;
  status: TodoStatus;
  /** 截止日期 YYYY-MM-DD */
  dueDate: string;
  /** 提醒时间 YYYY-MM-DD HH:mm，可空 */
  remindAt: string;
  tags: string[];
  /** 进度 0-100 */
  progress: number;
  repeat: TodoRepeat;
  starred: boolean;
  description: string;
  checklist: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
  /** 完成时间，仅 status=done 时有值 */
  finishedAt: string;
  /** 预算（元） */
  budget?: number;
}

/* ---------------- 团建规划 GroupBuilding ---------------- */
export type CommuteType = "self_drive" | "shuttle" | "other";
export type TicketType = "unified" | "self" | "none";
export type Gender = "male" | "female";
export type RoomType = "standard" | "family" | "king";

export interface GroupBuildingSignup {
  id: number;
  /** 填报人姓名 */
  reporterName: string;
  /** 手机号 */
  phone: string;
  /** 归属 */
  department: string;
  /** 出行人数 */
  headcount: number;
  /** 身份证号 */
  idCard: string;
  /** 通勤方式 */
  commuteType: CommuteType;
  /** 购票方式 */
  ticketType: TicketType;
  /** 去程时间，如 "11:30 - 13:20 左右到" */
  outboundTime: string;
  /** 去程班次&座次 */
  outboundSeat: string;
  /** 返程时间 */
  returnTime: string;
  /** 返程班次&座次 */
  returnSeat: string;
  /** 性别 */
  gender: Gender;
  /** 房型 */
  roomType: RoomType;
  /** 酒店 */
  hotel: string;
  /** 备注 */
  remark: string;
  /** 交通费用（元） */
  ticketFee: number;
  /** 住宿费用（元） */
  accommodationFee: number;
  /** 餐费（元） */
  mealFee: number;
  /** 其他费用（元） */
  otherFee: number;
  createdAt: string;
  updatedAt: string;
}

const BASE = "/api/v1/affairs";

const AffairsAPI = {
  getRequirements() {
    return request<any, Requirement[]>({ url: `${BASE}/requirements`, method: "get" });
  },
  saveRequirements(list: Requirement[]) {
    return request<any, number>({ url: `${BASE}/requirements`, method: "put", data: list });
  },
  getTodos() {
    return request<any, TodoItem[]>({ url: `${BASE}/todolist`, method: "get" });
  },
  saveTodos(list: TodoItem[]) {
    return request<any, number>({ url: `${BASE}/todolist`, method: "put", data: list });
  },
  getGroupBuildings() {
    return request<any, GroupBuildingSignup[]>({
      url: `${BASE}/group-building`,
      method: "get",
    });
  },
  saveGroupBuildings(list: GroupBuildingSignup[]) {
    return request<any, number>({
      url: `${BASE}/group-building`,
      method: "put",
      data: list,
    });
  },
};

export default AffairsAPI;
