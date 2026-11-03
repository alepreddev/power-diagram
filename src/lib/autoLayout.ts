import ELK from "elkjs/lib/elk.bundled.js";
import type { TableNode, TableEdge } from "./dbmlParser";

const elk = new ELK();

export async function layoutDiagramWithElk(
  nodes: TableNode[],
  edges: TableEdge[],
  direction: "RIGHT" | "DOWN" = "RIGHT"
): Promise<TableNode[]> {
  if (nodes.length === 0) return [];

  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction,
      "elk.spacing.nodeNode": "60",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
      "elk.spacing.edgeNode": "40",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
    },
    children: nodes.map((node) => {
      const colCount = node.data.columns?.length || 1;
      const height = 45 + colCount * 30 + 10;
      const width = 280;

      return {
        id: node.id,
        width,
        height,
      };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  try {
    const layout = await elk.layout(elkGraph);

    if (!layout.children) return nodes;

    const positionsMap = new Map<string, { x: number; y: number }>();
    for (const child of layout.children) {
      if (child.id && child.x !== undefined && child.y !== undefined) {
        positionsMap.set(child.id, { x: child.x, y: child.y });
      }
    }

    return nodes.map((node) => {
      const pos = positionsMap.get(node.id);
      return pos
        ? {
            ...node,
            position: { x: Math.round(pos.x), y: Math.round(pos.y) },
          }
        : node;
    });
  } catch (err) {
    console.error("Error al ejecutar auto-layout con ELKjs:", err);
    return nodes;
  }
}

