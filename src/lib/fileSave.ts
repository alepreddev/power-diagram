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
  data: Blob | string,
  options: SaveFileOptions
): Promise<boolean> {
  const { defaultFilename, filterName, extensions, mimeType = "text/plain" } = options;

  if (isTauri()) {
    const filePath = await save({
      title: "Guardar archivo",
      defaultPath: defaultFilename,
      filters: [{ name: filterName, extensions }],
    });

    if (!filePath) {
      return false;
    }

    if (typeof data === "string") {
      await invoke("save_text_file", { path: filePath, contents: data });
    } else {
      const buffer = await data.arrayBuffer();
      const bytes = Array.from(new Uint8Array(buffer));
      await invoke("save_binary_file", { path: filePath, contents: bytes });
    }
    return true;
  }

  // Fallback para navegador web
  const blob = typeof data === "string" ? new Blob([data], { type: mimeType }) : data;
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
