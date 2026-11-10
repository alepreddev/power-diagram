import { useState } from "react";
import { Database, Plus, ChevronDown } from "lucide-react";
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
  { value: "postgres", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "sqlite", label: "SQLite" },
  { value: "mssql", label: "SQL Server" },
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
      <DialogContent className="w-[92vw] max-w-lg sm:max-w-lg bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 shadow-2xl p-6 pb-5">
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

        <form onSubmit={handleSubmit} className="space-y-5 pt-3">
          {/* Nombre del proyecto */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
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

          {/* Selector de Motor de Base de Datos */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Motor de Base de Datos
            </label>
            <div className="relative">
              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value as EngineType)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs rounded-md px-3 pr-9 h-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium shadow-sm cursor-pointer appearance-none"
              >
                {DB_ENGINES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 dark:text-zinc-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
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
