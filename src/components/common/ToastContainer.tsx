import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Bell, CheckCircle2, MessageSquare, UserPlus, X } from 'lucide-react';

interface ToastContainerProps {
  onNavigateToTask?: (projectId: number, taskId: number) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ onNavigateToTask }) => {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white border border-slate-200 rounded-xl shadow-lg p-3.5 flex items-start gap-3 transition-all duration-200 transform translate-y-0"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
            {toast.title.toLowerCase().includes('comment') ? (
              <MessageSquare className="w-4 h-4" />
            ) : toast.title.toLowerCase().includes('project') ? (
              <UserPlus className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-slate-900">{toast.title}</h4>
            <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{toast.message}</p>
            {toast.linkProjectId && toast.linkTaskId && onNavigateToTask && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToTask(toast.linkProjectId!, toast.linkTaskId!);
                  dismissToast(toast.id);
                }}
                className="mt-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                View task &rarr;
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 shrink-0 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
