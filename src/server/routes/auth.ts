import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, get, run } from '../db.js';
import { authMiddleware, AuthenticatedRequest, JWT_SECRET, AuthUser } from '../middleware/auth.js';

const router = Router();

// Register new user
router.post('/register', (req, res): void => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required' });
    return;
  }

  const cleanEmail = String(email).trim().toLowerCase();
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long' });
    return;
  }

  const existing = get('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
  if (existing) {
    res.status(400).json({ error: 'An account with this email already exists' });
    return;
  }

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];
  const passwordHash = bcrypt.hashSync(password, 10);

  const result = run(
    'INSERT INTO users (name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?)',
    [name.trim(), cleanEmail, passwordHash, avatarColor]
  );

  const user: AuthUser = {
    id: result.lastInsertRowid,
    name: name.trim(),
    email: cleanEmail,
    avatar_color: avatarColor,
  };

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({ token, user });
});

// Login
router.post('/login', (req, res): void => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const user = get<any>(
    'SELECT id, name, email, password_hash, avatar_color FROM users WHERE LOWER(email) = ?',
    [cleanEmail]
  );

  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const authUser: AuthUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar_color: user.avatar_color,
  };

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

  res.json({ token, user: authUser });
});

// Get current user profile
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  res.json({ user: req.user });
});

// Update profile
router.put('/profile', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { name, avatar_color } = req.body;
  const userId = req.user!.id;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Name cannot be empty' });
    return;
  }

  run('UPDATE users SET name = ?, avatar_color = ? WHERE id = ?', [
    name.trim(),
    avatar_color || req.user!.avatar_color,
    userId,
  ]);

  const updatedUser = get<AuthUser>(
    'SELECT id, name, email, avatar_color FROM users WHERE id = ?',
    [userId]
  );

  res.json({ user: updatedUser });
});

export default router;
