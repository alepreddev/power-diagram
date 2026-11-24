import { useState, useEffect, useMemo, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { Search, Database, ListTree, StickyNote, X, CornerDownLeft } from "lucide-react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useTranslation } from "@/store/useSettingsStore";
import type { DiagramNode } from "@/lib/dbmlParser";

interface CanvasSearchPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface SearchMatch {
  node: DiagramNode;
  kind: "table" | "enum" | "note";
  subtitle?: string;
}

export function CanvasSearchPalette({ open, onClose }: CanvasSearchPaletteProps) {
  const { nodes, highlightNode } = useDiagramStore();
  const { setCenter } = useReactFlow();
  const { t } = useTranslation();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      const timer = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const matches = useMemo<SearchMatch[]>(() => {
    const q = query.trim().toLowerCase();
    const result: SearchMatch[] = [];

    for (const node of nodes) {
      if (node.type === "table") {
        const tableLabel = node.data.label;
        const matchedCol = q
          ? node.data.columns.find((c) => c.name.toLowerCase().includes(q))
          : undefined;
        const labelMatch = !q || tableLabel.toLowerCase().includes(q);
        const noteMatch = Boolean(q && node.data.note?.toLowerCase().includes(q));

        if (labelMatch || noteMatch || matchedCol) {
          result.push({
            node,
            kind: "table",
            subtitle: matchedCol && !labelMatch
              ? t.canvas.searchMatchedColumn(matchedCol.name)
              : t.canvas.colsCount(node.data.columns.length),
          });
        }
      } else if (node.type === "enum") {
        const matchedVal = q
          ? node.data.values.find((v) => v.name.toLowerCase().includes(q))
          : undefined;
        if (!q || node.data.label.toLowerCase().includes(q) || matchedVal) {
          result.push({
            node,
            kind: "enum",
            subtitle: matchedVal ? matchedVal.name : t.canvas.enumBadge,
          });
        }
      } else if (node.type === "note") {
        if (
          !q ||
          node.data.label.toLowerCase().includes(q) ||
          node.data.content.toLowerCase().includes(q)
        ) {
          result.push({
            node,
            kind: "note",
            subtitle: node.data.content.split(/\r?\n/)[0]?.slice(0, 48),
          });
        }
      }
    }

    return result;
  }, [nodes, query, t.canvas]);

  useEffect(() => {
    if (selectedIndex >= matches.length) {
      setSelectedIndex(Math.max(0, matches.length - 1));
    }
  }, [matches.length, selectedIndex]);

  if (!open) return null;

  const focusNode = (match: SearchMatch) => {
    const { node } = match;
    const width =
      node.measured?.width ?? (typeof node.width === "number" ? node.width : 280);
    const height =
      node.measured?.height ?? (typeof node.height === "number" ? node.height : 200);
    const cx = node.position.x + width / 2;
    const cy = node.position.y + height / 2;

    setCenter(cx, cy, { zoom: 1, duration: 400 });
    highlightNode(node.id);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (matches.length > 0 ? (prev + 1) % matches.length : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        matches.length > 0 ? (prev - 1 + matches.length) % matches.length : 0
      );
      return;
    }
    if (e.key === "Enter" && matches[selectedIndex]) {
      e.preventDefault();
      focusNode(matches[selectedIndex]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/25 dark:bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Barra de búsqueda */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-slate-200 dark:border-zinc-800">
          <Search className="w-4 h-4 text-app-accent-text shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={t.canvas.searchPlaceholder}
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
              ESC
            </kbd>
          )}
        </div>

        {/* Lista de coincidencias */}
        <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
          {matches.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-zinc-400">
              {t.canvas.searchEmpty(query.trim())}
            </div>
          ) : (
            matches.map((match, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon =
                match.kind === "table"
                  ? Database
                  : match.kind === "enum"
                    ? ListTree
                    : StickyNote;
              const iconColor =
                match.kind === "table"
                  ? "text-app-accent-text"
                  : match.kind === "enum"
                    ? "text-violet-500 dark:text-violet-400"
                    : "text-amber-500 dark:text-amber-400";

              return (
                <button
                  key={match.node.id}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => focusNode(match)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-app-accent-subtle text-slate-900 dark:text-zinc-100"
                      : "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                    <span className="font-semibold truncate">{match.node.data.label}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {match.subtitle && (
                      <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 truncate max-w-[160px]">
                        {match.subtitle}
                      </span>
                    )}
                    {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-app-accent-text" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
