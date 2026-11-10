import { toBlob, toSvg } from "html-to-image";
import { getNodesBounds, getViewportForBounds, type Node } from "@xyflow/react";
import { saveFileCrossPlatform } from "./fileSave";

async function captureViewportBlob(
  viewportElement: HTMLElement,
  format: "png" | "svg",
  options: Record<string, unknown>
): Promise<Blob | string> {
  const capture = async (opts: Record<string, unknown>) => {
    if (format === "png") {
      const blob = await toBlob(viewportElement, opts);
      if (!blob) throw new Error("No se pudo generar el contenido PNG del diagrama.");
      return blob;
    }
    const svgDataUrl = await toSvg(viewportElement, opts);
    const commaIdx = svgDataUrl.indexOf(",");
    return commaIdx >= 0 ? decodeURIComponent(svgDataUrl.slice(commaIdx + 1)) : svgDataUrl;
  };

  try {
    return await capture(options);
  } catch (err) {
    // Reintentar omitiendo fuentes web si WebView2 falla al serializar @font-face locales
    console.warn("Reintentando exportación de imagen sin incrustar fuentes web:", err);
    return capture({ ...options, skipFonts: true });
  }
}

/**
 * Exporta el lienzo completo de React Flow a una imagen PNG o SVG de alta resolución
 * capturando todas las tablas y relaciones sin importar el zoom actual.
 */
export async function exportDiagramImage(
  nodes: Node[],
  format: "png" | "svg",
  projectName: string = "diagram"
): Promise<boolean> {
  const viewportElement = document.querySelector(".react-flow__viewport") as HTMLElement | null;
  if (!viewportElement || nodes.length === 0) {
    throw new Error("No hay tablas en el diagrama para exportar.");
  }

  // Asegura dimensiones válidas si algún nodo aún no reportó su tamaño medido
  const normalizedNodes = nodes.map((node) => {
    if (node.measured?.width && node.measured?.height) return node;
    const colCount = Array.isArray(node.data?.columns) ? node.data.columns.length : 1;
    return {
      ...node,
      width: node.width ?? 280,
      height: node.height ?? 45 + colCount * 30 + 10,
    };
  });

  const nodesBounds = getNodesBounds(normalizedNodes);
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

  const isDark =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const backgroundColor = isDark ? "#09090b" : "#f8fafc";

  const options = {
    backgroundColor,
    width: imageWidth,
    height: imageHeight,
    pixelRatio: 2,
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  };

  const payload = await captureViewportBlob(viewportElement, format, options);
  const safeName = projectName.trim().toLowerCase().replace(/\s+/g, "_") || "diagram";

  return saveFileCrossPlatform(payload, {
    defaultFilename: `${safeName}_erd.${format}`,
    filterName: format === "png" ? "Imagen PNG" : "Imagen vectorial SVG",
    extensions: [format],
    mimeType: format === "png" ? "image/png" : "image/svg+xml",
  });
}
