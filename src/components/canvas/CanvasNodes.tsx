import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { ListTree, StickyNote, Layers, Trash2 } from "lucide-react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useTranslation } from "@/store/useSettingsStore";
import type { EnumNode, StickyNoteNode, TableGroupNode } from "@/lib/dbmlParser";

function EnumNodeComponent({ id, data, selected }: NodeProps<EnumNode>) {
  const deleteEnum = useDiagramStore((s) => s.deleteEnum);
  const isHighlighted = useDiagramStore((s) => s.highlightedNodeId === id);
  const { t } = useTranslation();

  return (
    <div
      className={`group/card rounded-lg bg-white dark:bg-zinc-900 border transition-all duration-150 min-w-[200px] max-w-[280px] ${
        isHighlighted
          ? "border-app-accent ring-2 ring-app-accent shadow-[0_0_0_6px_var(--app-accent-ring)]"
          : selected
            ? "border-violet-500 ring-2 ring-violet-500/30"
            : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
      }`}
    >
      <div className="h-1 w-full rounded-t-lg bg-violet-500" />

      <div className="flex items-center justify-between px-3 py-2 bg-slate-50/90 dark:bg-zinc-950/70 border-b border-slate-200 dark:border-zinc-800 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ListTree className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400 shrink-0" />
          <span className="font-semibold text-xs text-slate-900 dark:text-zinc-100 truncate">
            {data.label}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/30">
            {t.canvas.enumBadge}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteEnum(data.label);
            }}
            className="p-0.5 rounded text-slate-400 opacity-0 group-hover/card:opacity-100 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
            title={t.canvas.deleteElementTooltip}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="py-1 divide-y divide-slate-100 dark:divide-zinc-800/40">
        {data.values.map((val) => (
          <div
            key={val.name}
            title={val.note || val.name}
            className="px-3 py-1 text-xs font-mono text-slate-700 dark:text-zinc-300 flex items-center justify-between gap-2"
          >
            <span className="truncate">{val.name}</span>
            {val.note && (
              <span className="text-[10px] font-sans text-slate-400 dark:text-zinc-500 truncate max-w-[110px]">
                {val.note}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NoteNodeComponent({ id, data, selected }: NodeProps<StickyNoteNode>) {
  const deleteStickyNote = useDiagramStore((s) => s.deleteStickyNote);
  const isHighlighted = useDiagramStore((s) => s.highlightedNodeId === id);
  const { t } = useTranslation();

  return (
    <div
      className={`group/card rounded-lg border transition-all duration-150 min-w-[210px] max-w-[300px] bg-amber-50/95 dark:bg-amber-950/35 ${
        isHighlighted
          ? "border-app-accent ring-2 ring-app-accent shadow-[0_0_0_6px_var(--app-accent-ring)]"
          : selected
            ? "border-amber-500 ring-2 ring-amber-500/30"
            : "border-amber-200 dark:border-amber-800/60 hover:border-amber-300 dark:hover:border-amber-700"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-amber-200/70 dark:border-amber-800/40 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <StickyNote className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="font-semibold text-xs text-amber-950 dark:text-amber-200 truncate">
            {data.label}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
            {t.canvas.noteBadge}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteStickyNote(data.label);
            }}
            className="p-0.5 rounded text-amber-600/70 opacity-0 group-hover/card:opacity-100 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
            title={t.canvas.deleteElementTooltip}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="px-3 py-2.5 text-xs text-amber-950/90 dark:text-amber-100/85 whitespace-pre-wrap leading-relaxed break-words">
        {data.content}
      </div>
    </div>
  );
}

function GroupNodeComponent({ data }: NodeProps<TableGroupNode>) {
  const deleteTableGroup = useDiagramStore((s) => s.deleteTableGroup);
  const { t } = useTranslation();
  const groupColor = data.color || "#6366f1";

  return (
    <div
      className="w-full h-full rounded-xl border-2 border-dashed pointer-events-none relative transition-colors"
      style={{
        borderColor: `${groupColor}66`,
        backgroundColor: `${groupColor}10`,
      }}
    >
      <div
        className="pointer-events-auto inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold border shadow-xs m-2 bg-white/95 dark:bg-zinc-900/95"
        style={{ borderColor: `${groupColor}55` }}
      >
        <Layers className="w-3.5 h-3.5 shrink-0" style={{ color: groupColor }} />
        <span className="text-slate-800 dark:text-zinc-100">{data.label}</span>
        <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
          {t.canvas.groupTablesCount(data.tableNames.length)}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteTableGroup(data.label);
          }}
          className="p-0.5 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
          title={t.canvas.deleteElementTooltip}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export const EnumNodeMemo = memo(EnumNodeComponent);
export const NoteNodeMemo = memo(NoteNodeComponent);
export const GroupNodeMemo = memo(GroupNodeComponent);
