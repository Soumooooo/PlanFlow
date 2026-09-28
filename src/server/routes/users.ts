import { Router, Response } from 'express';
import { query } from '../db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get all users (for assigning tasks and adding project members)
router.get('/', authMiddleware, (_req: AuthenticatedRequest, res: Response): void => {
  const users = query(
    'SELECT id, name, email, avatar_color, created_at FROM users ORDER BY name ASC'
  );
  res.json({ users });
});

export default router;
