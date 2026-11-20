import { Parser } from "@dbml/core";
import type { Node, Edge } from "@xyflow/react";

export interface ColumnData {
  name: string;
  type: string;
  pk: boolean;
  unique: boolean;
  notNull: boolean;
  increment: boolean;
  note?: string;
}

export interface TableNodeData {
  label: string;
  schema?: string;
  headerColor?: string;
  note?: string;
  columns: ColumnData[];
  [key: string]: unknown;
}

export type TableNode = Node<TableNodeData, "table">;

export type RelationshipType = "1:1" | "1:n" | "n:1" | "n:m";

export interface RelationshipEdgeData {
  relationType: RelationshipType;
  sourceColumn: string;
  targetColumn: string;
  [key: string]: unknown;
}

export type TableEdge = Edge<RelationshipEdgeData>;

export interface ParserError {
  message: string;
  line?: number;
  column?: number;
}

export interface ParseResult {
  nodes: TableNode[];
  edges: TableEdge[];
  error: ParserError | null;
}

export interface CanvasPositions {
  [tableName: string]: { x: number; y: number };
}

/**
 * Parsea el código DBML y lo transforma en Nodos y Aristas para React Flow.
 * Si ocurre un error de sintaxis, no borra el diagrama: conserva los nodos previos
 * y retorna el objeto de error para mostrarlo en la UI.
 */
export function parseDbmlToGraph(
  dbmlCode: string,
  existingNodes: TableNode[] = [],
  savedPositions: CanvasPositions = {}
): ParseResult {
  if (!dbmlCode || !dbmlCode.trim()) {
    return { nodes: [], edges: [], error: null };
  }

  try {
    const database = Parser.parse(dbmlCode, "dbml");
    const existingPositionsMap = new Map<string, { x: number; y: number }>();

    // 1. Priorizar posiciones del estado actual en el canvas
    for (const node of existingNodes) {
      existingPositionsMap.set(node.id, { x: node.position.x, y: node.position.y });
    }

    // 2. Si no están en el estado actual, buscar en las guardadas de SQLite
    for (const [tableName, pos] of Object.entries(savedPositions)) {
      if (!existingPositionsMap.has(tableName)) {
        existingPositionsMap.set(tableName, pos);
      }
    }

    const nodes: TableNode[] = [];
    const edges: TableEdge[] = [];
    let tableIndex = 0;

    for (const schema of database.schemas) {
      for (const table of schema.tables) {
        const tableName = table.name;
        const savedPos = existingPositionsMap.get(tableName);

        // Posición calculada en cuadrícula limpia si la tabla es nueva
        const defaultPosition = {
          x: (tableIndex % 3) * 360 + 50,
          y: Math.floor(tableIndex / 3) * 300 + 50,
        };

        // Extraer PKs y UNIQUE de una sola columna declarados en bloques Indexes
        const indexPkCols = new Set<string>();
        const indexUniqueCols = new Set<string>();
        for (const idx of table.indexes || []) {
          const colNames = (idx.columns || [])
            .map((c) => (typeof c.value === "string" ? c.value.trim().toLowerCase() : ""))
            .filter(Boolean);
          if (idx.pk) {
            for (const c of colNames) indexPkCols.add(c);
          }
          if (idx.unique && colNames.length === 1) {
            indexUniqueCols.add(colNames[0]);
          }
        }

        const columns: ColumnData[] = table.fields.map((field) => {
          let typeName = "text";
          if (field.type) {
            typeName = typeof field.type === "string" ? field.type : field.type.type_name || "text";
          }
          const fieldLower = field.name.toLowerCase();
          const isPk = Boolean(field.pk) || indexPkCols.has(fieldLower);
          const isUnique = Boolean(field.unique) || indexUniqueCols.has(fieldLower);

          return {
            name: field.name,
            type: typeName,
            pk: isPk,
            unique: isUnique,
            notNull: Boolean(field.not_null) || isPk,
            increment: Boolean(field.increment),
            note: field.note || undefined,
          };
        });

        nodes.push({
          id: tableName,
          type: "table",
          position: savedPos || defaultPosition,
          data: {
            label: tableName,
            schema: schema.name || undefined,
            headerColor: (table.headerColor as unknown as string) || undefined,
            note: table.note || undefined,
            columns,
          },
        });

        tableIndex++;
      }

      // Procesar relaciones (Refs)
      for (const ref of schema.refs) {
        if (!ref.endpoints || ref.endpoints.length < 2) continue;

        const [ep1, ep2] = ref.endpoints;
        const sourceTable = ep1.tableName;
        const targetTable = ep2.tableName;
        const sourceCol = ep1.fieldNames?.[0] || "";
        const targetCol = ep2.fieldNames?.[0] || "";

        if (!sourceTable || !targetTable || !sourceCol || !targetCol) continue;

        // Determinar cardinalidad
        let relationType: RelationshipType = "1:n";
        if (ep1.relation === "1" && ep2.relation === "1") {
          relationType = "1:1";
        } else if (ep1.relation === "*" && ep2.relation === "1") {
          relationType = "n:1";
        } else if (ep1.relation === "1" && ep2.relation === "*") {
          relationType = "1:n";
        } else if (ep1.relation === "*" && ep2.relation === "*") {
          relationType = "n:m";
        }

        const edgeId = `ref-${sourceTable}.${sourceCol}-${targetTable}.${targetCol}`;

        edges.push({
          id: edgeId,
          type: "relation",
          source: sourceTable,
          target: targetTable,
          sourceHandle: `${sourceCol}-source`,
          targetHandle: `${targetCol}-target`,
          animated: false,
          data: {
            relationType,
            sourceColumn: sourceCol,
            targetColumn: targetCol,
          },
          style: { stroke: "#64748b", strokeWidth: 1.5 },
        });
      }
    }

    return { nodes, edges, error: null };
  } catch (err: unknown) {
    const errorObj = err as {
      message?: string;
      diags?: Array<{
        message?: string;
        location?: { start?: { line?: number; column?: number } };
      }>;
    };

    let errorMessage = errorObj.message || "Error sintáctico al compilar DBML";
    let line: number | undefined;
    let column: number | undefined;

    if (errorObj.diags && errorObj.diags.length > 0) {
      const diag = errorObj.diags[0];
      if (diag.message) errorMessage = diag.message;
      line = diag.location?.start?.line;
      column = diag.location?.start?.column;
    }

    // Regla Senior: Conservamos los nodos existentes en vez de borrar el diagrama
    return {
      nodes: existingNodes,
      edges: [],
      error: {
        message: errorMessage,
        line,
        column,
      },
    };
  }
}

/**
 * Formatea un identificador (tabla o columna) para DBML, envolviéndolo en comillas
 * dobles solo cuando contiene espacios o caracteres especiales.
 */
export function formatDbmlIdentifier(name: string): string {
  const clean = name.trim();
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(clean)) {
    return clean;
  }
  const unquoted =
    clean.startsWith('"') && clean.endsWith('"') ? clean.slice(1, -1).replace(/""/g, '"') : clean;
  return `"${unquoted.replace(/"/g, '\\"')}"`;
}

/**
 * Normaliza nombres de tipos SQL verbosos o específicos de motor a tipos DBML limpios,
 * detectando también si el tipo lleva implícito el autoincremento.
 */
export function normalizeSqlTypeName(rawType: string): { type: string; isIncrement: boolean } {
  let t = (rawType || "varchar").trim();
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
    t = t.slice(1, -1).trim();
  }

  let isIncrement = false;
  if (/\bIDENTITY\b/i.test(t) || /\bAUTO_?INCREMENT\b/i.test(t)) {
    isIncrement = true;
    t = t
      .replace(/\s*\bIDENTITY\s*(?:\(\s*-?\d+\s*,\s*-?\d+\s*\))?/gi, "")
      .replace(/\s*\bAUTO_?INCREMENT\b/gi, "")
      .trim();
  }

  // Columnas calculadas en SQL Server (AS (...) PERSISTED)
  if (/^AS\b/i.test(t)) {
    return { type: "varchar", isIncrement: false };
  }

  // Quitar modificadores que rompen tipos de una sola palabra en DBML
  t = t
    .replace(/\s+\b(?:UNSIGNED|ZEROFILL|VARYING)\b/gi, (match) =>
      /VARYING/i.test(match) ? match : ""
    )
    .replace(/\s+/g, " ")
    .trim();

  // Equivalencias estándar de tipos compuestos a tipos concisos compatibles con DBML
  t = t
    .replace(/^character\s+varying\b/i, "varchar")
    .replace(/^char\s+varying\b/i, "varchar")
    .replace(/^national\s+character\s+varying\b/i, "nvarchar")
    .replace(/^national\s+varchar\b/i, "nvarchar")
    .replace(/^national\s+character\b/i, "nchar")
    .replace(/^character\b/i, "char")
    .replace(/^timestamp\s+without\s+time\s+zone\b/i, "timestamp")
    .replace(/^timestamp\s+with\s+time\s+zone\b/i, "timestamptz")
    .replace(/^time\s+without\s+time\s+zone\b/i, "time")
    .replace(/^time\s+with\s+time\s+zone\b/i, "timetz")
    .replace(/^double\s+precision\b/i, "double")
    .replace(/^long\s+varchar\b/i, "text")
    .replace(/^long\s+varbinary\b/i, "blob")
    .replace(/\s*\(\s*max\s*\)/gi, "(max)")
    .replace(/\s*\(\s*([^)]*?)\s*\)/g, (_m, args: string) => `(${args.replace(/\s+/g, "")})`);

  if (/^(?:small|big)?serial[248]?$/i.test(t)) {
    isIncrement = true;
  }

  if (!t) t = "varchar";
  return { type: t, isIncrement };
}

/**
 * Formatea un tipo de columna para DBML. Si tras normalizar aún contiene espacios,
 * lo envuelve entre comillas dobles para evitar errores sintácticos en el parser DBML.
 */
export function formatDbmlType(rawType: string): string {
  const { type } = normalizeSqlTypeName(rawType);
  if (/\s/.test(type) && !(type.startsWith('"') && type.endsWith('"'))) {
    return `"${type.replace(/"/g, '\\"')}"`;
  }
  return type;
}

/**
 * Limpia un texto de nota/comentario para insertarlo en `note: '...'` de una sola línea.
 */
function sanitizeNoteValue(note: string): string {
  return note
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\s*\r?\n\s*/g, " ")
    .trim();
}

/**
 * Genera el bloque de texto DBML para una tabla con opciones de settings (color, nota).
 */
export function generateTableBlock(
  tableName: string,
  columns: ColumnData[],
  headerColor?: string,
  note?: string
): string {
  const settings: string[] = [];
  if (headerColor) settings.push(`headercolor: ${headerColor}`);
  if (note && note.trim()) settings.push(`note: '${sanitizeNoteValue(note)}'`);
  const settingsStr = settings.length > 0 ? ` [${settings.join(", ")}]` : "";

  const formattedColumns = columns
    .map((col) => {
      const constraints: string[] = [];
      if (col.pk) constraints.push("pk");
      if (col.increment) constraints.push("increment");
      if (col.unique) constraints.push("unique");
      if (col.notNull) constraints.push("not null");
      if (col.note && col.note.trim()) constraints.push(`note: '${sanitizeNoteValue(col.note)}'`);

      const constraintStr = constraints.length > 0 ? ` [${constraints.join(", ")}]` : "";
      const colName = formatDbmlIdentifier(col.name);
      const colType = formatDbmlType(col.type || "varchar");
      return `  ${colName} ${colType}${constraintStr}`;
    })
    .join("\n");

  return `Table ${formatDbmlIdentifier(tableName)}${settingsStr} {\n${formattedColumns}\n}`;
}

/**
 * Agrega de manera limpia una nueva tabla al final del código DBML
 * sin reformatear ni alterar el código existente del usuario.
 */
export function appendTableToDbml(
  currentDbml: string,
  tableName: string,
  columns: ColumnData[],
  headerColor?: string,
  note?: string
): string {
  const tableBlock = generateTableBlock(tableName, columns, headerColor, note);
  return `${currentDbml.trimEnd()}\n\n${tableBlock}\n`;
}

/**
 * Actualiza una tabla existente en el código DBML reemplazando su bloque sin
 * alterar comentarios ni el resto del documento. Si el nombre de la tabla cambia,
 * actualiza automáticamente las directivas Ref asociadas.
 */
export function updateTableInDbml(
  currentDbml: string,
  oldTableName: string,
  newTableName: string,
  columns: ColumnData[],
  headerColor?: string,
  note?: string
): string {
  const newBlock = generateTableBlock(newTableName, columns, headerColor, note);

  // Expresión regular que coincide con: Table [schema.]tableName [settings] { ... }
  const tableRegex = new RegExp(
    `\\bTable\\s+(?:[\\w_]+\\.)?["']?${oldTableName}["']?\\s*(?:\\[[^\\]]*\\])?\\s*\\{[^\\}]*\\}`,
    "i"
  );

  let updated = currentDbml;
  if (tableRegex.test(updated)) {
    updated = updated.replace(tableRegex, newBlock);
  } else {
    // Si no coincidió, anexar al final
    updated = `${updated.trimEnd()}\n\n${newBlock}\n`;
  }

  // Si el nombre de la tabla cambió, actualizar todas las relaciones Ref existentes
  if (oldTableName.toLowerCase() !== newTableName.toLowerCase()) {
    const refSourceRegex = new RegExp(`\\b${oldTableName}\\.`, "gi");
    updated = updated.replace(refSourceRegex, `${newTableName}.`);
  }

  return updated;
}

/**
 * Elimina una tabla y todas sus referencias asociadas (Ref) del código DBML.
 */
export function removeTableFromDbml(currentDbml: string, tableName: string): string {
  const tableRegex = new RegExp(
    `\\bTable\\s+(?:[\\w_]+\\.)?["']?${tableName}["']?\\s*(?:\\[[^\\]]*\\])?\\s*\\{[^\\}]*\\}\\s*`,
    "i"
  );

  let updated = currentDbml.replace(tableRegex, "");

  // Eliminar directivas Ref asociadas a esta tabla
  const refRegex1 = new RegExp(
    `^\\s*Ref(?:\\s+[\\w_]+)?:\\s*(?:[\\w_]+\\.)?${tableName}\\.[\\w_]+\\s*[><-]\\s*.*$\\n?`,
    "gmi"
  );
  const refRegex2 = new RegExp(
    `^\\s*Ref(?:\\s+[\\w_]+)?:\\s*.*\\s*[><-]\\s*(?:[\\w_]+\\.)?${tableName}\\.[\\w_]+.*$\\n?`,
    "gmi"
  );

  updated = updated.replace(refRegex1, "").replace(refRegex2, "");
  return updated.trimEnd() + "\n";
}

/**
 * Agrega una nueva relación (Ref) al final del código DBML.
 */
export function appendRefToDbml(
  currentDbml: string,
  sourceTable: string,
  sourceCol: string,
  targetTable: string,
  targetCol: string,
  relation: ">" | "<" | "-" = ">"
): string {
  const refLine = `\nRef: ${sourceTable}.${sourceCol} ${relation} ${targetTable}.${targetCol}\n`;
  return `${currentDbml.trimEnd()}\n${refLine}`;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Elimina quirúrgicamente una relación específica (Ref) entre dos tablas y columnas del código DBML.
 * Contempla relaciones directas, invertidas e inline en definiciones de columnas.
 */
export function removeRefFromDbml(
  currentDbml: string,
  sourceTable: string,
  sourceCol: string,
  targetTable: string,
  targetCol: string
): string {
  const sTable = escapeRegExp(sourceTable);
  const sCol = escapeRegExp(sourceCol);
  const tTable = escapeRegExp(targetTable);
  const tCol = escapeRegExp(targetCol);

  // 1. Directiva Ref: fuente -> destino
  const refRegex1 = new RegExp(
    `^\\s*Ref(?:\\s+[\\w_]+)?:\\s*(?:[\\w_]+\\.)?["']?${sTable}["']?\\.["']?${sCol}["']?\\s*[><-]\\s*(?:[\\w_]+\\.)?["']?${tTable}["']?\\.["']?${tCol}["']?.*$\\n?`,
    "gmi"
  );

  // 2. Directiva Ref: destino -> fuente
  const refRegex2 = new RegExp(
    `^\\s*Ref(?:\\s+[\\w_]+)?:\\s*(?:[\\w_]+\\.)?["']?${tTable}["']?\\.["']?${tCol}["']?\\s*[><-]\\s*(?:[\\w_]+\\.)?["']?${sTable}["']?\\.["']?${sCol}["']?.*$\\n?`,
    "gmi"
  );

  let updated = currentDbml.replace(refRegex1, "").replace(refRegex2, "");

  // 3. Inline ref en definición de columnas
  const inlineRefRegex1 = new RegExp(
    `(?:,\\s*)?ref\\s*:\\s*[><-]\\s*(?:[\\w_]+\\.)?["']?${tTable}["']?\\.["']?${tCol}["']?(?:\\s*,)?`,
    "gi"
  );
  const inlineRefRegex2 = new RegExp(
    `(?:,\\s*)?ref\\s*:\\s*[><-]\\s*(?:[\\w_]+\\.)?["']?${sTable}["']?\\.["']?${sCol}["']?(?:\\s*,)?`,
    "gi"
  );

  updated = updated.replace(inlineRefRegex1, "").replace(inlineRefRegex2, "");

  return updated.trimEnd() + "\n";
}

