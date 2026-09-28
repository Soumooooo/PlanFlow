import { User, Project, Task, Comment, AppNotification, DashboardData } from '../types';

const TOKEN_KEY = 'planflow_auth_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (payload: { name: string; email: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => request<{ user: User }>('/api/auth/me'),

  updateProfile: (payload: { name: string; avatar_color?: string }) =>
    request<{ user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Users
  getUsers: () => request<{ users: User[] }>('/api/users'),

  // Projects
  getProjects: () => request<{ projects: Project[] }>('/api/projects'),

  getProject: (id: number) => request<{ project: Project }>(`/api/projects/${id}`),

  createProject: (payload: { name: string; description?: string; color?: string }) =>
    request<{ project: Project }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateProject: (id: number, payload: { name: string; description?: string; color?: string }) =>
    request<{ project: Project }>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteProject: (id: number) =>
    request<{ success: boolean; message: string }>(`/api/projects/${id}`, {
      method: 'DELETE',
    }),

  addProjectMember: (projectId: number, userId: number) =>
    request<{ member: any }>(`/api/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  removeProjectMember: (projectId: number, userId: number) =>
    request<{ success: boolean }>(`/api/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
    }),

  // Tasks
  getProjectTasks: (projectId: number) =>
    request<{ tasks: Task[] }>(`/api/projects/${projectId}/tasks`),

  getTask: (id: number) => request<{ task: Task }>(`/api/tasks/${id}`),

  createTask: (projectId: number, payload: Partial<Task>) =>
    request<{ task: Task }>(`/api/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateTask: (id: number, payload: Partial<Task>) =>
    request<{ task: Task }>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteTask: (id: number) =>
    request<{ success: boolean }>(`/api/tasks/${id}`, {
      method: 'DELETE',
    }),

  getMyTasks: (filters?: { status?: string; priority?: string; projectId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.priority) params.set('priority', filters.priority);
    if (filters?.projectId) params.set('projectId', filters.projectId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<{ tasks: Task[] }>(`/api/my-tasks${qs}`);
  },

  // Comments
  getComments: (taskId: number) =>
    request<{ comments: Comment[] }>(`/api/tasks/${taskId}/comments`),

  createComment: (taskId: number, content: string) =>
    request<{ comment: Comment }>(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  updateComment: (commentId: number, content: string) =>
    request<{ comment: Comment }>(`/api/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),

  deleteComment: (commentId: number) =>
    request<{ success: boolean }>(`/api/comments/${commentId}`, {
      method: 'DELETE',
    }),

  // Notifications
  getNotifications: () =>
    request<{ notifications: AppNotification[]; unreadCount: number }>('/api/notifications'),

  markNotificationRead: (id: number) =>
    request<{ success: boolean }>(`/api/notifications/${id}/read`, {
      method: 'PUT',
    }),

  markAllNotificationsRead: () =>
    request<{ success: boolean }>('/api/notifications/read-all', {
      method: 'PUT',
    }),

  deleteNotification: (id: number) =>
    request<{ success: boolean }>(`/api/notifications/${id}`, {
      method: 'DELETE',
    }),

  // Dashboard
  getDashboard: () => request<DashboardData>('/api/dashboard'),
};
