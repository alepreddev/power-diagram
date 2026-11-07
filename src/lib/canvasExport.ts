import { toPng, toSvg } from "html-to-image";
import { getNodesBounds, getViewportForBounds, type Node } from "@xyflow/react";

/**
 * Exporta el lienzo completo de React Flow a una imagen PNG o SVG con fondo oscuro
 * capturando todas las tablas y relaciones sin importar el zoom actual.
 */
export async function exportDiagramImage(
  nodes: Node[],
  format: "png" | "svg",
  projectName: string = "diagram"
): Promise<void> {
  const viewportElement = document.querySelector(".react-flow__viewport") as HTMLElement | null;
  if (!viewportElement || nodes.length === 0) {
    throw new Error("No hay tablas en el diagrama para exportar.");
  }

  const nodesBounds = getNodesBounds(nodes);
  const padding = 60;
  const imageWidth = Math.max(800, Math.round(nodesBounds.width + padding * 2));
  const imageHeight = Math.max(600, Math.round(nodesBounds.height + padding * 2));

  const viewport = getViewportForBounds(
    nodesBounds,
    imageWidth,
    imageHeight,
    0.2,
    2,
    padding
  );

  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const backgroundColor = isDark ? "#09090b" : "#f8fafc";

  const options = {
    backgroundColor,
    width: imageWidth,
    height: imageHeight,
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  };

  const dataUrl =
    format === "png"
      ? await toPng(viewportElement, options)
      : await toSvg(viewportElement, options);

  const a = document.createElement("a");
  a.setAttribute("download", `${projectName.toLowerCase().replace(/\s+/g, "_")}_erd.${format}`);
  a.setAttribute("href", dataUrl);
  a.click();
}

