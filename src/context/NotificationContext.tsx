import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppNotification } from '../types';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import { useWebSocket } from './WebSocketContext';

interface Toast {
  id: string;
  title: string;
  message: string;
  linkProjectId?: number | null;
  linkTaskId?: number | null;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { subscribe } = useWebSocket();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Listen for real-time notifications
  useEffect(() => {
    const unsubscribe = subscribe('notification:new', (data) => {
      if (data.notification) {
        const notif: AppNotification = data.notification;
        setNotifications((prev) => [notif, ...prev]);
        setUnreadCount((prev) => prev + 1);

        // Show ephemeral toast
        const toastId = Math.random().toString(36).substring(2, 9);
        const newToast: Toast = {
          id: toastId,
          title: notif.title,
          message: notif.message,
          linkProjectId: notif.link_project_id,
          linkTaskId: notif.link_task_id,
        };

        setToasts((prev) => [...prev, newToast]);

        setTimeout(() => {
          dismissToast(toastId);
        }, 5000);
      }
    });

    return unsubscribe;
  }, [subscribe, dismissToast]);

  const markAsRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await api.deleteNotification(id);
      setNotifications((prev) => {
        const item = prev.find((n) => n.id === id);
        if (item && item.is_read === 0) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.id !== id);
      });
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        toasts,
        dismissToast,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
