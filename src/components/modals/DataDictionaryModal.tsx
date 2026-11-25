import { useState, useMemo } from "react";
import {
  BookOpen,
  Copy,
  Check,
  FileText,
  FileCode2,
  Printer,
  AlertTriangle,
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
import { useTranslation } from "@/store/useSettingsStore";
import {
  extractDataDictionary,
  generateDataDictionaryMarkdown,
  generateDataDictionaryHtml,
  exportDataDictionaryFile,
  printDataDictionaryHtml,
  type DictionaryColumn,
} from "@/lib/dataDictionary";

interface DataDictionaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ColumnAttrBadges({ col }: { col: DictionaryColumn }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {col.pk && (
        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
          PK
        </span>
      )}
      {col.fkTarget && (
        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
          FK
        </span>
      )}
      {col.unique && !col.pk && (
        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30">
          UQ
        </span>
      )}
      {col.notNull && (
        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          NN
        </span>
      )}
      {col.increment && (
        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700">
          AI
        </span>
      )}
      {!col.pk && !col.fkTarget && !col.unique && !col.notNull && !col.increment && (
        <span className="text-slate-400 dark:text-zinc-600">—</span>
      )}
    </div>
  );
}

export function DataDictionaryModal({ open, onOpenChange }: DataDictionaryModalProps) {
  const { activeProject, dbmlCode } = useDiagramStore();
  const { t, language } = useTranslation();
  const dd = t.modals.dataDictionary;

  const [activeTab, setActiveTab] = useState<"preview" | "markdown">("preview");
  const [copied, setCopied] = useState(false);
  const [savedFormat, setSavedFormat] = useState<"md" | "html" | null>(null);

  const model = useMemo(() => {
    if (!open) return null;
    return extractDataDictionary(
      activeProject?.name || "Diagrama",
      activeProject?.db_engine || "postgres",
      dbmlCode
    );
  }, [open, activeProject?.name, activeProject?.db_engine, dbmlCode]);

  const markdownText = useMemo(() => {
    if (!model) return "";
    return generateDataDictionaryMarkdown(model, language);
  }, [model, language]);

  const handleCopyMarkdown = async () => {
    await navigator.clipboard.writeText(markdownText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (format: "md" | "html") => {
    if (!model) return;
    try {
      const content =
        format === "md"
          ? markdownText
          : generateDataDictionaryHtml(model, language);
      const saved = await exportDataDictionaryFile(model.projectName, content, format);
      if (saved) {
        setSavedFormat(format);
        setTimeout(() => setSavedFormat(null), 2000);
      }
    } catch (err) {
      console.error("Error al guardar diccionario de datos:", err);
      alert(err instanceof Error ? err.message : "Error al guardar el archivo");
    }
  };

  const handlePrintPdf = () => {
    if (!model) return;
    const html = generateDataDictionaryHtml(model, language);
    printDataDictionaryHtml(html);
  };

  const hasTables = (model?.tables.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl sm:max-w-5xl h-[86vh] max-h-[840px] min-h-[520px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 shadow-2xl p-6 pb-5 flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0 pr-10 pb-2 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-app-accent-text shrink-0" />
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
                  {dd.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  {dd.description}
                </DialogDescription>
              </div>
            </div>

            {/* Pestañas Vista Documento / Markdown */}
            <div className="inline-flex items-center bg-slate-100 dark:bg-zinc-950 p-1 rounded-lg border border-slate-200 dark:border-zinc-800 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "preview"
                    ? "bg-app-accent text-app-accent-contrast"
                    : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {dd.previewTab}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("markdown")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "markdown"
                    ? "bg-app-accent text-app-accent-contrast"
                    : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {dd.markdownTab}
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Barra de estadísticas y botones de exportación */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800/80 p-2.5 rounded-lg shrink-0 mt-1">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-400">
            <span className="font-mono uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200">
              {model?.dbEngine}
            </span>
            {model && (
              <span className="font-medium">
                {dd.statsSummary(
                  model.stats.tableCount,
                  model.stats.columnCount,
                  model.stats.relationCount
                )}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasTables}
              onClick={handleCopyMarkdown}
              className="h-8 text-xs bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {t.common.copied}
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{dd.copyMd}</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={!hasTables}
              onClick={() => handleDownload("md")}
              className="h-8 text-xs bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 gap-1.5 cursor-pointer"
            >
              {savedFormat === "md" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{dd.savedFeedback}</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-app-accent-text" />
                  <span>{dd.downloadMd}</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={!hasTables}
              onClick={() => handleDownload("html")}
              className="h-8 text-xs bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 gap-1.5 cursor-pointer"
            >
              {savedFormat === "html" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{dd.savedFeedback}</span>
                </>
              ) : (
                <>
                  <FileCode2 className="w-3.5 h-3.5 text-sky-500" />
                  <span>{dd.downloadHtml}</span>
                </>
              )}
            </Button>

            <Button
              variant="default"
              size="sm"
              disabled={!hasTables}
              onClick={handlePrintPdf}
              className="h-8 text-xs bg-app-accent hover:bg-app-accent-hover text-app-accent-contrast gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{dd.printPdf}</span>
            </Button>
          </div>
        </div>

        {model?.parseError && (
          <div className="mt-2.5 shrink-0 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">{dd.syntaxWarning}</span>
          </div>
        )}

        {/* Contenido principal con scroll */}
        <div className="flex-1 min-h-0 mt-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-950/60 overflow-y-auto">
          {!hasTables ? (
            <div className="h-full flex items-center justify-center p-8 text-center text-xs text-slate-500 dark:text-zinc-400">
              {dd.emptyState}
            </div>
          ) : activeTab === "markdown" ? (
            <pre className="p-4 text-xs font-mono leading-relaxed text-slate-800 dark:text-zinc-200 whitespace-pre-wrap break-words select-text">
              {markdownText}
            </pre>
          ) : (
            <div className="p-5 space-y-5">
              {/* Tablas */}
              {model?.tables.map((tbl) => (
                <section
                  key={tbl.name}
                  className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
                >
                  <div
                    className="px-4 py-3 bg-slate-50 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800 flex items-start justify-between gap-3"
                    style={{
                      borderLeftWidth: "4px",
                      borderLeftColor: tbl.headerColor || "#6366f1",
                    }}
                  >
                    <div className="min-w-0">
                      <h3 className="font-mono font-bold text-sm text-slate-900 dark:text-zinc-100">
                        {tbl.name}
                      </h3>
                      {tbl.note && (
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                          {tbl.note}
                        </p>
                      )}
                    </div>
                    {tbl.groupName && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-app-accent-subtle text-app-accent-text shrink-0">
                        {dd.groupPrefix} {tbl.groupName}
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-zinc-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-zinc-400 bg-slate-50/50 dark:bg-zinc-950/40">
                          <th className="py-2 px-3 font-semibold">{dd.colName}</th>
                          <th className="py-2 px-3 font-semibold">{dd.colType}</th>
                          <th className="py-2 px-3 font-semibold">{dd.colAttrs}</th>
                          <th className="py-2 px-3 font-semibold">{dd.colDefault}</th>
                          <th className="py-2 px-3 font-semibold">{dd.colRef}</th>
                          <th className="py-2 px-3 font-semibold">{dd.colDesc}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/70">
                        {tbl.columns.map((col) => (
                          <tr key={col.name} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/30">
                            <td className="py-2 px-3 font-mono font-semibold text-slate-900 dark:text-zinc-100 whitespace-nowrap">
                              {col.name}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                              {col.type}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <ColumnAttrBadges col={col} />
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                              {col.defaultValue || <span className="text-slate-400 dark:text-zinc-600">—</span>}
                            </td>
                            <td className="py-2 px-3 font-mono text-sky-600 dark:text-sky-400 whitespace-nowrap">
                              {col.fkTarget ? (
                                `→ ${col.fkTarget}`
                              ) : (
                                <span className="text-slate-400 dark:text-zinc-600">—</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-600 dark:text-zinc-300">
                              {col.note || <span className="text-slate-400 dark:text-zinc-600">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {tbl.indexes.length > 0 && (
                    <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-zinc-950/50 border-t border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-400">
                      <span className="font-semibold text-slate-700 dark:text-zinc-300 mr-2">
                        {dd.indexesLabel}
                      </span>
                      <span className="inline-flex flex-wrap gap-2">
                        {tbl.indexes.map((idx, i) => (
                          <span
                            key={`${idx.name || "idx"}-${i}`}
                            className="font-mono text-[11px] px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800"
                          >
                            {idx.name ? `${idx.name}: ` : ""}({idx.columns.join(", ")})
                            {idx.pk ? " [PK]" : idx.unique ? " [UNIQUE]" : ""}
                          </span>
                        ))}
                      </span>
                    </div>
                  )}
                </section>
              ))}

              {/* Enumeraciones */}
              {model && model.enums.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    {dd.enumsTitle}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {model.enums.map((en) => (
                      <div
                        key={en.name}
                        className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
                      >
                        <div className="px-3.5 py-2 bg-slate-50 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800 border-l-4 border-l-amber-500 font-mono font-bold text-xs">
                          {en.name}
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-zinc-800/70">
                          {en.values.map((v) => (
                            <div
                              key={v.name}
                              className="px-3.5 py-1.5 flex items-center justify-between gap-3 text-xs"
                            >
                              <span className="font-mono font-medium text-slate-800 dark:text-zinc-200">
                                {v.name}
                              </span>
                              {v.note && (
                                <span className="text-slate-500 dark:text-zinc-400 truncate">
                                  {v.note}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Relaciones */}
              {model && model.relationships.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    {dd.relationsTitle}
                  </h3>
                  <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-zinc-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-zinc-400 bg-slate-50/50 dark:bg-zinc-950/40">
                          <th className="py-2 px-3 font-semibold">{dd.relSource}</th>
                          <th className="py-2 px-3 font-semibold">{dd.relCardinality}</th>
                          <th className="py-2 px-3 font-semibold">{dd.relTarget}</th>
                          <th className="py-2 px-3 font-semibold">{dd.relRules}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/70">
                        {model.relationships.map((rel, idx) => {
                          const rules = [
                            rel.onDelete ? `ON DELETE ${rel.onDelete.toUpperCase()}` : "",
                            rel.onUpdate ? `ON UPDATE ${rel.onUpdate.toUpperCase()}` : "",
                          ]
                            .filter(Boolean)
                            .join(" · ");
                          return (
                            <tr key={`${rel.sourceTable}-${rel.targetTable}-${idx}`}>
                              <td className="py-2 px-3 font-mono text-slate-800 dark:text-zinc-200">
                                {rel.sourceTable}.{rel.sourceColumn}
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                                  {rel.cardinality.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-800 dark:text-zinc-200">
                                {rel.targetTable}.{rel.targetColumn}
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-500 dark:text-zinc-400">
                                {rules || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
