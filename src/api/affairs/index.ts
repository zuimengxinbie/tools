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
};

export default AffairsAPI;
