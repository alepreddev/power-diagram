import { memo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { X } from "lucide-react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useTranslation } from "@/store/useSettingsStore";
import type { TableEdge } from "@/lib/dbmlParser";

function RelationshipEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style = {},
}: EdgeProps<TableEdge>) {
  const [isHovered, setIsHovered] = useState(false);
  const deleteEdge = useDiagramStore((state) => state.deleteEdge);
  const openEditEdgeModal = useDiagramStore((state) => state.openEditEdgeModal);
  const { t } = useTranslation();

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const relationType = data?.relationType || "1:n";
  const hasActions = Boolean(data?.onDelete || data?.onUpdate);

  const detailsParts: string[] = [];
  if (data?.onDelete) detailsParts.push(`ON DELETE ${data.onDelete.toUpperCase()}`);
  if (data?.onUpdate) detailsParts.push(`ON UPDATE ${data.onUpdate.toUpperCase()}`);
  const detailsText = detailsParts.length > 0 ? detailsParts.join(", ") : undefined;

  const handleOpenEditor = (e: React.MouseEvent) => {
    e.stopPropagation();
    const fullEdge = useDiagramStore.getState().edges.find((item) => item.id === id);
    if (fullEdge) {
      openEditEdgeModal(fullEdge);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteEdge(id);
  };

  const isHighlighted = selected || isHovered;

  const edgeStyle = {
    ...style,
    stroke: isHighlighted ? "var(--app-accent-main, #6366f1)" : (style.stroke || "#64748b"),
    strokeWidth: isHighlighted ? 2.5 : 1.5,
    transition: "stroke 0.15s ease, stroke-width 0.15s ease",
  };

  return (
    <>
      <BaseEdge path={edgePath} style={edgeStyle} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            onClick={handleOpenEditor}
            className={`group/badge flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all duration-150 shadow-sm border cursor-pointer ${
              isHighlighted
                ? "bg-app-accent text-app-accent-contrast border-app-accent shadow-md scale-110"
                : "bg-white/95 dark:bg-zinc-900/95 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:border-app-accent-border"
            }`}
            title={t.canvas.relationTooltip(relationType, detailsText)}
          >
            {hasActions && (
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isHighlighted ? "bg-current opacity-85" : "bg-app-accent"
                }`}
              />
            )}
            <span>{relationType}</span>

            {/* Botón de eliminación rápida en la relación */}
            <button
              type="button"
              onClick={handleDelete}
              className={`p-0.5 rounded-full transition-all duration-150 cursor-pointer ${
                isHighlighted
                  ? "opacity-100 scale-100 hover:bg-rose-500 hover:text-white"
                  : "opacity-0 group-hover/badge:opacity-100 scale-75 group-hover/badge:scale-100 hover:bg-rose-500/20 text-rose-500"
              }`}
              title={t.canvas.deleteRelationTooltip}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const RelationshipEdgeMemo = memo(RelationshipEdgeComponent);
