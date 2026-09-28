import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Project, User, ProjectMember } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../common/UserAvatar';
import { X, Users, UserPlus, Trash2, Crown, Shield } from 'lucide-react';

interface ProjectMembersModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
  onMembersUpdated: () => void;
}

export const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({
  isOpen,
  project,
  onClose,
  onMembersUpdated,
}) => {
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getUsers().then((res) => {
        setAllUsers(res.users);
      }).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen || !project) return null;

  const currentMembers = project.members || [];
  const memberUserIds = new Set(currentMembers.map((m) => m.id));
  const availableUsers = allUsers.filter((u) => !memberUserIds.has(u.id));

  const isOwner = project.owner_id === user?.id || project.my_role === 'owner';

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setLoading(true);
    setError(null);
    try {
      await api.addProjectMember(project.id, Number(selectedUserId));
      setSelectedUserId('');
      onMembersUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (targetUserId: number) => {
    setLoading(true);
    setError(null);
    try {
      await api.removeProjectMember(project.id, targetUserId);
      onMembersUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Manage Project Members</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-medium rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {/* Add member form */}
          <div>
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Add Existing User
            </h4>
            {availableUsers.length > 0 ? (
              <form onSubmit={handleAddMember} className="flex gap-2">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="">Select a user...</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!selectedUserId || loading}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </form>
            ) : (
              <p className="text-xs text-slate-500 italic">
                All registered users are already members of this project.
              </p>
            )}
          </div>

          {/* Current members list */}
          <div>
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Current Members ({currentMembers.length})
            </h4>

            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
              {currentMembers.map((member) => {
                const isMemberOwner = member.role === 'owner' || member.id === project.owner_id;
                const canRemove =
                  (isOwner && !isMemberOwner) || (!isOwner && member.id === user?.id);

                return (
                  <div
                    key={member.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar
                        name={member.name}
                        avatarColor={member.avatar_color}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 truncate">
                            {member.name}
                          </span>
                          {member.id === user?.id && (
                            <span className="text-[10px] text-slate-400">(You)</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 truncate block">
                          {member.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isMemberOwner ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Crown className="w-3 h-3" />
                          Owner
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                          <Shield className="w-3 h-3" />
                          Member
                        </span>
                      )}

                      {canRemove && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={loading}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 transition"
                          title={member.id === user?.id ? 'Leave Project' : 'Remove Member'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
