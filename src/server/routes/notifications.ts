import { Router, Response } from 'express';
import { query, get, run } from '../db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET all notifications for logged-in user
router.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const notifications = query(
    `SELECT * FROM notifications 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT 50`,
    [userId]
  );
  const unreadCount = get<{ count: number }>(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  )?.count || 0;

  res.json({ notifications, unreadCount });
});

// Mark single notification as read
router.put('/:id/read', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const notifId = Number(req.params.id);
  const userId = req.user!.id;

  run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [notifId, userId]);
  res.json({ success: true });
});

// Mark all as read
router.put('/read-all', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;

  run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
  res.json({ success: true });
});

// Delete single notification
router.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const notifId = Number(req.params.id);
  const userId = req.user!.id;

  run('DELETE FROM notifications WHERE id = ? AND user_id = ?', [notifId, userId]);
  res.json({ success: true });
});

export default router;
