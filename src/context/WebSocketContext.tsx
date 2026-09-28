import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

type EventCallback = (data: any) => void;

interface WebSocketContextType {
  isConnected: boolean;
  joinProject: (projectId: number) => void;
  leaveProject: (projectId: number) => void;
  subscribe: (event: string, callback: EventCallback) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<EventCallback>>>(new Map());
  const activeProjectsRef = useRef<Set<number>>(new Set());

  // Connect WebSocket
  useEffect(() => {
    if (!token || !user) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    let isMounted = true;
    let reconnectTimeout: any = null;

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setIsConnected(true);
        // Authenticate
        ws.send(JSON.stringify({ type: 'auth', token }));

        // Re-join any currently active project rooms
        activeProjectsRef.current.forEach((projId) => {
          ws.send(JSON.stringify({ type: 'join_project', projectId: projId }));
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type;
          if (type && listenersRef.current.has(type)) {
            listenersRef.current.get(type)?.forEach((cb) => {
              try {
                cb(data);
              } catch (err) {
                console.error('Error executing WS listener:', err);
              }
            });
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message', e);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setIsConnected(false);
        // Reconnect after 3 seconds
        reconnectTimeout = setTimeout(() => {
          if (isMounted && token) {
            connect();
          }
        }, 3000);
      };

      ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
        ws.close();
      };
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [token, user]);

  const joinProject = useCallback((projectId: number) => {
    activeProjectsRef.current.add(projectId);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'join_project', projectId }));
    }
  }, []);

  const leaveProject = useCallback((projectId: number) => {
    activeProjectsRef.current.delete(projectId);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'leave_project', projectId }));
    }
  }, []);

  const subscribe = useCallback((event: string, callback: EventCallback) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);

    return () => {
      listenersRef.current.get(event)?.delete(callback);
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        joinProject,
        leaveProject,
        subscribe,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
