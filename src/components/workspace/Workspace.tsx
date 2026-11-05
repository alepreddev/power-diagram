import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { DbmlEditor } from "@/components/editor/DbmlEditor";
import { DiagramCanvas } from "@/components/canvas/DiagramCanvas";
import { EditTableModal } from "@/components/modals/EditTableModal";
import { Button } from "@/components/ui/button";
import { useDiagramStore } from "@/store/useDiagramStore";

export function Workspace() {
  const [isEditorOpen, setIsEditorOpen] = useState(true);
  const { editingTable, closeEditTableModal } = useDiagramStore();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors">
      {/* Barra de cabecera */}
      <WorkspaceHeader />

      {/* Área de trabajo dividida */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Panel lateral del Editor de Código */}
        <div
          className={`h-full transition-all duration-200 ease-in-out shrink-0 relative ${
            isEditorOpen ? "w-[420px] max-w-[50vw]" : "w-0 overflow-hidden"
          }`}
        >
          {isEditorOpen && <DbmlEditor />}
        </div>

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

