import ELK from "elkjs/lib/elk.bundled.js";
import { recomputeGroupNodes, type DiagramNode, type TableEdge } from "./dbmlParser";

const elk = new ELK();

export type LayoutDirection = "RIGHT" | "DOWN";
export type LayoutSpacing = "compact" | "normal" | "spacious";

export interface AutoLayoutOptions {
  direction?: LayoutDirection;
  spacing?: LayoutSpacing;
}

const SPACING_CONFIG: Record<
  LayoutSpacing,
  { nodeNode: string; betweenLayers: string; edgeNode: string }
> = {
  compact: { nodeNode: "40", betweenLayers: "70", edgeNode: "25" },
  normal: { nodeNode: "60", betweenLayers: "100", edgeNode: "40" },
  spacious: { nodeNode: "90", betweenLayers: "150", edgeNode: "60" },
};

function getElkChildDimensions(node: DiagramNode): { width: number; height: number } {
  if (node.type === "table") {
    const colCount = node.data.columns?.length || 1;
    const noteHeight = node.data.note ? 28 : 0;
    return { width: 280, height: 45 + noteHeight + colCount * 30 + 10 };
  }
  if (node.type === "enum") {
    const valCount = node.data.values?.length || 1;
    return { width: 220, height: 44 + valCount * 26 + 10 };
  }
  if (node.type === "note") {
    const lines = Math.max(2, node.data.content.split(/\r?\n/).length);
    return { width: 230, height: 48 + lines * 18 + 16 };
  }
  return { width: 280, height: 140 };
}

export async function layoutDiagramWithElk(
  nodes: DiagramNode[],
  edges: TableEdge[],
  optionsOrDirection: AutoLayoutOptions | LayoutDirection = "RIGHT"
): Promise<DiagramNode[]> {
  if (nodes.length === 0) return [];

  const options: AutoLayoutOptions =
    typeof optionsOrDirection === "string"
      ? { direction: optionsOrDirection, spacing: "normal" }
      : optionsOrDirection;

  const direction: LayoutDirection = options.direction ?? "RIGHT";
  const spacingKey: LayoutSpacing = options.spacing ?? "normal";
  const spacing = SPACING_CONFIG[spacingKey];

  const layoutableNodes = nodes.filter((node) => node.type !== "group");
  if (layoutableNodes.length === 0) return nodes;

  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction,
      "elk.spacing.nodeNode": spacing.nodeNode,
      "elk.layered.spacing.nodeNodeBetweenLayers": spacing.betweenLayers,
      "elk.spacing.edgeNode": spacing.edgeNode,
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
    },
    children: layoutableNodes.map((node) => {
      const dims = getElkChildDimensions(node);
      return {
        id: node.id,
        width: dims.width,
        height: dims.height,
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

    const arranged = nodes.map((node) => {
      if (node.type === "group") return node;
      const pos = positionsMap.get(node.id);
      return pos
        ? {
            ...node,
            position: { x: Math.round(pos.x), y: Math.round(pos.y) },
          }
        : node;
    });

    return recomputeGroupNodes(arranged);
  } catch (err) {
    console.error("Error al ejecutar auto-layout con ELKjs:", err);
    return nodes;
  }
}
