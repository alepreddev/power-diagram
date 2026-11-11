import { useState, useEffect } from "react";
import { Database, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { updateProject, type Project } from "@/db/database";
import {
  DB_ENGINES,
  ProjectFormFields,
  type EngineType,
} from "./CreateProjectModal";

interface EditProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSuccess: (updatedProject: Project) => void;
}

/** Modal para renombrar un proyecto o cambiar su motor SQL asignado. */
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
    if (project && open) {
      setName(project.name);
      const normalized = project.db_engine?.toLowerCase();
      const matched = DB_ENGINES.find((item) => item.value === normalized);
      setEngine(matched ? matched.value : "postgres");
    }
  }, [project, open]);

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
      <DialogContent className="w-[92vw] max-w-lg sm:max-w-lg bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 shadow-2xl p-6 pb-5">
        <DialogHeader className="pr-10 pb-3 border-b border-slate-200 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
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

        <form onSubmit={handleSubmit} className="space-y-5 pt-3">
          <ProjectFormFields
            name={name}
            onNameChange={setName}
            engine={engine}
            onEngineChange={setEngine}
            placeholder="Nombre del proyecto"
          />

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
              disabled={isSaving || !name.trim()}
              className="h-9 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Guardando..." : "Guardar Cambios"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
