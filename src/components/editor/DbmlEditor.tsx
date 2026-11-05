import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { AlertCircle, Code2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useThemeStore } from "@/store/useThemeStore";
import { Button } from "@/components/ui/button";

export function DbmlEditor() {
  const { dbmlCode, setDbmlCode, syntaxError, nodes, edges } = useDiagramStore();
  const { resolvedTheme } = useThemeStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(dbmlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 transition-colors">
      {/* Header del Editor */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          <span className="font-semibold text-xs text-slate-800 dark:text-zinc-200">Editor DBML</span>
          <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono">
            ({nodes.length} tablas, {edges.length} relaciones)
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
          title="Copiar código DBML al portapapeles"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 mr-1" />
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 mr-1" />
              <span className="text-[11px]">Copiar</span>
            </>
          )}
        </Button>
      </div>

      {/* Área del editor de código */}
      <div className="flex-1 overflow-auto bg-white dark:bg-zinc-950 text-sm">
        <CodeMirror
          value={dbmlCode}
          height="100%"
          theme={resolvedTheme}
          extensions={[sql()]}
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
          className="text-[13px] font-mono h-full"
        />
      </div>

      {/* Banner de error de sintaxis no bloqueante */}
      {syntaxError && (
        <div className="px-3 py-2 bg-red-50 border-t border-red-200 text-xs text-red-700 dark:bg-red-950/60 dark:border-red-900/60 dark:text-red-300 flex items-start gap-2 shrink-0">
          <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-red-800 dark:text-red-200">
              Error sintáctico {syntaxError.line ? `(Línea ${syntaxError.line})` : ""}:
            </span>{" "}
            <span className="text-red-600 dark:text-red-300/90">{syntaxError.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

