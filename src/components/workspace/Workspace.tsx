import { useState, useRef, useCallback, useEffect } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { DbmlEditor } from "@/components/editor/DbmlEditor";
import { DiagramCanvas } from "@/components/canvas/DiagramCanvas";
import { EditTableModal } from "@/components/modals/EditTableModal";
import { EditRelationshipModal } from "@/components/modals/EditRelationshipModal";
import { Button } from "@/components/ui/button";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useTranslation } from "@/store/useSettingsStore";
import { formatDbmlCode } from "@/lib/dbmlFormatter";

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

  const {
    editingTable,
    closeEditTableModal,
    editingEdge,
    closeEditEdgeModal,
    undo,
    redo,
    saveToDatabase,
    runAutoLayout,
    requestCenterView,
    setDbmlCode,
  } = useDiagramStore();
  const { t } = useTranslation();

  useEffect(() => {
    const isEditableContext = (el: Element | null) => {
      if (!el) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return true;
      if ((el as HTMLElement).isContentEditable) return true;
      return Boolean(el.closest(".cm-editor"));
    };

    const hasOpenDialog = () => Boolean(document.querySelector('[role="dialog"]'));

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // Shift + Alt + F: Formatear código DBML desde cualquier parte del workspace
      if (e.shiftKey && e.altKey && !e.ctrlKey && !e.metaKey && key === "f") {
        if (hasOpenDialog()) return;
        e.preventDefault();
        const current = useDiagramStore.getState().dbmlCode;
        if (current.trim()) {
          const next = formatDbmlCode(current);
          if (next !== current) setDbmlCode(next);
        }
        return;
      }

      if (!(e.ctrlKey || e.metaKey)) return;

      // Ctrl + S: Guardar manualmente
      if (key === "s" && !e.shiftKey) {
        e.preventDefault();
        saveToDatabase();
        return;
      }

      // Ctrl + B: Mostrar / Ocultar panel del Editor DBML
      if (key === "b" && !e.shiftKey && !e.altKey) {
        if (hasOpenDialog()) return;
        e.preventDefault();
        setIsEditorOpen((prev) => !prev);
        return;
      }

      // Ctrl + 0: Centrar vista a todas las tablas
      if (e.key === "0" && !e.shiftKey && !e.altKey) {
        if (hasOpenDialog()) return;
        e.preventDefault();
        requestCenterView();
        return;
      }

      // Ctrl + Shift + L: Auto-Ordenar diagrama
      if (key === "l" && e.shiftKey && !e.altKey) {
        if (hasOpenDialog()) return;
        e.preventDefault();
        void runAutoLayout();
        return;
      }

      if (isEditableContext(document.activeElement)) {
        return;
      }

      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveToDatabase, undo, redo, runAutoLayout, requestCenterView, setDbmlCode]);

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
              className={`absolute top-0 -right-1 w-2 h-full cursor-col-resize z-30 group hover:bg-app-accent/20 active:bg-app-accent/40 transition-colors ${
                isResizing ? "bg-app-accent/30" : ""
              }`}
              title={t.workspace.resizeHandleTitle}
            >
              {/* Línea indicadora visual sobre el borde */}
              <div
                className={`absolute top-0 right-1 w-[2px] h-full transition-colors ${
                  isResizing
                    ? "bg-app-accent shadow-sm"
                    : "bg-transparent group-hover:bg-app-accent/80"
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
          className={`absolute bottom-4 z-20 h-8 px-2.5 bg-white/90 dark:bg-zinc-900/90 border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 shadow-xl duration-200 ease-in-out ${
            isEditorOpen ? "left-4" : "left-16"
          }`}
          title={isEditorOpen ? t.workspace.hideEditorTitle : t.workspace.showEditorTitle}
        >
          {isEditorOpen ? (
            <>
              <PanelLeftClose className="w-3.5 h-3.5 mr-1" />
              <span className="text-[11px]">{t.workspace.hideEditor}</span>
            </>
          ) : (
            <>
              <PanelLeftOpen className="w-3.5 h-3.5 mr-1 text-app-accent-text" />
              <span className="text-[11px]">{t.workspace.showEditor}</span>
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

      {/* Modal Global para Editar la Relación Seleccionada */}
      <EditRelationshipModal
        open={Boolean(editingEdge)}
        onOpenChange={(open) => {
          if (!open) closeEditEdgeModal();
        }}
        edge={editingEdge}
      />
    </div>
  );
}

