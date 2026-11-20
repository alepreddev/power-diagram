import { exporter, Parser } from "@dbml/core";
import { saveFileCrossPlatform } from "./fileSave";
import {
  generateTableBlock,
  formatDbmlIdentifier,
  normalizeSqlTypeName,
  type ColumnData,
} from "./dbmlParser";
import {
  sanitizeSqlSchema,
  simplifyCreateTable,
  isCreateTableStatement,
  detectSqlDialect,
  unquoteIdentifier,
  tableKeyOf,
  type SchemaHints,
} from "./sqlSanitizer";

export { detectSqlDialect };
export type ExportDialect = "postgres" | "mysql" | "mssql" | "sqlite" | "json";
export type ImportDialect = "postgres" | "mysql" | "mssql" | "sqlite";

export interface IgnoredStatementSummary {
  type: string;
  count: number;
}

export interface SqlImportReport {
  dialect: ImportDialect;
  detectedDialect: ImportDialect | null;
  tablesImported: number;
  relationshipsImported: number;
  ignoredStatementsTotal: number;
  ignoredBreakdown: IgnoredStatementSummary[];
  skippedDuplicateTables: string[];
  skippedRelationships: number;
}

export interface SqlImportOptions {
  /** Modo de importación: reemplazar todo o añadir omitiendo las tablas duplicadas. */
  mode?: "replace" | "append";
  /** Código DBML actual del diagrama (utilizado en modo 'append' para omitir duplicados). */
  existingDbml?: string;
}

export interface SqlImportResult {
  /** Código DBML final listo para aplicar al diagrama (combinado si mode === 'append'). */
  dbml: string;
  /** Código DBML únicamente de las tablas y relaciones importadas. */
  importedDbml: string;
  report: SqlImportReport;
}

/**
 * Exporta el esquema DBML a sintaxis SQL nativa para el motor elegido.
 */
export function exportDbmlToSql(dbmlCode: string, dialect: ExportDialect): string {
  if (!dbmlCode || !dbmlCode.trim()) return "";

  try {
    if (dialect === "sqlite") {
      // @dbml/core no tiene dialecto 'sqlite' nativo en exporter;
      // tomamos 'postgres' y normalizamos tipos y autoincrementales a estándar SQLite.
      const pgSql = exporter.export(dbmlCode, "postgres");
      return pgSql
        .replace(
          /\b(?:SMALLINT|INT|INTEGER|BIGINT)\s+GENERATED\s+(?:ALWAYS|BY\s+DEFAULT)\s+AS\s+IDENTITY\s+PRIMARY\s+KEY/gi,
          "INTEGER PRIMARY KEY AUTOINCREMENT"
        )
        .replace(
          /\b(?:SMALLSERIAL|SERIAL|BIGSERIAL)\s+PRIMARY\s+KEY/gi,
          "INTEGER PRIMARY KEY AUTOINCREMENT"
        );
    }

    return exporter.export(dbmlCode, dialect);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Error al exportar a ${dialect.toUpperCase()}: ${message}`);
  }
}

/* ------------------------------------------------------------------------------------
 * Parseo tolerante a fallos y construcción de DBML limpio
 * ---------------------------------------------------------------------------------- */

type DbmlParserFormat = "postgres" | "mysql" | "mssql";

function toParserFormat(dialect: ImportDialect): DbmlParserFormat {
  return dialect === "sqlite" ? "postgres" : dialect;
}

function extractNoteString(rawNote: unknown): string | undefined {
  if (!rawNote) return undefined;
  if (typeof rawNote === "string") return rawNote.trim() || undefined;
  if (typeof rawNote === "object" && "value" in rawNote) {
    const val = (rawNote as { value?: unknown }).value;
    if (typeof val === "string") return val.trim() || undefined;
  }
  return undefined;
}

interface ExistingSchemaSnapshot {
  /** tableKey (lowercase) → { name: nombre original, columns: Map<colLower, colOriginal> } */
  tables: Map<string, { name: string; columns: Map<string, string> }>;
  /** Claves canónicas de relaciones ya existentes: "t1.c1<->t2.c2" en minúsculas */
  refPairs: Set<string>;
}

function makeRefPairKey(t1: string, c1: string, t2: string, c2: string): string {
  const a = `${t1.toLowerCase()}.${c1.toLowerCase()}`;
  const b = `${t2.toLowerCase()}.${c2.toLowerCase()}`;
  return a < b ? `${a}<->${b}` : `${b}<->${a}`;
}

function inspectExistingDbml(existingDbml?: string): ExistingSchemaSnapshot {
  const tables = new Map<string, { name: string; columns: Map<string, string> }>();
  const refPairs = new Set<string>();
  if (!existingDbml || !existingDbml.trim()) {
    return { tables, refPairs };
  }

  try {
    const db = Parser.parse(existingDbml, "dbml");
    for (const schema of db.schemas) {
      for (const table of schema.tables) {
        const cols = new Map<string, string>();
        for (const field of table.fields) {
          cols.set(field.name.toLowerCase(), field.name);
        }
        tables.set(table.name.toLowerCase(), { name: table.name, columns: cols });
      }
      for (const ref of schema.refs) {
        if (!ref.endpoints || ref.endpoints.length < 2) continue;
        const [ep1, ep2] = ref.endpoints;
        const c1 = ep1.fieldNames?.[0];
        const c2 = ep2.fieldNames?.[0];
        if (ep1.tableName && ep2.tableName && c1 && c2) {
          refPairs.add(makeRefPairKey(ep1.tableName, c1, ep2.tableName, c2));
        }
      }
    }
  } catch {
    // Fallback léxico si el DBML actual en el editor tiene algún error pendiente
    const tableRe = /\bTable\s+(?:[\w_]+\.)?("[^"]+"|[\w_]+)\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}/gi;
    for (const match of existingDbml.matchAll(tableRe)) {
      const tName = unquoteIdentifier(match[1]);
      const cols = new Map<string, string>();
      for (const line of match[2].split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("//") || /^Indexes\b/i.test(trimmed)) continue;
        const colMatch = /^("[^"]+"|[\w_]+)\s+/.exec(trimmed);
        if (colMatch) {
          const cName = unquoteIdentifier(colMatch[1]);
          cols.set(cName.toLowerCase(), cName);
        }
      }
      tables.set(tName.toLowerCase(), { name: tName, columns: cols });
    }
  }

  return { tables, refPairs };
}

/**
 * Ejecuta Parser.parse sobre las sentencias sanitizadas.
 * Si el lote completo falla por alguna sentencia con sintaxis exótica o una FK huérfana/duplicada,
 * aísla las sentencias problemáticas conservando todas las tablas y relaciones válidas.
 */
function parseSanitizedStatementsResilient(
  statements: string[],
  dialect: ImportDialect,
  hints: SchemaHints,
  ignored: Map<string, number>
): { database: ReturnType<typeof Parser.parse>; skippedAlterRefs: number } {
  const format = toParserFormat(dialect);
  const joinSql = (stmts: string[]) => stmts.map((s) => `${s};`).join("\n\n");

  // 1. Vía rápida: intentar parsear todo el lote limpio de una sola vez
  try {
    const database = Parser.parse(joinSql(statements), format);
    return { database, skippedAlterRefs: 0 };
  } catch {
    // Continuar a la vía resiliente sentencia por sentencia
  }

  const createStmts = statements.filter(isCreateTableStatement);
  const alterStmts = statements.filter((s) => !isCreateTableStatement(s));

  let acceptedCreates: string[] = [];

  // 2. Intentar todos los CREATE TABLE juntos
  try {
    if (createStmts.length > 0) {
      Parser.parse(joinSql(createStmts), format);
      acceptedCreates = [...createStmts];
    }
  } catch {
    // Aislar qué CREATE TABLE requiere simplificación (nivel 1: con FKs, nivel 2: solo estructura)
    const level2Creates: string[] = [];
    const level1Candidates: (string | null)[] = [];

    for (const stmt of createStmts) {
      let chosenLevel2: string | null = null;
      // Probar primero la sentencia sin FKs o simplificada en nivel 2 para garantizar que la tabla exista
      const s2 = simplifyCreateTable(stmt, dialect, hints, 2);
      for (const candidate of [s2, stmt]) {
        if (!candidate) continue;
        try {
          Parser.parse(`${candidate};`, format);
          chosenLevel2 = candidate;
          break;
        } catch {
          // probar siguiente candidato
        }
      }

      if (chosenLevel2) {
        level2Creates.push(chosenLevel2);
        level1Candidates.push(simplifyCreateTable(stmt, dialect, hints, 1));
      } else {
        ignored.set(
          "CREATE TABLE (sintaxis no soportada)",
          (ignored.get("CREATE TABLE (sintaxis no soportada)") || 0) + 1
        );
      }
    }

    // Con todas las tablas ya presentes en level2Creates, intentar promover cada una a la versión original o nivel 1 (que incluye FKs inline)
    acceptedCreates = [...level2Creates];
    for (let idx = 0; idx < acceptedCreates.length; idx++) {
      const original = createStmts[idx];
      const s1 = level1Candidates[idx];
      for (const upgrade of [original, s1]) {
        if (!upgrade || upgrade === acceptedCreates[idx]) continue;
        const testList = [...acceptedCreates];
        testList[idx] = upgrade;
        try {
          Parser.parse(joinSql(testList), format);
          acceptedCreates[idx] = upgrade;
          break;
        } catch {
          // conservar versión nivel 2 para esta tabla
        }
      }
    }
  }

  if (acceptedCreates.length === 0) {
    throw new Error(
      "No se pudo interpretar ninguna tabla válida (CREATE TABLE) con el dialecto seleccionado."
    );
  }

  // 3. Incorporar cada ALTER TABLE válido (descartando FKs duplicadas o que apunten a tablas inexistentes)
  const acceptedAll = [...acceptedCreates];
  let skippedAlterRefs = 0;

  for (const alterStmt of alterStmts) {
    const candidateList = [...acceptedAll, alterStmt];
    try {
      Parser.parse(joinSql(candidateList), format);
      acceptedAll.push(alterStmt);
    } catch {
      skippedAlterRefs++;
      ignored.set(
        "ALTER TABLE (relación omitida)",
        (ignored.get("ALTER TABLE (relación omitida)") || 0) + 1
      );
    }
  }

  const database = Parser.parse(joinSql(acceptedAll), format);
  return { database, skippedAlterRefs };
}

/**
 * Importa un script SQL completo (incluso con configuraciones, datos, triggers o permisos),
 * extrae únicamente las tablas y relaciones válidas, limpia el esquema por defecto y
 * devuelve el código DBML normalizado junto con un reporte detallado.
 */
export function importSqlSchema(
  sqlCode: string,
  dialect: ImportDialect,
  options: SqlImportOptions = {}
): SqlImportResult {
  if (!sqlCode || !sqlCode.trim()) {
    throw new Error("El script SQL está vacío.");
  }

  const mode = options.mode ?? "replace";
  const detectedDialect = detectSqlDialect(sqlCode);
  const sanitized = sanitizeSqlSchema(sqlCode, dialect);

  if (!sanitized.statements.some(isCreateTableStatement)) {
    const hintMsg =
      detectedDialect && detectedDialect !== dialect
        ? ` Se detectó sintaxis de ${detectedDialect.toUpperCase()}; verifica el dialecto seleccionado.`
        : "";
    throw new Error(
      `No se encontraron instrucciones CREATE TABLE válidas en el script SQL.${hintMsg}`
    );
  }

  const existing = mode === "append" ? inspectExistingDbml(options.existingDbml) : inspectExistingDbml();

  // En modo 'append', inyectar stubs de las tablas existentes en el diagrama que no estén
  // en el script importado para que el parser SQL pueda resolver claves foráneas hacia ellas.
  const contextStubTableKeys = new Set<string>();
  const contextStubStatements: string[] = [];
  if (mode === "append" && existing.tables.size > 0) {
    const declaredInScript = new Set<string>();
    for (const stmt of sanitized.statements) {
      if (!isCreateTableStatement(stmt)) continue;
      const m = /^CREATE\s+TABLE\s+([^\s(]+)/i.exec(stmt);
      if (m) declaredInScript.add(tableKeyOf(m[1]));
    }
    const quoteForDialect = (ident: string) => {
      if (dialect === "mysql") return `\`${ident.replace(/`/g, "``")}\``;
      if (dialect === "mssql") return `[${ident.replace(/\]/g, "]]")}]`;
      return `"${ident.replace(/"/g, '""')}"`;
    };
    for (const [tableKey, info] of existing.tables.entries()) {
      if (declaredInScript.has(tableKey) || info.columns.size === 0) continue;
      const colDefs = [...info.columns.values()].map((c) => `${quoteForDialect(c)} int`).join(", ");
      contextStubStatements.push(`CREATE TABLE ${quoteForDialect(info.name)} (${colDefs})`);
      contextStubTableKeys.add(tableKey);
    }
  }

  const { database, skippedAlterRefs } = parseSanitizedStatementsResilient(
    [...contextStubStatements, ...sanitized.statements],
    dialect,
    sanitized.hints,
    sanitized.ignored
  );

  const availableTables = new Map<string, { name: string; columns: Map<string, string> }>(
    existing.tables
  );
  const seenImportedTables = new Set<string>();
  const skippedDuplicateTables: string[] = [];
  const tableBlocks: string[] = [];

  for (const schema of database.schemas) {
    for (const table of schema.tables) {
      // 1. El nombre de la tabla se toma sin prefijo de esquema (quita public., dbo., etc.)
      const rawTableName = unquoteIdentifier(table.name);
      const tableKey = rawTableName.toLowerCase();

      if (contextStubTableKeys.has(tableKey) || seenImportedTables.has(tableKey)) {
        continue;
      }
      seenImportedTables.add(tableKey);

      // 5. En modo Añadir, si la tabla ya existe en el diagrama actual, se omite
      if (mode === "append" && existing.tables.has(tableKey)) {
        skippedDuplicateTables.push(rawTableName);
        continue;
      }

      // Promover PK y UNIQUE de una columna declarados en Indexes (ej. CONSTRAINT PK_x, UNIQUE KEY, ALTER TABLE ADD)
      const indexPkCols = new Set<string>();
      const indexUniqueCols = new Set<string>();
      for (const idx of table.indexes || []) {
        const idxCols = (idx.columns || [])
          .map((c) => (typeof c.value === "string" ? unquoteIdentifier(c.value).toLowerCase() : ""))
          .filter(Boolean);
        if (idx.pk) {
          for (const colName of idxCols) indexPkCols.add(colName);
        }
        if (idx.unique && idxCols.length === 1) {
          indexUniqueCols.add(idxCols[0]);
        }
      }

      const columnMap = new Map<string, string>();
      const columns: ColumnData[] = [];

      for (const field of table.fields) {
        const colName = unquoteIdentifier(field.name);
        const colLower = colName.toLowerCase();
        if (columnMap.has(colLower)) continue;
        columnMap.set(colLower, colName);

        const colKey = `${tableKey}.${colLower}`;
        const rawType =
          typeof field.type === "string"
            ? field.type
            : field.type?.type_name || "varchar";
        const { type: normalizedType, isIncrement: typeHasIncrement } =
          normalizeSqlTypeName(rawType);

        const isPk = Boolean(field.pk) || indexPkCols.has(colLower);
        const isIncrement =
          Boolean(field.increment) ||
          typeHasIncrement ||
          sanitized.hints.incrementColumns.has(colKey);
        const isUnique =
          Boolean(field.unique) ||
          indexUniqueCols.has(colLower) ||
          sanitized.hints.uniqueColumns.has(colKey);
        const isNotNull = Boolean(field.not_null) || isPk;
        const colNote =
          extractNoteString(field.note) || sanitized.hints.columnNotes.get(colKey);

        columns.push({
          name: colName,
          type: normalizedType,
          pk: isPk,
          unique: isUnique,
          notNull: isNotNull,
          increment: isIncrement,
          note: colNote,
        });
      }

      if (columns.length === 0) continue;

      const tableNote =
        extractNoteString(table.note) || sanitized.hints.tableNotes.get(tableKey);

      tableBlocks.push(generateTableBlock(rawTableName, columns, undefined, tableNote));
      availableTables.set(tableKey, { name: rawTableName, columns: columnMap });
    }
  }

  // Procesar relaciones (Refs) garantizando operadores DBML válidos (>, <, -) y extremos existentes
  const refLines: string[] = [];
  const emittedRefPairs = new Set<string>(existing.refPairs);
  let skippedRelationships = skippedAlterRefs;

  for (const schema of database.schemas) {
    for (const ref of schema.refs) {
      if (!ref.endpoints || ref.endpoints.length < 2) continue;

      const [ep1, ep2] = ref.endpoints;
      const rawT1 = unquoteIdentifier(ep1.tableName || "");
      const rawT2 = unquoteIdentifier(ep2.tableName || "");
      const rawC1 = unquoteIdentifier(ep1.fieldNames?.[0] || "");
      const rawC2 = unquoteIdentifier(ep2.fieldNames?.[0] || "");

      if (!rawT1 || !rawT2 || !rawC1 || !rawC2) {
        skippedRelationships++;
        continue;
      }

      const table1 = availableTables.get(rawT1.toLowerCase());
      const table2 = availableTables.get(rawT2.toLowerCase());
      const col1 = table1?.columns.get(rawC1.toLowerCase());
      const col2 = table2?.columns.get(rawC2.toLowerCase());

      if (!table1 || !table2 || !col1 || !col2) {
        skippedRelationships++;
        continue;
      }

      const pairKey = makeRefPairKey(table1.name, col1, table2.name, col2);
      if (emittedRefPairs.has(pairKey)) {
        continue;
      }
      emittedRefPairs.add(pairKey);

      const rel1 = String(ep1.relation || "");
      const rel2 = String(ep2.relation || "");
      const isMany1 = rel1.includes("*");
      const isMany2 = rel2.includes("*");

      const left = `${formatDbmlIdentifier(table1.name)}.${formatDbmlIdentifier(col1)}`;
      const right = `${formatDbmlIdentifier(table2.name)}.${formatDbmlIdentifier(col2)}`;

      if (isMany1 && !isMany2) {
        refLines.push(`Ref: ${left} > ${right}`);
      } else if (!isMany1 && isMany2) {
        refLines.push(`Ref: ${right} > ${left}`);
      } else if (!isMany1 && !isMany2) {
        refLines.push(`Ref: ${left} - ${right}`);
      } else {
        refLines.push(`Ref: ${left} > ${right}`);
      }
    }
  }

  if (tableBlocks.length === 0 && skippedDuplicateTables.length === 0) {
    throw new Error("No se encontraron tablas válidas para importar en el script SQL.");
  }

  const importedParts: string[] = [];
  if (tableBlocks.length > 0) {
    importedParts.push(tableBlocks.join("\n\n"));
  }
  if (refLines.length > 0) {
    importedParts.push(refLines.join("\n"));
  }
  const importedDbml = importedParts.join("\n\n").trim();

  let finalDbml = importedDbml;
  if (mode === "append" && options.existingDbml?.trim()) {
    finalDbml = importedDbml
      ? `${options.existingDbml.trimEnd()}\n\n// Importado desde script SQL (${dialect.toUpperCase()})\n${importedDbml}\n`
      : options.existingDbml;
  } else if (finalDbml) {
    finalDbml = `${finalDbml}\n`;
  }

  const ignoredBreakdown: IgnoredStatementSummary[] = [...sanitized.ignored.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const ignoredStatementsTotal = ignoredBreakdown.reduce((sum, item) => sum + item.count, 0);

  return {
    dbml: finalDbml,
    importedDbml,
    report: {
      dialect,
      detectedDialect,
      tablesImported: tableBlocks.length,
      relationshipsImported: refLines.length,
      ignoredStatementsTotal,
      ignoredBreakdown,
      skippedDuplicateTables,
      skippedRelationships,
    },
  };
}

/**
 * Importa un script SQL DDL existente y devuelve directamente el código DBML limpio.
 */
export function importSqlToDbml(sqlCode: string, dialect: ImportDialect): string {
  if (!sqlCode || !sqlCode.trim()) return "";

  try {
    return importSqlSchema(sqlCode, dialect).dbml;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Error al importar SQL (${dialect.toUpperCase()}): ${message}`);
  }
}

/**
 * Guarda o descarga un archivo de texto usando el diálogo nativo en Tauri o Blob en web.
 */
export async function downloadTextFile(
  filename: string,
  content: string,
  mimeType = "text/plain"
): Promise<boolean> {
  const ext = filename.includes(".") ? filename.split(".").pop() || "txt" : "txt";
  const filterName =
    ext === "json" ? "Archivo JSON" : ext === "sql" ? "Script SQL" : "Archivo de texto";

  return saveFileCrossPlatform(content, {
    defaultFilename: filename,
    filterName,
    extensions: [ext],
    mimeType,
  });
}
