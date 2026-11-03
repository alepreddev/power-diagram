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

        const columns: ColumnData[] = table.fields.map((field) => {
          let typeName = "text";
          if (field.type) {
            typeName = typeof field.type === "string" ? field.type : field.type.type_name || "text";
          }

          return {
            name: field.name,
            type: typeName,
            pk: Boolean(field.pk),
            unique: Boolean(field.unique),
            notNull: Boolean(field.not_null),
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
  if (note && note.trim()) settings.push(`note: '${note.replace(/'/g, "\\'")}'`);
  const settingsStr = settings.length > 0 ? ` [${settings.join(", ")}]` : "";

  const formattedColumns = columns
    .map((col) => {
      const constraints: string[] = [];
      if (col.pk) constraints.push("pk");
      if (col.increment) constraints.push("increment");
      if (col.unique) constraints.push("unique");
      if (col.notNull) constraints.push("not null");
      if (col.note) constraints.push(`note: '${col.note.replace(/'/g, "\\'")}'`);

      const constraintStr = constraints.length > 0 ? ` [${constraints.join(", ")}]` : "";
      return `  ${col.name} ${col.type || "varchar"}${constraintStr}`;
    })
    .join("\n");

  return `Table ${tableName}${settingsStr} {\n${formattedColumns}\n}`;
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

