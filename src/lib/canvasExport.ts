import { toCanvas, toSvg } from "html-to-image";
import { getNodesBounds, type Node } from "@xyflow/react";
import { saveFileCrossPlatform } from "./fileSave";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Convierte un Data URL base64 (`data:image/png;base64,...`) en un Uint8Array
 * y verifica que contenga la firma binaria oficial de un archivo PNG válido.
 */
function dataUrlToValidatedPngBytes(dataUrl: string): Uint8Array {
  const commaIdx = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:image/png") || commaIdx < 0) {
    throw new Error("El lienzo no generó un flujo PNG válido.");
  }

  const base64 = dataUrl.slice(commaIdx + 1);
  if (!base64) {
    throw new Error("La imagen PNG generada está vacía.");
  }

  const binaryString = window.atob(base64);
  const len = binaryString.length;
  if (len < 64) {
    throw new Error("El archivo PNG generado está truncado o incompleto.");
  }

  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Verificar firma mágica PNG (\x89PNG\r\n\x1a\n)
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) {
      throw new Error("Los bytes generados no corresponden a una cabecera PNG válida.");
    }
  }

  return bytes;
}

async function captureViewportPayload(
  viewportElement: HTMLElement,
  format: "png" | "svg",
  options: Record<string, unknown>
): Promise<Uint8Array | string> {
  const capture = async (opts: Record<string, unknown>): Promise<Uint8Array | string> => {
    if (format === "png") {
      const canvas = await toCanvas(viewportElement, opts);
      const dataUrl = canvas.toDataURL("image/png");
      return dataUrlToValidatedPngBytes(dataUrl);
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

function buildViewportExportOptions(
  viewportElement: HTMLElement,
  nodes: Node[]
): Record<string, unknown> {
  // Asegura dimensiones reales en píxeles CSS (1:1) para cada tabla
  const normalizedNodes = nodes.map((node) => {
    if (node.measured?.width && node.measured?.height) return node;

    const escapedId =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(node.id)
        : node.id.replace(/"/g, '\\"');
    const domNode = viewportElement.querySelector(
      `.react-flow__node[data-id="${escapedId}"]`
    ) as HTMLElement | null;

    const measuredWidth = domNode?.offsetWidth || node.width || 280;
    const colCount = Array.isArray(node.data?.columns) ? node.data.columns.length : 1;
    const measuredHeight = domNode?.offsetHeight || node.height || 45 + colCount * 30 + 10;

    return {
      ...node,
      width: measuredWidth,
      height: measuredHeight,
      measured: {
        width: measuredWidth,
        height: measuredHeight,
      },
    };
  });

  const nodesBounds = getNodesBounds(normalizedNodes);
  const paddingPx = 64;

  // Dimensiones naturales a escala 1:1
  const naturalWidth = Math.max(480, Math.ceil(nodesBounds.width + paddingPx * 2));
  const naturalHeight = Math.max(320, Math.ceil(nodesBounds.height + paddingPx * 2));

  // Límite de 4096 px (4K UHD) por lado: evita que visores de Windows como "Herramienta Recortes"
  // rechacen abrir el archivo por exceso de dimensiones o que el canvas de WebView2 desborde memoria
  const MAX_OUTPUT_SIDE = 4096;
  const MAX_OUTPUT_AREA = 12_582_912; // ~4096 × 3072 px

  // Si el diagrama completo ya supera 4096 px en 1:1, ajustamos zoom para que quepa entero en 4096 px
  const fitZoom = Math.min(1, MAX_OUTPUT_SIDE / naturalWidth, MAX_OUTPUT_SIDE / naturalHeight);
  const imageWidth = Math.round(naturalWidth * fitZoom);
  const imageHeight = Math.round(naturalHeight * fitZoom);

  const translateX = Math.round(
    (imageWidth - nodesBounds.width * fitZoom) / 2 - nodesBounds.x * fitZoom
  );
  const translateY = Math.round(
    (imageHeight - nodesBounds.height * fitZoom) / 2 - nodesBounds.y * fitZoom
  );

  // Para diagramas normales/medianos (fitZoom === 1), aplicamos supersampling hasta 2x (Retina)
  // manteniendo siempre las dimensiones finales en enteros exactos <= 4096 px
  const maxScaleBySide = Math.min(MAX_OUTPUT_SIDE / imageWidth, MAX_OUTPUT_SIDE / imageHeight);
  const maxScaleByArea = Math.sqrt(MAX_OUTPUT_AREA / (imageWidth * imageHeight));
  const outputScale = Math.max(1, Math.min(2, maxScaleBySide, maxScaleByArea));

  const canvasWidth = Math.round(imageWidth * outputScale);
  const canvasHeight = Math.round(imageHeight * outputScale);

  const isDark =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const backgroundColor = isDark ? "#09090b" : "#f8fafc";

  return {
    backgroundColor,
    width: imageWidth,
    height: imageHeight,
    canvasWidth,
    canvasHeight,
    pixelRatio: 1,
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      transform: `translate(${translateX}px, ${translateY}px) scale(${fitZoom})`,
      transformOrigin: "0 0",
    },
  };
}

function getViewportForExport(nodes: Node[]): HTMLElement {
  const viewportElement = document.querySelector(".react-flow__viewport") as HTMLElement | null;
  if (!viewportElement || nodes.length === 0) {
    throw new Error("No hay tablas en el diagrama para exportar.");
  }
  return viewportElement;
}

/**
 * Exporta el lienzo completo de React Flow a una imagen PNG o SVG nítida
 * capturando todas las tablas y relaciones sin importar el zoom actual.
 */
export async function exportDiagramImage(
  nodes: Node[],
  format: "png" | "svg",
  projectName: string = "diagram"
): Promise<boolean> {
  const viewportElement = getViewportForExport(nodes);
  const options = buildViewportExportOptions(viewportElement, nodes);

  const payload = await captureViewportPayload(viewportElement, format, options);
  const safeName = projectName.trim().toLowerCase().replace(/\s+/g, "_") || "diagram";

  return saveFileCrossPlatform(payload, {
    defaultFilename: `${safeName}_erd.${format}`,
    filterName: format === "png" ? "Imagen PNG" : "Imagen vectorial SVG",
    extensions: [format],
    mimeType: format === "png" ? "image/png" : "image/svg+xml",
  });
}

/**
 * Renderiza el diagrama completo como PNG y lo copia directamente al portapapeles.
 */
export async function copyDiagramImageToClipboard(nodes: Node[]): Promise<void> {
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard?.write ||
    typeof ClipboardItem === "undefined"
  ) {
    throw new Error("El portapapeles de imágenes no está disponible en este entorno.");
  }

  const viewportElement = getViewportForExport(nodes);
  const options = buildViewportExportOptions(viewportElement, nodes);
  const bytes = await captureViewportPayload(viewportElement, "png", options);
  if (typeof bytes === "string") {
    throw new Error("No se pudo generar el flujo binario PNG.");
  }

  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "image/png" });
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}
