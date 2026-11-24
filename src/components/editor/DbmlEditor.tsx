import CodeMirror, {
  EditorView,
  type ReactCodeMirrorRef,
} from "@uiw/react-codemirror";
import { AlertCircle, ArrowUpRight, Code2, Copy, Check, Wand2 } from "lucide-react";
import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useTranslation } from "@/store/useSettingsStore";
import { createDbmlEditorExtensions } from "@/lib/dbmlLanguage";
import { formatDbmlCode } from "@/lib/dbmlFormatter";
import { Button } from "@/components/ui/button";

export function DbmlEditor() {
  const { dbmlCode, setDbmlCode, syntaxError, nodes, edges } = useDiagramStore();
  const { resolvedTheme } = useThemeStore();
  const { t } = useTranslation();

  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const [copied, setCopied] = useState(false);
  const [formatted, setFormatted] = useState(false);
  const formatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (formatTimerRef.current) clearTimeout(formatTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const tableCount = nodes.filter((n) => n.type === "table").length;

  const handleFormat = useCallback(() => {
    const current = useDiagramStore.getState().dbmlCode;
    if (!current.trim()) return;

    const next = formatDbmlCode(current);
    if (next !== current) {
      setDbmlCode(next);
    }

    setFormatted(true);
    if (formatTimerRef.current) clearTimeout(formatTimerRef.current);
    formatTimerRef.current = setTimeout(() => setFormatted(false), 1800);
  }, [setDbmlCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(dbmlCode);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleJumpToError = () => {
    const view = editorRef.current?.view;
    if (!view || !syntaxError) return;

    const targetLineNumber = Math.min(
      Math.max(1, syntaxError.line ?? 1),
      view.state.doc.lines
    );
    const line = view.state.doc.line(targetLineNumber);
    const colOffset = syntaxError.column
      ? Math.min(Math.max(0, syntaxError.column - 1), line.length)
      : 0;
    const anchor = line.from + colOffset;

    view.dispatch({
      selection: { anchor, head: line.to },
      effects: EditorView.scrollIntoView(line.from, { y: "center" }),
    });
    view.focus();
  };

  const extensions = useMemo(
    () =>
      createDbmlEditorExtensions(
        () => useDiagramStore.getState().nodes,
        handleFormat
      ),
    [handleFormat]
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 transition-colors">
      {/* Header del Editor */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Code2 className="w-4 h-4 text-app-accent-text shrink-0" />
          <span className="font-semibold text-xs text-slate-800 dark:text-zinc-200 shrink-0">
            {t.editor.title}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono truncate">
            {t.editor.counts(tableCount, edges.length)}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFormat}
            disabled={!dbmlCode.trim()}
            className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
            title={t.editor.formatTitle}
          >
            {formatted ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 mr-1" />
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {t.editor.formattedBtn}
                </span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5 text-app-accent-text mr-1" />
                <span className="text-[11px]">{t.editor.formatBtn}</span>
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
            title={t.editor.copyTitle}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 mr-1" />
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {t.common.copied}
                </span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" />
                <span className="text-[11px]">{t.common.copy}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Área del editor de código */}
      <div className="flex-1 min-h-0 relative bg-white dark:bg-zinc-950 text-sm overflow-hidden">
        <div className="absolute inset-0">
          <CodeMirror
            ref={editorRef}
            value={dbmlCode}
            height="100%"
            theme={resolvedTheme}
            extensions={extensions}
            onChange={(val) => setDbmlCode(val)}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              highlightSpecialChars: true,
              history: true,
              foldGutter: true,
              drawSelection: true,
              dropCursor: true,
              allowMultipleSelections: true,
              indentOnInput: true,
              syntaxHighlighting: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              rectangularSelection: true,
              crosshairCursor: true,
              highlightActiveLine: true,
              highlightSelectionMatches: true,
              closeBracketsKeymap: true,
              defaultKeymap: true,
              searchKeymap: true,
              historyKeymap: true,
              foldKeymap: true,
              completionKeymap: true,
              lintKeymap: true,
            }}
            className="text-[13px] font-mono h-full [&_.cm-editor]:h-full [&_.cm-scroller]:h-full [&_.cm-scroller]:overflow-auto"
          />
        </div>
      </div>

      {/* Banner interactivo de error sintáctico: clic para saltar directo a la línea */}
      {syntaxError && (
        <button
          type="button"
          onClick={handleJumpToError}
          title={t.editor.jumpToErrorTitle}
          className="w-full text-left px-3 py-2 bg-red-50 hover:bg-red-100/80 border-t border-red-200 text-xs text-red-700 dark:bg-red-950/60 dark:hover:bg-red-950/90 dark:border-red-900/60 dark:text-red-300 flex items-start justify-between gap-2 shrink-0 transition-colors cursor-pointer group"
        >
          <div className="flex items-start gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-red-800 dark:text-red-200">
                {t.editor.syntaxErrorPrefix(syntaxError.line)}
              </span>{" "}
              <span className="text-red-600 dark:text-red-300/90 break-words">
                {syntaxError.message}
              </span>
            </div>
          </div>

          {syntaxError.line && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-red-200/70 dark:bg-red-900/50 text-red-800 dark:text-red-200 shrink-0 group-hover:translate-x-0.5 transition-transform">
              <span>{t.editor.goToLine(syntaxError.line)}</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          )}
        </button>
      )}
    </div>
  );
}
