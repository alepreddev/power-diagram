import { useState, useMemo } from "react";
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
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDiagramStore } from "@/store/useDiagramStore";
import {
  exportDbmlToSql,
  importSqlToDbml,
  downloadTextFile,
  type ExportDialect,
  type ImportDialect,
} from "@/lib/sqlExportImport";

interface SqlExchangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "export" | "import";
}

export function SqlExchangeModal({
  open,
  onOpenChange,
  defaultTab = "export",
}: SqlExchangeModalProps) {
  const { dbmlCode, setDbmlCode, activeProject } = useDiagramStore();

  const [activeTab, setActiveTab] = useState<"export" | "import">(defaultTab);
  const [exportDialect, setExportDialect] = useState<ExportDialect>("postgres");
  const [importDialect, setImportDialect] = useState<ImportDialect>("postgres");
  const [inputSql, setInputSql] = useState("");
  const [importMode, setImportMode] = useState<"replace" | "append">("replace");
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Generar el SQL exportado de forma reactiva
  const exportedSql = useMemo(() => {
    try {
      return exportDbmlToSql(dbmlCode, exportDialect);
    } catch (err: unknown) {
      return `-- Error al exportar: ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [dbmlCode, exportDialect]);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportedSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = exportDialect === "json" ? "json" : "sql";
    const filename = `${(activeProject?.name || "diagram")
      .toLowerCase()
      .replace(/\s+/g, "_")}_${exportDialect}.${ext}`;
    downloadTextFile(filename, exportedSql, "text/plain");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) setInputSql(content);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = () => {
    setImportError(null);
    if (!inputSql.trim()) return;

    try {
      const convertedDbml = importSqlToDbml(inputSql, importDialect);

      if (importMode === "replace") {
        setDbmlCode(convertedDbml);
      } else {
        const combined = `${dbmlCode.trimEnd()}\n\n// Importado desde script SQL (${importDialect.toUpperCase()})\n${convertedDbml}`;
        setDbmlCode(combined);
      }

      onOpenChange(false);
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl flex flex-col max-h-[85vh]">
        <DialogHeader className="shrink-0 pb-2 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              <DialogTitle className="text-base font-bold text-zinc-100">
                Intercambio SQL y Esquemas
              </DialogTitle>
            </div>

            {/* Pestañas de Exportar / Importar */}
            <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTab("export")}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === "export"
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Exportar SQL
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("import")}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === "import"
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Importar SQL
              </button>
            </div>
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            {activeTab === "export"
              ? "Genera y descarga scripts DDL nativos para tu motor de base de datos preferido."
              : "Convierte scripts SQL existentes (.sql) en diagramas DBML mediante ingeniería inversa."}
          </DialogDescription>
        </DialogHeader>

        {/* Pestaña: EXPORTAR */}
        {activeTab === "export" ? (
          <div className="flex flex-col flex-1 overflow-hidden space-y-3 pt-3">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-300">Motor de Base de Datos:</span>
                <select
                  value={exportDialect}
                  onChange={(e) => setExportDialect(e.target.value as ExportDialect)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 h-8 focus:outline-none"
                >
                  <option value="postgres">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                  <option value="sqlite">SQLite</option>
                  <option value="mssql">SQL Server (MSSQL)</option>
                  <option value="json">JSON Schema</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 text-xs bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200 gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar SQL</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={handleDownload}
                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar .{exportDialect === "json" ? "json" : "sql"}</span>
                </Button>
              </div>
            </div>

            {/* Vista previa del SQL generado */}
            <div className="flex-1 min-h-[300px] border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
              <CodeMirror
                value={exportedSql}
                height="100%"
                theme="dark"
                extensions={[sql()]}
                editable={false}
                className="text-[13px] font-mono h-full"
              />
            </div>
          </div>
        ) : (
          /* Pestaña: IMPORTAR (Ingeniería Inversa) */
          <div className="flex flex-col flex-1 overflow-hidden space-y-3 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-300">Dialecto de Origen:</span>
                <select
                  value={importDialect}
                  onChange={(e) => setImportDialect(e.target.value as ImportDialect)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 h-8 focus:outline-none"
                >
                  <option value="postgres">PostgreSQL DDL</option>
                  <option value="mysql">MySQL DDL</option>
                  <option value="mssql">SQL Server DDL</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1.5 rounded border border-zinc-700">
                  <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Cargar archivo .sql</span>
                  <input
                    type="file"
                    accept=".sql,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <div className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === "replace"}
                      onChange={() => setImportMode("replace")}
                    />
                    <span>Reemplazar</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === "append"}
                      onChange={() => setImportMode("append")}
                    />
                    <span>Añadir</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Input de código SQL */}
            <div className="flex-1 min-h-[260px] border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
              <CodeMirror
                value={inputSql}
                height="100%"
                theme="dark"
                placeholder="Pega aquí tus instrucciones CREATE TABLE y ALTER TABLE..."
                extensions={[sql()]}
                onChange={(val) => setInputSql(val)}
                className="text-[13px] font-mono h-full"
              />
            </div>

            {importError && (
              <div className="p-2.5 bg-red-950/60 border border-red-900/60 rounded text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs text-zinc-400"
              >
                Cancelar
              </Button>

              <Button
                size="sm"
                onClick={handleImportSubmit}
                disabled={!inputSql.trim()}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Convertir a Diagrama DBML</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

