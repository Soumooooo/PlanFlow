import React, { useState } from 'react';
import { api } from '../../lib/api';
import { Project } from '../../types';
import { X, Settings, Trash2 } from 'lucide-react';

interface EditProjectModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
  onProjectUpdated: (project: Project) => void;
  onProjectDeleted: (projectId: number) => void;
}

const PRESET_COLORS = [
  '#4F46E5', // Indigo
  '#2563EB', // Blue
  '#059669', // Emerald
  '#D97706', // Amber
  '#DC2626', // Red
  '#7C3AED', // Purple
  '#DB2777', // Pink
  '#0891B2', // Cyan
];

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  project,
  onClose,
  onProjectUpdated,
  onProjectDeleted,
}) => {
  if (!isOpen || !project) return null;

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [color, setColor] = useState(project.color || PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmDelete, setIsConfirmDelete] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.updateProject(project.id, {
        name: name.trim(),
        description: description.trim(),
        color,
      });
      onProjectUpdated(res.project);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.deleteProject(project.id);
      onProjectDeleted(project.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
      setLoading(false);
    }
  };

  const isOwner = project.my_role === 'owner';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <Settings className="w-5 h-5 text-indigo-600" />
            <span>Project Settings</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-medium rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Theme Color
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition transform hover:scale-110 flex items-center justify-center ${
                    color === c ? 'ring-2 ring-offset-2 ring-slate-800 scale-105' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center border-t border-slate-100">
            {isOwner ? (
              isConfirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-600 font-medium">Are you sure?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmDelete(false)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Project</span>
                </button>
              )
            ) : (
              <span className="text-xs text-slate-400">Member view</span>
            )}

            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
