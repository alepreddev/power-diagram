import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  onConfirm: () => void | Promise<void>;
}

/** Modal de confirmación para acciones destructivas (eliminar proyectos o tablas). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  isConfirming = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-md sm:max-w-md bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 shadow-2xl p-6 pb-5">
        <DialogHeader className="items-center text-center px-6 pb-4 border-b border-slate-200 dark:border-zinc-800/80 gap-3">
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
            {title}
          </DialogTitle>
          <div className="p-2.5 rounded-xl dark:border-zinc-700 text-slate-500 dark:text-zinc-400">
            <Trash2 className="w-5 h-5" />
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-row items-center justify-center sm:justify-center gap-2.5 pt-3">
          <Button
            type="button"
            variant="ghost"
            disabled={isConfirming}
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={isConfirming}
            onClick={onConfirm}
            className="h-9 px-5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isConfirming ? "Eliminando..." : confirmLabel}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
