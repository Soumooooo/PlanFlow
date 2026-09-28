import { Router, Response } from 'express';
import { query, get, run } from '../db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { getUserProjectMembership } from './projects.js';
import { broadcastToProject, broadcastToUser } from '../websocket.js';

const router = Router();

// GET all tasks for a project
router.get('/projects/:projectId/tasks', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const projectId = Number(req.params.projectId);
  const userId = req.user!.id;

  const membership = getUserProjectMembership(projectId, userId);
  if (!membership) {
    res.status(403).json({ error: 'You do not have access to this project' });
    return;
  }

  const tasks = query<any>(
    `SELECT 
      t.*,
      u_assignee.name as assignee_name,
      u_assignee.email as assignee_email,
      u_assignee.avatar_color as assignee_avatar_color,
      u_creator.name as creator_name,
      (SELECT COUNT(*) FROM comments c WHERE c.task_id = t.id) as comments_count
     FROM tasks t
     LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
     INNER JOIN users u_creator ON t.created_by = u_creator.id
     WHERE t.project_id = ?
     ORDER BY t.position ASC, t.created_at ASC`,
    [projectId]
  );

  res.json({ tasks });
});

// POST create task in a project
router.post('/projects/:projectId/tasks', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const projectId = Number(req.params.projectId);
  const userId = req.user!.id;
  const { title, description, status, priority, due_date, assigned_to } = req.body;

  const membership = getUserProjectMembership(projectId, userId);
  if (!membership) {
    res.status(403).json({ error: 'You do not have access to this project' });
    return;
  }

  if (!title || !title.trim()) {
    res.status(400).json({ error: 'Task title is required' });
    return;
  }

  const validStatuses = ['To Do', 'In Progress', 'Review', 'Done'];
  const taskStatus = validStatuses.includes(status) ? status : 'To Do';

  const validPriorities = ['Low', 'Medium', 'High'];
  const taskPriority = validPriorities.includes(priority) ? priority : 'Medium';

  const assigneeId = assigned_to ? Number(assigned_to) : null;

  // Determine next position in this column
  const posRow = get<{ maxPos: number | null }>(
    'SELECT MAX(position) as maxPos FROM tasks WHERE project_id = ? AND status = ?',
    [projectId, taskStatus]
  );
  const nextPos = (posRow?.maxPos ?? -1) + 1;

  const result = run(
    `INSERT INTO tasks (project_id, title, description, status, priority, due_date, position, assigned_to, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId,
      title.trim(),
      (description || '').trim(),
      taskStatus,
      taskPriority,
      due_date || null,
      nextPos,
      assigneeId,
      userId,
    ]
  );

  const taskId = result.lastInsertRowid;

  // Fetch created task with joins
  const task = get<any>(
    `SELECT 
      t.*,
      u_assignee.name as assignee_name,
      u_assignee.email as assignee_email,
      u_assignee.avatar_color as assignee_avatar_color,
      u_creator.name as creator_name,
      0 as comments_count
     FROM tasks t
     LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
     INNER JOIN users u_creator ON t.created_by = u_creator.id
     WHERE t.id = ?`,
    [taskId]
  );

  // If assigned to another user, send notification
  if (assigneeId && assigneeId !== userId) {
    const project = get<any>('SELECT name FROM projects WHERE id = ?', [projectId]);
    const notifResult = run(
      `INSERT INTO notifications (user_id, type, title, message, link_project_id, link_task_id, is_read)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        assigneeId,
        'task_assigned',
        'Task Assigned',
        `${req.user!.name} assigned you to "${task.title}" in ${project?.name || 'a project'}`,
        projectId,
        taskId,
      ]
    );

    const notif = get('SELECT * FROM notifications WHERE id = ?', [notifResult.lastInsertRowid]);
    broadcastToUser(assigneeId, { type: 'notification:new', notification: notif });
  }

  // Real-time broadcast to all viewers of the project
  broadcastToProject(projectId, { type: 'task:created', task });

  res.status(201).json({ task });
});

// GET single task details
router.get('/tasks/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const taskId = Number(req.params.id);
  const userId = req.user!.id;

  const task = get<any>(
    `SELECT 
      t.*,
      p.name as project_name,
      p.color as project_color,
      u_assignee.name as assignee_name,
      u_assignee.email as assignee_email,
      u_assignee.avatar_color as assignee_avatar_color,
      u_creator.name as creator_name,
      (SELECT COUNT(*) FROM comments c WHERE c.task_id = t.id) as comments_count
     FROM tasks t
     INNER JOIN projects p ON t.project_id = p.id
     LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
     INNER JOIN users u_creator ON t.created_by = u_creator.id
     WHERE t.id = ?`,
    [taskId]
  );

  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const membership = getUserProjectMembership(task.project_id, userId);
  if (!membership) {
    res.status(403).json({ error: 'You do not have access to this task' });
    return;
  }

  res.json({ task });
});

// PUT update task
router.put('/tasks/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const taskId = Number(req.params.id);
  const userId = req.user!.id;
  const { title, description, status, priority, due_date, assigned_to, position } = req.body;

  const existingTask = get<any>('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!existingTask) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const membership = getUserProjectMembership(existingTask.project_id, userId);
  if (!membership) {
    res.status(403).json({ error: 'You do not have access to this project' });
    return;
  }

  const validStatuses = ['To Do', 'In Progress', 'Review', 'Done'];
  const newStatus = status && validStatuses.includes(status) ? status : existingTask.status;

  const validPriorities = ['Low', 'Medium', 'High'];
  const newPriority = priority && validPriorities.includes(priority) ? priority : existingTask.priority;

  const newTitle = title !== undefined ? String(title).trim() : existingTask.title;
  const newDescription = description !== undefined ? String(description).trim() : existingTask.description;
  const newDueDate = due_date !== undefined ? (due_date || null) : existingTask.due_date;
  const newAssigneeId = assigned_to !== undefined ? (assigned_to ? Number(assigned_to) : null) : existingTask.assigned_to;
  const newPosition = position !== undefined ? Number(position) : existingTask.position;

  run(
    `UPDATE tasks
     SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, 
         assigned_to = ?, position = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      newTitle,
      newDescription,
      newStatus,
      newPriority,
      newDueDate,
      newAssigneeId,
      newPosition,
      taskId,
    ]
  );

  // Notify if newly assigned to someone else
  if (newAssigneeId && newAssigneeId !== existingTask.assigned_to && newAssigneeId !== userId) {
    const project = get<any>('SELECT name FROM projects WHERE id = ?', [existingTask.project_id]);
    const notifResult = run(
      `INSERT INTO notifications (user_id, type, title, message, link_project_id, link_task_id, is_read)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        newAssigneeId,
        'task_assigned',
        'Task Assigned',
        `${req.user!.name} assigned you to "${newTitle}" in ${project?.name || 'a project'}`,
        existingTask.project_id,
        taskId,
      ]
    );

    const notif = get('SELECT * FROM notifications WHERE id = ?', [notifResult.lastInsertRowid]);
    broadcastToUser(newAssigneeId, { type: 'notification:new', notification: notif });
  }

  const updatedTask = get<any>(
    `SELECT 
      t.*,
      p.name as project_name,
      p.color as project_color,
      u_assignee.name as assignee_name,
      u_assignee.email as assignee_email,
      u_assignee.avatar_color as assignee_avatar_color,
      u_creator.name as creator_name,
      (SELECT COUNT(*) FROM comments c WHERE c.task_id = t.id) as comments_count
     FROM tasks t
     INNER JOIN projects p ON t.project_id = p.id
     LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
     INNER JOIN users u_creator ON t.created_by = u_creator.id
     WHERE t.id = ?`,
    [taskId]
  );

  // Broadcast update to project viewers in real-time
  broadcastToProject(existingTask.project_id, { type: 'task:updated', task: updatedTask });

  res.json({ task: updatedTask });
});

// DELETE task
router.delete('/tasks/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const taskId = Number(req.params.id);
  const userId = req.user!.id;

  const task = get<any>('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const membership = getUserProjectMembership(task.project_id, userId);
  if (!membership) {
    res.status(403).json({ error: 'You do not have access to this project' });
    return;
  }

  const projectId = task.project_id;
  run('DELETE FROM tasks WHERE id = ?', [taskId]);

  broadcastToProject(projectId, { type: 'task:deleted', taskId, projectId });

  res.json({ success: true, message: 'Task deleted successfully' });
});

// GET My Tasks (all tasks assigned to logged-in user across their projects)
router.get('/my-tasks', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { status, priority, projectId } = req.query;

  let sql = `
    SELECT 
      t.*,
      p.name as project_name,
      p.color as project_color,
      u_assignee.name as assignee_name,
      u_assignee.email as assignee_email,
      u_assignee.avatar_color as assignee_avatar_color,
      u_creator.name as creator_name,
      (SELECT COUNT(*) FROM comments c WHERE c.task_id = t.id) as comments_count
    FROM tasks t
    INNER JOIN projects p ON t.project_id = p.id
    INNER JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
    LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
    INNER JOIN users u_creator ON t.created_by = u_creator.id
    WHERE t.assigned_to = ?
  `;

  const params: any[] = [userId, userId];

  if (status && status !== 'all') {
    sql += ' AND t.status = ?';
    params.push(status);
  }

  if (priority && priority !== 'all') {
    sql += ' AND t.priority = ?';
    params.push(priority);
  }

  if (projectId && projectId !== 'all') {
    sql += ' AND t.project_id = ?';
    params.push(Number(projectId));
  }

  sql += ' ORDER BY CASE t.priority WHEN "High" THEN 1 WHEN "Medium" THEN 2 ELSE 3 END, t.due_date ASC, t.updated_at DESC';

  const tasks = query<any>(sql, params);
  res.json({ tasks });
});

export default router;
