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

const BASE = "/api/v1/affairs";

const AffairsAPI = {
  getRequirements() {
    return request<any, Requirement[]>({ url: `${BASE}/requirements`, method: "get" });
  },
  saveRequirements(list: Requirement[]) {
    return request<any, number>({ url: `${BASE}/requirements`, method: "put", data: list });
  },
};

export default AffairsAPI;
