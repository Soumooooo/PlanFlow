import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { useNotifications } from '../../context/NotificationContext';
import { UserAvatar } from '../common/UserAvatar';
import { 
  Bell, 
  Plus, 
  Radio, 
  LogOut, 
  User as UserIcon, 
  ChevronDown, 
  Menu,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  activeProjectName?: string;
  onOpenNewProject: () => void;
  onOpenNewTask: () => void;
  onNavigate: (view: string, projectId?: number, taskId?: number) => void;
  onToggleSidebarMobile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  activeProjectName,
  onOpenNewProject,
  onOpenNewTask,
  onNavigate,
  onToggleSidebarMobile,
}) => {
  const { user, logout, login } = useAuth();
  const { isConnected } = useWebSocket();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQuickSwitch = async (email: string) => {
    setShowUserMenu(false);
    await login(email, 'password123');
  };

  const getPageTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Dashboard Overview';
      case 'projects':
        return 'Projects';
      case 'project-board':
        return activeProjectName ? activeProjectName : 'Kanban Board';
      case 'my-tasks':
        return 'My Assigned Tasks';
      case 'notifications':
        return 'Notifications';
      default:
        return 'PlanFlow';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile hamburger + Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebarMobile}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {activeProjectName && currentView === 'project-board' ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <button
                type="button"
                onClick={() => onNavigate('projects')}
                className="hover:text-indigo-600 transition"
              >
                Projects
              </button>
              <span>/</span>
              <span className="font-bold text-slate-900">{activeProjectName}</span>
            </div>
          ) : (
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {getPageTitle()}
            </h1>
          )}
        </div>
      </div>

      {/* Right: Actions, Live Indicator, Notifications, User */}
      <div className="flex items-center gap-3">
        {/* Real-time WebSocket connection badge */}
        <div
          title={isConnected ? 'Connected to live WebSocket' : 'Connecting to live updates...'}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="hidden md:inline">{isConnected ? 'Live Sync' : 'Reconnecting'}</span>
        </div>

        {/* Quick Action Buttons */}
        {currentView === 'project-board' ? (
          <button
            type="button"
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Task</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenNewProject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Project</span>
          </button>
        )}

        {/* Notifications Popover */}
        <div className="relative" ref={notifMenuRef}>
          <button
            type="button"
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllAsRead()}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No notifications yet
                  </div>
                ) : (
                  notifications.slice(0, 6).map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markAsRead(notif.id);
                        if (notif.link_project_id) {
                          onNavigate('project-board', notif.link_project_id, notif.link_task_id || undefined);
                        }
                        setShowNotifMenu(false);
                      }}
                      className={`p-3 hover:bg-slate-50 cursor-pointer transition text-left flex gap-3 items-start ${
                        notif.is_read === 0 ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0"
                           style={{ opacity: notif.is_read === 0 ? 1 : 0 }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 leading-tight">
                          {notif.title}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('notifications');
                    setShowNotifMenu(false);
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  View all notifications &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        {user && (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 pl-1.5 rounded-full hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
            >
              <UserAvatar name={user.name} avatarColor={user.avatar_color} size="sm" />
              <span className="hidden md:inline text-xs font-semibold text-slate-700 max-w-[100px] truncate">
                {user.name.split(' ')[0]}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>

                {/* Quick switch accounts */}
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Switch Test User
                  </p>
                  <div className="flex flex-col gap-1">
                    {user.email !== 'alex@planflow.io' && (
                      <button
                        type="button"
                        onClick={() => handleQuickSwitch('alex@planflow.io')}
                        className="text-left text-xs text-indigo-600 hover:underline"
                      >
                        Alex Rivera (Product Lead)
                      </button>
                    )}
                    {user.email !== 'sarah@planflow.io' && (
                      <button
                        type="button"
                        onClick={() => handleQuickSwitch('sarah@planflow.io')}
                        className="text-left text-xs text-indigo-600 hover:underline"
                      >
                        Sarah Chen (Senior Dev)
                      </button>
                    )}
                    {user.email !== 'david@planflow.io' && (
                      <button
                        type="button"
                        onClick={() => handleQuickSwitch('david@planflow.io')}
                        className="text-left text-xs text-indigo-600 hover:underline"
                      >
                        David Kim (UI Designer)
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
