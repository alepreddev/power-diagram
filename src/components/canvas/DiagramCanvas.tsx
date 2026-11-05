import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Sparkles, ZoomIn } from "lucide-react";
import { TableNodeMemo } from "./TableNode";
import { useDiagramStore } from "@/store/useDiagramStore";
import { useThemeStore } from "@/store/useThemeStore";
import { layoutDiagramWithElk } from "@/lib/autoLayout";
import { Button } from "@/components/ui/button";

function CanvasContent() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setNodes, saveToDatabase } =
    useDiagramStore();
  const { resolvedTheme } = useThemeStore();
  const { fitView } = useReactFlow();

  const nodeTypes = useMemo(() => ({ table: TableNodeMemo }), []);

  const isDark = resolvedTheme === "dark";

  const handleAutoLayout = useCallback(async () => {
    if (nodes.length === 0) return;
    const arrangedNodes = await layoutDiagramWithElk(nodes, edges);
    setNodes(arrangedNodes);
    setTimeout(() => {
      fitView({ duration: 400 });
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
        fitView
        minZoom={0.15}
        maxZoom={2}
        colorMode={resolvedTheme}
        className={resolvedTheme}
        defaultEdgeOptions={{
          type: "smoothstep",
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
        />
        <MiniMap
          nodeColor={isDark ? "#6366f1" : "#4f46e5"}
          maskColor={isDark ? "rgba(9, 9, 11, 0.75)" : "rgba(241, 245, 249, 0.75)"}
          className="!bg-white/90 !border-slate-300 dark:!bg-zinc-900/90 dark:!border-zinc-800 rounded-lg shadow-xl"
        />
      </ReactFlow>

      {/* Barra de herramientas flotante del Lienzo */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-slate-200 dark:border-zinc-800 p-1.5 rounded-lg shadow-lg">
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
          onClick={() => fitView({ duration: 300 })}
          className="h-8 gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
          title="Ajustar vista a todas las tablas"
        >
          <ZoomIn className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Centrar</span>
        </Button>
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

