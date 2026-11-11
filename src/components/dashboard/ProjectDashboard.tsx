import { useState, useEffect } from "react";
import { Plus, Trash2, ArrowRight, Pencil } from "lucide-react";
import { getProjects, deleteProject, type Project } from "@/db/database";
import { useDiagramStore } from "@/store/useDiagramStore";
import { Button } from "@/components/ui/button";
import { DashboardOptionsMenu } from "./DashboardOptionsMenu";
import { CreateProjectModal } from "@/components/modals/CreateProjectModal";
import { EditProjectModal } from "@/components/modals/EditProjectModal";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";

export function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    loadProjects();
  }, []);

  const handleProjectCreated = (newProject: Project) => {
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
      setDeletingProject(null);
    } catch (err) {
      console.error("Error al eliminar proyecto:", err);
    } finally {
      setIsDeleting(false);
    }
  };

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
              {/* <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30">
                v{__APP_VERSION__}
              </span> */}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400">ERD Studio & SQL Architect</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DashboardOptionsMenu />
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-8 space-y-6">
        {/* Cabecera de la sección */}
        <div className="border-b border-slate-200 dark:border-zinc-800 pb-5">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
            Mis Bases de Datos
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Administra tus diagramas relacionales, esquemas DBML y arquitecturas de datos.
          </p>
        </div>

        {/* Sección de proyectos existentes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Proyectos Registrados ({projects.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="text-center py-16 text-slate-500 dark:text-zinc-500 text-sm">
              Cargando proyectos desde SQLite...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tarjeta interactiva para crear nueva base de datos */}
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="group border border-dashed border-slate-300 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-400 bg-white/40 dark:bg-zinc-900/30 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 rounded-lg p-5 flex flex-col items-center justify-center gap-2.5 transition-all text-slate-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer min-h-[140px]"
              >
                <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-zinc-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 flex items-center justify-center transition-colors">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-semibold block">Nueva Base de Datos</span>
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500">Diseñar nuevo esquema ERD</span>
                </div>
              </button>

              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => setActiveProject(project)}
                  className="group relative rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:border-indigo-400 dark:hover:border-indigo-500/50 p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md dark:shadow-lg dark:hover:shadow-indigo-500/5 flex flex-col justify-between min-h-[140px]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded border ${getEngineBadgeColor(project.db_engine)}`}>
                        {project.db_engine}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProject(project);
                          }}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:text-zinc-500 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 rounded"
                          title="Editar proyecto"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingProject(project);
                          }}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-500 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded"
                          title="Eliminar proyecto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <h4 className="font-semibold text-sm text-slate-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                      {project.name}
                    </h4>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-500">
                    <span>
                      {new Date(project.created_at).toLocaleDateString([], {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                      <span>Abrir</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
        title="Eliminar Base de Datos"
        description={`¿Estás seguro de que deseas eliminar "${deletingProject?.name ?? ""}" y su diagrama? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        isConfirming={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
