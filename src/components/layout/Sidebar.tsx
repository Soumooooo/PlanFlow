import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { UserAvatar } from '../common/UserAvatar';
import { Project } from '../../types';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Bell,
  Plus,
  LogOut,
  ChevronRight,
  Kanban,
  X
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  activeProjectId?: number | null;
  projects: Project[];
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onNavigate: (view: string, projectId?: number) => void;
  onOpenNewProject: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  activeProjectId,
  projects,
  isOpenMobile,
  onCloseMobile,
  onNavigate,
  onOpenNewProject,
}) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'All Projects', icon: FolderKanban },
    { id: 'my-tasks', label: 'My Tasks', icon: CheckSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Logo */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
          <div
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition">
              <Kanban className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight">PlanFlow</span>
              <span className="block text-[10px] text-slate-400 -mt-1 font-medium">Project Manager</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Quick Projects list */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Projects
              </span>
              <button
                type="button"
                onClick={onOpenNewProject}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition"
                title="Create project"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-0.5">
              {projects.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400 italic">No projects yet</div>
              ) : (
                projects.map((proj) => {
                  const isCurrent = currentView === 'project-board' && activeProjectId === proj.id;
                  return (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => {
                        onNavigate('project-board', proj.id);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition text-left group ${
                        isCurrent
                          ? 'bg-slate-800 text-white font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: proj.color || '#4F46E5' }}
                        />
                        <span className="truncate">{proj.name}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 shrink-0" />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* User profile footer */}
        {user && (
          <div className="p-3 border-t border-slate-800 bg-slate-900/60">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50">
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar name={user.name} avatarColor={user.avatar_color} size="sm" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Log out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition shrink-0 ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
