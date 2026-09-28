import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Task, Project, Comment, TaskStatus, TaskPriority } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { UserAvatar } from '../common/UserAvatar';
import {
  X,
  Calendar,
  Flag,
  User as UserIcon,
  Trash2,
  MessageSquare,
  Send,
  Edit2,
  Check,
  Clock,
  Columns3
} from 'lucide-react';

interface TaskDetailModalProps {
  taskId: number | null;
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: (task: Task) => void;
  onTaskDeleted: (taskId: number) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  taskId,
  project,
  isOpen,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
}) => {
  const { user } = useAuth();
  const { subscribe } = useWebSocket();

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [isSavingDesc, setIsSavingDesc] = useState(false);

  const [loading, setLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load task and comments
  useEffect(() => {
    if (!isOpen || !taskId) {
      setTask(null);
      setComments([]);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([api.getTask(taskId), api.getComments(taskId)])
      .then(([taskRes, commentsRes]) => {
        if (!isMounted) return;
        setTask(taskRes.task);
        setTitleDraft(taskRes.task.title);
        setDescriptionDraft(taskRes.task.description || '');
        setComments(commentsRes.comments);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load task details');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [taskId, isOpen]);

  // Real-time WebSocket subscriptions for task & comments
  useEffect(() => {
    if (!isOpen || !taskId) return;

    // Listen for task updates
    const unsubTask = subscribe('task:updated', (data) => {
      if (data.task && data.task.id === taskId) {
        setTask(data.task);
        setTitleDraft(data.task.title);
        setDescriptionDraft(data.task.description || '');
      }
    });

    // Listen for task deletions
    const unsubTaskDel = subscribe('task:deleted', (data) => {
      if (data.taskId === taskId) {
        onClose();
      }
    });

    // Listen for comment additions
    const unsubCommentAdd = subscribe('comment:created', (data) => {
      if (data.taskId === taskId && data.comment) {
        setComments((prev) => {
          // Idempotency check: avoid duplicate comments
          if (prev.some((c) => c.id === data.comment.id)) return prev;
          return [...prev, data.comment];
        });
      }
    });

    // Listen for comment edits
    const unsubCommentEdit = subscribe('comment:updated', (data) => {
      if (data.comment) {
        setComments((prev) =>
          prev.map((c) => (c.id === data.comment.id ? data.comment : c))
        );
      }
    });

    // Listen for comment deletes
    const unsubCommentDel = subscribe('comment:deleted', (data) => {
      if (data.commentId) {
        setComments((prev) => prev.filter((c) => c.id !== data.commentId));
      }
    });

    return () => {
      unsubTask();
      unsubTaskDel();
      unsubCommentAdd();
      unsubCommentEdit();
      unsubCommentDel();
    };
  }, [isOpen, taskId, subscribe, onClose]);

  if (!isOpen) return null;

  const handleUpdateField = async (fields: Partial<Task>) => {
    if (!task) return;
    try {
      const res = await api.updateTask(task.id, fields);
      setTask(res.task);
      onTaskUpdated(res.task);
    } catch (err: any) {
      setError(err.message || 'Failed to update task');
    }
  };

  const handleSaveTitle = async () => {
    if (!titleDraft.trim() || !task) return;
    if (titleDraft.trim() === task.title) {
      setIsEditingTitle(false);
      return;
    }
    await handleUpdateField({ title: titleDraft.trim() });
    setIsEditingTitle(false);
  };

  const handleSaveDescription = async () => {
    if (!task) return;
    setIsSavingDesc(true);
    await handleUpdateField({ description: descriptionDraft.trim() });
    setIsSavingDesc(false);
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await api.deleteTask(task.id);
        onTaskDeleted(task.id);
        onClose();
      } catch (err: any) {
        setError(err.message || 'Failed to delete task');
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !task) return;

    setCommentLoading(true);
    try {
      const res = await api.createComment(task.id, newComment.trim());
      // Append optimistically / from API response if not already pushed via socket
      setComments((prev) => {
        if (prev.some((c) => c.id === res.comment.id)) return prev;
        return [...prev, res.comment];
      });
      setNewComment('');
    } catch (err: any) {
      setError(err.message || 'Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleStartEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.content);
  };

  const handleSaveEditComment = async (commentId: number) => {
    if (!editCommentText.trim()) return;
    try {
      const res = await api.updateComment(commentId, editCommentText.trim());
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? res.comment : c))
      );
      setEditingCommentId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await api.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete comment');
    }
  };

  const members = project?.members || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: project?.color || '#4F46E5' }}
            />
            <span className="text-xs font-semibold text-slate-500">
              {project?.name || 'Project'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDeleteTask}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">Loading task details...</div>
        ) : task ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-medium rounded-xl border border-red-200">
                {error}
              </div>
            )}

            {/* Editable Title */}
            <div>
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                    autoFocus
                    className="flex-1 text-lg font-bold text-slate-900 border border-indigo-400 rounded-xl px-3 py-1.5 focus:outline-none ring-2 ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveTitle}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTitleDraft(task.title);
                      setIsEditingTitle(false);
                    }}
                    className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="group flex items-start justify-between gap-2">
                  <h2
                    onClick={() => setIsEditingTitle(true)}
                    className="text-xl font-bold text-slate-900 tracking-tight cursor-pointer hover:text-indigo-600 transition"
                    title="Click to edit title"
                  >
                    {task.title}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(true)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Property Badges & Selectors */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              {/* Status */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                  <Columns3 className="w-3 h-3" />
                  Status
                </label>
                <select
                  value={task.status}
                  onChange={(e) => handleUpdateField({ status: e.target.value as TaskStatus })}
                  className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                  <Flag className="w-3 h-3" />
                  Priority
                </label>
                <select
                  value={task.priority}
                  onChange={(e) => handleUpdateField({ priority: e.target.value as TaskPriority })}
                  className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                  <UserIcon className="w-3 h-3" />
                  Assignee
                </label>
                <select
                  value={task.assigned_to || ''}
                  onChange={(e) =>
                    handleUpdateField({
                      assigned_to: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Due Date
                </label>
                <input
                  type="date"
                  value={task.due_date || ''}
                  onChange={(e) => handleUpdateField({ due_date: e.target.value || null })}
                  className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Description
                </label>
                {descriptionDraft !== (task.description || '') && (
                  <button
                    type="button"
                    onClick={handleSaveDescription}
                    disabled={isSavingDesc}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    {isSavingDesc ? 'Saving...' : 'Save Description'}
                  </button>
                )}
              </div>
              <textarea
                rows={4}
                placeholder="Add more details to this task..."
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                onBlur={handleSaveDescription}
                className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
              />
            </div>

            {/* Comments Section */}
            <div className="border-t border-slate-100 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Comments & Activity ({comments.length})
                </h3>
              </div>

              {/* New Comment Input */}
              <form onSubmit={handleAddComment} className="flex gap-2.5 mb-6">
                <UserAvatar name={user?.name || 'User'} avatarColor={user?.avatar_color} size="md" />
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || commentLoading}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">
                    No comments yet. Start the conversation!
                  </p>
                ) : (
                  comments.map((comment) => {
                    const isAuthor = comment.user_id === user?.id;
                    const isOwner = project?.owner_id === user?.id;
                    const canDelete = isAuthor || isOwner;

                    return (
                      <div key={comment.id} className="flex gap-3 items-start group text-xs">
                        <UserAvatar
                          name={comment.user_name}
                          avatarColor={comment.user_avatar_color}
                          size="md"
                        />
                        <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">
                                {comment.user_name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(comment.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              {isAuthor && editingCommentId !== comment.id && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditComment(comment)}
                                  className="text-slate-400 hover:text-indigo-600 p-0.5"
                                  title="Edit comment"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="text-slate-400 hover:text-rose-600 p-0.5"
                                  title="Delete comment"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {editingCommentId === comment.id ? (
                            <div className="mt-2 space-y-2">
                              <textarea
                                rows={2}
                                value={editCommentText}
                                onChange={(e) => setEditCommentText(e.target.value)}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => setEditingCommentId(null)}
                                  className="px-2.5 py-1 text-[11px] text-slate-500 hover:bg-slate-200 rounded-md"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditComment(comment.id)}
                                  className="px-2.5 py-1 text-[11px] bg-indigo-600 text-white font-semibold rounded-md"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                              {comment.content}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">Task not found</div>
        )}
      </div>
    </div>
  );
};
