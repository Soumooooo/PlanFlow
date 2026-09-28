import { Router, Response } from 'express';
import { query, get, run } from '../db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { getUserProjectMembership } from './projects.js';
import { broadcastToProject, broadcastToUser } from '../websocket.js';

const router = Router();

// GET all comments for a task
router.get('/tasks/:taskId/comments', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const taskId = Number(req.params.taskId);
  const userId = req.user!.id;

  const task = get<any>('SELECT project_id FROM tasks WHERE id = ?', [taskId]);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const membership = getUserProjectMembership(task.project_id, userId);
  if (!membership) {
    res.status(403).json({ error: 'You do not have access to this project' });
    return;
  }

  const comments = query<any>(
    `SELECT 
      c.*,
      u.name as user_name,
      u.email as user_email,
      u.avatar_color as user_avatar_color
     FROM comments c
     INNER JOIN users u ON c.user_id = u.id
     WHERE c.task_id = ?
     ORDER BY c.created_at ASC`,
    [taskId]
  );

  res.json({ comments });
});

// POST create comment on a task
router.post('/tasks/:taskId/comments', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const taskId = Number(req.params.taskId);
  const userId = req.user!.id;
  const { content } = req.body;

  if (!content || !content.trim()) {
    res.status(400).json({ error: 'Comment content cannot be empty' });
    return;
  }

  const task = get<any>(
    `SELECT t.id, t.title, t.project_id, t.assigned_to, t.created_by, p.name as project_name
     FROM tasks t
     INNER JOIN projects p ON t.project_id = p.id
     WHERE t.id = ?`,
    [taskId]
  );

  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const membership = getUserProjectMembership(task.project_id, userId);
  if (!membership) {
    res.status(403).json({ error: 'You do not have access to this project' });
    return;
  }

  const result = run(
    'INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)',
    [taskId, userId, content.trim()]
  );

  const commentId = result.lastInsertRowid;

  const newComment = get<any>(
    `SELECT 
      c.*,
      u.name as user_name,
      u.email as user_email,
      u.avatar_color as user_avatar_color
     FROM comments c
     INNER JOIN users u ON c.user_id = u.id
     WHERE c.id = ?`,
    [commentId]
  );

  // Notify task assignee if different from commenter
  const notifiedUserIds = new Set<number>();

  if (task.assigned_to && task.assigned_to !== userId) {
    notifiedUserIds.add(task.assigned_to);
  }

  // Also notify creator if different from commenter and not already notified
  if (task.created_by && task.created_by !== userId) {
    notifiedUserIds.add(task.created_by);
  }

  for (const recipientId of notifiedUserIds) {
    const notifResult = run(
      `INSERT INTO notifications (user_id, type, title, message, link_project_id, link_task_id, is_read)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        recipientId,
        'comment_added',
        'New Comment',
        `${req.user!.name} commented on "${task.title}": "${content.trim().slice(0, 60)}${content.length > 60 ? '...' : ''}"`,
        task.project_id,
        taskId,
      ]
    );
    const notif = get('SELECT * FROM notifications WHERE id = ?', [notifResult.lastInsertRowid]);
    broadcastToUser(recipientId, { type: 'notification:new', notification: notif });
  }

  // Real-time broadcast to project viewers
  broadcastToProject(task.project_id, {
    type: 'comment:created',
    taskId,
    projectId: task.project_id,
    comment: newComment,
  });

  res.status(201).json({ comment: newComment });
});

// PUT edit comment (only author can edit)
router.put('/comments/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const commentId = Number(req.params.id);
  const userId = req.user!.id;
  const { content } = req.body;

  if (!content || !content.trim()) {
    res.status(400).json({ error: 'Comment content cannot be empty' });
    return;
  }

  const comment = get<any>('SELECT * FROM comments WHERE id = ?', [commentId]);
  if (!comment) {
    res.status(404).json({ error: 'Comment not found' });
    return;
  }

  if (comment.user_id !== userId) {
    res.status(403).json({ error: 'You can only edit your own comments' });
    return;
  }

  run('UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
    content.trim(),
    commentId,
  ]);

  const updatedComment = get<any>(
    `SELECT 
      c.*,
      u.name as user_name,
      u.email as user_email,
      u.avatar_color as user_avatar_color
     FROM comments c
     INNER JOIN users u ON c.user_id = u.id
     WHERE c.id = ?`,
    [commentId]
  );

  const task = get<any>('SELECT project_id FROM tasks WHERE id = ?', [comment.task_id]);
  if (task) {
    broadcastToProject(task.project_id, {
      type: 'comment:updated',
      comment: updatedComment,
      taskId: comment.task_id,
      projectId: task.project_id,
    });
  }

  res.json({ comment: updatedComment });
});

// DELETE comment (author or project owner can delete)
router.delete('/comments/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const commentId = Number(req.params.id);
  const userId = req.user!.id;

  const comment = get<any>('SELECT * FROM comments WHERE id = ?', [commentId]);
  if (!comment) {
    res.status(404).json({ error: 'Comment not found' });
    return;
  }

  const task = get<any>(
    `SELECT t.project_id, p.owner_id
     FROM tasks t
     INNER JOIN projects p ON t.project_id = p.id
     WHERE t.id = ?`,
    [comment.task_id]
  );

  const isOwner = task && task.owner_id === userId;
  const isAuthor = comment.user_id === userId;

  if (!isAuthor && !isOwner) {
    res.status(403).json({ error: 'You do not have permission to delete this comment' });
    return;
  }

  run('DELETE FROM comments WHERE id = ?', [commentId]);

  if (task) {
    broadcastToProject(task.project_id, {
      type: 'comment:deleted',
      commentId,
      taskId: comment.task_id,
      projectId: task.project_id,
    });
  }

  res.json({ success: true, message: 'Comment deleted successfully' });
});

export default router;
