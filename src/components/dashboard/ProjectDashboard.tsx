import { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  Trash2,
  ArrowRight,
  Pencil,
  Copy,
  Download,
  Upload,
  LayoutGrid,
  List,
  Table2,
  Search,
  X,
  ArrowUpDown,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  getProjects,
  deleteProject,
  duplicateProject,
  createProjectWithDiagram,
  getDiagramByProjectId,
  type Project,
} from "@/db/database";
import {
  exportProjectAsPdiag,
  parseImportedDiagramFile,
} from "@/lib/projectBackup";
import type { CanvasPositions } from "@/lib/dbmlParser";
import { useDiagramStore } from "@/store/useDiagramStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DbEngineIcon } from "@/components/ui/DbEngineSelect";
import { DashboardOptionsMenu } from "./DashboardOptionsMenu";
import { CreateProjectModal } from "@/components/modals/CreateProjectModal";
import { EditProjectModal } from "@/components/modals/EditProjectModal";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { useTranslation } from "@/store/useSettingsStore";

const RECENT_PROJECTS_KEY = "power_diagram_recent_projects";
const PROJECTS_VIEW_MODE_KEY = "power_diagram_projects_view_mode";
const PROJECTS_SORT_BY_KEY = "power_diagram_projects_sort_by";

type ProjectsViewMode = "grid" | "list" | "table";
type EngineFilter = "all" | "postgres" | "mysql" | "sqlite" | "mssql";
type SortCriterion = "updated" | "created" | "name" | "tables";

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

function getStoredSortBy(): SortCriterion {
  try {
    const raw = localStorage.getItem(PROJECTS_SORT_BY_KEY);
    if (raw === "updated" || raw === "created" || raw === "name" || raw === "tables") {
      return raw;
    }
  } catch {
    // ignorar
  }
  return "updated";
}

function storeSortBy(sort: SortCriterion) {
  try {
    localStorage.setItem(PROJECTS_SORT_BY_KEY, sort);
  } catch {
    // ignorar
  }
}

function parseSqliteDate(raw?: string): Date {
  if (!raw) return new Date(0);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) {
    return new Date(`${raw.replace(" ", "T")}Z`);
  }
  return new Date(raw);
}

function formatProjectDate(rawDate: string | undefined, dateLocale: string): string {
  if (!rawDate) return "—";
  const d = parseSqliteDate(rawDate);
  if (Number.isNaN(d.getTime())) return rawDate;
  return d.toLocaleDateString(dateLocale, {
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
  onDuplicate: () => void;
  onExportBackup: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** Botones de acción (exportar respaldo, duplicar, editar y eliminar) reutilizados en las 3 vistas. */
function ProjectActionButtons({
  onDuplicate,
  onExportBackup,
  onEdit,
  onDelete,
  duplicateTitle,
  exportBackupTitle,
  editTitle,
  deleteTitle,
}: {
  onDuplicate: () => void;
  onExportBackup: () => void;
  onEdit: () => void;
  onDelete: () => void;
  duplicateTitle: string;
  exportBackupTitle: string;
  editTitle: string;
  deleteTitle: string;
}) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onExportBackup();
        }}
        className="h-7 w-7 p-0 text-slate-400 hover:text-app-accent-text hover:bg-app-accent-subtle rounded cursor-pointer"
        title={exportBackupTitle}
      >
        <Download className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
        className="h-7 w-7 p-0 text-slate-400 hover:text-app-accent-text hover:bg-app-accent-subtle rounded cursor-pointer"
        title={duplicateTitle}
      >
        <Copy className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="h-7 w-7 p-0 text-slate-400 hover:text-app-accent-text hover:bg-app-accent-subtle rounded cursor-pointer"
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
        className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-500 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded cursor-pointer"
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
  onDuplicate,
  onExportBackup,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  const { t, language } = useTranslation();
  const dateLocale = language === "en" ? "en-US" : "es-ES";
  const tableCount = project.table_count ?? 0;
  const displayDate = formatProjectDate(project.updated_at || project.created_at, dateLocale);

  return (
    <div
      onClick={onOpen}
      className="group relative rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:border-app-accent-border p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[144px]"
    >
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span
              className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded border ${getEngineBadgeColor(
                project.db_engine
              )}`}
            >
              {project.db_engine}
            </span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700/60">
              {t.dashboard.tablesCount(tableCount)}
            </span>
            {badgeLabel && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-app-accent-subtle text-app-accent-text">
                {badgeLabel}
              </span>
            )}
          </div>
          <ProjectActionButtons
            onDuplicate={onDuplicate}
            onExportBackup={onExportBackup}
            onEdit={onEdit}
            onDelete={onDelete}
            duplicateTitle={t.dashboard.duplicateProjectTitle}
            exportBackupTitle={t.dashboard.exportBackupTitle}
            editTitle={t.dashboard.editProjectTitle}
            deleteTitle={t.dashboard.deleteProjectTitle}
          />
        </div>

        <h4 className="font-semibold text-sm text-slate-900 dark:text-zinc-100 group-hover:text-app-accent-text transition-colors truncate">
          {project.name}
        </h4>
      </div>

      <div className="mt-4 pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-500">
        <span>
          {t.dashboard.updatedPrefix} {displayDate}
        </span>
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
  onDuplicate,
  onExportBackup,
  onEdit,
  onDelete,
}: Omit<ProjectCardProps, "badgeLabel">) {
  const { t, language } = useTranslation();
  const dateLocale = language === "en" ? "en-US" : "es-ES";
  const tableCount = project.table_count ?? 0;
  const displayDate = formatProjectDate(project.updated_at || project.created_at, dateLocale);

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
        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700/60 shrink-0">
          {t.dashboard.tablesCount(tableCount)}
        </span>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <span className="hidden sm:inline text-[11px] text-slate-500 dark:text-zinc-500">
          {t.dashboard.updatedPrefix} {displayDate}
        </span>
        <span className="hidden md:flex items-center gap-1 text-[11px] text-app-accent-text opacity-0 group-hover:opacity-100 transition-opacity font-medium">
          <span>{t.dashboard.open}</span>
          <ArrowRight className="w-3 h-3" />
        </span>
        <ProjectActionButtons
          onDuplicate={onDuplicate}
          onExportBackup={onExportBackup}
          onEdit={onEdit}
          onDelete={onDelete}
          duplicateTitle={t.dashboard.duplicateProjectTitle}
          exportBackupTitle={t.dashboard.exportBackupTitle}
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
  onDuplicate,
  onExportBackup,
  onEdit,
  onDelete,
}: {
  projects: Project[];
  onOpen: (project: Project) => void;
  onDuplicate: (project: Project) => void;
  onExportBackup: (project: Project) => void;
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
                {t.dashboard.tableColTables}
              </th>
              <th className="sticky top-0 z-10 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 py-2.5 px-4 hidden md:table-cell">
                {t.dashboard.tableColUpdated}
              </th>
              <th className="sticky top-0 z-10 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 py-2.5 px-4 hidden lg:table-cell">
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
                <td className="py-2.5 px-4 hidden sm:table-cell whitespace-nowrap border-b border-slate-100 dark:border-zinc-800/70 group-last:border-b-0">
                  <span className="text-xs font-mono text-slate-600 dark:text-zinc-300">
                    {project.table_count ?? 0}
                  </span>
                </td>
                <td className="py-2.5 px-4 hidden md:table-cell whitespace-nowrap text-xs text-slate-500 dark:text-zinc-400 border-b border-slate-100 dark:border-zinc-800/70 group-last:border-b-0">
                  {formatProjectDate(project.updated_at || project.created_at, dateLocale)}
                </td>
                <td className="py-2.5 px-4 hidden lg:table-cell whitespace-nowrap text-xs text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800/70 group-last:border-b-0">
                  {formatProjectDate(project.created_at, dateLocale)}
                </td>
                <td className="py-2.5 px-4 border-b border-slate-100 dark:border-zinc-800/70 group-last:border-b-0">
                  <div className="flex items-center justify-end gap-2.5">
                    <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-app-accent-text opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                      <span>{t.dashboard.open}</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                    <ProjectActionButtons
                      onDuplicate={() => onDuplicate(project)}
                      onExportBackup={() => onExportBackup(project)}
                      onEdit={() => onEdit(project)}
                      onDelete={() => onDelete(project)}
                      duplicateTitle={t.dashboard.duplicateProjectTitle}
                      exportBackupTitle={t.dashboard.exportBackupTitle}
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
  const [engineFilter, setEngineFilter] = useState<EngineFilter>("all");
  const [sortBy, setSortBy] = useState<SortCriterion>(getStoredSortBy);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [cachedDeletingProject, setCachedDeletingProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

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
      prev.map((p) => (p.id === updatedProject.id ? { ...p, ...updatedProject } : p))
    );
    setEditingProject(null);
  };

  const handleDuplicateProject = async (project: Project) => {
    try {
      const copyName = `${project.name} (${t.dashboard.copySuffix})`;
      const cloned = await duplicateProject(project.id, copyName);
      setProjects((prev) => [cloned, ...prev]);
    } catch (err) {
      console.error("Error al duplicar diagrama:", err);
    }
  };

  const handleExportProjectBackup = async (project: Project) => {
    try {
      const diagram = await getDiagramByProjectId(project.id);
      let positions: CanvasPositions = {};
      if (diagram?.canvas_json) {
        try {
          positions = JSON.parse(diagram.canvas_json) as CanvasPositions;
        } catch {
          positions = {};
        }
      }
      await exportProjectAsPdiag(project, diagram?.dbml_code ?? "", positions);
    } catch (err) {
      console.error("Error al exportar respaldo del diagrama:", err);
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImportError(null);
    setIsImporting(true);

    try {
      const rawContent = await file.text();
      const imported = await parseImportedDiagramFile(file.name, rawContent);
      const created = await createProjectWithDiagram(
        imported.name,
        imported.dbEngine,
        imported.dbmlCode,
        JSON.stringify(imported.canvasPositions)
      );
      const updatedRecent = storeRecentProjectAccess(created.id);
      setRecentProjectIds(updatedRecent);
      await loadProjects();
      setActiveProject(created);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "EMPTY_FILE") {
        setImportError(t.dashboard.importErrorEmpty);
      } else if (code === "INVALID_JSON") {
        setImportError(t.dashboard.importErrorInvalidJson);
      } else if (code === "INVALID_BACKUP_SCHEMA") {
        setImportError(t.dashboard.importErrorInvalidSchema);
      } else {
        setImportError(err instanceof Error ? err.message : t.dashboard.importErrorInvalidSchema);
      }
    } finally {
      setIsImporting(false);
    }
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

  const handleChangeSortBy = (nextSort: SortCriterion) => {
    setSortBy(nextSort);
    storeSortBy(nextSort);
  };

  /**
   * Obtiene los últimos 2 proyectos a los que se accedió.
   * Si no hay suficientes accesos en historial, completa con los proyectos registrados existentes.
   */
  const recentProjects = useMemo(() => {
    if (projects.length === 0) return [];
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const result: Project[] = [];

    for (const id of recentProjectIds) {
      const found = projectMap.get(id);
      if (found) {
        result.push(found);
        if (result.length === 2) break;
      }
    }

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

    const matches = projects.filter((project) => {
      if (engineFilter !== "all" && project.db_engine.toLowerCase() !== engineFilter) {
        return false;
      }
      if (query && !project.name.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });

    return [...matches].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }
      if (sortBy === "tables") {
        const diff = (b.table_count ?? 0) - (a.table_count ?? 0);
        if (diff !== 0) return diff;
      }
      if (sortBy === "created") {
        const diff =
          parseSqliteDate(b.created_at).getTime() - parseSqliteDate(a.created_at).getTime();
        if (diff !== 0) return diff;
        return b.id - a.id;
      }
      // Default: "updated"
      const diff =
        parseSqliteDate(b.updated_at || b.created_at).getTime() -
        parseSqliteDate(a.updated_at || a.created_at).getTime();
      if (diff !== 0) return diff;
      return b.id - a.id;
    });
  }, [projects, searchQuery, engineFilter, sortBy]);

  const resetAllFilters = () => {
    setSearchQuery("");
    setEngineFilter("all");
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col transition-colors">
      {/* Input oculto para importar archivos .pdiag.json o .dbml */}
      <input
        ref={importFileInputRef}
        type="file"
        accept=".json,.dbml"
        onChange={handleImportFileChange}
        className="hidden"
      />

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
      <main className="flex-1 min-h-0 max-w-5xl w-full mx-auto px-8 pt-8 pb-0 flex flex-col gap-6 overflow-hidden">
        {/* Cabecera de la sección */}
        <div className="shrink-0 border-b border-slate-200 dark:border-zinc-800 pb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              {t.dashboard.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              {t.dashboard.subtitle}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isImporting}
            onClick={() => importFileInputRef.current?.click()}
            title={t.dashboard.importDiagramTooltip}
            className="h-8 gap-1.5 text-xs bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-800 hover:border-app-accent-border hover:bg-app-accent-subtle text-slate-700 dark:text-zinc-200 cursor-pointer"
          >
            {isImporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-app-accent-text" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-app-accent-text" />
            )}
            <span>{t.dashboard.importDiagramTitle}</span>
          </Button>
        </div>

        {importError && (
          <div className="shrink-0 flex items-center justify-between gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-700 dark:text-rose-300">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{importError}</span>
            </div>
            <button
              type="button"
              onClick={() => setImportError(null)}
              className="p-0.5 rounded hover:bg-rose-500/20 cursor-pointer"
              aria-label={t.common.close}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Sección 1: Botón de registrar y los últimos 2 proyectos a los que se accedió */}
        <section aria-labelledby="quick-access-heading" className="shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <h3
              id="quick-access-heading"
              className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400"
            >
              {t.dashboard.quickAccessTitle}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tarjeta interactiva para crear nuevo diagrama */}
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="group border border-dashed border-slate-300 dark:border-zinc-800 hover:border-app-accent-border bg-white/40 dark:bg-zinc-900/30 hover:bg-app-accent-subtle rounded-lg p-5 flex flex-col items-center justify-center gap-2.5 transition-all text-slate-600 dark:text-zinc-400 hover:text-app-accent-text cursor-pointer min-h-[144px]"
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
                onDuplicate={() => handleDuplicateProject(project)}
                onExportBackup={() => handleExportProjectBackup(project)}
                onEdit={() => setEditingProject(project)}
                onDelete={() => setDeletingProject(project)}
              />
            ))}
          </div>
        </section>

        {/* Sección 2: Todos los proyectos registrados debajo (con scroll exclusivo) */}
        <section aria-labelledby="registered-projects-heading" className="flex-1 min-h-0 flex flex-col gap-3.5 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <h3
              id="registered-projects-heading"
              className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400"
            >
              {t.dashboard.registeredProjectsTitle(filteredProjects.length)}
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              {/* Buscador por título de diagrama */}
              <div className="relative w-44 sm:w-52">
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

              {/* Filtro por motor de base de datos */}
              <Select
                value={engineFilter}
                onValueChange={(v) => setEngineFilter(v as EngineFilter)}
              >
                <SelectTrigger
                  aria-label={t.dashboard.filterEngineAria}
                  className="h-8 w-[142px] bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-none"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.dashboard.filterAllEngines}</SelectItem>
                  <SelectItem value="postgres">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="sqlite">SQLite</SelectItem>
                  <SelectItem value="mssql">SQL Server</SelectItem>
                </SelectContent>
              </Select>

              {/* Selector de ordenamiento */}
              <Select
                value={sortBy}
                onValueChange={(v) => handleChangeSortBy(v as SortCriterion)}
              >
                <SelectTrigger
                  aria-label={t.dashboard.sortAria}
                  className="h-8 w-[156px] bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-none"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-zinc-500 shrink-0" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">{t.dashboard.sortUpdated}</SelectItem>
                  <SelectItem value="created">{t.dashboard.sortCreated}</SelectItem>
                  <SelectItem value="name">{t.dashboard.sortName}</SelectItem>
                  <SelectItem value="tables">{t.dashboard.sortTables}</SelectItem>
                </SelectContent>
              </Select>

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
                onDuplicate={handleDuplicateProject}
                onExportBackup={handleExportProjectBackup}
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
                    {searchQuery.trim()
                      ? t.dashboard.noSearchResults(searchQuery.trim())
                      : t.dashboard.noFilterResults}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetAllFilters}
                    className="h-8 text-xs cursor-pointer"
                  >
                    {t.dashboard.clearFilters}
                  </Button>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={() => handleOpenProject(project)}
                      onDuplicate={() => handleDuplicateProject(project)}
                      onExportBackup={() => handleExportProjectBackup(project)}
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
                      onDuplicate={() => handleDuplicateProject(project)}
                      onExportBackup={() => handleExportProjectBackup(project)}
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

      {/* Modal para Crear Nuevo Diagrama */}
      <CreateProjectModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={handleProjectCreated}
      />

      {/* Modal para Editar Diagrama */}
      <EditProjectModal
        open={Boolean(editingProject)}
        onOpenChange={(open) => {
          if (!open) setEditingProject(null);
        }}
        project={editingProject}
        onSuccess={handleProjectUpdated}
      />

      {/* Modal de Confirmación para Eliminar Diagrama */}
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
