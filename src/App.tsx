import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthPage } from './components/auth/AuthPage';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProjectsView } from './components/projects/ProjectsView';
import { KanbanBoard } from './components/kanban/KanbanBoard';
import { MyTasksView } from './components/tasks/MyTasksView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { CreateProjectModal } from './components/projects/CreateProjectModal';
import { CreateTaskModal } from './components/tasks/CreateTaskModal';
import { ToastContainer } from './components/common/ToastContainer';
import { api } from './lib/api';
import { Project } from './types';

function MainApp() {
  const { user, loading: authLoading } = useAuth();

  const [currentView, setCurrentView] = useState<'dashboard' | 'projects' | 'project-board' | 'my-tasks' | 'notifications'>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [initialTaskId, setInitialTaskId] = useState<number | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  // Global modals
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  // Load accessible projects for current user
  const loadProjects = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingProjects(true);
      const res = await api.getProjects();
      setProjects(res.projects);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user, loadProjects]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading PlanFlow...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const handleNavigate = (view: string, projectId?: number, taskId?: number) => {
    if (view === 'project-board' && projectId) {
      setActiveProjectId(projectId);
      setInitialTaskId(taskId || null);
      setCurrentView('project-board');
    } else {
      setCurrentView(view as any);
      if (view !== 'project-board') {
        setActiveProjectId(null);
        setInitialTaskId(null);
      }
    }
  };

  const handleOpenProject = (projectId: number) => {
    setActiveProjectId(projectId);
    setInitialTaskId(null);
    setCurrentView('project-board');
  };

  const handleProjectCreated = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
  };

  const handleProjectUpdated = (updatedProject: Project) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
    );
  };

  const handleProjectDeleted = (deletedProjectId: number) => {
    setProjects((prev) => prev.filter((p) => p.id !== deletedProjectId));
    if (activeProjectId === deletedProjectId) {
      setCurrentView('projects');
      setActiveProjectId(null);
    }
  };

  const activeProject = projects.find((p) => p.id === activeProjectId);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        activeProjectId={activeProjectId}
        projects={projects}
        isOpenMobile={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
        onNavigate={handleNavigate}
        onOpenNewProject={() => setIsCreateProjectOpen(true)}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Navbar */}
        <Navbar
          currentView={currentView}
          activeProjectName={activeProject?.name}
          onOpenNewProject={() => setIsCreateProjectOpen(true)}
          onOpenNewTask={() => setIsCreateTaskOpen(true)}
          onNavigate={handleNavigate}
          onToggleSidebarMobile={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
        />

        {/* View Router */}
        <main className="flex-1 flex flex-col min-h-0">
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={handleNavigate}
              onOpenNewProject={() => setIsCreateProjectOpen(true)}
            />
          )}

          {currentView === 'projects' && (
            <ProjectsView
              projects={projects}
              loading={loadingProjects}
              onOpenProject={handleOpenProject}
              onProjectCreated={handleProjectCreated}
              onProjectUpdated={handleProjectUpdated}
              onProjectDeleted={handleProjectDeleted}
              onReloadProjects={loadProjects}
            />
          )}

          {currentView === 'project-board' && activeProjectId && (
            <KanbanBoard
              key={activeProjectId}
              projectId={activeProjectId}
              initialTaskId={initialTaskId}
              onProjectUpdated={handleProjectUpdated}
              onProjectDeleted={handleProjectDeleted}
            />
          )}

          {currentView === 'my-tasks' && (
            <MyTasksView
              projects={projects}
              onOpenProject={handleOpenProject}
            />
          )}

          {currentView === 'notifications' && (
            <NotificationsView
              onNavigateToTask={(projId, taskId) =>
                handleNavigate('project-board', projId, taskId)
              }
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onProjectCreated={(newProj) => {
          handleProjectCreated(newProj);
          handleOpenProject(newProj.id);
        }}
      />

      {activeProject && (
        <CreateTaskModal
          isOpen={isCreateTaskOpen}
          project={activeProject}
          onClose={() => setIsCreateTaskOpen(false)}
          onTaskCreated={() => {
            // Updated via WebSocket or board state
            setIsCreateTaskOpen(false);
          }}
        />
      )}

      {/* Real-time Toast Notifications */}
      <ToastContainer
        onNavigateToTask={(projId, taskId) =>
          handleNavigate('project-board', projId, taskId)
        }
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <NotificationProvider>
          <MainApp />
        </NotificationProvider>
      </WebSocketProvider>
    </AuthProvider>
  );
}
