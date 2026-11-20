import { invoke, isTauri } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

export interface SaveFileOptions {
  defaultFilename: string;
  filterName: string;
  extensions: string[];
  mimeType?: string;
}

/**
 * Guarda un archivo en disco de forma multiplataforma:
 * - En Tauri (Windows, Linux, macOS): abre el diálogo nativo "Guardar como..." y escribe vía Rust.
 * - En navegador web: dispara descarga estándar con Blob adjunto al DOM.
 * Retorna `true` si se guardó o `false` si el usuario canceló.
 */
export async function saveFileCrossPlatform(
  data: Blob | Uint8Array | string,
  options: SaveFileOptions
): Promise<boolean> {
  const { defaultFilename, filterName, extensions, mimeType = "text/plain" } = options;

  if (isTauri()) {
    let filePath = await save({
      title: "Guardar archivo",
      defaultPath: defaultFilename,
      filters: [{ name: filterName, extensions }],
    });

    if (!filePath) {
      return false;
    }

    // Garantizar que la ruta tenga la extensión esperada si el usuario la borró en el diálogo
    const primaryExt = extensions[0]?.toLowerCase();
    if (
      primaryExt &&
      !extensions.some((ext) => filePath!.toLowerCase().endsWith(`.${ext.toLowerCase()}`))
    ) {
      filePath = `${filePath}.${primaryExt}`;
    }

    if (typeof data === "string") {
      await invoke("save_text_file", { path: filePath, contents: data });
    } else {
      const byteView =
        data instanceof Uint8Array ? data : new Uint8Array(await data.arrayBuffer());
      if (byteView.byteLength === 0) {
        throw new Error("El archivo generado está vacío (0 bytes).");
      }
      await invoke("save_binary_file", { path: filePath, contents: Array.from(byteView) });
    }
    return true;
  }

  // Fallback para navegador web
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: mimeType })
      : data instanceof Uint8Array
        ? new Blob([data.buffer as ArrayBuffer], { type: mimeType })
        : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
