import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, ArrowRight, Pencil, LayoutGrid, List, Table2, Search, X } from "lucide-react";
import { getProjects, deleteProject, type Project } from "@/db/database";
import { useDiagramStore } from "@/store/useDiagramStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DbEngineIcon } from "@/components/ui/DbEngineSelect";
import { DashboardOptionsMenu } from "./DashboardOptionsMenu";
import { CreateProjectModal } from "@/components/modals/CreateProjectModal";
import { EditProjectModal } from "@/components/modals/EditProjectModal";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { useTranslation } from "@/store/useSettingsStore";

const RECENT_PROJECTS_KEY = "power_diagram_recent_projects";
const PROJECTS_VIEW_MODE_KEY = "power_diagram_projects_view_mode";

type ProjectsViewMode = "grid" | "list" | "table";

function getStoredProjectsViewMode(): ProjectsViewMode {
  try {
    const raw = localStorage.getItem(PROJECTS_VIEW_MODE_KEY);
    if (raw === "grid" || raw === "list" || raw === "table") {
      return raw;
    }
  } catch (err) {
    console.error("Error al leer formato de vista de localStorage:", err);
  }
  return "grid";
}

function storeProjectsViewMode(mode: ProjectsViewMode) {
  try {
    localStorage.setItem(PROJECTS_VIEW_MODE_KEY, mode);
  } catch (err) {
    console.error("Error al guardar formato de vista en localStorage:", err);
  }
}

function formatProjectDate(createdAt: string, dateLocale: string): string {
  return new Date(createdAt).toLocaleDateString(dateLocale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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

/** Botones de acción (editar y eliminar) reutilizados en las vistas de cuadrícula, lista y tabla. */
function ProjectActionButtons({
  onEdit,
  onDelete,
  editTitle,
  deleteTitle,
}: {
  onEdit: () => void;
  onDelete: () => void;
  editTitle: string;
  deleteTitle: string;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="h-7 w-7 p-0 text-slate-400 hover:text-app-accent-text hover:bg-app-accent-subtle rounded"
        title={editTitle}
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
        title={deleteTitle}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
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
          <ProjectActionButtons
            onEdit={onEdit}
            onDelete={onDelete}
            editTitle={t.dashboard.editProjectTitle}
            deleteTitle={t.dashboard.deleteProjectTitle}
          />
        </div>

        <h4 className="font-semibold text-sm text-slate-900 dark:text-zinc-100 group-hover:text-app-accent-text transition-colors truncate">
          {project.name}
        </h4>
      </div>

      <div className="mt-4 pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-500">
        <span>{formatProjectDate(project.created_at, dateLocale)}</span>
        <span className="flex items-center gap-1 text-app-accent-text opacity-0 group-hover:opacity-100 transition-opacity font-medium">
          <span>{t.dashboard.open}</span>
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}

/** Elemento horizontal compacto para la vista en formato lista. */
function ProjectListItem({
  project,
  onOpen,
  onEdit,
  onDelete,
}: Omit<ProjectCardProps, "badgeLabel">) {
  const { t, language } = useTranslation();
  const dateLocale = language === "en" ? "en-US" : "es-ES";

  return (
    <div
      onClick={onOpen}
      className="group rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:border-app-accent-border px-4 py-3 transition-all duration-200 cursor-pointer flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <DbEngineIcon engine={project.db_engine} className="w-4 h-4 shrink-0" />
        <h4 className="font-semibold text-sm text-slate-900 dark:text-zinc-100 group-hover:text-app-accent-text transition-colors truncate">
          {project.name}
        </h4>
        <span
          className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${getEngineBadgeColor(
            project.db_engine
          )}`}
        >
          {project.db_engine}
        </span>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <span className="hidden sm:inline text-[11px] text-slate-500 dark:text-zinc-500">
          {formatProjectDate(project.created_at, dateLocale)}
        </span>
        <span className="hidden md:flex items-center gap-1 text-[11px] text-app-accent-text opacity-0 group-hover:opacity-100 transition-opacity font-medium">
          <span>{t.dashboard.open}</span>
          <ArrowRight className="w-3 h-3" />
        </span>
        <ProjectActionButtons
          onEdit={onEdit}
          onDelete={onDelete}
          editTitle={t.dashboard.editProjectTitle}
          deleteTitle={t.dashboard.deleteProjectTitle}
        />
      </div>
    </div>
  );
}

/** Vista tabular de proyectos registrados con cabecera fija durante el scroll. */
function ProjectTableView({
  projects,
  onOpen,
  onEdit,
  onDelete,
}: {
  projects: Project[];
  onOpen: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}) {
  const { t, language } = useTranslation();
  const dateLocale = language === "en" ? "en-US" : "es-ES";

  return (
    <div className="min-h-0 max-h-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            <tr>
              <th className="sticky top-0 z-10 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 py-2.5 px-4">
                {t.dashboard.tableColProject}
              </th>
              <th className="sticky top-0 z-10 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 py-2.5 px-4">
                {t.dashboard.tableColEngine}
              </th>
              <th className="sticky top-0 z-10 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 py-2.5 px-4 hidden sm:table-cell">
                {t.dashboard.tableColCreated}
              </th>
              <th className="sticky top-0 z-10 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 py-2.5 px-4 text-right">
                {t.dashboard.tableColActions}
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                onClick={() => onOpen(project)}
                className="group hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <td className="py-2.5 px-4 border-b border-slate-100 dark:border-zinc-800/70 group-last:border-b-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <DbEngineIcon engine={project.db_engine} className="w-4 h-4 shrink-0" />
                    <span className="font-semibold text-sm text-slate-900 dark:text-zinc-100 group-hover:text-app-accent-text transition-colors truncate">
                      {project.name}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-4 whitespace-nowrap border-b border-slate-100 dark:border-zinc-800/70 group-last:border-b-0">
                  <span
                    className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded border ${getEngineBadgeColor(
                      project.db_engine
                    )}`}
                  >
                    {project.db_engine}
                  </span>
                </td>
                <td className="py-2.5 px-4 hidden sm:table-cell whitespace-nowrap text-xs text-slate-500 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800/70 group-last:border-b-0">
                  {formatProjectDate(project.created_at, dateLocale)}
                </td>
                <td className="py-2.5 px-4 border-b border-slate-100 dark:border-zinc-800/70 group-last:border-b-0">
                  <div className="flex items-center justify-end gap-3">
                    <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-app-accent-text opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                      <span>{t.dashboard.open}</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                    <ProjectActionButtons
                      onEdit={() => onEdit(project)}
                      onDelete={() => onDelete(project)}
                      editTitle={t.dashboard.editProjectTitle}
                      deleteTitle={t.dashboard.deleteProjectTitle}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProjectDashboard() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentProjectIds, setRecentProjectIds] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<ProjectsViewMode>(getStoredProjectsViewMode);
  const [searchQuery, setSearchQuery] = useState("");
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

  const handleChangeViewMode = (mode: ProjectsViewMode) => {
    setViewMode(mode);
    storeProjectsViewMode(mode);
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

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) => project.name.toLowerCase().includes(query));
  }, [projects, searchQuery]);

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col transition-colors">
      {/* Barra de navegación superior */}
      <nav className="h-14 shrink-0 border-b border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 backdrop-blur px-8 flex items-center justify-between z-20">
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
      <main className="flex-1 min-h-0 max-w-5xl w-full mx-auto px-8 pt-8 pb-0 flex flex-col gap-7 overflow-hidden">
        {/* Cabecera de la sección */}
        <div className="shrink-0 border-b border-slate-200 dark:border-zinc-800 pb-5">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
            {t.dashboard.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            {t.dashboard.subtitle}
          </p>
        </div>

        {/* Sección 1: Botón de registrar y los últimos 2 proyectos a los que se accedió */}
        <section aria-labelledby="quick-access-heading" className="shrink-0 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3
              id="quick-access-heading"
              className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400"
            >
              {t.dashboard.quickAccessTitle}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* Sección 2: Todos los proyectos registrados debajo (con scroll exclusivo) */}
        <section aria-labelledby="registered-projects-heading" className="flex-1 min-h-0 flex flex-col gap-3.5 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
            <h3
              id="registered-projects-heading"
              className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400"
            >
              {t.dashboard.registeredProjectsTitle(filteredProjects.length)}
            </h3>

            <div className="flex items-center gap-2">
              {/* Buscador por título de proyecto */}
              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.dashboard.searchPlaceholder}
                  aria-label={t.dashboard.searchPlaceholder}
                  className="h-8 pl-8 pr-7 text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label={t.dashboard.clearSearch}
                    title={t.dashboard.clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Selector de formato de vista (Cuadrícula, Lista, Tabla) */}
              <div
                role="group"
                aria-label={t.dashboard.viewModeLabel}
                className="inline-flex items-center gap-0.5 p-0.5 h-8 rounded-lg bg-slate-200/70 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shrink-0"
              >
                {(
                  [
                    { id: "grid" as const, icon: LayoutGrid, label: t.dashboard.viewGrid },
                    { id: "list" as const, icon: List, label: t.dashboard.viewList },
                    { id: "table" as const, icon: Table2, label: t.dashboard.viewTable },
                  ] as const
                ).map(({ id, icon: Icon, label }) => {
                  const active = viewMode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={active}
                      aria-label={label}
                      title={label}
                      onClick={() => handleChangeViewMode(id)}
                      className={`h-full w-7 inline-flex items-center justify-center rounded-md transition-all cursor-pointer ${
                        active
                          ? "bg-white dark:bg-zinc-800 text-app-accent-text shadow-xs"
                          : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {!isLoading && filteredProjects.length > 0 && viewMode === "table" ? (
            <div className="flex-1 min-h-0 pb-8 flex flex-col">
              <ProjectTableView
                projects={filteredProjects}
                onOpen={handleOpenProject}
                onEdit={setEditingProject}
                onDelete={setDeletingProject}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto -mr-3 pr-3 pt-0.5 pb-8">
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
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 dark:border-zinc-800/80 rounded-lg p-8 text-slate-500 dark:text-zinc-400 space-y-3">
                  <p className="text-sm font-medium">
                    {t.dashboard.noSearchResults(searchQuery.trim())}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="h-8 text-xs cursor-pointer"
                  >
                    {t.dashboard.clearSearch}
                  </Button>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={() => handleOpenProject(project)}
                      onEdit={() => setEditingProject(project)}
                      onDelete={() => setDeletingProject(project)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredProjects.map((project) => (
                    <ProjectListItem
                      key={project.id}
                      project={project}
                      onOpen={() => handleOpenProject(project)}
                      onEdit={() => setEditingProject(project)}
                      onDelete={() => setDeletingProject(project)}
                    />
                  ))}
                </div>
              )}
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
