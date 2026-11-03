import { useState, useEffect } from "react";
import { Plus, Database, Trash2, ArrowRight, Layers, Sparkles } from "lucide-react";
import { getProjects, createProject, deleteProject, type Project } from "@/db/database";
import { useDiagramStore } from "@/store/useDiagramStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [engine, setEngine] = useState<"postgres" | "mysql" | "sqlite" | "mssql">("postgres");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isCreating) return;

    try {
      setIsCreating(true);
      const newProj = await createProject(name.trim(), engine);
      setName("");
      await loadProjects();
      // Abrir inmediatamente el nuevo proyecto en el workspace
      setActiveProject({
        id: newProj.id,
        name: newProj.name,
        db_engine: newProj.db_engine,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Error al crear proyecto:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("¿Estás seguro de que deseas eliminar este proyecto y su diagrama?")) {
      await deleteProject(id);
      await loadProjects();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Barra de navegación superior */}
      <nav className="h-14 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur px-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Power Diagram</h1>
            <span className="text-[10px] text-zinc-400">ERD Studio & SQL Architect</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>SQLite Local Activo</span>
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-8 space-y-8">
        {/* Banner de bienvenida y creación */}
        <div className="rounded-xl border border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-900/40 p-6">
          <div className="max-w-2xl space-y-2 mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Modelado SQL Profesional</span>
            </div>
            <h2 className="text-xl font-bold text-zinc-100">Crear un Nuevo Diagrama ERD</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Diseña la arquitectura de tu base de datos escribiendo código DBML o arrastrando tablas en el lienzo interactivo.
            </p>
          </div>

          <form onSubmit={handleCreate} className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Nombre del proyecto (ej. Sistema de Facturación)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 min-w-[260px] bg-zinc-950 border-zinc-800 text-sm h-10 text-zinc-100 placeholder:text-zinc-500"
              required
            />

            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value as any)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-md px-3 h-10 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="postgres">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="sqlite">SQLite</option>
              <option value="mssql">SQL Server</option>
            </select>

            <Button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="h-10 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isCreating ? "Creando..." : "Crear Proyecto"}</span>
            </Button>
          </form>
        </div>

        {/* Sección de proyectos existentes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Proyectos Registrados ({projects.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-zinc-500 text-sm">
              Cargando proyectos desde SQLite...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
              <Database className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
              <p className="text-sm font-medium text-zinc-300">No hay proyectos creados aún</p>
              <p className="text-xs text-zinc-500 mt-1">
                Escribe un nombre arriba para crear tu primer diagrama ERD.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => setActiveProject(project)}
                  className="group relative rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-indigo-500/50 p-4 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-indigo-500/5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                        {project.db_engine}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDelete(project.id, e)}
                        className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded"
                        title="Eliminar proyecto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <h4 className="font-semibold text-sm text-zinc-100 group-hover:text-indigo-400 transition-colors truncate">
                      {project.name}
                    </h4>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>
                      {new Date(project.created_at).toLocaleDateString([], {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
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
    </div>
  );
}

