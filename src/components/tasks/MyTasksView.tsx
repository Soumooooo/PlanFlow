import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { Task, Project, TaskStatus, TaskPriority } from '../../types';
import { TaskDetailModal } from './TaskDetailModal';
import {
  CheckSquare,
  Search,
  Filter,
  Calendar,
  MessageSquare,
  ArrowUpDown,
  FolderKanban,
  Flag,
  Clock,
  ArrowRight
} from 'lucide-react';

interface MyTasksViewProps {
  projects: Project[];
  onOpenProject: (projectId: number) => void;
}

export const MyTasksView: React.FC<MyTasksViewProps> = ({ projects, onOpenProject }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected task modal
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTaskProject, setSelectedTaskProject] = useState<Project | null>(null);

  const fetchMyTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getMyTasks({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        projectId: projectFilter !== 'all' ? projectFilter : undefined,
      });
      setTasks(res.tasks);
    } catch (err: any) {
      setError(err.message || 'Failed to load your assigned tasks');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, projectFilter]);

  useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  const handleOpenTask = async (task: Task) => {
    try {
      const projRes = await api.getProject(task.project_id);
      setSelectedTaskProject(projRes.project);
      setSelectedTaskId(task.id);
    } catch (e) {
      console.error('Failed to load project details for modal', e);
    }
  };

  const handleQuickStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    try {
      await api.updateTask(taskId, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  // Client-side text search
  const filteredTasks = tasks.filter((t) => {
    if (!searchQuery) return true;
    return (
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.project_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const priorityColor = (p: TaskPriority) => {
    switch (p) {
      case 'High':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Low':
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          My Assigned Tasks ({tasks.length})
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          All tasks assigned to you across your collaborative projects
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search my tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        {/* Right: Project, Status, Priority Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Project Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-400 hidden md:inline">Project:</span>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-medium"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-400 hidden md:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Review">Review</option>
              <option value="Done">Done</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-400 hidden md:inline">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List Table */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-400">Loading your tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No tasks found</h3>
          <p className="text-xs text-slate-500">
            {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || projectFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'You have no assigned tasks at the moment.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTasks.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/70 transition cursor-pointer group"
                    onClick={() => handleOpenTask(t)}
                  >
                    {/* Task Title & Comments */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition">
                          {t.title}
                        </span>
                        {(t.comments_count || 0) > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                            <MessageSquare className="w-3 h-3" />
                            <span>{t.comments_count}</span>
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 max-w-sm mt-0.5">
                          {t.description}
                        </p>
                      )}
                    </td>

                    {/* Project */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: t.project_color || '#4F46E5' }}
                        />
                        <span className="font-medium text-slate-700">{t.project_name}</span>
                      </div>
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-3 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={t.status}
                        onChange={(e) =>
                          handleQuickStatusChange(t.id, e.target.value as TaskStatus)
                        }
                        className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Review">Review</option>
                        <option value="Done">Done</option>
                      </select>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${priorityColor(
                          t.priority
                        )}`}
                      >
                        {t.priority}
                      </span>
                    </td>

                    {/* Due Date */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      {t.due_date ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.due_date}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic">No deadline</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onOpenProject(t.project_id)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg transition"
                        title="Go to Kanban Board"
                      >
                        <FolderKanban className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        project={selectedTaskProject}
        isOpen={Boolean(selectedTaskId)}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={(updated) => {
          setTasks((prev) =>
            prev.map((t) => (t.id === updated.id ? updated : t))
          );
        }}
        onTaskDeleted={(deletedId) => {
          setTasks((prev) => prev.filter((t) => t.id !== deletedId));
        }}
      />
    </div>
  );
};
