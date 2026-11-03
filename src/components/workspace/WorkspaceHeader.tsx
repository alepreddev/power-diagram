import { ArrowLeft, Check, Loader2, Save, Plus, Database } from "lucide-react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { Button } from "@/components/ui/button";

export function WorkspaceHeader() {
  const { activeProject, closeProject, isDirty, isSaving, lastSavedAt, saveToDatabase, addNewTable } =
    useDiagramStore();

  if (!activeProject) return null;

  const handleQuickAddTable = () => {
    const randomSuffix = Math.floor(Math.random() * 1000);
    const tableName = `new_table_${randomSuffix}`;
    addNewTable(tableName, [
      { name: "id", type: "integer", pk: true, unique: false, notNull: true, increment: true },
      { name: "name", type: "varchar", pk: false, unique: false, notNull: true, increment: false },
    ]);
  };

  return (
    <header className="h-12 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0 select-none">
      {/* Botón Volver y Metadatos del Proyecto */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={closeProject}
          className="h-8 px-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          title="Volver a la lista de proyectos"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span className="text-xs">Proyectos</span>
        </Button>

        <div className="h-4 w-px bg-zinc-800" />

        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-sm text-zinc-100">{activeProject.name}</span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/50">
            {activeProject.db_engine}
          </span>
        </div>
      </div>

      {/* Indicador de Autoguardado y Botones de Acción */}
      <div className="flex items-center gap-3">
        {/* Estado de persistencia SQLite */}
        <div className="flex items-center gap-1.5 text-xs">
          {isSaving ? (
            <span className="flex items-center gap-1 text-amber-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Guardando en SQLite...</span>
            </span>
          ) : isDirty ? (
            <span className="flex items-center gap-1 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Cambios pendientes</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400">
              <Check className="w-3.5 h-3.5" />
              <span>Guardado {lastSavedAt ? `(${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ""}</span>
            </span>
          )}
        </div>

        <div className="h-4 w-px bg-zinc-800" />

        <Button
          variant="outline"
          size="sm"
          onClick={handleQuickAddTable}
          className="h-8 gap-1 text-xs bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200"
          title="Agregar una nueva tabla al esquema"
        >
          <Plus className="w-3.5 h-3.5 text-indigo-400" />
          <span>Nueva Tabla</span>
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={() => saveToDatabase()}
          disabled={isSaving || !isDirty}
          className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
          title="Forzar guardado manual"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Guardar</span>
        </Button>
      </div>
    </header>
  );
}

