import { Router, Response } from 'express';
import { query, get } from '../db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;

  // 1. Projects accessible to user
  const projects = query<any>(
    `SELECT 
      p.id, p.name, p.color, p.updated_at,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as total_tasks,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'Done') as done_tasks
     FROM projects p
     INNER JOIN project_members pm ON p.id = pm.project_id
     WHERE pm.user_id = ?
     ORDER BY p.updated_at DESC`,
    [userId]
  );

  const totalProjects = projects.length;

  const projectProgress = projects.map((p) => {
    const total = p.total_tasks;
    const done = p.done_tasks;
    const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      total_tasks: total,
      done_tasks: done,
      progress_percent: progressPercent,
    };
  });

  // 2. My assigned tasks count
  const myAssignedTasksCount = get<{ count: number }>(
    `SELECT COUNT(*) as count 
     FROM tasks t
     INNER JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = ?
     WHERE t.assigned_to = ?`,
    [userId, userId]
  )?.count || 0;

  // Breakdown by status
  const myTasksByStatus = query<any>(
    `SELECT t.status, COUNT(*) as count
     FROM tasks t
     INNER JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = ?
     WHERE t.assigned_to = ?
     GROUP BY t.status`,
    [userId, userId]
  );

  // 3. Tasks due soon (due in the next 7 days, assigned to user or in accessible projects)
  const today = new Date().toISOString().split('T')[0];
  const next7DaysDate = new Date();
  next7DaysDate.setDate(next7DaysDate.getDate() + 7);
  const next7Days = next7DaysDate.toISOString().split('T')[0];

  const tasksDueSoon = query<any>(
    `SELECT 
      t.*,
      p.name as project_name,
      p.color as project_color,
      u_assignee.name as assignee_name,
      u_assignee.avatar_color as assignee_avatar_color
     FROM tasks t
     INNER JOIN projects p ON t.project_id = p.id
     INNER JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
     LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
     WHERE t.due_date IS NOT NULL 
       AND t.due_date >= ? 
       AND t.due_date <= ?
       AND t.status != 'Done'
     ORDER BY t.due_date ASC
     LIMIT 8`,
    [userId, today, next7Days]
  );

  // 4. Recently updated tasks
  const recentlyUpdatedTasks = query<any>(
    `SELECT 
      t.*,
      p.name as project_name,
      p.color as project_color,
      u_assignee.name as assignee_name,
      u_assignee.avatar_color as assignee_avatar_color
     FROM tasks t
     INNER JOIN projects p ON t.project_id = p.id
     INNER JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
     LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
     ORDER BY t.updated_at DESC
     LIMIT 8`,
    [userId]
  );

  res.json({
    stats: {
      totalProjects,
      myAssignedTasksCount,
      tasksDueSoonCount: tasksDueSoon.length,
      myTasksByStatus,
    },
    projectProgress,
    tasksDueSoon,
    recentlyUpdatedTasks,
  });
});

export default router;
