import fs from 'fs';
import path from 'path';
import initSqlJs, { type Database } from 'sql.js';
import bcrypt from 'bcryptjs';

let db: Database;
const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.resolve(DB_DIR, 'kanban.sqlite');

export async function initDb(): Promise<Database> {
  if (db) return db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } catch (e) {
      console.error('Failed to load existing SQLite database, creating new one', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON;');

  // Create tables
  createTables();

  // Seed sample data if users table is empty
  seedInitialData();

  saveDb();
  return db;
}

export function saveDb(): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#4F46E5',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      owner_id INTEGER NOT NULL,
      color TEXT DEFAULT '#4F46E5',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'member',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'To Do',
      priority TEXT NOT NULL DEFAULT 'Medium',
      due_date TEXT,
      position INTEGER DEFAULT 0,
      assigned_to INTEGER,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link_project_id INTEGER,
      link_task_id INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

function seedInitialData() {
  const projCheck = query<any>('SELECT COUNT(*) as count FROM projects');
  if (projCheck[0] && projCheck[0].count > 0) {
    return; // Already properly seeded
  }

  console.log('Seeding initial demo data...');
  // Clean up any stale partial data
  db.run('DELETE FROM comments;');
  db.run('DELETE FROM notifications;');
  db.run('DELETE FROM tasks;');
  db.run('DELETE FROM project_members;');
  db.run('DELETE FROM projects;');
  db.run('DELETE FROM users;');

  const saltRounds = 10;
  const defaultPassword = 'password123';
  const passwordHash = bcrypt.hashSync(defaultPassword, saltRounds);

  // Insert 3 demo users
  const u1 = run(`INSERT INTO users (name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?)`, [
    'Alex Rivera',
    'alex@planflow.io',
    passwordHash,
    '#3B82F6', // Blue
  ]);
  const u2 = run(`INSERT INTO users (name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?)`, [
    'Sarah Chen',
    'sarah@planflow.io',
    passwordHash,
    '#10B981', // Emerald
  ]);
  const u3 = run(`INSERT INTO users (name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?)`, [
    'David Kim',
    'david@planflow.io',
    passwordHash,
    '#F59E0B', // Amber
  ]);

  const userAlexId = u1.lastInsertRowid || 1;
  const userSarahId = u2.lastInsertRowid || 2;
  const userDavidId = u3.lastInsertRowid || 3;

  // Insert Project 1: Mobile App Redesign
  const p1 = run(
    `INSERT INTO projects (name, description, owner_id, color) VALUES (?, ?, ?, ?)`,
    [
      'Mobile App Redesign',
      'Revamping the mobile interface for iOS and Android with modern navigation and dark mode support.',
      userAlexId,
      '#6366F1',
    ]
  );
  const projectId1 = p1.lastInsertRowid || 1;

  // Add members to Project 1
  run(`INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)`, [projectId1, userAlexId, 'owner']);
  run(`INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)`, [projectId1, userSarahId, 'member']);
  run(`INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)`, [projectId1, userDavidId, 'member']);

  // Insert Project 2: Backend API V2
  const p2 = run(
    `INSERT INTO projects (name, description, owner_id, color) VALUES (?, ?, ?, ?)`,
    [
      'Cloud Architecture & API V2',
      'Scaling the microservices and refactoring RESTful endpoints for reduced latency.',
      userSarahId,
      '#059669',
    ]
  );
  const projectId2 = p2.lastInsertRowid || 2;

  run(`INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)`, [projectId2, userSarahId, 'owner']);
  run(`INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)`, [projectId2, userAlexId, 'member']);

  // Tasks for Project 1
  const today = new Date();
  const formatOffset = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const t1 = run(
    `INSERT INTO tasks (project_id, title, description, status, priority, due_date, position, assigned_to, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId1,
      'Conduct user interviews on prototype navigation',
      'Gather feedback from 5 beta testers on the bottom sheet navigation drawer and gestures.',
      'To Do',
      'Medium',
      formatOffset(3),
      0,
      3, // David Kim
      1,
    ]
  );

  const t2 = run(
    `INSERT INTO tasks (project_id, title, description, status, priority, due_date, position, assigned_to, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId1,
      'Implement biometric authentication',
      'Integrate FaceID / TouchID biometric prompt on mobile login and store secure session tokens.',
      'In Progress',
      'High',
      formatOffset(1),
      0,
      1, // Alex Rivera
      1,
    ]
  );

  const t3 = run(
    `INSERT INTO tasks (project_id, title, description, status, priority, due_date, position, assigned_to, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId1,
      'Refactor offline SQLite cache sync',
      'Ensure state reconciles seamlessly when the app reconnects to the network after offline mode.',
      'Review',
      'High',
      formatOffset(2),
      0,
      2, // Sarah Chen
      1,
    ]
  );

  const t4 = run(
    `INSERT INTO tasks (project_id, title, description, status, priority, due_date, position, assigned_to, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId1,
      'Design color palette and typography tokens',
      'Created Tailwind design system tokens, color variants, and accessible contrast ratios.',
      'Done',
      'Low',
      formatOffset(-2),
      0,
      3, // David Kim
      1,
    ]
  );

  // Insert some comments
  run(
    `INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)`,
    [t2.lastInsertRowid, 3, 'Make sure to handle fallback PIN code if biometrics are cancelled!']
  );
  run(
    `INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)`,
    [t2.lastInsertRowid, 1, 'Good point, already added fallback modal handling for PIN entry.']
  );

  // Insert some notifications for Alex
  run(
    `INSERT INTO notifications (user_id, type, title, message, link_project_id, link_task_id, is_read)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      1,
      'task_assigned',
      'Task Assigned',
      'You were assigned to "Implement biometric authentication"',
      projectId1,
      t2.lastInsertRowid,
      0,
    ]
  );
  run(
    `INSERT INTO notifications (user_id, type, title, message, link_project_id, link_task_id, is_read)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      1,
      'comment_added',
      'New Comment',
      'David Kim commented on "Implement biometric authentication"',
      projectId1,
      t2.lastInsertRowid,
      0,
    ]
  );

  console.log('Seed completed successfully.');
}

// SQL helper methods
export function query<T = any>(sql: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export function get<T = any>(sql: string, params: any[] = []): T | undefined {
  const rows = query<T>(sql, params);
  return rows.length > 0 ? rows[0] : undefined;
}

export function run(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  db.run(sql, params);
  const res = db.exec('SELECT last_insert_rowid() AS id, changes() AS changes');
  const lastInsertRowid = (res[0]?.values[0]?.[0] as number) ?? 0;
  const changes = (res[0]?.values[0]?.[1] as number) ?? 0;
  saveDb();
  return { changes, lastInsertRowid };
}
