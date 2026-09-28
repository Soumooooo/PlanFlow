import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { DashboardData, Task, Project } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../common/UserAvatar';
import { TaskDetailModal } from '../tasks/TaskDetailModal';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  TrendingUp,
  Calendar,
  ArrowRight,
  Plus,
  AlertTriangle,
  Flag,
  Sparkles
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (view: string, projectId?: number, taskId?: number) => void;
  onOpenNewProject: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenNewProject,
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTaskProject, setSelectedTaskProject] = useState<Project | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.getDashboard()
      .then((res) => {
        if (!isMounted) return;
        setData(res);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load dashboard');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenTask = async (task: Task) => {
    try {
      const projRes = await api.getProject(task.project_id);
      setSelectedTaskProject(projRes.project);
      setSelectedTaskId(task.id);
    } catch (e) {
      console.error('Failed to load project for task modal', e);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-sm">
        Loading dashboard overview...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-sm text-rose-600">
        {error || 'Unable to load dashboard data.'}
      </div>
    );
  }

  const { stats, projectProgress, tasksDueSoon, recentlyUpdatedTasks } = data;

  const totalTasksInProgress = stats.myTasksByStatus.find((s) => s.status === 'In Progress')?.count || 0;
  const totalTasksDone = stats.myTasksByStatus.find((s) => s.status === 'Done')?.count || 0;

  return (
    <div className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto space-y-8 overflow-y-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-100 text-xs font-semibold backdrop-blur-xs mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Welcome back, {user?.name.split(' ')[0]}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Here's what is happening with your projects
          </h2>
          <p className="text-indigo-200 text-xs sm:text-sm mt-1 max-w-xl">
            You have <strong className="text-white font-bold">{stats.myAssignedTasksCount}</strong> tasks assigned to you and{' '}
            <strong className="text-white font-bold">{stats.tasksDueSoonCount}</strong> tasks due in the next 7 days.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewProject}
          className="px-4 py-2.5 bg-white text-indigo-600 hover:bg-indigo-50 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold">Total Projects</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.totalProjects}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Active workspaces you belong to</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold">My Assigned Tasks</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.myAssignedTasksCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalTasksInProgress} in progress &bull; {totalTasksDone} completed
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold">Tasks Due Soon</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.tasksDueSoonCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Due within the next 7 days</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold">Overall Progress</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {projectProgress.length > 0
              ? Math.round(
                  projectProgress.reduce((acc, p) => acc + p.progress_percent, 0) /
                    projectProgress.length
                )
              : 0}
            %
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Average project completion</p>
        </div>
      </div>

      {/* Main Content Grid: Projects Progress & Tasks Due Soon */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Project Progress */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Project Progress</h3>
              <p className="text-xs text-slate-500">Completion rate across all active projects</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>View all projects</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {projectProgress.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                No projects found. Create your first project to get started!
              </p>
            ) : (
              projectProgress.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => onNavigate('project-board', proj.id)}
                  className="p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-slate-50/60 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: proj.color || '#4F46E5' }}
                      />
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">
                        {proj.name}
                      </h4>
                    </div>
                    <span className="text-xs font-extrabold text-slate-700">
                      {proj.progress_percent}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${proj.progress_percent}%`,
                        backgroundColor: proj.color || '#4F46E5',
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>
                      {proj.done_tasks} of {proj.total_tasks} tasks completed
                    </span>
                    <span className="text-indigo-600 font-medium group-hover:translate-x-0.5 transition flex items-center gap-1">
                      Open Board &rarr;
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Tasks Due Soon */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Due Soon</h3>
              <p className="text-xs text-slate-500">Upcoming deadlines</p>
            </div>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
            {tasksDueSoon.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-8 text-center">
                No tasks due in the next 7 days. You're all caught up!
              </p>
            ) : (
              tasksDueSoon.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleOpenTask(task)}
                  className="py-3 hover:bg-slate-50 cursor-pointer transition flex items-start gap-2.5 group"
                >
                  <div className="mt-0.5">
                    <Flag
                      className={`w-3.5 h-3.5 ${
                        task.priority === 'High'
                          ? 'text-rose-500'
                          : task.priority === 'Medium'
                          ? 'text-amber-500'
                          : 'text-slate-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition truncate">
                      {task.title}
                    </h5>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                      <span className="truncate">{task.project_name}</span>
                      <span>&bull;</span>
                      <span className="text-amber-600 font-semibold">{task.due_date}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recently Updated Tasks Feed */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recently Updated Tasks</h3>
            <p className="text-xs text-slate-500">Latest activity across projects</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('my-tasks')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            My tasks view &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {recentlyUpdatedTasks.map((t) => (
            <div
              key={t.id}
              onClick={() => handleOpenTask(t)}
              className="p-3.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-slate-50/60 transition cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${t.project_color || '#4F46E5'}15`,
                      color: t.project_color || '#4F46E5',
                    }}
                  >
                    {t.project_name}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    {t.status}
                  </span>
                </div>
                <h5 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition line-clamp-2">
                  {t.title}
                </h5>
              </div>

              <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-[10px] text-slate-400">
                <span>
                  {new Date(t.updated_at).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                {t.assignee_name && (
                  <UserAvatar
                    name={t.assignee_name}
                    avatarColor={t.assignee_avatar_color}
                    size="sm"
                    showTooltip
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        project={selectedTaskProject}
        isOpen={Boolean(selectedTaskId)}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={() => {}}
        onTaskDeleted={() => {}}
      />
    </div>
  );
};
