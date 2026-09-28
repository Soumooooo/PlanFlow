export interface User {
  id: number;
  name: string;
  email: string;
  avatar_color: string;
  created_at?: string;
}

export interface ProjectMember extends User {
  role: 'owner' | 'member';
}

export interface Project {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  color: string;
  created_at: string;
  updated_at: string;
  my_role?: 'owner' | 'member';
  owner_name?: string;
  owner_email?: string;
  total_tasks?: number;
  done_tasks?: number;
  members?: ProjectMember[];
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Review' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface Task {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  position: number;
  assigned_to: number | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  assignee_name?: string | null;
  assignee_email?: string | null;
  assignee_avatar_color?: string | null;
  creator_name?: string;
  project_name?: string;
  project_color?: string;
  comments_count?: number;
}

export interface Comment {
  id: number;
  task_id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
  user_avatar_color: string;
}

export interface AppNotification {
  id: number;
  user_id: number;
  type: 'task_assigned' | 'project_added' | 'comment_added';
  title: string;
  message: string;
  link_project_id: number | null;
  link_task_id: number | null;
  is_read: number; // 0 or 1
  created_at: string;
}

export interface DashboardStats {
  totalProjects: number;
  myAssignedTasksCount: number;
  tasksDueSoonCount: number;
  myTasksByStatus: { status: TaskStatus; count: number }[];
}

export interface ProjectProgress {
  id: number;
  name: string;
  color: string;
  total_tasks: number;
  done_tasks: number;
  progress_percent: number;
}

export interface DashboardData {
  stats: DashboardStats;
  projectProgress: ProjectProgress[];
  tasksDueSoon: Task[];
  recentlyUpdatedTasks: Task[];
}
