import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, ArrowRight, Pencil } from "lucide-react";
import { getProjects, deleteProject, type Project } from "@/db/database";
import { useDiagramStore } from "@/store/useDiagramStore";
import { Button } from "@/components/ui/button";
import { DashboardOptionsMenu } from "./DashboardOptionsMenu";
import { CreateProjectModal } from "@/components/modals/CreateProjectModal";
import { EditProjectModal } from "@/components/modals/EditProjectModal";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { useTranslation } from "@/store/useSettingsStore";

const RECENT_PROJECTS_KEY = "power_diagram_recent_projects";

function getStoredRecentProjectIds(): number[] {
  try {
    const raw = localStorage.getItem(RECENT_PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is number => typeof id === "number");
    }
  } catch (err) {
    console.error("Error al leer proyectos recientes de localStorage:", err);
  }
  return [];
}

function storeRecentProjectAccess(projectId: number): number[] {
  try {
    const current = getStoredRecentProjectIds().filter((id) => id !== projectId);
    const updated = [projectId, ...current].slice(0, 10);
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error("Error al persistir acceso a proyecto en localStorage:", err);
    return [projectId];
  }
}

function removeStoredRecentProject(projectId: number): number[] {
  try {
    const updated = getStoredRecentProjectIds().filter((id) => id !== projectId);
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error("Error al eliminar proyecto de recientes en localStorage:", err);
    return [];
  }
}

const getEngineBadgeColor = (engine: string) => {
  switch (engine.toLowerCase()) {
    case "postgres":
      return "text-sky-500 bg-sky-500/10 border-sky-500/30";
    case "mysql":
      return "text-amber-500 bg-amber-500/10 border-amber-500/30";
    case "sqlite":
      return "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";
    case "mssql":
      return "text-rose-500 bg-rose-500/10 border-rose-500/30";
    default:
      return "text-slate-500 bg-slate-500/10 border-slate-500/30";
  }
};

interface ProjectCardProps {
  project: Project;
  badgeLabel?: string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ProjectCard({
  project,
  badgeLabel,
  onOpen,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  const { t, language } = useTranslation();
  const dateLocale = language === "en" ? "en-US" : "es-ES";

  return (
    <div
      onClick={onOpen}
      className="group relative rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:border-app-accent-border p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[140px]"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded border ${getEngineBadgeColor(
                project.db_engine
              )}`}
            >
              {project.db_engine}
            </span>
            {badgeLabel && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                {badgeLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="h-7 w-7 p-0 text-slate-400 hover:text-app-accent-text hover:bg-app-accent-subtle rounded"
              title={t.dashboard.editProjectTitle}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-500 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded"
              title={t.dashboard.deleteProjectTitle}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <h4 className="font-semibold text-sm text-slate-900 dark:text-zinc-100 group-hover:text-app-accent-text transition-colors truncate">
          {project.name}
        </h4>
      </div>

      <div className="mt-4 pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-500">
        <span>
          {new Date(project.created_at).toLocaleDateString(dateLocale, {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
        <span className="flex items-center gap-1 text-app-accent-text opacity-0 group-hover:opacity-100 transition-opacity font-medium">
          <span>{t.dashboard.open}</span>
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}

export function ProjectDashboard() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentProjectIds, setRecentProjectIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [cachedDeletingProject, setCachedDeletingProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (deletingProject) {
      setCachedDeletingProject(deletingProject);
    }
  }, [deletingProject]);

  const targetDeletingProject = deletingProject || cachedDeletingProject;

  const { setActiveProject } = useDiagramStore();

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      console.error("Error al cargar proyectos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setRecentProjectIds(getStoredRecentProjectIds());
    loadProjects();
  }, []);

  const handleOpenProject = (project: Project) => {
    const updated = storeRecentProjectAccess(project.id);
    setRecentProjectIds(updated);
    setActiveProject(project);
  };

  const handleProjectCreated = (newProject: Project) => {
    const updated = storeRecentProjectAccess(newProject.id);
    setRecentProjectIds(updated);
    loadProjects();
    setActiveProject(newProject);
  };

  const handleProjectUpdated = (updatedProject: Project) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
    );
    setEditingProject(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProject || isDeleting) return;
    try {
      setIsDeleting(true);
      await deleteProject(deletingProject.id);
      setProjects((prev) => prev.filter((p) => p.id !== deletingProject.id));
      const updated = removeStoredRecentProject(deletingProject.id);
      setRecentProjectIds(updated);
      setDeletingProject(null);
    } catch (err) {
      console.error("Error al eliminar proyecto:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Obtiene los últimos 2 proyectos a los que se accedió.
   * Si no hay suficientes accesos en historial, completa con los proyectos registrados existentes.
   */
  const recentProjects = useMemo(() => {
    if (projects.length === 0) return [];
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const result: Project[] = [];

    // 1. Proyectos en orden de acceso reciente
    for (const id of recentProjectIds) {
      const found = projectMap.get(id);
      if (found) {
        result.push(found);
        if (result.length === 2) break;
      }
    }

    // 2. Si hay menos de 2 en historial, completar con los existentes
    if (result.length < 2) {
      for (const p of projects) {
        if (!result.some((r) => r.id === p.id)) {
          result.push(p);
          if (result.length === 2) break;
        }
      }
    }

    return result;
  }, [projects, recentProjectIds]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col transition-colors">
      {/* Barra de navegación superior */}
      <nav className="h-14 border-b border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 backdrop-blur px-8 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Power Diagram" className="w-7 h-7 rounded-lg object-contain shadow-sm" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                Power Diagram
              </h1>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400">{t.dashboard.tagline}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DashboardOptionsMenu />
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-8 space-y-8">
        {/* Cabecera de la sección */}
        <div className="border-b border-slate-200 dark:border-zinc-800 pb-5">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
            {t.dashboard.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            {t.dashboard.subtitle}
          </p>
        </div>

        {/* Sección 1: Botón de registrar y los últimos 2 proyectos a los que se accedió */}
        <section aria-labelledby="quick-access-heading" className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h3
              id="quick-access-heading"
              className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400"
            >
              {t.dashboard.quickAccessTitle}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Tarjeta interactiva para crear nueva base de datos */}
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="group border border-dashed border-slate-300 dark:border-zinc-800 hover:border-app-accent-border bg-white/40 dark:bg-zinc-900/30 hover:bg-app-accent-subtle rounded-lg p-5 flex flex-col items-center justify-center gap-2.5 transition-all text-slate-600 dark:text-zinc-400 hover:text-app-accent-text cursor-pointer min-h-[140px]"
            >
              <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-zinc-800 group-hover:bg-app-accent-subtle group-hover:text-app-accent-text flex items-center justify-center transition-colors">
                <Plus className="w-4 h-4" />
              </div>
              <div className="text-center">
                <span className="text-xs font-semibold block">{t.dashboard.newDatabaseTitle}</span>
                <span className="text-[11px] text-slate-400 dark:text-zinc-500">{t.dashboard.newDatabaseSubtitle}</span>
              </div>
            </button>

            {/* Los últimos 2 proyectos a los que se accedió al lado del botón */}
            {recentProjects.map((project) => (
              <ProjectCard
                key={`recent-${project.id}`}
                project={project}
                badgeLabel={t.dashboard.recentBadge}
                onOpen={() => handleOpenProject(project)}
                onEdit={() => setEditingProject(project)}
                onDelete={() => setDeletingProject(project)}
              />
            ))}
          </div>
        </section>

        {/* Sección 2: Todos los proyectos registrados debajo */}
        <section aria-labelledby="registered-projects-heading" className="space-y-3.5 pt-2">
          <div className="flex items-center justify-between">
            <h3
              id="registered-projects-heading"
              className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400"
            >
              {t.dashboard.registeredProjectsTitle(projects.length)}
            </h3>
          </div>

          {isLoading ? (
            <div className="text-center py-16 text-slate-500 dark:text-zinc-500 text-sm">
              {t.dashboard.loadingProjects}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 dark:border-zinc-800/80 rounded-lg p-8 text-slate-500 dark:text-zinc-400 space-y-1">
              <p className="text-sm font-medium">{t.dashboard.emptyTitle}</p>
              <p className="text-xs text-slate-400 dark:text-zinc-500">
                {t.dashboard.emptySubtitle}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={() => handleOpenProject(project)}
                  onEdit={() => setEditingProject(project)}
                  onDelete={() => setDeletingProject(project)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Modal para Crear Nueva Base de Datos / Proyecto */}
      <CreateProjectModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={handleProjectCreated}
      />

      {/* Modal para Editar Base de Datos / Proyecto */}
      <EditProjectModal
        open={Boolean(editingProject)}
        onOpenChange={(open) => {
          if (!open) setEditingProject(null);
        }}
        project={editingProject}
        onSuccess={handleProjectUpdated}
      />

      {/* Modal de Confirmación para Eliminar Proyecto */}
      <ConfirmDialog
        open={Boolean(deletingProject)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletingProject(null);
        }}
        title={t.dashboard.deleteModalTitle}
        description={t.dashboard.deleteModalDescription(targetDeletingProject?.name ?? "")}
        confirmLabel={t.common.delete}
        isConfirming={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
