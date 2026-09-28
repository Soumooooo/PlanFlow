import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './middleware/auth.js';

interface ClientConnection {
  ws: WebSocket;
  userId?: number;
  projectIds: Set<number>;
  isAlive: boolean;
}

const clients = new Map<WebSocket, ClientConnection>();

export function initWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket) => {
    const client: ClientConnection = {
      ws,
      projectIds: new Set(),
      isAlive: true,
    };
    clients.set(ws, client);

    ws.on('pong', () => {
      client.isAlive = true;
    });

    ws.on('message', (messageRaw: string) => {
      try {
        const msg = JSON.parse(messageRaw.toString());
        switch (msg.type) {
          case 'auth': {
            if (msg.token) {
              try {
                const payload = jwt.verify(msg.token, JWT_SECRET) as { id: number };
                client.userId = payload.id;
                ws.send(JSON.stringify({ type: 'authenticated', userId: client.userId }));
              } catch (e) {
                ws.send(JSON.stringify({ type: 'auth_error', error: 'Invalid token' }));
              }
            }
            break;
          }
          case 'join_project': {
            const projectId = Number(msg.projectId);
            if (projectId) {
              client.projectIds.add(projectId);
              ws.send(JSON.stringify({ type: 'joined_project', projectId }));
            }
            break;
          }
          case 'leave_project': {
            const projectId = Number(msg.projectId);
            if (projectId) {
              client.projectIds.delete(projectId);
              ws.send(JSON.stringify({ type: 'left_project', projectId }));
            }
            break;
          }
          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
      clients.delete(ws);
    });
  });

  // Heartbeat interval to clean up stale connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = clients.get(ws);
      if (!client) return;
      if (!client.isAlive) {
        clients.delete(ws);
        return ws.terminate();
      }
      client.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });
}

export function broadcastToProject(projectId: number, payload: any, excludeUserId?: number) {
  const message = JSON.stringify(payload);
  for (const client of clients.values()) {
    if (client.projectIds.has(projectId) && client.ws.readyState === WebSocket.OPEN) {
      if (excludeUserId && client.userId === excludeUserId) {
        continue;
      }
      client.ws.send(message);
    }
  }
}

export function broadcastToUser(userId: number, payload: any) {
  const message = JSON.stringify(payload);
  for (const client of clients.values()) {
    if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

export function broadcastToAll(payload: any) {
  const message = JSON.stringify(payload);
  for (const client of clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}
