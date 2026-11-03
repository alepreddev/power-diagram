import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { AlertCircle, Code2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { Button } from "@/components/ui/button";

export function DbmlEditor() {
  const { dbmlCode, setDbmlCode, syntaxError, nodes, edges } = useDiagramStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(dbmlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800">
      {/* Header del Editor */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-xs text-zinc-200">Editor DBML</span>
          <span className="text-[10px] text-zinc-500 font-mono">
            ({nodes.length} tablas, {edges.length} relaciones)
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          title="Copiar código DBML al portapapeles"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" />
              <span className="text-[11px] text-emerald-400">Copiado</span>
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
      <div className="flex-1 overflow-auto bg-zinc-950 text-sm">
        <CodeMirror
          value={dbmlCode}
          height="100%"
          theme="dark"
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
        <div className="px-3 py-2 bg-red-950/60 border-t border-red-900/60 flex items-start gap-2 text-xs text-red-300 shrink-0">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-red-200">
              Error sintáctico {syntaxError.line ? `(Línea ${syntaxError.line})` : ""}:
            </span>{" "}
            <span className="text-red-300/90">{syntaxError.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

