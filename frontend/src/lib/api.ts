const API_BASE = "/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: { method?: string; headers?: Record<string, string>; body?: unknown } = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let fetchBody: BodyInit | undefined;
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(options.body);
  } else {
    fetchBody = options.body as BodyInit | undefined;
  }

  const res = await fetch(`${API_BASE}${path}`, { method: options.method, headers, body: fetchBody });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: { email, password },
      }),
    register: (username: string, email: string, password: string) =>
      request<{ token: string; user: User }>("/auth/register", {
        method: "POST",
        body: { username, email, password },
      }),
    me: () => request<User>("/auth/me"),
  },
  tasks: {
    getAll: () => request<Task[]>("/tasks"),
    getAvailable: () => request<Task[]>("/tasks/available"),
    getMine: () => request<Task[]>("/tasks/mine"),
    getPending: () => request<Task[]>("/tasks/pending"),
    getClaimed: () => request<Task[]>("/tasks/claimed"),
    getById: (id: string) => request<Task>(`/tasks/${id}`),
    create: (data: CreateTaskPayload) =>
      request<Task>("/tasks", { method: "POST", body: data }),
    update: (id: string, data: Partial<CreateTaskPayload & { status: string; assignedToId: string }>) =>
      request<Task>(`/tasks/${id}`, { method: "PUT", body: data }),
    delete: (id: string) =>
      request<{ message: string }>(`/tasks/${id}`, { method: "DELETE" }),
    claim: (id: string, userDeadline?: string) =>
      request<Task>(`/tasks/${id}/claim`, { method: "POST", body: { userDeadline } }),
    accept: (id: string) =>
      request<Task>(`/tasks/${id}/accept`, { method: "POST" }),
    reject: (id: string, reason: string) =>
      request<Task>(`/tasks/${id}/reject`, { method: "POST", body: { reason } }),
    pending: (id: string, reason: string) =>
      request<Task>(`/tasks/${id}/pending`, { method: "POST", body: { reason } }),
    complete: (id: string) =>
      request<Task>(`/tasks/${id}/complete`, { method: "POST" }),
    approveComplete: (id: string) =>
      request<Task>(`/tasks/${id}/approve-complete`, { method: "POST" }),
    extendDate: (id: string, newDeadline: string, reason?: string) =>
      request<Task>(`/tasks/${id}/extend-date`, { method: "POST", body: { newDeadline, reason } }),
    approveExtend: (id: string) =>
      request<Task>(`/tasks/${id}/approve-extend`, { method: "POST" }),
    rejectExtend: (id: string) =>
      request<Task>(`/tasks/${id}/reject-extend`, { method: "POST" }),
    lock: (id: string) =>
      request<Task>(`/tasks/${id}/lock`, { method: "POST" }),
    reassign: (id: string, assignedToId: string) =>
      request<Task>(`/tasks/${id}/reassign`, { method: "POST", body: { assignedToId } }),
    getStats: () => request<DashboardStats>("/tasks/stats"),
  },
  submissions: {
    getAll: () => request<Submission[]>("/submissions"),
    getByTask: (taskId: string) => request<Submission[]>(`/submissions/${taskId}`),
    submit: (taskId: string, formData: FormData) =>
      request<Submission>(`/submissions/${taskId}/submit`, { method: "POST", body: formData }),
    review: (id: string, action: "accept" | "reject", adminComments?: string) =>
      request<{ message: string }>(`/submissions/${id}/review`, { method: "PUT", body: { action, adminComments } }),
  },
  notifications: {
    getMine: () => request<Notification[]>("/notifications"),
    markRead: (id: string) =>
      request<{ message: string }>(`/notifications/${id}/read`, { method: "PUT" }),
    markAllRead: () =>
      request<{ message: string }>("/notifications/read-all", { method: "PUT" }),
  },
  admin: {
    getUsers: () => request<User[]>("/admin/users"),
    createUser: (data: { username: string; email: string; password: string; role: string; isMaster?: boolean }) =>
      request<User>("/admin/users", { method: "POST", body: data }),
    updateUser: (id: string, data: Partial<{ username: string; email: string; password: string; role: string; isMaster: boolean }>) =>
      request<User>(`/admin/users/${id}`, { method: "PUT", body: data }),
    deleteUser: (id: string) =>
      request<{ message: string }>(`/admin/users/${id}`, { method: "DELETE" }),
  },
  categories: {
    getAll: () => request<Category[]>("/categories"),
    create: (name: string) =>
      request<Category>("/categories", { method: "POST", body: { name } }),
    delete: (id: string) =>
      request<{ message: string }>("/categories", { method: "DELETE", body: { id } }),
  },
};

export interface User {
  id: string;
  username: string;
  email: string;
  role: "ADMIN" | "USER";
  isMaster?: boolean;
}

export interface Task {
  id: string;
  name: string;
  category: string;
  siteProject: string;
  deadline: string;
  userDeadline?: string | null;
  priority: string;
  description: string;
  status: string;
  extensionCount: number;
  pendingReason?: string;
  rejectReason?: string;
  extendDeadline?: string;
  extendReason?: string;
  extendStatus?: string;
  locked?: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdBy?: { id: string; username: string };
  assignedToId?: string;
  assignedTo?: { id: string; username: string };
  submissions?: Submission[];
}

export interface Submission {
  id: string;
  taskId: string;
  task?: { id: string; name: string };
  userId: string;
  user?: { id: string; username: string };
  reportUrl?: string;
  comments?: string;
  adminComments?: string;
  pendingReason?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskPayload {
  name: string;
  category: string;
  siteProject: string;
  deadline: string;
  priority: string;
  description: string;
  assignedToId?: string;
}

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  extensionRequests: number;
  overdueTasks: number;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: string;
  taskId?: string;
  read: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}
