import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { initDb } from './src/server/db.js';
import { initWebSocket } from './src/server/websocket.js';

import authRoutes from './src/server/routes/auth.js';
import usersRoutes from './src/server/routes/users.js';
import projectsRoutes from './src/server/routes/projects.js';
import tasksRoutes from './src/server/routes/tasks.js';
import commentsRoutes from './src/server/routes/comments.js';
import notificationsRoutes from './src/server/routes/notifications.js';
import dashboardRoutes from './src/server/routes/dashboard.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });
initWebSocket(wss);

// Standard middleware
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api', tasksRoutes); // Mounts /api/projects/:id/tasks, /api/tasks/:id, /api/my-tasks
app.use('/api', commentsRoutes); // Mounts /api/tasks/:id/comments, /api/comments/:id
app.use('/api/notifications', notificationsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    // Initialize SQLite database
    console.log('Initializing SQLite database...');
    await initDb();
    console.log('SQLite database ready.');

    const isProduction = process.env.NODE_ENV === 'production';

    if (!isProduction) {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite middleware mounted in development mode.');
    } else {
      const distPath = path.resolve(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
      console.log('Serving production static build from dist/.');
    }

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`PlanFlow Server listening on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
