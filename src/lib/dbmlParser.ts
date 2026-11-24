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

export interface EnumValueData {
  name: string;
  note?: string;
}

export interface EnumNodeData {
  label: string;
  values: EnumValueData[];
  [key: string]: unknown;
}

export type EnumNode = Node<EnumNodeData, "enum">;

export interface StickyNoteNodeData {
  label: string;
  content: string;
  [key: string]: unknown;
}

export type StickyNoteNode = Node<StickyNoteNodeData, "note">;

export interface TableGroupNodeData {
  label: string;
  color?: string;
  tableNames: string[];
  [key: string]: unknown;
}

export type TableGroupNode = Node<TableGroupNodeData, "group">;

export type DiagramNode = TableNode | EnumNode | StickyNoteNode | TableGroupNode;

export type RelationshipType = "1:1" | "1:n" | "n:1" | "n:m";

export type ReferentialAction =
  | "no action"
  | "restrict"
  | "cascade"
  | "set null"
  | "set default";

export interface RelationshipEdgeData {
  relationType: RelationshipType;
  sourceColumn: string;
  targetColumn: string;
  onDelete?: string;
  onUpdate?: string;
  [key: string]: unknown;
}

export type TableEdge = Edge<RelationshipEdgeData>;

export interface ParserError {
  message: string;
  line?: number;
  column?: number;
}

export interface ParseResult {
  nodes: DiagramNode[];
  edges: TableEdge[];
  error: ParserError | null;
}

export interface CanvasPositions {
  [tableName: string]: { x: number; y: number };
}

function estimateNodeSize(node: DiagramNode): { width: number; height: number } {
  const measuredW = node.measured?.width ?? (typeof node.width === "number" ? node.width : undefined);
  const measuredH =
    node.measured?.height ?? (typeof node.height === "number" ? node.height : undefined);
  if (measuredW && measuredH) {
    return { width: measuredW, height: measuredH };
  }

  if (node.type === "table") {
    const colCount = node.data.columns?.length || 1;
    const noteHeight = node.data.note ? 28 : 0;
    return {
      width: measuredW ?? 280,
      height: measuredH ?? 45 + noteHeight + colCount * 30 + 10,
    };
  }

  if (node.type === "enum") {
    const valCount = node.data.values?.length || 1;
    return {
      width: measuredW ?? 220,
      height: measuredH ?? 44 + valCount * 26 + 10,
    };
  }

  if (node.type === "note") {
    const lines = Math.max(2, node.data.content.split(/\r?\n/).length);
    return {
      width: measuredW ?? 230,
      height: measuredH ?? 48 + lines * 18 + 16,
    };
  }

  return { width: measuredW ?? 320, height: measuredH ?? 200 };
}

/**
 * Recalcula la posición y el tamaño de cada marco TableGroup alrededor de sus tablas miembro
 * y garantiza que los nodos `group` se ubiquen al principio del array para quedar detrás en z-order.
 */
export function recomputeGroupNodes(nodes: DiagramNode[]): DiagramNode[] {
  const tableMap = new Map<string, TableNode>();
  const groupNodes: TableGroupNode[] = [];
  const otherNodes: DiagramNode[] = [];

  for (const node of nodes) {
    if (node.type === "table") {
      tableMap.set(node.id.toLowerCase(), node);
      otherNodes.push(node);
    } else if (node.type === "group") {
      groupNodes.push(node);
    } else {
      otherNodes.push(node);
    }
  }

  if (groupNodes.length === 0) {
    return nodes;
  }

  const PAD_LEFT = 24;
  const PAD_RIGHT = 24;
  const PAD_BOTTOM = 24;
  const PAD_TOP = 44;

  const updatedGroups: TableGroupNode[] = groupNodes.map((group) => {
    const members = group.data.tableNames
      .map((name) => tableMap.get(name.toLowerCase()))
      .filter((t): t is TableNode => Boolean(t));

    if (members.length === 0) {
      return {
        ...group,
        zIndex: -1,
        draggable: false,
        selectable: false,
        style: { ...(group.style || {}), width: 260, height: 140 },
      };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const member of members) {
      const { width, height } = estimateNodeSize(member);
      minX = Math.min(minX, member.position.x);
      minY = Math.min(minY, member.position.y);
      maxX = Math.max(maxX, member.position.x + width);
      maxY = Math.max(maxY, member.position.y + height);
    }

    const x = Math.round(minX - PAD_LEFT);
    const y = Math.round(minY - PAD_TOP);
    const width = Math.round(maxX - minX + PAD_LEFT + PAD_RIGHT);
    const height = Math.round(maxY - minY + PAD_TOP + PAD_BOTTOM);

    return {
      ...group,
      position: { x, y },
      width,
      height,
      zIndex: -1,
      draggable: false,
      selectable: false,
      style: {
        ...(group.style || {}),
        width,
        height,
      },
    };
  });

  return [...updatedGroups, ...otherNodes];
}

/**
 * Parsea el código DBML (sintaxis v2) y lo transforma en Nodos y Aristas para React Flow.
 * Si ocurre un error de sintaxis, no borra el diagrama: conserva los nodos y aristas previos
 * y retorna el objeto de error para mostrarlo en la UI.
 */
export function parseDbmlToGraph(
  dbmlCode: string,
  existingNodes: DiagramNode[] = [],
  savedPositions: CanvasPositions = {},
  existingEdges: TableEdge[] = []
): ParseResult {
  if (!dbmlCode || !dbmlCode.trim()) {
    return { nodes: [], edges: [], error: null };
  }

  try {
    const database = Parser.parse(dbmlCode, "dbmlv2");
    const existingPositionsMap = new Map<string, { x: number; y: number }>();

    // 1. Priorizar posiciones del estado actual en el canvas
    for (const node of existingNodes) {
      if (node.type === "group") continue;
      existingPositionsMap.set(node.id, { x: node.position.x, y: node.position.y });
    }

    // 2. Si no están en el estado actual, buscar en las guardadas de SQLite
    for (const [nodeId, pos] of Object.entries(savedPositions)) {
      if (!existingPositionsMap.has(nodeId)) {
        existingPositionsMap.set(nodeId, pos);
      }
    }

    const nodes: DiagramNode[] = [];
    const edges: TableEdge[] = [];
    const seenEdgeIds = new Set<string>();
    let elementIndex = 0;

    for (const schema of database.schemas) {
      for (const table of schema.tables) {
        const tableName = table.name;
        const savedPos = existingPositionsMap.get(tableName);

        // Posición calculada en cuadrícula limpia si la tabla es nueva
        const defaultPosition = {
          x: (elementIndex % 3) * 360 + 50,
          y: Math.floor(elementIndex / 3) * 300 + 50,
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

        elementIndex++;
      }

      // Procesar enumeraciones (Enum)
      for (const enumDef of schema.enums || []) {
        const enumId = `enum:${enumDef.name}`;
        const savedPos = existingPositionsMap.get(enumId);
        const defaultPosition = {
          x: (elementIndex % 3) * 360 + 50,
          y: Math.floor(elementIndex / 3) * 300 + 50,
        };

        nodes.push({
          id: enumId,
          type: "enum",
          position: savedPos || defaultPosition,
          data: {
            label: enumDef.name,
            values: (enumDef.values || []).map((v) => ({
              name: v.name,
              note: v.note || undefined,
            })),
          },
        });

        elementIndex++;
      }

      // Procesar grupos de tablas (TableGroup)
      for (const group of schema.tableGroups || []) {
        const groupId = `group:${group.name}`;
        const tableNames = (group.tables || []).map((t) => t.name).filter(Boolean);
        nodes.push({
          id: groupId,
          type: "group",
          position: existingPositionsMap.get(groupId) || { x: 0, y: 0 },
          zIndex: -1,
          draggable: false,
          selectable: false,
          data: {
            label: group.name,
            color: (group.color as unknown as string) || undefined,
            tableNames,
          },
        });
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

        const baseId = `ref-${sourceTable}.${sourceCol}-${targetTable}.${targetCol}`;
        let edgeId = baseId;
        let dupIndex = 2;
        while (seenEdgeIds.has(edgeId)) {
          edgeId = `${baseId}#${dupIndex}`;
          dupIndex++;
        }
        seenEdgeIds.add(edgeId);

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
            onDelete: typeof ref.onDelete === "string" && ref.onDelete ? ref.onDelete : undefined,
            onUpdate: typeof ref.onUpdate === "string" && ref.onUpdate ? ref.onUpdate : undefined,
          },
          style: { stroke: "#64748b", strokeWidth: 1.5 },
        });
      }
    }

    // Procesar notas adhesivas de nivel raíz (Note)
    for (const sticky of database.notes || []) {
      const noteId = `note:${sticky.name}`;
      const savedPos = existingPositionsMap.get(noteId);
      const defaultPosition = {
        x: (elementIndex % 3) * 360 + 50,
        y: Math.floor(elementIndex / 3) * 300 + 50,
      };

      nodes.push({
        id: noteId,
        type: "note",
        position: savedPos || defaultPosition,
        data: {
          label: sticky.name,
          content: sticky.content || "",
        },
      });

      elementIndex++;
    }

    return { nodes: recomputeGroupNodes(nodes), edges, error: null };
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

    // Regla Senior: Conservamos los nodos y aristas existentes en vez de borrar el diagrama
    return {
      nodes: existingNodes,
      edges: existingEdges,
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
    `^\\s*Ref(?:\\s+[\\w_]+)?:\\s*(?:[\\w_]+\\.)?${tableName}\\.[\\w_]+\\s*(?:<>|[><-])\\s*.*$\\n?`,
    "gmi"
  );
  const refRegex2 = new RegExp(
    `^\\s*Ref(?:\\s+[\\w_]+)?:\\s*.*\\s*(?:<>|[><-])\\s*(?:[\\w_]+\\.)?${tableName}\\.[\\w_]+.*$\\n?`,
    "gmi"
  );

  updated = updated.replace(refRegex1, "").replace(refRegex2, "");
  return updated.trimEnd() + "\n";
}

function relationTypeToOperator(relationType: RelationshipType): "-" | ">" | "<" | "<>" {
  switch (relationType) {
    case "1:1":
      return "-";
    case "n:1":
      return ">";
    case "1:n":
      return "<";
    case "n:m":
      return "<>";
  }
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
  relation: ">" | "<" | "-" | "<>" = ">"
): string {
  const refLine = `\nRef: ${formatDbmlIdentifier(sourceTable)}.${formatDbmlIdentifier(sourceCol)} ${relation} ${formatDbmlIdentifier(targetTable)}.${formatDbmlIdentifier(targetCol)}\n`;
  return `${currentDbml.trimEnd()}\n${refLine}`;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Elimina quirúrgicamente una relación específica (Ref) entre dos tablas y columnas del código DBML.
 * Contempla relaciones directas, invertidas, n:m (<>) e inline en definiciones de columnas.
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
    `^\\s*Ref(?:\\s+[\\w_]+)?:\\s*(?:[\\w_]+\\.)?["']?${sTable}["']?\\.["']?${sCol}["']?\\s*(?:<>|[><-])\\s*(?:[\\w_]+\\.)?["']?${tTable}["']?\\.["']?${tCol}["']?.*$\\n?`,
    "gmi"
  );

  // 2. Directiva Ref: destino -> fuente
  const refRegex2 = new RegExp(
    `^\\s*Ref(?:\\s+[\\w_]+)?:\\s*(?:[\\w_]+\\.)?["']?${tTable}["']?\\.["']?${tCol}["']?\\s*(?:<>|[><-])\\s*(?:[\\w_]+\\.)?["']?${sTable}["']?\\.["']?${sCol}["']?.*$\\n?`,
    "gmi"
  );

  let updated = currentDbml.replace(refRegex1, "").replace(refRegex2, "");

  // 3. Inline ref en definición de columnas
  const inlineRefRegex1 = new RegExp(
    `(?:,\\s*)?ref\\s*:\\s*(?:<>|[><-])\\s*(?:[\\w_]+\\.)?["']?${tTable}["']?\\.["']?${tCol}["']?(?:\\s*,)?`,
    "gi"
  );
  const inlineRefRegex2 = new RegExp(
    `(?:,\\s*)?ref\\s*:\\s*(?:<>|[><-])\\s*(?:[\\w_]+\\.)?["']?${sTable}["']?\\.["']?${sCol}["']?(?:\\s*,)?`,
    "gi"
  );

  updated = updated
    .replace(inlineRefRegex1, "")
    .replace(inlineRefRegex2, "")
    .replace(/\s*\[\s*\]/g, "");

  return updated.trimEnd() + "\n";
}

/**
 * Actualiza la cardinalidad y acciones referenciales (onDelete / onUpdate) de una relación existente en DBML.
 */
export function updateRefInDbml(
  currentDbml: string,
  sourceTable: string,
  sourceCol: string,
  targetTable: string,
  targetCol: string,
  relationType: RelationshipType,
  onDelete?: string,
  onUpdate?: string
): string {
  const op = relationTypeToOperator(relationType);
  const settings: string[] = [];
  if (onDelete && onDelete.trim()) settings.push(`delete: ${onDelete.trim().toLowerCase()}`);
  if (onUpdate && onUpdate.trim()) settings.push(`update: ${onUpdate.trim().toLowerCase()}`);
  const settingsStr = settings.length > 0 ? ` [${settings.join(", ")}]` : "";

  const formattedLine = `Ref: ${formatDbmlIdentifier(sourceTable)}.${formatDbmlIdentifier(sourceCol)} ${op} ${formatDbmlIdentifier(targetTable)}.${formatDbmlIdentifier(targetCol)}${settingsStr}`;

  const sTable = escapeRegExp(sourceTable);
  const sCol = escapeRegExp(sourceCol);
  const tTable = escapeRegExp(targetTable);
  const tCol = escapeRegExp(targetCol);

  const refRegex1 = new RegExp(
    `^\\s*Ref(?:\\s+[\\w_]+)?:\\s*(?:[\\w_]+\\.)?["']?${sTable}["']?\\.["']?${sCol}["']?\\s*(?:<>|[><-])\\s*(?:[\\w_]+\\.)?["']?${tTable}["']?\\.["']?${tCol}["']?.*$`,
    "mi"
  );
  const refRegex2 = new RegExp(
    `^\\s*Ref(?:\\s+[\\w_]+)?:\\s*(?:[\\w_]+\\.)?["']?${tTable}["']?\\.["']?${tCol}["']?\\s*(?:<>|[><-])\\s*(?:[\\w_]+\\.)?["']?${sTable}["']?\\.["']?${sCol}["']?.*$`,
    "mi"
  );

  if (refRegex1.test(currentDbml)) {
    return currentDbml.replace(refRegex1, formattedLine).trimEnd() + "\n";
  }

  if (refRegex2.test(currentDbml)) {
    const invertedOp: "-" | ">" | "<" | "<>" = op === ">" ? "<" : op === "<" ? ">" : op;
    const invertedLine = `Ref: ${formatDbmlIdentifier(targetTable)}.${formatDbmlIdentifier(targetCol)} ${invertedOp} ${formatDbmlIdentifier(sourceTable)}.${formatDbmlIdentifier(sourceCol)}${settingsStr}`;
    return currentDbml.replace(refRegex2, invertedLine).trimEnd() + "\n";
  }

  // Si provenía de un ref inline dentro de una columna, removerlo y añadir la línea Ref explícita
  const cleaned = removeRefFromDbml(currentDbml, sourceTable, sourceCol, targetTable, targetCol);
  return `${cleaned.trimEnd()}\n\n${formattedLine}\n`;
}

/** Añade un bloque Enum al final del código DBML. */
export function appendEnumToDbml(currentDbml: string, name: string, values: string[]): string {
  const cleanValues = values
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => `  ${formatDbmlIdentifier(v)}`)
    .join("\n");
  const block = `Enum ${formatDbmlIdentifier(name)} {\n${cleanValues}\n}`;
  return `${currentDbml.trimEnd()}\n\n${block}\n`;
}

/** Elimina un bloque Enum del código DBML. */
export function removeEnumFromDbml(currentDbml: string, name: string): string {
  const escaped = escapeRegExp(name);
  const regex = new RegExp(
    `\\bEnum\\s+(?:[\\w_]+\\.)?["']?${escaped}["']?\\s*\\{[^\\}]*\\}\\s*`,
    "gi"
  );
  return currentDbml.replace(regex, "").trimEnd() + "\n";
}

/** Añade una nota adhesiva (Note) al final del código DBML. */
export function appendStickyNoteToDbml(currentDbml: string, name: string, content: string): string {
  const cleanContent = content.trim().replace(/'''/g, "\\'\\'\\'");
  const body = cleanContent.includes("\n")
    ? `  '''\n${cleanContent
        .split(/\r?\n/)
        .map((line) => `  ${line}`)
        .join("\n")}\n  '''`
    : `  '${sanitizeNoteValue(cleanContent)}'`;
  const block = `Note ${formatDbmlIdentifier(name)} {\n${body}\n}`;
  return `${currentDbml.trimEnd()}\n\n${block}\n`;
}

/** Elimina una nota adhesiva (Note) del código DBML. */
export function removeStickyNoteFromDbml(currentDbml: string, name: string): string {
  const escaped = escapeRegExp(name);
  const regex = new RegExp(`\\bNote\\s+["']?${escaped}["']?\\s*\\{[^\\}]*\\}\\s*`, "gi");
  return currentDbml.replace(regex, "").trimEnd() + "\n";
}

/** Añade un bloque TableGroup al final del código DBML. */
export function appendTableGroupToDbml(
  currentDbml: string,
  name: string,
  tableNames: string[],
  color?: string
): string {
  const settingsStr = color ? ` [color: ${color}]` : "";
  const body = tableNames
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => `  ${formatDbmlIdentifier(t)}`)
    .join("\n");
  const block = `TableGroup ${formatDbmlIdentifier(name)}${settingsStr} {\n${body}\n}`;
  return `${currentDbml.trimEnd()}\n\n${block}\n`;
}

/** Elimina un bloque TableGroup del código DBML. */
export function removeTableGroupFromDbml(currentDbml: string, name: string): string {
  const escaped = escapeRegExp(name);
  const regex = new RegExp(
    `\\bTableGroup\\s+["']?${escaped}["']?\\s*(?:\\[[^\\]]*\\])?\\s*\\{[^\\}]*\\}\\s*`,
    "gi"
  );
  return currentDbml.replace(regex, "").trimEnd() + "\n";
}

