import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Loader2,
  Save,
  Plus,
  Database,
  FileCode2,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { Button } from "@/components/ui/button";
import { CreateTableModal } from "@/components/modals/CreateTableModal";
import { SqlExchangeModal } from "@/components/modals/SqlExchangeModal";
import { exportDiagramImage } from "@/lib/canvasExport";

export function WorkspaceHeader() {
  const {
    activeProject,
    closeProject,
    isDirty,
    isSaving,
    lastSavedAt,
    saveToDatabase,
    nodes,
  } = useDiagramStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sqlModal, setSqlModal] = useState<{ open: boolean; tab: "export" | "import" }>({
    open: false,
    tab: "export",
  });
  const [isExportingImage, setIsExportingImage] = useState(false);

  if (!activeProject) return null;

  const handleExportImage = async (format: "png" | "svg") => {
    try {
      setIsExportingImage(true);
      await exportDiagramImage(nodes, format, activeProject.name);
    } catch (err) {
      console.error("Error al exportar imagen:", err);
      alert(err instanceof Error ? err.message : "Error al generar la imagen");
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <>
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
            <span className="font-semibold text-sm text-zinc-100 truncate max-w-[200px]">
              {activeProject.name}
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/50">
              {activeProject.db_engine}
            </span>
          </div>
        </div>

        {/* Indicadores y Acciones Principales */}
        <div className="flex items-center gap-2.5">
          {/* Estado de persistencia SQLite */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs mr-1">
            {isSaving ? (
              <span className="flex items-center gap-1 text-amber-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Guardando...</span>
              </span>
            ) : isDirty ? (
              <span className="flex items-center gap-1 text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Pendiente</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span>
                  Guardado{" "}
                  {lastSavedAt
                    ? `(${lastSavedAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })})`
                    : ""}
                </span>
              </span>
            )}
          </div>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* Botones de Exportar/Importar SQL */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSqlModal({ open: true, tab: "import" })}
            className="h-8 gap-1.5 text-xs bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200"
            title="Importar script SQL existente (Ingeniería inversa)"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Importar SQL</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSqlModal({ open: true, tab: "export" })}
            className="h-8 gap-1.5 text-xs bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200"
            title="Exportar esquema a SQL nativo o JSON"
          >
            <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Exportar SQL</span>
          </Button>

          {/* Exportar a Imagen */}
          <Button
            variant="outline"
            size="sm"
            disabled={isExportingImage || nodes.length === 0}
            onClick={() => handleExportImage("png")}
            className="h-8 gap-1.5 text-xs bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200"
            title="Descargar diagrama en imagen PNG de alta resolución"
          >
            <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">PNG</span>
          </Button>

          <div className="h-4 w-px bg-zinc-800" />

          {/* Modal de Crear Tabla */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-8 gap-1 text-xs bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200 font-medium"
            title="Crear tabla visualmente"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Nueva Tabla</span>
          </Button>

          {/* Guardado Manual */}
          <Button
            variant="default"
            size="sm"
            onClick={() => saveToDatabase()}
            disabled={isSaving || !isDirty}
            className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
            title="Forzar guardado manual en SQLite"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guardar</span>
          </Button>
        </div>
      </header>

      {/* Modales */}
      <CreateTableModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      <SqlExchangeModal
        open={sqlModal.open}
        onOpenChange={(open) => setSqlModal((prev) => ({ ...prev, open }))}
        defaultTab={sqlModal.tab}
      />
    </>
  );
}
