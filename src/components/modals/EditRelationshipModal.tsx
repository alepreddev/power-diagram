import { useState, useEffect } from "react";
import { GitFork, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useTranslation } from "@/store/useSettingsStore";
import type { RelationshipType, TableEdge } from "@/lib/dbmlParser";

interface EditRelationshipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  edge: TableEdge | null;
}

const CARDINALITIES: readonly RelationshipType[] = ["1:1", "1:n", "n:1", "n:m"];
const ACTION_NONE = "__none__";
const REFERENTIAL_ACTIONS = [
  "no action",
  "restrict",
  "cascade",
  "set null",
  "set default",
] as const;

export function EditRelationshipModal({
  open,
  onOpenChange,
  edge,
}: EditRelationshipModalProps) {
  const { updateEdge, deleteEdge } = useDiagramStore();
  const { t } = useTranslation();

  const [cachedEdge, setCachedEdge] = useState<TableEdge | null>(edge);
  const [relationType, setRelationType] = useState<RelationshipType>("1:n");
  const [onDelete, setOnDelete] = useState<string>(ACTION_NONE);
  const [onUpdate, setOnUpdate] = useState<string>(ACTION_NONE);

  useEffect(() => {
    if (edge) {
      setCachedEdge(edge);
      setRelationType(edge.data?.relationType || "1:n");
      setOnDelete(edge.data?.onDelete || ACTION_NONE);
      setOnUpdate(edge.data?.onUpdate || ACTION_NONE);
    }
  }, [edge, open]);

  const targetEdge = edge || cachedEdge;
  if (!targetEdge) return null;

  const sourceCol = targetEdge.data?.sourceColumn || "";
  const targetCol = targetEdge.data?.targetColumn || "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateEdge(
      targetEdge.id,
      relationType,
      onDelete === ACTION_NONE ? undefined : onDelete,
      onUpdate === ACTION_NONE ? undefined : onUpdate
    );
    onOpenChange(false);
  };

  const handleDelete = () => {
    deleteEdge(targetEdge.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-lg sm:max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 shadow-2xl p-6 pb-5">
        <DialogHeader className="pr-10 pb-1">
          <div className="flex items-center gap-2">
            <GitFork className="w-5 h-5 text-app-accent-text" />
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
              {t.modals.relationshipModal.title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
            {t.modals.relationshipModal.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Extremos conectados */}
          <div className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono">
            <span className="font-semibold text-slate-800 dark:text-zinc-100 truncate">
              {targetEdge.source}.{sourceCol}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-app-accent text-app-accent-contrast text-[11px] font-bold shrink-0">
              {relationType}
            </span>
            <span className="font-semibold text-slate-800 dark:text-zinc-100 truncate">
              {targetEdge.target}.{targetCol}
            </span>
          </div>

          {/* Cardinalidad */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
              {t.modals.relationshipModal.cardinalityLabel}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CARDINALITIES.map((card) => {
                const active = relationType === card;
                const copy = t.modals.relationshipModal.cardinalityOptions[card];
                return (
                  <button
                    key={card}
                    type="button"
                    onClick={() => setRelationType(card)}
                    className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                      active
                        ? "bg-app-accent-subtle border-app-accent-border ring-1 ring-app-accent-ring"
                        : "bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div
                      className={`text-sm font-mono font-bold ${
                        active ? "text-app-accent-text" : "text-slate-800 dark:text-zinc-200"
                      }`}
                    >
                      {copy.label}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      {copy.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Acciones Referenciales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                {t.modals.relationshipModal.onDeleteLabel}
              </label>
              <Select value={onDelete} onValueChange={setOnDelete}>
                <SelectTrigger className="w-full h-9 text-xs bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ACTION_NONE}>
                    {t.modals.relationshipModal.actionDefault}
                  </SelectItem>
                  {REFERENTIAL_ACTIONS.map((action) => (
                    <SelectItem key={action} value={action} className="font-mono uppercase">
                      {action.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                {t.modals.relationshipModal.onUpdateLabel}
              </label>
              <Select value={onUpdate} onValueChange={setOnUpdate}>
                <SelectTrigger className="w-full h-9 text-xs bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ACTION_NONE}>
                    {t.modals.relationshipModal.actionDefault}
                  </SelectItem>
                  {REFERENTIAL_ACTIONS.map((action) => (
                    <SelectItem key={action} value={action} className="font-mono uppercase">
                      {action.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              className="h-9 px-3.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/10 gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.modals.relationshipModal.deleteRelationBtn}</span>
            </Button>

            <div className="flex items-center gap-2.5 self-end sm:self-auto">
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
                className="h-9 px-5 bg-app-accent hover:bg-app-accent-hover text-app-accent-contrast text-xs font-semibold shadow-md cursor-pointer"
              >
                {t.common.saveChanges}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
