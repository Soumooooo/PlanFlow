import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../lib/api';
import { Project, Task, TaskStatus, TaskPriority } from '../../types';
import { useWebSocket } from '../../context/WebSocketContext';
import { UserAvatar } from '../common/UserAvatar';
import { CreateTaskModal } from '../tasks/CreateTaskModal';
import { TaskDetailModal } from '../tasks/TaskDetailModal';
import { ProjectMembersModal } from '../projects/ProjectMembersModal';
import { EditProjectModal } from '../projects/EditProjectModal';
import {
  Plus,
  Settings,
  Users,
  Search,
  Filter,
  Calendar,
  MessageSquare,
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  Clock,
  ArrowRight,
  GripVertical
} from 'lucide-react';

interface KanbanBoardProps {
  projectId: number;
  initialTaskId?: number | null;
  onProjectUpdated: (project: Project) => void;
  onProjectDeleted: (projectId: number) => void;
}

const COLUMNS: { id: TaskStatus; label: string; headerColor: string; bg: string }[] = [
  { id: 'To Do', label: 'To Do', headerColor: 'text-slate-700', bg: 'bg-slate-100/70' },
  { id: 'In Progress', label: 'In Progress', headerColor: 'text-blue-700', bg: 'bg-blue-50/50' },
  { id: 'Review', label: 'Review', headerColor: 'text-amber-700', bg: 'bg-amber-50/50' },
  { id: 'Done', label: 'Done', headerColor: 'text-emerald-700', bg: 'bg-emerald-50/50' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  projectId,
  initialTaskId,
  onProjectUpdated,
  onProjectDeleted,
}) => {
  const { joinProject, leaveProject, subscribe } = useWebSocket();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Modals
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskColumn, setCreateTaskColumn] = useState<TaskStatus>('To Do');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(initialTaskId || null);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);

  // Drag and Drop state
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Fetch project & tasks
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [projRes, tasksRes] = await Promise.all([
        api.getProject(projectId),
        api.getProjectTasks(projectId),
      ]);
      setProject(projRes.project);
      setTasks(tasksRes.tasks);
      onProjectUpdated(projRes.project);
    } catch (err: any) {
      setError(err.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  }, [projectId, onProjectUpdated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Join WebSocket project room on mount
  useEffect(() => {
    joinProject(projectId);
    return () => {
      leaveProject(projectId);
    };
  }, [projectId, joinProject, leaveProject]);

  // WebSocket subscriptions for real-time task updates
  useEffect(() => {
    // 1. Task created by another peer
    const unsubTaskCreated = subscribe('task:created', (data) => {
      if (data.task && data.task.project_id === projectId) {
        setTasks((prev) => {
          if (prev.some((t) => t.id === data.task.id)) return prev;
          return [...prev, data.task];
        });
      }
    });

    // 2. Task updated (moved, assigned, edited)
    const unsubTaskUpdated = subscribe('task:updated', (data) => {
      if (data.task && data.task.project_id === projectId) {
        setTasks((prev) =>
          prev.map((t) => (t.id === data.task.id ? data.task : t))
        );
      }
    });

    // 3. Task deleted
    const unsubTaskDeleted = subscribe('task:deleted', (data) => {
      if (data.projectId === projectId || data.taskId) {
        setTasks((prev) => prev.filter((t) => t.id !== data.taskId));
      }
    });

    // 4. Project member added / removed
    const unsubMemberAdded = subscribe('project:member_added', (data) => {
      if (data.projectId === projectId) {
        loadData();
      }
    });

    const unsubMemberRemoved = subscribe('project:member_removed', (data) => {
      if (data.projectId === projectId) {
        loadData();
      }
    });

    // 5. Comment added / deleted (updates comments_count badge)
    const unsubCommentCreated = subscribe('comment:created', (data) => {
      if (data.projectId === projectId && data.taskId) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === data.taskId
              ? { ...t, comments_count: (t.comments_count || 0) + 1 }
              : t
          )
        );
      }
    });

    const unsubCommentDeleted = subscribe('comment:deleted', (data) => {
      if (data.projectId === projectId && data.taskId) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === data.taskId
              ? { ...t, comments_count: Math.max(0, (t.comments_count || 1) - 1) }
              : t
          )
        );
      }
    });

    return () => {
      unsubTaskCreated();
      unsubTaskUpdated();
      unsubTaskDeleted();
      unsubMemberAdded();
      unsubMemberRemoved();
      unsubCommentCreated();
      unsubCommentDeleted();
    };
  }, [projectId, subscribe, loadData]);

  // Handle task moved optimistically & via API
  const handleMoveTask = async (taskId: number, newStatus: TaskStatus) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask || targetTask.status === newStatus) return;

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await api.updateTask(taskId, { status: newStatus });
    } catch (err) {
      console.error('Failed to move task:', err);
      // Rollback on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: targetTask.status } : t))
      );
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('text/plain', String(taskId));
    setDraggingTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(colId);
  };

  const handleDrop = async (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskIdStr = e.dataTransfer.getData('text/plain');
    const taskId = Number(taskIdStr) || draggingTaskId;
    setDraggingTaskId(null);

    if (taskId) {
      handleMoveTask(taskId, colId);
    }
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (
        searchQuery &&
        !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (selectedAssignee !== 'all') {
        if (selectedAssignee === 'unassigned') {
          if (t.assigned_to !== null) return false;
        } else {
          if (String(t.assigned_to) !== selectedAssignee) return false;
        }
      }
      if (selectedPriority !== 'all' && t.priority !== selectedPriority) {
        return false;
      }
      return true;
    });
  }, [tasks, searchQuery, selectedAssignee, selectedPriority]);

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

  const isDueOverdue = (dateStr: string | null, status: TaskStatus) => {
    if (!dateStr || status === 'Done') return false;
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  if (loading && !project) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-sm">
        Loading Kanban Board...
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Project Not Accessible</h3>
        <p className="text-xs text-slate-500">{error || 'Project does not exist or access denied.'}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">
      {/* Top Project Subheader */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 shrink-0 flex flex-wrap items-center justify-between gap-4">
        {/* Project Info & Members */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3.5 h-3.5 rounded-md shrink-0 shadow-xs"
              style={{ backgroundColor: project.color || '#4F46E5' }}
            />
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {project.name}
              </h2>
              {project.description && (
                <p className="text-xs text-slate-500 max-w-md truncate">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          {/* Members Avatar Stack */}
          <div className="flex items-center gap-1.5 pl-4 border-l border-slate-200">
            <div className="flex -space-x-2 overflow-hidden">
              {(project.members || []).slice(0, 4).map((member) => (
                <UserAvatar
                  key={member.id}
                  name={member.name}
                  avatarColor={member.avatar_color}
                  size="sm"
                  className="ring-2 ring-white"
                  showTooltip
                />
              ))}
            </div>
            {(project.members || []).length > 4 && (
              <span className="text-[10px] text-slate-500 font-medium pl-1">
                +{(project.members?.length || 0) - 4}
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsMembersModalOpen(true)}
              className="ml-1 p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Members</span>
            </button>
          </div>
        </div>

        {/* Right Tools & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white w-36 sm:w-48"
            />
          </div>

          {/* Priority filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-medium"
          >
            <option value="all">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Project Settings button */}
          <button
            type="button"
            onClick={() => setIsEditProjectOpen(true)}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            title="Project Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Add Task button */}
          <button
            type="button"
            onClick={() => {
              setCreateTaskColumn('To Do');
              setIsCreateTaskOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Kanban Columns Canvas */}
      <div className="flex-1 overflow-x-auto p-4 sm:p-6">
        <div className="flex gap-4 sm:gap-6 min-w-max h-full pb-2">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            const isTargeted = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`w-72 sm:w-80 flex flex-col rounded-2xl border transition-colors duration-150 ${
                  isTargeted
                    ? 'border-indigo-400 bg-indigo-50/40 ring-2 ring-indigo-200'
                    : 'border-slate-200/80 bg-slate-100/60'
                }`}
              >
                {/* Column Header */}
                <div className="p-3.5 flex items-center justify-between border-b border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${col.headerColor}`}>
                      {col.label}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-600 border border-slate-200 shadow-2xs">
                      {colTasks.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCreateTaskColumn(col.id);
                      setIsCreateTaskOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition"
                    title={`Add task to ${col.label}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Column Task Cards List */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                  {colTasks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      No tasks
                    </div>
                  ) : (
                    colTasks.map((t) => {
                      const overdue = isDueOverdue(t.due_date, t.status);
                      const isDragging = draggingTaskId === t.id;

                      return (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, t.id)}
                          onClick={() => setSelectedTaskId(t.id)}
                          className={`bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs hover:shadow-md hover:border-indigo-300 transition cursor-pointer group relative ${
                            isDragging ? 'opacity-40 scale-95' : ''
                          }`}
                        >
                          {/* Priority and Move Selector */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${priorityColor(
                                t.priority
                              )}`}
                            >
                              {t.priority}
                            </span>

                            {/* Quick move dropdown for accessibility */}
                            <select
                              value={t.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleMoveTask(t.id, e.target.value as TaskStatus);
                              }}
                              className="text-[10px] bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-600 hover:bg-slate-100 focus:outline-none"
                              title="Move column"
                            >
                              <option value="To Do">To Do</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Review">Review</option>
                              <option value="Done">Done</option>
                            </select>
                          </div>

                          {/* Task Title */}
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-2 mb-1 group-hover:text-indigo-600 transition">
                            {t.title}
                          </h4>

                          {/* Description snippet */}
                          {t.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 mb-3">
                              {t.description}
                            </p>
                          )}

                          {/* Footer: Due date, comments, assignee */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                            <div className="flex items-center gap-3">
                              {t.due_date && (
                                <span
                                  className={`flex items-center gap-1 ${
                                    overdue
                                      ? 'text-rose-600 font-semibold'
                                      : 'text-slate-500'
                                  }`}
                                  title={`Due: ${t.due_date}`}
                                >
                                  <Calendar className="w-3 h-3" />
                                  <span>{t.due_date.slice(5)}</span>
                                </span>
                              )}

                              {(t.comments_count || 0) > 0 && (
                                <span className="flex items-center gap-1 text-slate-500">
                                  <MessageSquare className="w-3 h-3" />
                                  <span>{t.comments_count}</span>
                                </span>
                              )}
                            </div>

                            {t.assignee_name ? (
                              <UserAvatar
                                name={t.assignee_name}
                                avatarColor={t.assignee_avatar_color}
                                size="sm"
                                showTooltip
                              />
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        project={project}
        defaultStatus={createTaskColumn}
        onClose={() => setIsCreateTaskOpen(false)}
        onTaskCreated={(newTask) => {
          setTasks((prev) => {
            if (prev.some((t) => t.id === newTask.id)) return prev;
            return [...prev, newTask];
          });
        }}
      />

      {/* Task Details Modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        project={project}
        isOpen={Boolean(selectedTaskId)}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={(updatedTask) => {
          setTasks((prev) =>
            prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
          );
        }}
        onTaskDeleted={(deletedTaskId) => {
          setTasks((prev) => prev.filter((t) => t.id !== deletedTaskId));
        }}
      />

      {/* Members Modal */}
      <ProjectMembersModal
        isOpen={isMembersModalOpen}
        project={project}
        onClose={() => setIsMembersModalOpen(false)}
        onMembersUpdated={loadData}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={isEditProjectOpen}
        project={project}
        onClose={() => setIsEditProjectOpen(false)}
        onProjectUpdated={(p) => {
          setProject(p);
          onProjectUpdated(p);
        }}
        onProjectDeleted={(pid) => {
          onProjectDeleted(pid);
        }}
      />
    </div>
  );
};
