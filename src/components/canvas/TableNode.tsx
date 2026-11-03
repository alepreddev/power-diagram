import { memo, useMemo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Key, Database, Hash, Type, Calendar, ToggleLeft, FileText, Settings } from "lucide-react";
import type { TableNode, ColumnData } from "@/lib/dbmlParser";
import { useDiagramStore } from "@/store/useDiagramStore";

// Selector de iconos según el tipo de dato SQL/DBML
function getTypeIcon(typeName: string) {
  const lower = typeName.toLowerCase();
  if (lower.includes("int") || lower.includes("serial") || lower.includes("num") || lower.includes("float") || lower.includes("decimal")) {
    return <Hash className="w-3 h-3 text-emerald-400/80" />;
  }
  if (lower.includes("char") || lower.includes("text") || lower.includes("string")) {
    return <Type className="w-3 h-3 text-sky-400/80" />;
  }
  if (lower.includes("time") || lower.includes("date")) {
    return <Calendar className="w-3 h-3 text-amber-400/80" />;
  }
  if (lower.includes("bool")) {
    return <ToggleLeft className="w-3 h-3 text-purple-400/80" />;
  }
  return <FileText className="w-3 h-3 text-zinc-400/80" />;
}

interface ColumnRowProps {
  column: ColumnData;
  isLeftConnected: boolean;
  isRightConnected: boolean;
}

function ColumnRow({ column, isLeftConnected, isRightConnected }: ColumnRowProps) {
  return (
    <div className="relative group/col flex items-center justify-between px-3 py-1.5 hover:bg-zinc-800/60 transition-colors border-b border-zinc-800/40 last:border-b-0 text-xs">
      {/* Handle Izquierdo (Target): solo visible si está conectado o al pasar el cursor */}
      <Handle
        type="target"
        position={Position.Left}
        id={`${column.name}-target`}
        className={`!w-2 !h-2 !-left-1 !bg-indigo-400 !border-2 !border-zinc-950 rounded-full cursor-crosshair transition-all duration-150 ${
          isLeftConnected
            ? "!opacity-100 !scale-100 shadow-[0_0_6px_rgba(129,140,248,0.8)]"
            : "!opacity-0 group-hover/col:!opacity-100 !scale-75 group-hover/col:!scale-125"
        }`}
      />

      {/* Nombre y símbolo de la columna */}
      <div className="flex items-center gap-2 min-w-0 pr-2">
        {column.pk ? (
          <span title="Primary Key">
            <Key className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400/20" />
          </span>
        ) : (
          <span className="shrink-0">{getTypeIcon(column.type)}</span>
        )}

        <span
          className={`truncate font-medium ${
            column.pk ? "text-zinc-100 font-semibold" : "text-zinc-300"
          }`}
        >
          {column.name}
        </span>
      </div>

      {/* Tipo de dato y Constraints */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="font-mono text-[11px] text-zinc-400 bg-zinc-950/60 px-1.5 py-0.5 rounded border border-zinc-800/50">
          {column.type}
        </span>

        {column.pk && (
          <span className="text-[9px] font-bold tracking-wider px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
            PK
          </span>
        )}

        {column.unique && !column.pk && (
          <span className="text-[9px] font-bold tracking-wider px-1 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
            UQ
          </span>
        )}

        {column.notNull && !column.pk && (
          <span className="text-[9px] font-bold tracking-wider px-1 py-0.2 rounded bg-zinc-800 text-zinc-400">
            NN
          </span>
        )}
      </div>

      {/* Handle Derecho (Source): solo visible si está conectado o al pasar el cursor */}
      <Handle
        type="source"
        position={Position.Right}
        id={`${column.name}-source`}
        className={`!w-2 !h-2 !-right-1 !bg-indigo-400 !border-2 !border-zinc-950 rounded-full cursor-crosshair transition-all duration-150 ${
          isRightConnected
            ? "!opacity-100 !scale-100 shadow-[0_0_6px_rgba(129,140,248,0.8)]"
            : "!opacity-0 group-hover/col:!opacity-100 !scale-75 group-hover/col:!scale-125"
        }`}
      />
    </div>
  );
}

function TableNodeComponent({ data, selected }: NodeProps<TableNode>) {
  const headerColor = data.headerColor || "#4f46e5"; // Indigo por defecto
  const openEditTableModal = useDiagramStore((state) => state.openEditTableModal);
  const edges = useDiagramStore((state) => state.edges);

  const tableName = data.label;

  // Mapear los handles que tienen relaciones activas
  const connectedHandles = useMemo(() => {
    const set = new Set<string>();
    for (const edge of edges) {
      if (edge.source === tableName && edge.sourceHandle) {
        set.add(edge.sourceHandle);
      }
      if (edge.target === tableName && edge.targetHandle) {
        set.add(edge.targetHandle);
      }
    }
    return set;
  }, [edges, tableName]);

  return (
    <div
      className={`rounded-lg bg-zinc-900 border transition-all duration-150 min-w-[240px] max-w-[340px] shadow-2xl ${
        selected
          ? "border-indigo-500 ring-2 ring-indigo-500/30 shadow-indigo-500/10"
          : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      {/* Barra superior de acento de color */}
      <div
        className="h-1 w-full rounded-t-lg"
        style={{ backgroundColor: headerColor }}
      />

      {/* Encabezado de la tabla */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-950/70 border-b border-zinc-800">
        <div className="flex items-center gap-2 min-w-0">
          <Database className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="font-semibold text-xs tracking-wide text-zinc-100 truncate">
            {data.label}
          </span>
          {data.schema && (
            <span className="text-[10px] text-zinc-500 font-mono">
              ({data.schema})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-zinc-400 font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded">
            {data.columns.length} cols
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openEditTableModal(data);
            }}
            className="p-0.5 rounded text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 transition-colors focus:outline-none cursor-pointer"
            title="Editar características de la tabla"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Lista de columnas */}
      <div className="py-1">
        {data.columns.length === 0 ? (
          <div className="px-3 py-2 text-center text-zinc-500 text-xs italic">
            Sin columnas definidas
          </div>
        ) : (
          data.columns.map((col) => (
            <ColumnRow
              key={col.name}
              column={col}
              isLeftConnected={connectedHandles.has(`${col.name}-target`)}
              isRightConnected={connectedHandles.has(`${col.name}-source`)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export const TableNodeMemo = memo(TableNodeComponent);


