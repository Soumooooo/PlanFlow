import React, { useState } from 'react';
import { Project } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { CreateProjectModal } from './CreateProjectModal';
import { EditProjectModal } from './EditProjectModal';
import { ProjectMembersModal } from './ProjectMembersModal';
import {
  Plus,
  Search,
  FolderKanban,
  Settings,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Crown,
  Shield
} from 'lucide-react';

interface ProjectsViewProps {
  projects: Project[];
  loading: boolean;
  onOpenProject: (projectId: number) => void;
  onProjectCreated: (project: Project) => void;
  onProjectUpdated: (project: Project) => void;
  onProjectDeleted: (projectId: number) => void;
  onReloadProjects: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  loading,
  onOpenProject,
  onProjectCreated,
  onProjectUpdated,
  onProjectDeleted,
  onReloadProjects,
}) => {
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [managingMembersProject, setManagingMembersProject] = useState<Project | null>(null);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Projects ({projects.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your collaborative project workspaces and Kanban boards
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-400">Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No projects found</h3>
          <p className="text-xs text-slate-500">
            {search ? 'Try adjusting your search query.' : 'Create your first project to collaborate on tasks!'}
          </p>
          {!search && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((p) => {
            const total = p.total_tasks || 0;
            const done = p.done_tasks || 0;
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;
            const isOwner = p.my_role === 'owner';

            return (
              <div
                key={p.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-md hover:border-indigo-300 transition flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar: Color, Title, Role, Settings */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-lg shrink-0 mt-0.5 shadow-2xs"
                        style={{ backgroundColor: p.color || '#4F46E5' }}
                      />
                      <div className="min-w-0">
                        <h3
                          onClick={() => onOpenProject(p.id)}
                          className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition cursor-pointer truncate"
                        >
                          {p.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          {isOwner ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                              <Crown className="w-3 h-3" /> Owner
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                              <Shield className="w-3 h-3" /> Member
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setManagingMembersProject(p)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg transition"
                        title="Manage Members"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingProject(p)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition"
                        title="Project Settings"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 line-clamp-2 min-h-8 mb-4">
                    {p.description || 'No description provided.'}
                  </p>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-slate-500 font-medium">Task Completion</span>
                      <span className="font-bold text-slate-800">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: p.color || '#4F46E5',
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>{done} Done</span>
                      <span>{total} Total</span>
                    </div>
                  </div>
                </div>

                {/* Footer: Members avatar stack + Open Board CTA */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center -space-x-1.5">
                    {(p.members || []).slice(0, 3).map((m) => (
                      <UserAvatar
                        key={m.id}
                        name={m.name}
                        avatarColor={m.avatar_color}
                        size="sm"
                        className="ring-2 ring-white"
                        showTooltip
                      />
                    ))}
                    {(p.members?.length || 0) > 3 && (
                      <span className="text-[10px] text-slate-500 font-medium pl-2">
                        +{(p.members?.length || 0) - 3}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenProject(p.id)}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition group-hover:translate-x-0.5"
                  >
                    <span>Open Board</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={(newProj) => {
          onProjectCreated(newProj);
          onOpenProject(newProj.id);
        }}
      />

      <EditProjectModal
        isOpen={Boolean(editingProject)}
        project={editingProject}
        onClose={() => setEditingProject(null)}
        onProjectUpdated={(updated) => {
          onProjectUpdated(updated);
          setEditingProject(null);
        }}
        onProjectDeleted={(deletedId) => {
          onProjectDeleted(deletedId);
          setEditingProject(null);
        }}
      />

      <ProjectMembersModal
        isOpen={Boolean(managingMembersProject)}
        project={managingMembersProject}
        onClose={() => setManagingMembersProject(null)}
        onMembersUpdated={() => {
          onReloadProjects();
          setManagingMembersProject(null);
        }}
      />
    </div>
  );
};
