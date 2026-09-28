import { Router, Response } from 'express';
import { query, get, run } from '../db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { broadcastToProject, broadcastToUser } from '../websocket.js';

const router = Router();

// Helper to check if user has access to project
export function getUserProjectMembership(projectId: number, userId: number) {
  return get<{ id: number; project_id: number; user_id: number; role: string }>(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [projectId, userId]
  );
}

// GET all projects accessible to current user
router.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;

  const projects = query<any>(
    `SELECT 
      p.id, p.name, p.description, p.owner_id, p.color, p.created_at, p.updated_at,
      pm.role as my_role,
      u.name as owner_name, u.email as owner_email,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as total_tasks,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'Done') as done_tasks
    FROM projects p
    INNER JOIN project_members pm ON p.id = pm.project_id
    INNER JOIN users u ON p.owner_id = u.id
    WHERE pm.user_id = ?
    ORDER BY p.updated_at DESC`,
    [userId]
  );

  console.log(`[DEBUG /api/projects] userId: ${userId}, found: ${projects.length}`);

  // For each project, fetch member summaries
  const enhancedProjects = projects.map((p) => {
    const members = query<any>(
      `SELECT u.id, u.name, u.email, u.avatar_color, pm.role
       FROM project_members pm
       INNER JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = ?
       ORDER BY pm.role DESC, u.name ASC`,
      [p.id]
    );
    return {
      ...p,
      members,
    };
  });

  res.json({ projects: enhancedProjects });
});

// POST create new project
router.post('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { name, description, color } = req.body;
  const userId = req.user!.id;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Project name is required' });
    return;
  }

  const projectColor = color || '#4F46E5';

  const result = run(
    'INSERT INTO projects (name, description, owner_id, color) VALUES (?, ?, ?, ?)',
    [name.trim(), (description || '').trim(), userId, projectColor]
  );

  const projectId = result.lastInsertRowid;

  // Add creator as owner member
  run(
    'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
    [projectId, userId, 'owner']
  );

  const newProject = get<any>(
    `SELECT p.*, 'owner' as my_role, u.name as owner_name, u.email as owner_email
     FROM projects p
     INNER JOIN users u ON p.owner_id = u.id
     WHERE p.id = ?`,
    [projectId]
  );

  const members = query<any>(
    `SELECT u.id, u.name, u.email, u.avatar_color, pm.role
     FROM project_members pm
     INNER JOIN users u ON pm.user_id = u.id
     WHERE pm.project_id = ?`,
    [projectId]
  );

  res.status(201).json({
    project: {
      ...newProject,
      total_tasks: 0,
      done_tasks: 0,
      members,
    },
  });
});

// GET single project details
router.get('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const projectId = Number(req.params.id);
  const userId = req.user!.id;

  const membership = getUserProjectMembership(projectId, userId);
  if (!membership) {
    res.status(403).json({ error: 'You do not have access to this project' });
    return;
  }

  const project = get<any>(
    `SELECT p.*, pm.role as my_role, u.name as owner_name, u.email as owner_email
     FROM projects p
     INNER JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
     INNER JOIN users u ON p.owner_id = u.id
     WHERE p.id = ?`,
    [userId, projectId]
  );

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const members = query<any>(
    `SELECT u.id, u.name, u.email, u.avatar_color, pm.role
     FROM project_members pm
     INNER JOIN users u ON pm.user_id = u.id
     WHERE pm.project_id = ?
     ORDER BY pm.role DESC, u.name ASC`,
    [projectId]
  );

  res.json({ project: { ...project, members } });
});

// PUT edit project
router.put('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const projectId = Number(req.params.id);
  const userId = req.user!.id;
  const { name, description, color } = req.body;

  const membership = getUserProjectMembership(projectId, userId);
  if (!membership) {
    res.status(403).json({ error: 'You are not a member of this project' });
    return;
  }

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Project name is required' });
    return;
  }

  run(
    `UPDATE projects 
     SET name = ?, description = ?, color = COALESCE(?, color), updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name.trim(), (description || '').trim(), color, projectId]
  );

  const updatedProject = get<any>(
    `SELECT p.*, pm.role as my_role, u.name as owner_name, u.email as owner_email
     FROM projects p
     INNER JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
     INNER JOIN users u ON p.owner_id = u.id
     WHERE p.id = ?`,
    [userId, projectId]
  );

  const members = query<any>(
    `SELECT u.id, u.name, u.email, u.avatar_color, pm.role
     FROM project_members pm
     INNER JOIN users u ON pm.user_id = u.id
     WHERE pm.project_id = ?`,
    [projectId]
  );

  const fullProject = { ...updatedProject, members };
  broadcastToProject(projectId, { type: 'project:updated', project: fullProject });

  res.json({ project: fullProject });
});

// DELETE project (only owner can delete)
router.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const projectId = Number(req.params.id);
  const userId = req.user!.id;

  const project = get<any>('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (project.owner_id !== userId) {
    res.status(403).json({ error: 'Only the project owner can delete this project' });
    return;
  }

  broadcastToProject(projectId, { type: 'project:deleted', projectId });

  run('DELETE FROM projects WHERE id = ?', [projectId]);

  res.json({ success: true, message: 'Project deleted successfully' });
});

// POST add member to project
router.post('/:id/members', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const projectId = Number(req.params.id);
  const currentUserId = req.user!.id;
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'Target user ID is required' });
    return;
  }

  const membership = getUserProjectMembership(projectId, currentUserId);
  if (!membership) {
    res.status(403).json({ error: 'You are not a member of this project' });
    return;
  }

  const project = get<any>('SELECT name FROM projects WHERE id = ?', [projectId]);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const targetUser = get<any>('SELECT id, name, email, avatar_color FROM users WHERE id = ?', [userId]);
  if (!targetUser) {
    res.status(404).json({ error: 'User to add not found' });
    return;
  }

  const existingMember = getUserProjectMembership(projectId, userId);
  if (existingMember) {
    res.status(400).json({ error: 'User is already a member of this project' });
    return;
  }

  run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [
    projectId,
    userId,
    'member',
  ]);

  // Create in-app notification for the newly added user
  const notifResult = run(
    `INSERT INTO notifications (user_id, type, title, message, link_project_id, is_read)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [
      userId,
      'project_added',
      'Added to Project',
      `${req.user!.name} added you to project "${project.name}"`,
      projectId,
    ]
  );

  const notif = get('SELECT * FROM notifications WHERE id = ?', [notifResult.lastInsertRowid]);
  broadcastToUser(userId, { type: 'notification:new', notification: notif });

  const addedMember = {
    ...targetUser,
    role: 'member',
  };

  broadcastToProject(projectId, {
    type: 'project:member_added',
    projectId,
    member: addedMember,
  });

  res.status(201).json({ member: addedMember });
});

// DELETE remove member from project
router.delete('/:id/members/:userId', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const projectId = Number(req.params.id);
  const currentUserId = req.user!.id;
  const targetUserId = Number(req.params.userId);

  const project = get<any>('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const currentMembership = getUserProjectMembership(projectId, currentUserId);
  if (!currentMembership) {
    res.status(403).json({ error: 'You are not a member of this project' });
    return;
  }

  // Cannot remove owner
  if (targetUserId === project.owner_id) {
    res.status(400).json({ error: 'The project owner cannot be removed' });
    return;
  }

  // Only owner can remove someone else; users can remove themselves (leave project)
  if (currentUserId !== targetUserId && currentMembership.role !== 'owner') {
    res.status(403).json({ error: 'Only the project owner can remove other members' });
    return;
  }

  run('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [
    projectId,
    targetUserId,
  ]);

  broadcastToProject(projectId, {
    type: 'project:member_removed',
    projectId,
    userId: targetUserId,
  });

  res.json({ success: true, message: 'Member removed from project' });
});

export default router;
