import { useState, useEffect, useRef } from "react";
import { Plus, Database, Trash2, ArrowRight, Sparkles, ChevronDown, Check } from "lucide-react";
import { getProjects, createProject, deleteProject, type Project } from "@/db/database";
import { useDiagramStore } from "@/store/useDiagramStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const DB_ENGINES = [
  { value: "postgres", label: "PostgreSQL", badge: "PG", color: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
  { value: "mysql", label: "MySQL", badge: "MY", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { value: "sqlite", label: "SQLite", badge: "SQ", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  { value: "mssql", label: "SQL Server", badge: "MS", color: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
] as const;

type EngineType = (typeof DB_ENGINES)[number]["value"];

export function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [engine, setEngine] = useState<EngineType>("postgres");
  const [isEngineOpen, setIsEngineOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const { setActiveProject } = useDiagramStore();

  const selectedEngine = DB_ENGINES.find((e) => e.value === engine) || DB_ENGINES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsEngineOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col transition-colors">
      {/* Barra de navegación superior */}
      <nav className="h-14 border-b border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 backdrop-blur px-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Power Diagram" className="w-7 h-7 rounded-lg object-contain shadow-sm" />
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-zinc-100">Power Diagram</h1>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400">ERD Studio & SQL Architect</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-8 space-y-8">
        {/* Banner de bienvenida y creación */}
        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-gradient-to-r from-white to-slate-100/60 dark:from-zinc-900 dark:to-zinc-900/40 p-6 shadow-sm dark:shadow-none">
          <div className="max-w-2xl space-y-2 mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Modelado SQL Profesional</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Crear un Nuevo Diagrama ERD</h2>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              Diseña la arquitectura de tu base de datos escribiendo código DBML o arrastrando tablas en el lienzo interactivo.
            </p>
          </div>

          <form onSubmit={handleCreate} className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Nombre del proyecto (ej. Sistema de Facturación)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 min-w-[260px] bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-sm h-10 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-sm"
              required
            />

            {/* Custom Dropdown para el Motor de Base de Datos */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsEngineOpen(!isEngineOpen)}
                className="h-10 px-3 bg-white dark:bg-zinc-950 hover:bg-slate-50 dark:hover:bg-zinc-900 border border-slate-300 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 text-xs rounded-md flex items-center gap-2.5 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
              >
                <span className={`text-[10px] font-mono px-1 py-0.2 rounded border ${selectedEngine.color}`}>
                  {selectedEngine.badge}
                </span>
                <span className="font-medium text-xs text-slate-800 dark:text-zinc-200">{selectedEngine.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 transition-transform ${isEngineOpen ? "rotate-180" : ""}`} />
              </button>

              {isEngineOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-2xl p-1 z-30 space-y-0.5 animate-in fade-in-50 zoom-in-95 duration-100">
                  {DB_ENGINES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setEngine(item.value);
                        setIsEngineOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-md transition-colors ${
                        engine === item.value
                          ? "bg-indigo-50 text-indigo-600 font-semibold dark:bg-indigo-600/20 dark:text-indigo-300"
                          : "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-100"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-mono px-1 py-0.2 rounded border ${item.color}`}>
                          {item.badge}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      {engine === item.value && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="h-10 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>{isCreating ? "Creando..." : "Crear Proyecto"}</span>
            </Button>
          </form>
        </div>

        {/* Sección de proyectos existentes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Proyectos Registrados ({projects.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-slate-500 dark:text-zinc-500 text-sm">
              Cargando proyectos desde SQLite...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-300 dark:border-zinc-800 rounded-xl bg-slate-100/50 dark:bg-zinc-900/20">
              <Database className="w-10 h-10 mx-auto text-slate-400 dark:text-zinc-600 mb-3" />
              <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">No hay proyectos creados aún</p>
              <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">
                Escribe un nombre arriba para crear tu primer diagrama ERD.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => setActiveProject(project)}
                  className="group relative rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:border-indigo-400 dark:hover:border-indigo-500/50 p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md dark:shadow-lg dark:hover:shadow-indigo-500/5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700/50">
                        {project.db_engine}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDelete(project.id, e)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-500 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded"
                        title="Eliminar proyecto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
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
    </div>
  );
}

