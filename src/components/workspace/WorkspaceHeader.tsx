import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Loader2,
  Save,
  Plus,
  Database,
  FileCode2,
  Upload,
  Image as ImageIcon,
  Check,
} from "lucide-react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { Button } from "@/components/ui/button";
import { CreateTableModal } from "@/components/modals/CreateTableModal";
import { SqlExchangeModal } from "@/components/modals/SqlExchangeModal";
import { exportDiagramImage } from "@/lib/canvasExport";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function WorkspaceHeader() {
  const {
    activeProject,
    closeProject,
    isDirty,
    isSaving,
    saveToDatabase,
    nodes,
  } = useDiagramStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sqlModal, setSqlModal] = useState<{ open: boolean; tab: "export" | "import" }>({
    open: false,
    tab: "export",
  });
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [imageExported, setImageExported] = useState(false);
  const exportFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (exportFeedbackTimer.current) {
        clearTimeout(exportFeedbackTimer.current);
      }
    };
  }, []);

  if (!activeProject) return null;

  const handleExportImage = async (format: "png" | "svg") => {
    try {
      setIsExportingImage(true);
      const saved = await exportDiagramImage(nodes, format, activeProject.name);
      if (saved) {
        setImageExported(true);
        if (exportFeedbackTimer.current) clearTimeout(exportFeedbackTimer.current);
        exportFeedbackTimer.current = setTimeout(() => setImageExported(false), 2000);
      }
    } catch (err) {
      console.error("Error al exportar imagen:", err);
      alert(err instanceof Error ? err.message : "Error al generar la imagen");
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <>
      <header className="h-12 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-4 flex items-center justify-between shrink-0 select-none transition-colors">
        {/* Botón Volver y Metadatos del Proyecto */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={closeProject}
            className="h-8 px-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
            title="Volver a la lista de proyectos"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span className="text-xs">Proyectos</span>
          </Button>

          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />

          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span className="font-semibold text-sm text-slate-800 dark:text-zinc-100 truncate max-w-[200px]">
              {activeProject.name}
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700/50">
              {activeProject.db_engine}
            </span>
          </div>
        </div>

        {/* Indicadores y Acciones Principales */}
        <div className="flex items-center gap-2.5">
          {/* Indicador de persistencia SQLite: icono de carga al guardar y memoria en verde al estar guardado */}
          <div
            className={`flex items-center justify-center p-1 rounded transition-colors ${
              isDirty && !isSaving ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800" : ""
            }`}
            onClick={() => {
              if (isDirty && !isSaving) saveToDatabase();
            }}
            title={
              isSaving || isDirty
                ? "Guardando cambios..."
                : "Guardado en SQLite"
            }
          >
            {isSaving || isDirty ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-500 dark:text-amber-400" />
            ) : (
              <Save className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />

          {/* Botones de Exportar/Importar SQL */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSqlModal({ open: true, tab: "import" })}
            className="h-8 gap-1.5 text-xs bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:text-zinc-200"
            title="Importar script SQL existente (Ingeniería inversa)"
          >
            <Upload className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            <span className="hidden md:inline">Importar SQL</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSqlModal({ open: true, tab: "export" })}
            className="h-8 gap-1.5 text-xs bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:text-zinc-200"
            title="Exportar esquema a SQL nativo o JSON"
          >
            <FileCode2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span className="hidden md:inline">Exportar SQL</span>
          </Button>

          {/* Exportar a Imagen */}
          <Button
            variant="outline"
            size="sm"
            disabled={isExportingImage || nodes.length === 0}
            onClick={() => handleExportImage("png")}
            className="h-8 gap-1.5 text-xs bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:text-zinc-200"
            title="Exportar diagrama como imagen PNG de alta resolución"
          >
            {isExportingImage ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500 dark:text-purple-400" />
            ) : imageExported ? (
              <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
            )}
            <span className="hidden md:inline">
              {isExportingImage ? "Exportando..." : imageExported ? "Guardado" : "PNG"}
            </span>
          </Button>

          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />

          {/* Modal de Crear Tabla */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-8 gap-1 text-xs bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:text-zinc-200 font-medium"
            title="Crear tabla visualmente"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
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

          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />

          {/* Selector de Tema */}
          <ThemeToggle />
        </div>
      </header>

      {/* Modales */}
      <CreateTableModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      <SqlExchangeModal
        open={sqlModal.open}
        onOpenChange={(open) => setSqlModal((prev) => ({ ...prev, open }))}
        activeTab={sqlModal.tab}
        onTabChange={(tab) => setSqlModal((prev) => ({ ...prev, tab }))}
      />
    </>
  );
}
