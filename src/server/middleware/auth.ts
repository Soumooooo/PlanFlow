import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { get } from '../db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'planflow_dev_super_secret_jwt_key_2026';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  avatar_color: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. No token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
    const user = get<AuthUser>(
      'SELECT id, name, email, avatar_color FROM users WHERE id = ?',
      [payload.id]
    );

    if (!user) {
      res.status(401).json({ error: 'User not found or token invalid' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
