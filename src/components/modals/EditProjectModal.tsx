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
import { useTranslation } from "@/store/useSettingsStore";
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
  const [activeProject, setActiveProject] = useState<Project | null>(project);
  const [name, setName] = useState("");
  const [engine, setEngine] = useState<EngineType>("postgres");
  const [isSaving, setIsSaving] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (project) {
      setActiveProject(project);
      setName(project.name);
      const normalized = project.db_engine?.toLowerCase();
      const matched = DB_ENGINES.find((item) => item.value === normalized);
      setEngine(matched ? matched.value : "postgres");
    }
  }, [project, open]);

  const targetProject = project || activeProject;
  if (!targetProject) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || isSaving) return;

    try {
      setIsSaving(true);
      await updateProject(targetProject.id, cleanName, engine);
      onOpenChange(false);
      onSuccess({
        ...targetProject,
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
      <DialogContent className="w-[92vw] max-w-lg sm:max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 shadow-2xl p-6 pb-5">
        <DialogHeader className="pr-10 pb-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg text-app-accent-text">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
                {t.modals.editProject.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {t.modals.editProject.description}
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
            placeholder={t.modals.projectForm.editNamePlaceholder}
          />

          <DialogFooter className="flex flex-row items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="h-9 px-5 bg-app-accent hover:bg-app-accent-hover text-app-accent-contrast text-xs font-semibold shadow-md gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? t.common.saving : t.common.saveChanges}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
