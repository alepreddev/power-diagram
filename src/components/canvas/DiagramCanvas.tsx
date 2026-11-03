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
import { layoutDiagramWithElk } from "@/lib/autoLayout";
import { Button } from "@/components/ui/button";

function CanvasContent() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setNodes, saveToDatabase } =
    useDiagramStore();
  const { fitView } = useReactFlow();

  const nodeTypes = useMemo(() => ({ table: TableNodeMemo }), []);

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
    <div className="relative w-full h-full bg-zinc-950">
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
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "#64748b", strokeWidth: 1.5 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
        <Controls className="!bg-zinc-900 !border-zinc-800 !text-zinc-100 !fill-zinc-100 shadow-xl" />
        <MiniMap
          nodeColor="#6366f1"
          maskColor="rgba(9, 9, 11, 0.75)"
          className="!bg-zinc-900/90 !border-zinc-800 rounded-lg shadow-xl"
        />
      </ReactFlow>

      {/* Barra de herramientas flotante del Lienzo */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-zinc-900/90 backdrop-blur border border-zinc-800 p-1.5 rounded-lg shadow-lg">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAutoLayout}
          className="h-8 gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200"
          title="Auto-organizar tablas matemáticamente para evitar cruce de líneas"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Auto-Ordenar</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fitView({ duration: 300 })}
          className="h-8 gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200"
          title="Ajustar vista a todas las tablas"
        >
          <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
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

