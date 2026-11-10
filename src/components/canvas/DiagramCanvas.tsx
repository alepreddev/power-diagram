import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  useStore,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Sparkles, ZoomIn, ZoomOut } from "lucide-react";
import { TableNodeMemo } from "./TableNode";
import { RelationshipEdgeMemo } from "./RelationshipEdge";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useThemeStore } from "@/store/useThemeStore";
import { layoutDiagramWithElk } from "@/lib/autoLayout";
import { Button } from "@/components/ui/button";

/** Pestaña flotante que muestra el porcentaje de zoom cada vez que cambia. */
function ZoomIndicator() {
  const zoom = useStore((state) => state.transform[2]);
  const { zoomTo } = useReactFlow();
  const zoomPercent = Math.round(zoom * 100);

  const [isVisible, setIsVisible] = useState(false);
  const [direction, setDirection] = useState<"in" | "out" | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const isReadyRef = useRef(false);
  const prevZoomRef = useRef(zoomPercent);
  const latestZoomRef = useRef(zoomPercent);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  latestZoomRef.current = zoomPercent;

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(
    (delay = 1800) => {
      clearHideTimer();
      hideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, delay);
    },
    [clearHideTimer]
  );

  // Evita disparar el indicador durante el fitView inicial al montar el lienzo
  useEffect(() => {
    const readyTimer = setTimeout(() => {
      prevZoomRef.current = latestZoomRef.current;
      isReadyRef.current = true;
    }, 250);

    return () => {
      clearTimeout(readyTimer);
      clearHideTimer();
    };
  }, [clearHideTimer]);

  useEffect(() => {
    if (!isReadyRef.current) {
      prevZoomRef.current = zoomPercent;
      return;
    }

    if (zoomPercent !== prevZoomRef.current) {
      setDirection(zoomPercent > prevZoomRef.current ? "in" : "out");
      prevZoomRef.current = zoomPercent;
      setIsVisible(true);
      if (!isHovered) {
        scheduleHide(1800);
      }
    }
  }, [zoomPercent, isHovered, scheduleHide]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    clearHideTimer();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (isVisible) {
      scheduleHide(1200);
    }
  };

  return (
    <button
      type="button"
      onClick={() => zoomTo(1, { duration: 250 })}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={`Zoom aplicado: ${zoomPercent}% (Clic para restablecer al 100%)`}
      aria-live="polite"
      className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-mono font-semibold bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 shadow-lg hover:border-indigo-400 dark:hover:border-indigo-500/60 transition-all duration-200 cursor-pointer select-none ${
        isVisible
          ? "opacity-100 translate-x-0 scale-100"
          : "opacity-0 translate-x-2 scale-95 pointer-events-none"
      }`}
    >
      {direction === "out" ? (
        <ZoomOut className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
      ) : (
        <ZoomIn className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
      )}
      <span className="tabular-nums">{zoomPercent}%</span>
    </button>
  );
}

const INITIAL_FIT_VIEW_OPTIONS = { minZoom: 1, maxZoom: 1 };
const FIT_VIEW_OPTIONS = { maxZoom: 1 };

function CanvasContent() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setNodes, saveToDatabase } =
    useDiagramStore();
  const { resolvedTheme } = useThemeStore();
  const { fitView } = useReactFlow();

  const nodeTypes = useMemo(() => ({ table: TableNodeMemo }), []);
  const edgeTypes = useMemo(() => ({ relation: RelationshipEdgeMemo }), []);

  const isDark = resolvedTheme === "dark";

  const handleAutoLayout = useCallback(async () => {
    if (nodes.length === 0) return;
    const arrangedNodes = await layoutDiagramWithElk(nodes, edges);
    setNodes(arrangedNodes);
    setTimeout(() => {
      fitView({ duration: 400, ...FIT_VIEW_OPTIONS });
      saveToDatabase();
    }, 50);
  }, [nodes, edges, setNodes, fitView, saveToDatabase]);

  return (
    <div className="relative w-full h-full bg-slate-100/90 dark:bg-zinc-950 transition-colors">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={INITIAL_FIT_VIEW_OPTIONS}
        minZoom={0.15}
        maxZoom={2}
        colorMode={resolvedTheme}
        className={resolvedTheme}
        defaultEdgeOptions={{
          type: "relation",
          style: { stroke: isDark ? "#64748b" : "#475569", strokeWidth: 1.5 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={isDark ? "#27272a" : "#cbd5e1"}
        />
        <Controls
          position="bottom-left"
          showInteractive={true}
          fitViewOptions={FIT_VIEW_OPTIONS}
        />
        <MiniMap
          nodeColor={isDark ? "#6366f1" : "#4f46e5"}
          maskColor={isDark ? "rgba(9, 9, 11, 0.75)" : "rgba(241, 245, 249, 0.75)"}
          className="!bg-white/90 !border-slate-300 dark:!bg-zinc-900/90 dark:!border-zinc-800 rounded-lg shadow-xl"
        />
      </ReactFlow>

      {/* Barra de herramientas flotante del Lienzo */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <ZoomIndicator />

        <div className="flex items-center gap-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-slate-200 dark:border-zinc-800 p-1.5 rounded-lg shadow-lg">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoLayout}
            className="h-8 gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
            title="Auto-organizar tablas matemáticamente para evitar cruce de líneas"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Auto-Ordenar</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fitView({ duration: 300, ...FIT_VIEW_OPTIONS })}
            className="h-8 gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
            title="Ajustar vista a todas las tablas"
          >
            <ZoomIn className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Centrar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DiagramCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
}

