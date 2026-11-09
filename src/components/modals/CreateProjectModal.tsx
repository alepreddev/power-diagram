import { useState } from "react";
import { Database, Plus, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProject, type Project } from "@/db/database";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newProject: Project) => void;
}

export const DB_ENGINES = [
  {
    value: "postgres",
    label: "PostgreSQL",
    badge: "PG",
    desc: "Relacional avanzado con soporte JSON y extensiones",
    color: "text-sky-500 bg-sky-500/10 border-sky-500/30",
    activeBorder: "border-sky-500 ring-1 ring-sky-500/30 bg-sky-50/50 dark:bg-sky-950/20",
  },
  {
    value: "mysql",
    label: "MySQL",
    badge: "MY",
    desc: "Rápido, confiable y ampliamente utilizado en la web",
    color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
    activeBorder: "border-amber-500 ring-1 ring-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20",
  },
  {
    value: "sqlite",
    label: "SQLite",
    badge: "SQ",
    desc: "Embebido, sin servidor y ligero en un solo archivo",
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
    activeBorder: "border-emerald-500 ring-1 ring-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20",
  },
  {
    value: "mssql",
    label: "SQL Server",
    badge: "MS",
    desc: "Motor empresarial de Microsoft con soporte T-SQL",
    color: "text-rose-500 bg-rose-500/10 border-rose-500/30",
    activeBorder: "border-rose-500 ring-1 ring-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20",
  },
] as const;

export type EngineType = (typeof DB_ENGINES)[number]["value"];

export function CreateProjectModal({ open, onOpenChange, onSuccess }: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [engine, setEngine] = useState<EngineType>("postgres");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || isCreating) return;

    try {
      setIsCreating(true);
      const created = await createProject(cleanName, engine);
      setName("");
      setEngine("postgres");
      onOpenChange(false);
      onSuccess({
        id: created.id,
        name: created.name,
        db_engine: created.db_engine,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Error al crear proyecto:", err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-xl sm:max-w-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 shadow-2xl p-6">
        <DialogHeader className="pr-10 pb-3 border-b border-slate-200 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
                Crear Nuevo Proyecto ERD
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Define el nombre y el motor para inicializar tu nuevo esquema de base de datos.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Nombre del proyecto */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Nombre del Proyecto / Base de Datos
            </label>
            <Input
              placeholder="ej. Sistema de Facturación, E-commerce, CRM Ventas"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs h-10 w-full shadow-sm"
              autoFocus
              required
            />
          </div>

          {/* Selector de Motor de Base de Datos en cuadrícula */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Motor de Base de Datos
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DB_ENGINES.map((item) => {
                const isSelected = engine === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setEngine(item.value)}
                    className={`text-left p-3 rounded-lg border transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                      isSelected
                        ? item.activeBorder
                        : "border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 hover:bg-slate-100/70 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${item.color}`}>
                          {item.badge}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                          {item.label}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                      {item.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="h-9 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isCreating ? "Creando..." : "Crear Proyecto"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
