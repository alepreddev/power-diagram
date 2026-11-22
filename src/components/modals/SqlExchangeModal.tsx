import { useState, useMemo, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import {
  Download,
  Upload,
  Copy,
  Check,
  FileCode,
  AlertCircle,
  Database,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DbEngineSelect, type DbEngineOption } from "@/components/ui/DbEngineSelect";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useTranslation } from "@/store/useSettingsStore";
import {
  exportDbmlToSql,
  importSqlSchema,
  detectSqlDialect,
  downloadTextFile,
  type ExportDialect,
  type ImportDialect,
} from "@/lib/sqlExportImport";

const EXPORT_DIALECT_OPTIONS: readonly DbEngineOption<ExportDialect>[] = [
  { value: "postgres", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "sqlite", label: "SQLite" },
  { value: "mssql", label: "SQL Server (MSSQL)" },
  { value: "json", label: "JSON Schema" },
];

const IMPORT_DIALECT_OPTIONS: readonly DbEngineOption<ImportDialect>[] = [
  { value: "postgres", label: "PostgreSQL DDL" },
  { value: "mysql", label: "MySQL DDL" },
  { value: "sqlite", label: "SQLite DDL" },
  { value: "mssql", label: "SQL Server DDL" },
];

const DIALECT_LABELS: Record<ImportDialect, string> = {
  postgres: "PostgreSQL",
  mysql: "MySQL",
  sqlite: "SQLite",
  mssql: "SQL Server",
};

interface SqlExchangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "export" | "import";
  activeTab?: "export" | "import";
  onTabChange?: (tab: "export" | "import") => void;
}

export function SqlExchangeModal({
  open,
  onOpenChange,
  defaultTab = "export",
  activeTab: controlledTab,
  onTabChange,
}: SqlExchangeModalProps) {
  const { dbmlCode, applyDbmlWithAutoLayout, activeProject } = useDiagramStore();
  const { resolvedTheme } = useThemeStore();
  const { t } = useTranslation();

  const [internalTab, setInternalTab] = useState<"export" | "import">(defaultTab);
  const activeTab = controlledTab ?? internalTab;

  const setActiveTab = (tab: "export" | "import") => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const [exportDialect, setExportDialect] = useState<ExportDialect>("postgres");
  const [importDialect, setImportDialect] = useState<ImportDialect>("postgres");
  const [autoDetectedDialect, setAutoDetectedDialect] = useState<ImportDialect | null>(null);
  const [inputSql, setInputSql] = useState("");
  const [importMode, setImportMode] = useState<"replace" | "append">("replace");
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sincroniza la pestaña inicial y limpia errores previos cada vez que se abre la modal
  useEffect(() => {
    if (open) {
      if (!controlledTab) {
        setInternalTab(defaultTab);
      }
      setImportError(null);
    }
  }, [open, defaultTab, controlledTab]);

  // Generar el SQL exportado de forma reactiva solo cuando la pestaña Exportar está visible
  const exportedSql = useMemo(() => {
    if (!open || activeTab !== "export") return "";
    try {
      return exportDbmlToSql(dbmlCode, exportDialect);
    } catch (err: unknown) {
      return `-- Error al exportar: ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [open, activeTab, dbmlCode, exportDialect]);

  // Pre-análisis reactivo del script SQL para mostrar el resumen de tablas, relaciones y sentencias ignoradas
  const importPreview = useMemo(() => {
    if (!open || activeTab !== "import" || !inputSql.trim()) return null;
    try {
      return {
        result: importSqlSchema(inputSql, importDialect, {
          mode: importMode,
          existingDbml: dbmlCode,
        }),
        error: null,
      };
    } catch (err: unknown) {
      return {
        result: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }, [open, activeTab, inputSql, importDialect, importMode, dbmlCode]);

  const handleSqlInputChange = (val: string) => {
    setInputSql(val);
    setImportError(null);
    const detected = detectSqlDialect(val);
    setAutoDetectedDialect(detected);
    if (detected && detected !== importDialect) {
      setImportDialect(detected);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportedSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    const ext = exportDialect === "json" ? "json" : "sql";
    const filename = `${(activeProject?.name || "diagram")
      .toLowerCase()
      .replace(/\s+/g, "_")}_${exportDialect}.${ext}`;
    try {
      await downloadTextFile(filename, exportedSql, "text/plain");
    } catch (err) {
      console.error("Error al guardar archivo:", err);
      alert(err instanceof Error ? err.message : "Error al guardar el archivo");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) handleSqlInputChange(content);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImportSubmit = async () => {
    setImportError(null);
    if (!inputSql.trim() || isImporting) return;

    try {
      setIsImporting(true);
      const { dbml } =
        importPreview?.result ??
        importSqlSchema(inputSql, importDialect, {
          mode: importMode,
          existingDbml: dbmlCode,
        });

      await applyDbmlWithAutoLayout(dbml);
      onOpenChange(false);
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl sm:max-w-4xl h-[85vh] max-h-[820px] min-h-[520px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 shadow-2xl p-6 pb-5 flex flex-col overflow-hidden">
        {/* Cabecera espaciosa con margen derecho para no chocar con el botón cerrar */}
        <DialogHeader className="shrink-0 pr-10 pb-2 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-app-accent-text" />
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
                  {t.modals.sqlExchange.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  {t.modals.sqlExchange.description}
                </DialogDescription>
              </div>
            </div>

            {/* Pestañas de Exportar / Importar con buen ancho */}
            <div className="inline-flex items-center bg-slate-100 dark:bg-zinc-950 p-1 rounded-lg border border-slate-200 dark:border-zinc-800 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab("export")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "export"
                    ? "bg-app-accent text-app-accent-contrast shadow"
                    : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {t.modals.sqlExchange.exportTab}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("import")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "import"
                    ? "bg-app-accent text-app-accent-contrast shadow"
                    : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {t.modals.sqlExchange.importTab}
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* ========================================================
            PESTAÑA: EXPORTAR SQL
           ======================================================== */}
        {activeTab === "export" ? (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden space-y-3 pt-3">
            {/* Barra de configuración y acciones */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800/80 p-2.5 rounded-lg shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                  {t.modals.sqlExchange.dbEngineLabel}
                </span>
                <DbEngineSelect
                  value={exportDialect}
                  onValueChange={setExportDialect}
                  options={EXPORT_DIALECT_OPTIONS}
                  triggerClassName="h-8 min-w-[205px] bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700/80"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 text-xs bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 gap-1.5 shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{t.common.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t.modals.sqlExchange.copySql}</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={handleDownload}
                  className="h-8 text-xs bg-app-accent hover:bg-app-accent-hover text-app-accent-contrast gap-1.5 font-semibold shadow cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.modals.sqlExchange.downloadPrefix} .{exportDialect === "json" ? "json" : "sql"}</span>
                </Button>
              </div>
            </div>

            {/* Visor de código SQL con scrollbar vertical y horizontal garantizados */}
            <div className="flex-1 min-h-0 relative border border-slate-300 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950 shadow-inner">
              <div className="absolute inset-0">
                <CodeMirror
                  value={exportedSql}
                  height="100%"
                  theme={resolvedTheme}
                  extensions={[sql()]}
                  editable={false}
                  className="text-[13px] font-mono h-full [&_.cm-editor]:h-full [&_.cm-scroller]:h-full [&_.cm-scroller]:overflow-auto"
                />
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================
             PESTAÑA: IMPORTAR SQL (Ingeniería Inversa)
             ======================================================== */
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden space-y-3 pt-3">
            {/* Barra de opciones de importación */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800/80 p-2.5 rounded-lg shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                  {t.modals.sqlExchange.sourceDialectLabel}
                </span>
                <DbEngineSelect
                  value={importDialect}
                  onValueChange={setImportDialect}
                  options={IMPORT_DIALECT_OPTIONS}
                  triggerClassName="h-8 min-w-[195px] bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700/80"
                />
                {autoDetectedDialect && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-app-accent-soft text-app-accent-text border border-app-accent-border"
                    title={t.modals.sqlExchange.autoDetectedTooltip(DIALECT_LABELS[autoDetectedDialect])}
                  >
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span>Auto: {DIALECT_LABELS[autoDetectedDialect]}</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 dark:text-zinc-300 dark:hover:text-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:border-zinc-700 cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors shadow-sm">
                  <FileCode className="w-3.5 h-3.5 text-app-accent-text" />
                  <span>{t.modals.sqlExchange.loadSqlFile}</span>
                  <input
                    type="file"
                    accept=".sql,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-md border border-slate-300 dark:border-zinc-800 shadow-sm">
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-app-accent-text">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === "replace"}
                      onChange={() => setImportMode("replace")}
                      className="accent-app-accent"
                    />
                    <span>{t.modals.sqlExchange.modeReplace}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-app-accent-text">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === "append"}
                      onChange={() => setImportMode("append")}
                      className="accent-app-accent"
                    />
                    <span>{t.modals.sqlExchange.modeAppend}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Input de código SQL con scrollbar vertical y horizontal garantizados */}
            <div className="flex-1 min-h-0 relative border border-slate-300 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950 shadow-inner">
              <div className="absolute inset-0">
                <CodeMirror
                  value={inputSql}
                  height="100%"
                  theme={resolvedTheme}
                  placeholder={t.modals.sqlExchange.sqlPlaceholder}
                  extensions={[sql()]}
                  onChange={handleSqlInputChange}
                  className="text-[13px] font-mono h-full [&_.cm-editor]:h-full [&_.cm-scroller]:h-full [&_.cm-scroller]:overflow-auto"
                />
              </div>
            </div>

            {/* Resumen en vivo de tablas, relaciones y sentencias ignoradas */}
            {importPreview?.result && (
              <div className="p-2.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-lg text-xs text-slate-700 dark:text-zinc-200 flex flex-col gap-1 shrink-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {t.modals.sqlExchange.readySummary(
                        importPreview.result.report.tablesImported,
                        importPreview.result.report.relationshipsImported
                      )}
                    </span>
                  </span>

                  {importPreview.result.report.ignoredStatementsTotal > 0 && (
                    <span className="text-slate-500 dark:text-zinc-400">
                      {t.modals.sqlExchange.ignoredSummary(importPreview.result.report.ignoredStatementsTotal)}{" "}
                      (
                      {importPreview.result.report.ignoredBreakdown
                        .slice(0, 4)
                        .map((item) => `${item.type} ×${item.count}`)
                        .join(", ")}
                      {importPreview.result.report.ignoredBreakdown.length > 4 ? "…" : ""})
                    </span>
                  )}
                </div>

                {importPreview.result.report.skippedDuplicateTables.length > 0 && (
                  <div className="text-[11px] text-amber-700 dark:text-amber-400">
                    {t.modals.sqlExchange.skippedDuplicates(importPreview.result.report.skippedDuplicateTables.length)}{" "}
                    <span className="font-mono font-medium">
                      {importPreview.result.report.skippedDuplicateTables.join(", ")}
                    </span>
                  </div>
                )}
              </div>
            )}

            {(importError || importPreview?.error) && (
              <div className="p-3 bg-red-50 border border-red-200 dark:bg-red-950/70 dark:border-red-900/80 rounded-md text-xs text-red-700 dark:text-red-200 flex items-start gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                <span>{importError || importPreview?.error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2 shrink-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-9 px-4 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
              >
                {t.common.cancel}
              </Button>

              <Button
                type="button"
                onClick={handleImportSubmit}
                disabled={!inputSql.trim() || Boolean(importPreview?.error) || isImporting}
                className="h-9 px-5 text-xs bg-app-accent hover:bg-app-accent-hover text-app-accent-contrast font-semibold gap-1.5 shadow-md cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isImporting ? t.modals.sqlExchange.importingStatus : t.modals.sqlExchange.importSubmit}</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
