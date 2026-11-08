import { useState, useRef, useCallback, useEffect } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { DbmlEditor } from "@/components/editor/DbmlEditor";
import { DiagramCanvas } from "@/components/canvas/DiagramCanvas";
import { EditTableModal } from "@/components/modals/EditTableModal";
import { Button } from "@/components/ui/button";
import { useDiagramStore } from "@/store/useDiagramStore";

const MIN_EDITOR_WIDTH = 280;
const DEFAULT_EDITOR_WIDTH = 420;

export function Workspace() {
  const [isEditorOpen, setIsEditorOpen] = useState(true);
  const [editorWidth, setEditorWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("power_diagram_editor_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_EDITOR_WIDTH) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_EDITOR_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    isResizingRef.current = true;
  }, []);

  const stopResizing = useCallback(() => {
    if (isResizingRef.current) {
      setIsResizing(false);
      isResizingRef.current = false;
    }
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const maxWidth = Math.min(window.innerWidth * 0.75, 900);
    const newWidth = Math.min(Math.max(e.clientX, MIN_EDITOR_WIDTH), maxWidth);
    setEditorWidth(newWidth);
    try {
      localStorage.setItem("power_diagram_editor_width", newWidth.toString());
    } catch {
      // ignore
    }
  }, []);

  const resetWidth = useCallback(() => {
    setEditorWidth(DEFAULT_EDITOR_WIDTH);
    try {
      localStorage.setItem("power_diagram_editor_width", DEFAULT_EDITOR_WIDTH.toString());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const { editingTable, closeEditTableModal } = useDiagramStore();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors">
      {/* Barra de cabecera */}
      <WorkspaceHeader />

      {/* Área de trabajo dividida */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Panel lateral del Editor de Código */}
        <div
          style={{ width: isEditorOpen ? `${editorWidth}px` : 0 }}
          className={`h-full shrink-0 relative ${
            isResizing
              ? "transition-none select-none"
              : "transition-[width] duration-200 ease-in-out"
          } ${!isEditorOpen ? "overflow-hidden" : ""}`}
        >
          {isEditorOpen && <DbmlEditor />}

          {/* Tirador dinámico para ajustar el ancho (Resize Handle) */}
          {isEditorOpen && (
            <div
              onMouseDown={startResizing}
              onDoubleClick={resetWidth}
              className={`absolute top-0 -right-1 w-2 h-full cursor-col-resize z-30 group hover:bg-indigo-500/20 active:bg-indigo-500/40 transition-colors ${
                isResizing ? "bg-indigo-500/30" : ""
              }`}
              title="Arrastra para ajustar el ancho (Doble clic para restaurar)"
            >
              {/* Línea indicadora visual sobre el borde */}
              <div
                className={`absolute top-0 right-1 w-[2px] h-full transition-colors ${
                  isResizing
                    ? "bg-indigo-500 shadow-sm"
                    : "bg-transparent group-hover:bg-indigo-400/80"
                }`}
              />
            </div>
          )}
        </div>

        {/* Capa de protección invisible durante el arrastre para evitar interferencia del lienzo */}
        {isResizing && (
          <div className="fixed inset-0 z-50 cursor-col-resize select-none" />
        )}

        {/* Botón flotante para colapsar/expandir el editor */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditorOpen(!isEditorOpen)}
          className="absolute bottom-4 left-4 z-20 h-8 px-2 bg-white/90 dark:bg-zinc-900/90 border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 shadow-xl"
          title={isEditorOpen ? "Ocultar editor de código" : "Mostrar editor de código"}
        >
          {isEditorOpen ? (
            <>
              <PanelLeftClose className="w-3.5 h-3.5 mr-1" />
              <span className="text-[11px]">Ocultar Editor</span>
            </>
          ) : (
            <>
              <PanelLeftOpen className="w-3.5 h-3.5 mr-1 text-indigo-500 dark:text-indigo-400" />
              <span className="text-[11px]">Abrir Editor</span>
            </>
          )}
        </Button>

        {/* Lienzo Interactivo con React Flow */}
        <div className="flex-1 h-full relative">
          <DiagramCanvas />
        </div>
      </div>

      {/* Modal Global para Editar la Tabla Seleccionada */}
      <EditTableModal
        open={Boolean(editingTable)}
        onOpenChange={(open) => {
          if (!open) closeEditTableModal();
        }}
        tableData={editingTable}
      />
    </div>
  );
}

