import { useState, useEffect } from "react";
import { Database, Check } from "lucide-react";
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
import { updateProject, type Project } from "@/db/database";
import { DB_ENGINES, type EngineType } from "./CreateProjectModal";

interface EditProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSuccess: (updatedProject: Project) => void;
}

export function EditProjectModal({
  open,
  onOpenChange,
  project,
  onSuccess,
}: EditProjectModalProps) {
  const [name, setName] = useState("");
  const [engine, setEngine] = useState<EngineType>("postgres");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setEngine((project.db_engine as EngineType) || "postgres");
    }
  }, [project]);

  if (!project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || isSaving) return;

    try {
      setIsSaving(true);
      await updateProject(project.id, cleanName, engine);
      onOpenChange(false);
      onSuccess({
        ...project,
        name: cleanName,
        db_engine: engine,
      });
    } catch (err) {
      console.error("Error al actualizar proyecto:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-xl sm:max-w-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 shadow-2xl p-6 pb-5">
        <DialogHeader className="pr-10 pb-3 border-b border-slate-200 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
                Editar Base de Datos
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Modifica el nombre o el motor asignado a tu proyecto de base de datos.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          {/* Nombre del proyecto */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Nombre del Proyecto / Base de Datos
            </label>
            <Input
              placeholder="Nombre del proyecto"
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
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${item.color}`}
                        >
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
              disabled={isSaving || !name.trim()}
              className="h-9 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md gap-1.5"
            >
              <span>{isSaving ? "Guardando..." : "Guardar Cambios"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
