import { useState, useRef, useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  ArrowLeft,
  Loader2,
  Save,
  Plus,
  Database,
  FileCode2,
  Upload,
  Image as ImageIcon,
  FileImage,
  Copy,
  Check,
  ChevronDown,
  SlidersHorizontal,
  AlertTriangle,
} from "lucide-react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useSettingsStore, useTranslation } from "@/store/useSettingsStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateTableModal } from "@/components/modals/CreateTableModal";
import { SqlExchangeModal } from "@/components/modals/SqlExchangeModal";
import { PreferencesModal } from "@/components/modals/PreferencesModal";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { exportDiagramImage, copyDiagramImageToClipboard } from "@/lib/canvasExport";
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
  const autoSave = useSettingsStore((state) => state.autoSave);
  const toggleAutoSave = useSettingsStore((state) => state.toggleAutoSave);
  const { t } = useTranslation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sqlModal, setSqlModal] = useState<{ open: boolean; tab: "export" | "import" }>({
    open: false,
    tab: "export",
  });
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [pendingExitAction, setPendingExitAction] = useState<"dashboard" | "window" | null>(null);
  const forceCloseWindowRef = useRef(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [imageFeedback, setImageFeedback] = useState<"exported" | "copied" | null>(null);
  const exportFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (exportFeedbackTimer.current) {
        clearTimeout(exportFeedbackTimer.current);
      }
    };
  }, []);

  // Proteger el cierre nativo de la ventana cuando hay cambios sin guardar
  useEffect(() => {
    if (isTauri()) {
      let cancelled = false;
      let unlisten: (() => void) | undefined;

      getCurrentWindow()
        .onCloseRequested((event) => {
          if (forceCloseWindowRef.current) return;
          const { activeProject: currentProject, isDirty: dirty } = useDiagramStore.getState();
          if (currentProject && dirty) {
            event.preventDefault();
            setPendingExitAction("window");
          }
        })
        .then((fn) => {
          if (cancelled) {
            fn();
          } else {
            unlisten = fn;
          }
        })
        .catch((err) => {
          console.error("No se pudo registrar onCloseRequested:", err);
        });

      return () => {
        cancelled = true;
        unlisten?.();
      };
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const { activeProject: currentProject, isDirty: dirty } = useDiagramStore.getState();
      if (currentProject && dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Atajos globales para modales del Workspace: Ctrl+N (Nueva Tabla), Ctrl+E (Exportar SQL), Ctrl+I (Importar SQL)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key !== "n" && key !== "e" && key !== "i") return;

      // Evitar apilar modales si ya hay otra ventana modal abierta
      const openDialog = document.querySelector('[role="dialog"]');
      if (openDialog && !sqlModal.open) return;

      if (key === "n" && !openDialog) {
        e.preventDefault();
        setIsCreateOpen(true);
      } else if (key === "e") {
        e.preventDefault();
        setSqlModal({ open: true, tab: "export" });
      } else if (key === "i") {
        e.preventDefault();
        setSqlModal({ open: true, tab: "import" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sqlModal.open]);

  if (!activeProject) return null;

  const triggerImageFeedback = (type: "exported" | "copied") => {
    setImageFeedback(type);
    if (exportFeedbackTimer.current) clearTimeout(exportFeedbackTimer.current);
    exportFeedbackTimer.current = setTimeout(() => setImageFeedback(null), 2000);
  };

  const handleBackToProjects = () => {
    if (isDirty) {
      setPendingExitAction("dashboard");
      return;
    }
    closeProject();
  };

  const handleExportImage = async (format: "png" | "svg") => {
    try {
      setIsExportingImage(true);
      const saved = await exportDiagramImage(nodes, format, activeProject.name);
      if (saved) {
        triggerImageFeedback("exported");
      }
    } catch (err) {
      console.error("Error al exportar imagen:", err);
      alert(err instanceof Error ? err.message : "Error al generar la imagen");
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleCopyImage = async () => {
    try {
      setIsExportingImage(true);
      await copyDiagramImageToClipboard(nodes);
      triggerImageFeedback("copied");
    } catch (err) {
      console.error("Error al copiar imagen al portapapeles:", err);
      alert(err instanceof Error ? err.message : t.workspace.copyImageError);
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
            onClick={handleBackToProjects}
            className="h-8 px-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            title={t.workspace.backToProjectsTitle}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span className="text-xs">{t.workspace.backToProjects}</span>
          </Button>

          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />

          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-app-accent-text" />
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
          {/* Indicador de persistencia SQLite */}
          <div
            className={`flex items-center justify-center p-1 rounded transition-colors ${
              isDirty && !isSaving ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800" : ""
            }`}
            onClick={() => {
              if (isDirty && !isSaving) saveToDatabase();
            }}
            title={
              isSaving
                ? t.workspace.statusSaving
                : isDirty
                  ? t.workspace.statusUnsaved
                  : t.workspace.statusSaved
            }
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-500 dark:text-amber-400" />
            ) : isDirty ? (
              <div className="relative flex items-center justify-center">
                <Save className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-zinc-900" />
              </div>
            ) : (
              <Save className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />

          {/* Botones de Exportar/Importar SQL */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSqlModal({ open: true, tab: "export" })}
            className="h-8 gap-1.5 text-xs bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:text-zinc-200 cursor-pointer"
            title={t.workspace.exportSqlTitle}
          >
            <FileCode2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span className="hidden md:inline">{t.workspace.exportSql}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSqlModal({ open: true, tab: "import" })}
            className="h-8 gap-1.5 text-xs bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:text-zinc-200 cursor-pointer"
            title={t.workspace.importSqlTitle}
          >
            <Upload className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            <span className="hidden md:inline">{t.workspace.importSql}</span>
          </Button>

          {/* Menú de Exportar / Copiar Imagen */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isExportingImage || nodes.length === 0}
                className="h-8 gap-1.5 text-xs bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:text-zinc-200 cursor-pointer"
                title={t.workspace.exportImageTitle}
              >
                {isExportingImage ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500 dark:text-purple-400" />
                ) : imageFeedback ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                )}
                <span className="hidden md:inline">
                  {isExportingImage
                    ? t.workspace.exportingPng
                    : imageFeedback === "exported"
                      ? t.workspace.exportedPng
                      : imageFeedback === "copied"
                        ? t.workspace.copiedImage
                        : t.workspace.exportImage}
                </span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={6} className="w-52">
              <DropdownMenuItem onSelect={() => handleExportImage("png")} className="gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" />
                <span>{t.workspace.exportPngOption}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleExportImage("svg")} className="gap-2">
                <FileImage className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                <span>{t.workspace.exportSvgOption}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleCopyImage} className="gap-2">
                <Copy className="w-3.5 h-3.5 text-app-accent-text shrink-0" />
                <span>{t.workspace.copyImageOption}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />

          {/* Modal de Crear Tabla */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-8 gap-1 text-xs bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:text-zinc-200 font-medium cursor-pointer"
            title={t.workspace.newTableTitle}
          >
            <Plus className="w-3.5 h-3.5 text-app-accent-text" />
            <span>{t.workspace.newTable}</span>
          </Button>

          {/* Botón dividido de Guardado Manual + Dropdown de Autoguardado */}
          <div className="inline-flex items-center">
            <Button
              variant="default"
              size="sm"
              onClick={() => saveToDatabase()}
              disabled={isSaving || !isDirty}
              className="h-8 gap-1.5 text-xs bg-app-accent hover:bg-app-accent-hover text-app-accent-contrast disabled:opacity-50 cursor-pointer rounded-r-none"
              title={t.workspace.saveBtnTitle}
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.common.save}</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 w-6 px-0 rounded-l-none border-l border-current/20 bg-app-accent hover:bg-app-accent-hover text-app-accent-contrast cursor-pointer"
                  title={t.workspace.saveOptionsTitle}
                  aria-label={t.workspace.saveOptionsTitle}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" sideOffset={6} className="w-56">
                <DropdownMenuItem
                  onSelect={toggleAutoSave}
                  className="justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Save className="w-3.5 h-3.5 text-app-accent-text shrink-0" />
                    <span>{t.workspace.autoSaveToggleLabel}</span>
                  </span>
                  <span
                    className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                      autoSave
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
                    }`}
                  >
                    {autoSave ? t.workspace.autoSaveOn : t.workspace.autoSaveOff}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />

          {/* Selector de Tema y Acceso a Preferencias */}
          <ThemeToggle />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPreferencesOpen(true)}
            className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title={t.workspace.preferencesTitle}
            aria-label={t.workspace.preferencesTitle}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
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

      <PreferencesModal
        open={isPreferencesOpen}
        onOpenChange={setIsPreferencesOpen}
      />

      <ConfirmDialog
        open={pendingExitAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingExitAction(null);
        }}
        title={t.workspace.unsavedExitTitle}
        description={t.workspace.unsavedExitDescription}
        confirmLabel={t.workspace.unsavedExitConfirm}
        cancelLabel={t.workspace.unsavedExitCancel}
        tone="warning"
        icon={<AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" />}
        onConfirm={() => {
          const action = pendingExitAction;
          setPendingExitAction(null);
          if (action === "window") {
            forceCloseWindowRef.current = true;
            const win = getCurrentWindow();
            void win.close().catch(() => win.destroy());
          } else {
            closeProject();
          }
        }}
      />
    </>
  );
}
