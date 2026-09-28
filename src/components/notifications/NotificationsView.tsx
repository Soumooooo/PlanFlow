import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import {
  Bell,
  CheckCircle2,
  MessageSquare,
  UserPlus,
  Trash2,
  CheckCheck,
  Calendar,
  ArrowRight
} from 'lucide-react';

interface NotificationsViewProps {
  onNavigateToTask: (projectId: number, taskId?: number) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onNavigateToTask }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, loading } =
    useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = notifications.filter((n) =>
    filter === 'unread' ? n.is_read === 0 : true
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'comment_added':
        return <MessageSquare className="w-4 h-4 text-indigo-600" />;
      case 'project_added':
        return <UserPlus className="w-4 h-4 text-emerald-600" />;
      case 'task_assigned':
      default:
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="flex-1 p-6 sm:p-8 max-w-4xl mx-auto space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              In-App Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Stay updated when tasks are assigned, members are added, or comments are posted
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllAsRead()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}

          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg transition ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-lg transition ${
                filter === 'unread'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-400">Loading notifications...</div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No notifications</h3>
          <p className="text-xs text-slate-500">
            {filter === 'unread'
              ? 'You have read all your notifications!'
              : 'You have no notifications at the moment.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-2xs overflow-hidden">
          {filteredNotifications.map((notif) => {
            const isUnread = notif.is_read === 0;

            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (isUnread) markAsRead(notif.id);
                  if (notif.link_project_id) {
                    onNavigateToTask(notif.link_project_id, notif.link_task_id || undefined);
                  }
                }}
                className={`p-4 flex items-start gap-3.5 hover:bg-slate-50 transition cursor-pointer group ${
                  isUnread ? 'bg-indigo-50/30' : ''
                }`}
              >
                {/* Icon */}
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition">
                  {getIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                      {notif.title}
                    </h4>
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                    <span>
                      {new Date(notif.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {notif.link_project_id && (
                      <span className="text-indigo-600 font-semibold group-hover:underline flex items-center gap-0.5">
                        Open details &rarr;
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0" onClick={(e) => e.stopPropagation()}>
                  {isUnread && (
                    <button
                      type="button"
                      onClick={() => markAsRead(notif.id)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                      title="Mark as read"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteNotification(notif.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                    title="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
