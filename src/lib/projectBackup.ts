import { Parser } from "@dbml/core";
import { saveFileCrossPlatform } from "./fileSave";
import { parseDbmlToGraph, type CanvasPositions, type DiagramNode } from "./dbmlParser";
import { layoutDiagramWithElk } from "./autoLayout";

export type SupportedDbEngine = "postgres" | "mysql" | "sqlite" | "mssql";

export interface PortableDiagramFile {
  format: "power-diagram";
  version: 1;
  exportedAt: string;
  project: {
    name: string;
    db_engine: SupportedDbEngine;
  };
  diagram: {
    dbml_code: string;
    canvas_positions: CanvasPositions;
  };
}

export interface ImportedDiagramPayload {
  name: string;
  dbEngine: SupportedDbEngine;
  dbmlCode: string;
  canvasPositions: CanvasPositions;
}

function normalizeDbEngine(raw?: string | null): SupportedDbEngine {
  const clean = (raw || "").trim().toLowerCase();
  if (clean.includes("mysql") || clean.includes("mariadb")) return "mysql";
  if (clean.includes("sqlite")) return "sqlite";
  if (clean.includes("mssql") || clean.includes("sqlserver") || clean.includes("sql server")) {
    return "mssql";
  }
  return "postgres";
}

function slugifyFilename(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "diagrama";
}

function deriveProjectNameFromFilename(filename: string): string {
  const base = filename
    .replace(/\.pdiag\.json$/i, "")
    .replace(/\.(json|dbml)$/i, "")
    .trim();
  return base || "Diagrama Importado";
}

function sanitizeCanvasPositions(raw: unknown): CanvasPositions {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const sanitized: CanvasPositions = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!key || !val || typeof val !== "object") continue;
    const coords = val as { x?: unknown; y?: unknown };
    if (
      typeof coords.x === "number" &&
      Number.isFinite(coords.x) &&
      typeof coords.y === "number" &&
      Number.isFinite(coords.y)
    ) {
      sanitized[key] = {
        x: Math.round(coords.x),
        y: Math.round(coords.y),
      };
    }
  }
  return sanitized;
}

export function extractNodePositions(nodes: DiagramNode[]): CanvasPositions {
  const map: CanvasPositions = {};
  for (const node of nodes) {
    if (node.type === "group") continue;
    map[node.id] = {
      x: Math.round(node.position.x),
      y: Math.round(node.position.y),
    };
  }
  return map;
}

export function serializePortableDiagram(
  project: { name: string; db_engine: string },
  dbmlCode: string,
  canvasPositions: CanvasPositions
): string {
  const payload: PortableDiagramFile = {
    format: "power-diagram",
    version: 1,
    exportedAt: new Date().toISOString(),
    project: {
      name: project.name.trim() || "Diagrama",
      db_engine: normalizeDbEngine(project.db_engine),
    },
    diagram: {
      dbml_code: dbmlCode,
      canvas_positions: sanitizeCanvasPositions(canvasPositions),
    },
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}

export async function exportProjectAsPdiag(
  project: { name: string; db_engine: string },
  dbmlCode: string,
  canvasPositions: CanvasPositions
): Promise<boolean> {
  const jsonText = serializePortableDiagram(project, dbmlCode, canvasPositions);
  const slug = slugifyFilename(project.name);

  return saveFileCrossPlatform(jsonText, {
    defaultFilename: `${slug}.pdiag.json`,
    filterName: "Power Diagram Backup (*.pdiag.json, *.json)",
    extensions: ["json"],
    mimeType: "application/json;charset=utf-8",
  });
}

export async function exportProjectAsDbml(
  projectName: string,
  dbmlCode: string
): Promise<boolean> {
  const slug = slugifyFilename(projectName);
  const content = dbmlCode.endsWith("\n") ? dbmlCode : `${dbmlCode}\n`;

  return saveFileCrossPlatform(content, {
    defaultFilename: `${slug}.dbml`,
    filterName: "DBML Schema (*.dbml)",
    extensions: ["dbml"],
    mimeType: "text/plain;charset=utf-8",
  });
}

function detectEngineFromDbmlAst(dbmlCode: string): SupportedDbEngine {
  try {
    const db = Parser.parse(dbmlCode, "dbmlv2") as unknown as {
      databaseType?: string;
    };
    if (db.databaseType) {
      return normalizeDbEngine(db.databaseType);
    }
  } catch {
    // Si no tiene bloque Project o hay error menor, buscar directiva database_type por regex
    const match = /database_type\s*:\s*['"`]([^'"`]+)['"`]/i.exec(dbmlCode);
    if (match?.[1]) {
      return normalizeDbEngine(match[1]);
    }
  }
  return "postgres";
}

function detectProjectNameFromDbmlAst(dbmlCode: string): string | null {
  try {
    const db = Parser.parse(dbmlCode, "dbmlv2") as unknown as {
      name?: string;
    };
    if (db.name && typeof db.name === "string" && db.name.trim()) {
      return db.name.trim();
    }
  } catch {
    const match = /^\s*Project\s+(?:"([^"]+)"|'([^']+)'|([A-Za-z0-9_-]+))\s*\{/im.exec(dbmlCode);
    const extracted = match?.[1] || match?.[2] || match?.[3];
    if (extracted?.trim()) return extracted.trim();
  }
  return null;
}

/**
 * Parsea y valida un archivo `.pdiag.json` o `.dbml` seleccionado por el usuario.
 * Si es un `.dbml` puro (o un respaldo sin coordenadas), calcula automáticamente un layout limpio con ELK.
 */
export async function parseImportedDiagramFile(
  filename: string,
  rawContent: string
): Promise<ImportedDiagramPayload> {
  const trimmed = rawContent.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    throw new Error("EMPTY_FILE");
  }

  const lowerName = filename.toLowerCase();
  const looksLikeJson =
    lowerName.endsWith(".json") || (trimmed.startsWith("{") && trimmed.endsWith("}"));

  let name = deriveProjectNameFromFilename(filename);
  let dbEngine: SupportedDbEngine = "postgres";
  let dbmlCode = "";
  let canvasPositions: CanvasPositions = {};

  if (looksLikeJson) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error("INVALID_JSON");
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("INVALID_BACKUP_SCHEMA");
    }

    const record = parsed as Record<string, unknown>;
    const projectObj =
      record.project && typeof record.project === "object"
        ? (record.project as Record<string, unknown>)
        : null;
    const diagramObj =
      record.diagram && typeof record.diagram === "object"
        ? (record.diagram as Record<string, unknown>)
        : null;

    const extractedDbml =
      typeof diagramObj?.dbml_code === "string"
        ? diagramObj.dbml_code
        : typeof record.dbml_code === "string"
          ? record.dbml_code
          : null;

    if (extractedDbml === null) {
      throw new Error("INVALID_BACKUP_SCHEMA");
    }

    dbmlCode = extractedDbml;
    if (typeof projectObj?.name === "string" && projectObj.name.trim()) {
      name = projectObj.name.trim();
    } else if (typeof record.name === "string" && record.name.trim()) {
      name = record.name.trim();
    }

    const rawEngine =
      typeof projectObj?.db_engine === "string"
        ? projectObj.db_engine
        : typeof record.db_engine === "string"
          ? record.db_engine
          : undefined;
    dbEngine = rawEngine ? normalizeDbEngine(rawEngine) : detectEngineFromDbmlAst(dbmlCode);

    const rawPositions =
      diagramObj?.canvas_positions ?? diagramObj?.canvas_json ?? record.canvas_positions;
    if (typeof rawPositions === "string") {
      try {
        canvasPositions = sanitizeCanvasPositions(JSON.parse(rawPositions));
      } catch {
        canvasPositions = {};
      }
    } else {
      canvasPositions = sanitizeCanvasPositions(rawPositions);
    }
  } else {
    // Archivo .dbml plano
    dbmlCode = rawContent.replace(/^\uFEFF/, "");
    const astProjectName = detectProjectNameFromDbmlAst(dbmlCode);
    if (astProjectName) {
      name = astProjectName;
    }
    dbEngine = detectEngineFromDbmlAst(dbmlCode);
  }

  // Si hay código DBML válido pero no se incluyeron posiciones guardadas, calcular auto-layout inicial con ELK
  if (Object.keys(canvasPositions).length === 0 && dbmlCode.trim()) {
    const graph = parseDbmlToGraph(dbmlCode, [], {});
    if (!graph.error && graph.nodes.length > 0) {
      try {
        const arrangedNodes = await layoutDiagramWithElk(graph.nodes, graph.edges);
        canvasPositions = extractNodePositions(arrangedNodes);
      } catch {
        canvasPositions = extractNodePositions(graph.nodes);
      }
    }
  }

  return {
    name,
    dbEngine,
    dbmlCode,
    canvasPositions,
  };
}
