/**
 * Sanitizador de scripts SQL para la importación de esquemas.
 *
 * Recibe un script completo exportado por el motor (pg_dump, mysqldump, SSMS, `.dump`
 * de SQLite...) y conserva únicamente lo que define la estructura del diagrama:
 *   - CREATE TABLE (columnas, tipos, PK, UNIQUE, NOT NULL, autoincrementales)
 *   - ALTER TABLE ... ADD [CONSTRAINT] PRIMARY KEY | FOREIGN KEY | UNIQUE
 *
 * Todo lo demás (configuración, datos, permisos, funciones, triggers...) se descarta y
 * se contabiliza por tipo para el reporte. Ciertos datos útiles que vienen en sentencias
 * descartadas (comentarios de tablas/columnas, autoincrementales declarados aparte,
 * índices UNIQUE) se extraen como "pistas" para aplicarlas al construir el diagrama.
 */

export type SqlSourceDialect = "postgres" | "mysql" | "mssql" | "sqlite";

export interface SchemaHints {
  /** Columnas autoincrementales: "tabla.columna" en minúsculas (sin esquema). */
  incrementColumns: Set<string>;
  /** Columnas con restricción UNIQUE declarada mediante CREATE UNIQUE INDEX. */
  uniqueColumns: Set<string>;
  /** Descripción de tablas: "tabla" en minúsculas → texto. */
  tableNotes: Map<string, string>;
  /** Descripción de columnas: "tabla.columna" en minúsculas → texto. */
  columnNotes: Map<string, string>;
}

export interface SanitizedSql {
  /** Sentencias DDL limpias (sin el terminador `;`). */
  statements: string[];
  /** Sentencias descartadas agrupadas por tipo. */
  ignored: Map<string, number>;
  hints: SchemaHints;
}

/* ------------------------------------------------------------------------------------
 * Expresiones base
 * ---------------------------------------------------------------------------------- */

const IDENT_SRC =
  '(?:"(?:[^"]|"")+"|`[^`]+`|\\[(?:[^\\]]|\\]\\])+\\]|[A-Za-z_\\u00C0-\\uFFFF][\\w$\\u00C0-\\uFFFF]*)';
const QNAME_SRC = `${IDENT_SRC}(?:\\s*\\.\\s*${IDENT_SRC}){0,2}`;

const CREATE_TABLE_RE = new RegExp(
  `^CREATE\\s+(?:OR\\s+REPLACE\\s+)?(?:(?:GLOBAL|LOCAL)\\s+)?(?:(TEMP|TEMPORARY)\\s+)?(?:UNLOGGED\\s+)?TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(${QNAME_SRC})\\s*`,
  "i"
);
const ALTER_TABLE_RE = new RegExp(
  `^ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(?:ONLY\\s+)?(${QNAME_SRC})\\s*`,
  "i"
);
const UNIQUE_INDEX_RE = new RegExp(
  `^CREATE\\s+UNIQUE\\s+(?:(?:CLUSTERED|NONCLUSTERED)\\s+)?INDEX\\s+(?:CONCURRENTLY\\s+)?(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:${QNAME_SRC}\\s+)?ON\\s+(?:ONLY\\s+)?(${QNAME_SRC})\\s*(?:USING\\s+\\w+\\s*)?\\(`,
  "i"
);
const COMMENT_ON_RE = new RegExp(
  `^COMMENT\\s+ON\\s+(TABLE|COLUMN)\\s+(${QNAME_SRC})\\s+IS\\s+([EN]?'(?:[^']|'')*'|NULL)\\s*$`,
  "i"
);
const LEADING_IDENT_RE = new RegExp(`^(${IDENT_SRC})`);
const TABLE_CONSTRAINT_RE = new RegExp(
  `^(?:CONSTRAINT\\s+${IDENT_SRC}\\s+)?(PRIMARY\\s+KEY|UNIQUE|FOREIGN\\s+KEY)\\b`,
  "i"
);
const DISCARDED_TABLE_ELEMENT_RE = new RegExp(
  `^(?:(?:CONSTRAINT\\s+${IDENT_SRC}\\s+)?(?:CHECK|EXCLUDE)\\b|(?:KEY|INDEX|FULLTEXT|SPATIAL|LIKE|PERIOD)\\b)`,
  "i"
);
const REFERENCES_RE = new RegExp(
  `\\bREFERENCES\\s+(${QNAME_SRC})\\s*(\\([^)]*\\))?((?:\\s+ON\\s+(?:DELETE|UPDATE)\\s+(?:SET\\s+NULL|SET\\s+DEFAULT|NO\\s+ACTION|CASCADE|RESTRICT))*)`,
  "i"
);

/* ------------------------------------------------------------------------------------
 * Utilidades léxicas
 * ---------------------------------------------------------------------------------- */

/** Quita las comillas de un identificador ("x", `x`, [x]) y resuelve sus escapes. */
export function unquoteIdentifier(raw: string): string {
  const s = raw.trim();
  if (s.length >= 2) {
    if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1).replace(/""/g, '"');
    if (s.startsWith("`") && s.endsWith("`")) return s.slice(1, -1).replace(/``/g, "`");
    if (s.startsWith("[") && s.endsWith("]")) return s.slice(1, -1).replace(/\]\]/g, "]");
  }
  return s;
}

/** Índice justo después del cierre de la cadena o identificador que empieza en `start`. */
function skipQuoted(text: string, start: number, close: string, backslashEscapes = false): number {
  let i = start + 1;
  while (i < text.length) {
    const ch = text[i];
    if (backslashEscapes && ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === close) {
      if (text[i + 1] === close) {
        i += 2;
        continue;
      }
      return i + 1;
    }
    i++;
  }
  return text.length;
}

/** Divide un texto por un separador ignorando paréntesis, cadenas e identificadores. */
export function splitTopLevel(text: string, separator: string, backslashEscapes = false): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (ch === "'" || ch === '"' || ch === "`") {
      i = skipQuoted(text, i, ch, backslashEscapes && ch !== "`");
      continue;
    }
    if (ch === "[") {
      i = skipQuoted(text, i, "]");
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (ch === separator && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
    i++;
  }
  parts.push(text.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** Devuelve el índice del paréntesis que cierra al que está en `openIdx` (o -1). */
function findMatchingParen(text: string, openIdx: number, backslashEscapes = false): number {
  let depth = 0;
  let i = openIdx;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "'" || ch === '"' || ch === "`") {
      i = skipQuoted(text, i, ch, backslashEscapes && ch !== "`");
      continue;
    }
    if (ch === "[") {
      i = skipQuoted(text, i, "]");
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

function splitQualifiedName(qname: string): string[] {
  return splitTopLevel(qname, ".").map(unquoteIdentifier);
}

/** Quita el esquema o base de datos prefijada (ej. public.users → users, [dbo].[users] → [users]). */
function stripSchemaFromQName(qname: string): string {
  const parts = splitTopLevel(qname, ".");
  return (parts[parts.length - 1] || qname).trim();
}

/** Nombre de la tabla en minúsculas y sin esquema, usado como clave de las pistas. */
export function tableKeyOf(qname: string): string {
  const parts = splitQualifiedName(qname);
  return (parts[parts.length - 1] || "").toLowerCase();
}

/** Convierte un literal SQL ('...', N'...', E'...') a texto plano de una sola línea. */
function parseSqlString(literal: string, backslashEscapes: boolean): string {
  let s = literal.trim().replace(/^[EN]/i, "");
  if (s.startsWith("'") && s.endsWith("'")) s = s.slice(1, -1);
  s = s.replace(/''/g, "'");
  if (backslashEscapes) {
    s = s.replace(/\\(.)/g, (_m, c: string) => (c === "n" || c === "r" || c === "t" ? " " : c));
  }
  return s.replace(/\s*\r?\n\s*/g, " ").trim();
}

/** Convierte `x` y [x] a "x" fuera de las cadenas (la gramática usada para SQLite es la de PostgreSQL). */
function toDoubleQuotedIdentifiers(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "'" || ch === '"') {
      const end = skipQuoted(text, i, ch);
      out += text.slice(i, end);
      i = end;
    } else if (ch === "`" || ch === "[") {
      const close = ch === "`" ? "`" : "]";
      const end = skipQuoted(text, i, close);
      const inner = unquoteIdentifier(text.slice(i, end));
      out += `"${inner.replace(/"/g, '""')}"`;
      i = end;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

function bump(map: Map<string, number>, label: string) {
  map.set(label, (map.get(label) || 0) + 1);
}

/* ------------------------------------------------------------------------------------
 * 1. Separador de sentencias
 * ---------------------------------------------------------------------------------- */

const COPY_FROM_STDIN_RE = /^COPY\b[\s\S]*?\bFROM\s+STDIN\b/i;

/**
 * Separa el script en sentencias respetando comentarios, cadenas, identificadores entre
 * comillas, bloques `$$` de PostgreSQL, datos de `COPY ... FROM stdin`, lotes `GO` de
 * SQL Server y `DELIMITER` de MySQL. Los comentarios se eliminan del resultado.
 */
export function splitSqlStatements(sql: string, dialect: SqlSourceDialect): string[] {
  const statements: string[] = [];
  const backslash = dialect === "mysql";
  const n = sql.length;
  let delimiter = ";";
  let buf = "";
  let i = 0;
  let atLineStart = true;

  const push = () => {
    const stmt = buf.trim();
    buf = "";
    if (!stmt) return;
    statements.push(stmt);

    // Saltar el bloque de datos que sigue a COPY ... FROM stdin (termina en una línea "\.")
    if (COPY_FROM_STDIN_RE.test(stmt)) {
      const terminator = /\r?\n\\\.[ \t]*(?:\r?\n|$)/g;
      terminator.lastIndex = i;
      const match = terminator.exec(sql);
      i = match ? match.index + match[0].length : n;
      atLineStart = true;
    }
  };

  const lineEndFrom = (from: number) => {
    const idx = sql.indexOf("\n", from);
    return idx === -1 ? n : idx;
  };

  while (i < n) {
    if (atLineStart) {
      atLineStart = false;
      const lineEnd = lineEndFrom(i);
      const line = sql.slice(i, lineEnd).trim();
      const atBoundary = buf.trim() === "";

      if (dialect === "mssql" && /^GO(?:\s+\d+)?\s*;?$/i.test(line)) {
        i = lineEnd;
        push();
        continue;
      }
      const delimiterMatch = /^DELIMITER\s+(\S+)$/i.exec(line);
      if (delimiterMatch) {
        i = lineEnd;
        push();
        delimiter = delimiterMatch[1];
        continue;
      }
      // Meta-comandos de psql (\connect, \restrict...) y de la consola de SQLite (.mode...)
      if (atBoundary && ((dialect !== "mssql" && line.startsWith("\\")) || (dialect === "sqlite" && line.startsWith(".")))) {
        i = lineEnd;
        continue;
      }
    }

    const ch = sql[i];
    const next = sql[i + 1];

    if (ch === "\n") {
      buf += ch;
      i++;
      atLineStart = true;
      continue;
    }
    if ((ch === "-" && next === "-") || (ch === "#" && dialect === "mysql")) {
      i = lineEndFrom(i);
      continue;
    }
    if (ch === "/" && next === "*") {
      // Incluye los comentarios condicionales de MySQL /*!40101 ... */
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
      buf += " ";
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      const end = skipQuoted(sql, i, ch, backslash && ch !== "`");
      buf += sql.slice(i, end);
      i = end;
      continue;
    }
    if (ch === "[" && (dialect === "mssql" || dialect === "sqlite")) {
      const end = skipQuoted(sql, i, "]");
      buf += sql.slice(i, end);
      i = end;
      continue;
    }
    if (ch === "$" && dialect === "postgres" && !/[\w$]/.test(sql[i - 1] || "")) {
      const tag = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i, i + 64));
      if (tag) {
        const close = sql.indexOf(tag[0], i + tag[0].length);
        const end = close === -1 ? n : close + tag[0].length;
        buf += sql.slice(i, end);
        i = end;
        continue;
      }
    }
    if (sql.startsWith(delimiter, i)) {
      i += delimiter.length;
      push();
      continue;
    }

    buf += ch;
    i++;
  }

  push();
  return statements;
}

/* ------------------------------------------------------------------------------------
 * 2. Clasificación de sentencias descartadas
 * ---------------------------------------------------------------------------------- */

const OBJECT_KEYWORDS = new Set([
  "TABLE", "VIEW", "INDEX", "FUNCTION", "PROCEDURE", "PROC", "TRIGGER", "SEQUENCE", "SCHEMA",
  "DATABASE", "EXTENSION", "TYPE", "DOMAIN", "ROLE", "USER", "LOGIN", "EVENT", "MATERIALIZED",
  "POLICY", "RULE", "AGGREGATE", "OPERATOR", "COLLATION", "PUBLICATION", "SUBSCRIPTION",
  "SYNONYM", "SERVER", "STATISTICS", "TABLESPACE",
]);

function classifyStatement(stmt: string): string {
  const words = stmt
    .slice(0, 160)
    .split(/\s+/)
    .map((w) => w.toUpperCase().replace(/[^A-Z_]/g, ""))
    .filter(Boolean);
  const first = words[0] || "OTRO";

  if (first === "CREATE" || first === "ALTER" || first === "DROP") {
    const objectWord = words.slice(1, 6).find((w) => OBJECT_KEYWORDS.has(w));
    if (objectWord === "MATERIALIZED") return `${first} MATERIALIZED VIEW`;
    if (objectWord) return `${first} ${objectWord === "PROC" ? "PROCEDURE" : objectWord}`;
  }
  if (first === "EXECUTE") return "EXEC";
  return first;
}

/* ------------------------------------------------------------------------------------
 * 3. Normalización de CREATE TABLE / ALTER TABLE
 * ---------------------------------------------------------------------------------- */

/** Elimina opciones físicas y de almacenamiento que no forman parte del modelo lógico. */
function cleanConstraintClause(text: string): string {
  return text
    .replace(new RegExp(`(\\bREFERENCES\\s+)(${QNAME_SRC})`, "gi"), (_m, prefix: string, qn: string) => {
      return `${prefix}${stripSchemaFromQName(qn)}`;
    })
    .replace(/\s+(?:CLUSTERED|NONCLUSTERED)\b/gi, "")
    .replace(/\s+WITH\s*\((?:[^()]|\([^()]*\))*\)/gi, "")
    .replace(/\s+ON\s+(?!DELETE\b|UPDATE\b)(?:\[[^\]]+\]|"[^"]+"|[\w$]+)(?:\s*\([^)]*\))?/gi, "")
    .replace(/\s+USING\s+INDEX\s+TABLESPACE\s+(?:"[^"]+"|[\w$]+)/gi, "")
    .replace(/\s+USING\s+(?:BTREE|HASH)\b/gi, "")
    .replace(/\s+INCLUDE\s*\([^)]*\)/gi, "")
    .replace(/\s+(?:NOT\s+)?DEFERRABLE(?:\s+INITIALLY\s+(?:DEFERRED|IMMEDIATE))?/gi, "")
    .replace(/\s+INITIALLY\s+(?:DEFERRED|IMMEDIATE)/gi, "")
    .replace(/\s+NOT\s+VALID\b/gi, "")
    .replace(/\s+NOT\s+FOR\s+REPLICATION\b/gi, "")
    .replace(/\s+MATCH\s+(?:FULL|SIMPLE|PARTIAL)\b/gi, "")
    .replace(/\s+NOT\s+ENFORCED\b|\s+ENFORCED\b/gi, "")
    .replace(/\s+(?:ASC|DESC)\b/gi, "");
}

function columnIsAutoIncrement(definitionRest: string): boolean {
  return (
    /\bAUTO_?INCREMENT\b/i.test(definitionRest) ||
    /\bIDENTITY\b/i.test(definitionRest) ||
    /\bnextval\s*\(/i.test(definitionRest) ||
    /^\s*(?:SMALL|BIG)?SERIAL[248]?\b/i.test(definitionRest)
  );
}

function normalizeColumnDefinition(
  part: string,
  dialect: SqlSourceDialect,
  tableKey: string,
  hints: SchemaHints,
  options?: { stripInlinePk?: boolean; stripInlineReferences?: boolean }
): string {
  const nameMatch = LEADING_IDENT_RE.exec(part);
  if (!nameMatch) return part;

  const name = nameMatch[1];
  let rest = part.slice(name.length);
  const colKey = `${tableKey}.${unquoteIdentifier(name).toLowerCase()}`;

  if (columnIsAutoIncrement(rest)) hints.incrementColumns.add(colKey);

  // Extraer comentario inline de columna (COMMENT '...') si está presente
  const commentMatch = /\bCOMMENT\s+('(?:[^'\\]|\\.|'')*')/i.exec(rest);
  if (commentMatch) {
    const commentText = parseSqlString(commentMatch[1], dialect === "mysql");
    if (commentText && !hints.columnNotes.has(colKey)) {
      hints.columnNotes.set(colKey, commentText);
    }
    if (dialect !== "mysql") {
      rest = rest.replace(/\s+COMMENT\s+'(?:[^'\\]|\\.|'')*'/gi, "");
    }
  }

  if (options?.stripInlinePk) {
    rest = rest.replace(/\s+PRIMARY\s+KEY\b/gi, "");
  }
  if (options?.stripInlineReferences) {
    rest = rest.replace(
      new RegExp(
        `\\s+(?:CONSTRAINT\\s+${IDENT_SRC}\\s+)?(?:FOREIGN\\s+KEY\\s+)?REFERENCES\\s+${QNAME_SRC}\\s*(?:\\([^)]*\\))?(?:\\s+ON\\s+(?:DELETE|UPDATE)\\s+(?:SET\\s+NULL|SET\\s+DEFAULT|NO\\s+ACTION|CASCADE|RESTRICT))*`,
        "gi"
      ),
      ""
    );
  }

  rest = rest.replace(/\s+COLLATE\s+(?:[\w$]+\.)?(?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[\w$]+)/gi, "");

  switch (dialect) {
    case "mysql":
      rest = rest.replace(/\s+(?:CHARACTER\s+SET|CHARSET)\s+[\w$]+/gi, "");
      break;
    case "mssql":
      rest = rest
        .replace(/\s+IDENTITY\s*(?:\(\s*-?\d+\s*,\s*-?\d+\s*\))?/gi, "")
        .replace(/\s+(?:ROWGUIDCOL|SPARSE|FILESTREAM)\b/gi, "")
        .replace(new RegExp(`\\bCONSTRAINT\\s+${IDENT_SRC}\\s+(?=DEFAULT\\b)`, "gi"), "");
      break;
    case "postgres":
      rest = rest.replace(
        /\s+GENERATED\s+(?:ALWAYS|BY\s+DEFAULT)\s+AS\s+IDENTITY(?:\s*\((?:[^()]|\([^()]*\))*\))?/gi,
        ""
      );
      break;
    case "sqlite":
      rest = rest.replace(/\s+AUTOINCREMENT\b/gi, "").replace(/\s+ON\s+CONFLICT\s+\w+/gi, "");
      // SQLite permite columnas sin tipo: se les asigna TEXT para que el parser las acepte
      if (!rest.trim() || /^\s*(?:PRIMARY|NOT|NULL|UNIQUE|DEFAULT|REFERENCES|CHECK|CONSTRAINT)\b/i.test(rest)) {
        rest = ` TEXT${rest}`;
      }
      break;
  }

  return `${name}${cleanConstraintClause(rest)}`;
}

interface ParsedCreateTable {
  qname: string;
  temporary: boolean;
  parts: string[];
  tail: string;
}

function parseCreateTable(stmt: string, backslash: boolean): ParsedCreateTable | null {
  const header = CREATE_TABLE_RE.exec(stmt);
  if (!header) return null;

  const rest = stmt.slice(header[0].length);
  if (!rest.startsWith("(")) return null; // CREATE TABLE ... AS SELECT / PARTITION OF / LIKE

  const close = findMatchingParen(rest, 0, backslash);
  if (close === -1) return null;

  return {
    qname: header[2],
    temporary: Boolean(header[1]),
    parts: splitTopLevel(rest.slice(1, close), ",", backslash),
    tail: rest.slice(close + 1),
  };
}

function normalizeCreateTable(
  stmt: string,
  dialect: SqlSourceDialect,
  hints: SchemaHints,
  ignored: Map<string, number>
): string | null {
  const backslash = dialect === "mysql";
  const parsed = parseCreateTable(stmt, backslash);
  if (!parsed) {
    bump(ignored, "CREATE TABLE (sin definición de columnas)");
    return null;
  }
  if (parsed.temporary) {
    bump(ignored, "CREATE TEMPORARY TABLE");
    return null;
  }

  const tableKey = tableKeyOf(parsed.qname);
  const cleanTableName = stripSchemaFromQName(parsed.qname);

  // Detectar si existen constraints de tabla PRIMARY KEY o FOREIGN KEY para evitar duplicados inline
  let hasTableLevelPk = false;
  const tableLevelFkCols = new Set<string>();
  for (const part of parsed.parts) {
    const constraintMatch = TABLE_CONSTRAINT_RE.exec(part);
    if (!constraintMatch) continue;
    const kind = constraintMatch[1].toUpperCase().replace(/\s+/g, " ");
    if (kind === "PRIMARY KEY") {
      hasTableLevelPk = true;
    } else if (kind === "FOREIGN KEY") {
      const open = part.indexOf("(", constraintMatch.index + constraintMatch[0].length - constraintMatch[1].length);
      const close = open === -1 ? -1 : findMatchingParen(part, open, backslash);
      if (close !== -1) {
        const cols = splitTopLevel(part.slice(open + 1, close), ",").map((c) => unquoteIdentifier(c).toLowerCase());
        if (cols.length === 1) tableLevelFkCols.add(cols[0]);
      }
    } else if (kind === "UNIQUE") {
      const open = part.indexOf("(", constraintMatch.index + constraintMatch[0].length - constraintMatch[1].length);
      const close = open === -1 ? -1 : findMatchingParen(part, open, backslash);
      if (close !== -1) {
        const cols = splitTopLevel(part.slice(open + 1, close), ",").map((c) =>
          unquoteIdentifier(c.replace(/\(\s*\d+\s*\)/, "").trim()).toLowerCase()
        );
        if (cols.length === 1 && cols[0]) {
          hints.uniqueColumns.add(`${tableKey}.${cols[0]}`);
        }
      }
    }
  }

  const elements: string[] = [];
  const seenTableConstraints = new Set<string>();

  for (const part of parsed.parts) {
    if (TABLE_CONSTRAINT_RE.test(part)) {
      const cleanedConstraint = cleanConstraintClause(part);
      const dedupKey = cleanedConstraint.replace(/\s+/g, " ").toLowerCase();
      if (!seenTableConstraints.has(dedupKey)) {
        seenTableConstraints.add(dedupKey);
        elements.push(cleanedConstraint);
      }
    } else if (DISCARDED_TABLE_ELEMENT_RE.test(part)) {
      continue; // CHECK, índices no únicos, LIKE...
    } else {
      const nameMatch = LEADING_IDENT_RE.exec(part);
      const colLower = nameMatch ? unquoteIdentifier(nameMatch[1]).toLowerCase() : "";
      elements.push(
        normalizeColumnDefinition(part, dialect, tableKey, hints, {
          stripInlinePk: hasTableLevelPk,
          stripInlineReferences: tableLevelFkCols.has(colLower),
        })
      );
    }
  }

  if (elements.length === 0) {
    bump(ignored, "CREATE TABLE (sin definición de columnas)");
    return null;
  }

  // Comentario de tabla (ej. MySQL: ) ENGINE=InnoDB COMMENT='...')
  const comment = /\bCOMMENT\s*=?\s*('(?:[^'\\]|\\.|'')*')/i.exec(parsed.tail);
  if (comment) {
    const text = parseSqlString(comment[1], backslash);
    if (text) hints.tableNotes.set(tableKey, text);
  }

  const ddl = `CREATE TABLE ${cleanTableName} (\n  ${elements.join(",\n  ")}\n)`;
  return dialect === "sqlite" ? toDoubleQuotedIdentifiers(ddl) : ddl;
}

function normalizeAlterTable(
  stmt: string,
  dialect: SqlSourceDialect,
  hints: SchemaHints,
  ignored: Map<string, number>
): string[] {
  const header = ALTER_TABLE_RE.exec(stmt);
  if (!header) {
    bump(ignored, "ALTER TABLE (configuración)");
    return [];
  }

  const qname = stripSchemaFromQName(header[1]);
  const tableKey = tableKeyOf(header[1]);
  const actionsText = stmt.slice(header[0].length).replace(/^WITH\s+(?:NO)?CHECK\s+/i, "");
  const actions = splitTopLevel(actionsText, ",", dialect === "mysql");
  const kept: string[] = [];
  let usedAsHint = false;

  for (const action of actions) {
    const addRest = action.replace(/^ADD\s+/i, "");
    if (/^ADD\s+/i.test(action) && TABLE_CONSTRAINT_RE.test(addRest)) {
      // Si es un ADD UNIQUE de una sola columna, registrarlo también como pista
      if (/^(?:CONSTRAINT\s+\S+\s+)?UNIQUE\b/i.test(addRest)) {
        const open = addRest.indexOf("(");
        const close = open === -1 ? -1 : findMatchingParen(addRest, open, dialect === "mysql");
        if (close !== -1) {
          const cols = splitTopLevel(addRest.slice(open + 1, close), ",").map((c) =>
            unquoteIdentifier(c.replace(/\(\s*\d+\s*\)/, "").trim()).toLowerCase()
          );
          if (cols.length === 1 && cols[0]) {
            hints.uniqueColumns.add(`${tableKey}.${cols[0]}`);
          }
        }
      }
      kept.push(`ALTER TABLE ${qname} ${cleanConstraintClause(action)}`);
      continue;
    }

    // Comentario de tabla vía ALTER TABLE `users` COMMENT = '...'
    const tableComment = /^COMMENT\s*=?\s*('(?:[^'\\]|\\.|'')*')/i.exec(action);
    if (tableComment) {
      const text = parseSqlString(tableComment[1], dialect === "mysql");
      if (text) hints.tableNotes.set(tableKey, text);
      usedAsHint = true;
      continue;
    }

    // MySQL/phpMyAdmin: ALTER TABLE x MODIFY `id` int NOT NULL AUTO_INCREMENT
    const modify = new RegExp(`^(?:MODIFY|CHANGE)\\s+(?:COLUMN\\s+)?(${IDENT_SRC})(?:\\s+(${IDENT_SRC}))?`, "i").exec(action);
    if (modify && /\bAUTO_INCREMENT\b/i.test(action)) {
      const isChange = /^CHANGE\b/i.test(action);
      const column = unquoteIdentifier(isChange && modify[2] ? modify[2] : modify[1]);
      hints.incrementColumns.add(`${tableKey}.${column.toLowerCase()}`);
      usedAsHint = true;
      continue;
    }

    // PostgreSQL: ALTER COLUMN id SET DEFAULT nextval(...) / ADD GENERATED ... AS IDENTITY
    const pgIdentity = new RegExp(
      `^ALTER\\s+(?:COLUMN\\s+)?(${IDENT_SRC})\\s+(?:SET\\s+DEFAULT\\s+nextval\\s*\\(|ADD\\s+GENERATED\\b)`,
      "i"
    ).exec(action);
    if (pgIdentity) {
      hints.incrementColumns.add(`${tableKey}.${unquoteIdentifier(pgIdentity[1]).toLowerCase()}`);
      usedAsHint = true;
    }
  }

  if (kept.length === 0 && !usedAsHint) bump(ignored, "ALTER TABLE (configuración)");
  return dialect === "sqlite" ? kept.map(toDoubleQuotedIdentifiers) : kept;
}

/** CREATE UNIQUE INDEX de una sola columna → pista UNIQUE para esa columna. */
function collectUniqueIndex(stmt: string, dialect: SqlSourceDialect, hints: SchemaHints, ignored: Map<string, number>) {
  const match = UNIQUE_INDEX_RE.exec(stmt);
  if (!match) {
    bump(ignored, "CREATE INDEX");
    return;
  }

  const openIdx = match[0].length - 1;
  const close = findMatchingParen(stmt, openIdx, dialect === "mysql");
  if (close === -1) {
    bump(ignored, "CREATE INDEX");
    return;
  }
  if (/\bWHERE\b/i.test(stmt.slice(close + 1))) {
    bump(ignored, "CREATE UNIQUE INDEX (parcial)");
    return;
  }

  const columns = splitTopLevel(stmt.slice(openIdx + 1, close), ",").map((c) => c.replace(/\(\s*\d+\s*\)/, "").trim());
  if (columns.some((c) => c.includes("("))) {
    bump(ignored, "CREATE UNIQUE INDEX (expresión)");
    return;
  }
  if (columns.length !== 1) {
    bump(ignored, "UNIQUE compuesto");
    return;
  }

  const column = LEADING_IDENT_RE.exec(columns[0]);
  if (column) {
    hints.uniqueColumns.add(`${tableKeyOf(match[1])}.${unquoteIdentifier(column[1]).toLowerCase()}`);
  }
}

/** COMMENT ON TABLE / COLUMN ... IS '...' (PostgreSQL). */
function collectCommentOn(stmt: string, hints: SchemaHints): boolean {
  const match = COMMENT_ON_RE.exec(stmt);
  if (!match) return false;
  if (/^NULL$/i.test(match[3])) return true;

  const text = parseSqlString(match[3], false);
  if (!text) return true;

  const parts = splitQualifiedName(match[2]).map((p) => p.toLowerCase());
  if (match[1].toUpperCase() === "TABLE") {
    hints.tableNotes.set(parts[parts.length - 1], text);
  } else if (parts.length >= 2) {
    hints.columnNotes.set(`${parts[parts.length - 2]}.${parts[parts.length - 1]}`, text);
  }
  return true;
}

/** EXEC sp_addextendedproperty 'MS_Description' ... (SQL Server). */
function collectExtendedProperty(stmt: string, hints: SchemaHints): boolean {
  if (!/^EXEC(?:UTE)?\s+(?:[\w[\]]+\.)*\[?sp_addextendedproperty\]?/i.test(stmt)) return false;

  const named = new Map<string, string>();
  for (const m of stmt.matchAll(/@(\w+)\s*=\s*N?'((?:[^']|'')*)'/gi)) {
    named.set(m[1].toLowerCase(), m[2].replace(/''/g, "'"));
  }

  let values: (string | undefined)[];
  if (named.size > 0) {
    values = ["name", "value", "level0type", "level0name", "level1type", "level1name", "level2type", "level2name"].map(
      (key) => named.get(key)
    );
  } else {
    values = [...stmt.matchAll(/N?'((?:[^']|'')*)'/g)].map((m) => m[1].replace(/''/g, "'"));
  }

  const [name, value, , , level1Type, level1Name, level2Type, level2Name] = values;
  if (!name || !/description/i.test(name) || !value?.trim()) return true;
  if (!level1Type || !/table/i.test(level1Type) || !level1Name) return true;

  const text = value.replace(/\s*\r?\n\s*/g, " ").trim();
  const tableKey = level1Name.toLowerCase();
  if (level2Type && /column/i.test(level2Type) && level2Name) {
    hints.columnNotes.set(`${tableKey}.${level2Name.toLowerCase()}`, text);
  } else {
    hints.tableNotes.set(tableKey, text);
  }
  return true;
}

/* ------------------------------------------------------------------------------------
 * 4. API pública
 * ---------------------------------------------------------------------------------- */

/** Limpia un script SQL y devuelve solo el DDL de tablas y relaciones. */
export function sanitizeSqlSchema(sql: string, dialect: SqlSourceDialect): SanitizedSql {
  const ignored = new Map<string, number>();
  const hints: SchemaHints = {
    incrementColumns: new Set(),
    uniqueColumns: new Set(),
    tableNotes: new Map(),
    columnNotes: new Map(),
  };
  const statements: string[] = [];

  for (const raw of splitSqlStatements(sql, dialect)) {
    const stmt = raw.trim();
    const head = stmt.slice(0, 120).replace(/\s+/g, " ").toUpperCase();

    if (CREATE_TABLE_RE.test(stmt)) {
      const ddl = normalizeCreateTable(stmt, dialect, hints, ignored);
      if (ddl) statements.push(ddl);
    } else if (head.startsWith("ALTER TABLE ")) {
      statements.push(...normalizeAlterTable(stmt, dialect, hints, ignored));
    } else if (/^CREATE UNIQUE\b/.test(head) && /\bINDEX\b/.test(head)) {
      collectUniqueIndex(stmt, dialect, hints, ignored);
    } else if (head.startsWith("COMMENT ON ") && collectCommentOn(stmt, hints)) {
      continue;
    } else if (/^EXEC/.test(head) && collectExtendedProperty(stmt, hints)) {
      continue;
    } else {
      bump(ignored, classifyStatement(stmt));
    }
  }

  return { statements, ignored, hints };
}

/**
 * Versión simplificada de un CREATE TABLE para cuando el parser rechaza la original.
 * Conserva solo nombre, tipo, NOT NULL, PK, UNIQUE y (en el nivel 1) las claves foráneas.
 */
export function simplifyCreateTable(
  stmt: string,
  dialect: SqlSourceDialect,
  hints: SchemaHints,
  level: 1 | 2
): string | null {
  const parsed = parseCreateTable(stmt, dialect === "mysql");
  if (!parsed) return null;

  const tableKey = tableKeyOf(parsed.qname);
  const cleanTableName = stripSchemaFromQName(parsed.qname);
  const elements: string[] = [];
  const identList = (text: string) =>
    splitTopLevel(text, ",")
      .map((c) => LEADING_IDENT_RE.exec(c.trim())?.[1])
      .filter(Boolean)
      .join(", ");

  let hasTableLevelPk = false;
  const tableLevelFkCols = new Set<string>();
  for (const part of parsed.parts) {
    const constraint = TABLE_CONSTRAINT_RE.exec(part);
    if (!constraint) continue;
    const kind = constraint[1].toUpperCase().replace(/\s+/g, " ");
    if (kind === "PRIMARY KEY") hasTableLevelPk = true;
    else if (kind === "FOREIGN KEY") {
      const open = part.indexOf("(", constraint.index + constraint[0].length - constraint[1].length);
      const close = open === -1 ? -1 : findMatchingParen(part, open);
      if (close !== -1) {
        const cols = splitTopLevel(part.slice(open + 1, close), ",").map((c) => unquoteIdentifier(c).toLowerCase());
        if (cols.length === 1) tableLevelFkCols.add(cols[0]);
      }
    }
  }

  for (const part of parsed.parts) {
    const constraint = TABLE_CONSTRAINT_RE.exec(part);
    if (constraint) {
      const kind = constraint[1].toUpperCase().replace(/\s+/g, " ");
      const open = part.indexOf("(", constraint.index + constraint[0].length - constraint[1].length);
      const close = open === -1 ? -1 : findMatchingParen(part, open);
      if (close === -1) continue;
      const cols = identList(part.slice(open + 1, close));
      if (!cols) continue;

      if (kind === "FOREIGN KEY") {
        if (level !== 1) continue;
        const ref = REFERENCES_RE.exec(part.slice(close + 1));
        if (ref) {
          const refTarget = stripSchemaFromQName(ref[1]);
          elements.push(`FOREIGN KEY (${cols}) REFERENCES ${refTarget} ${ref[2] || ""}${ref[3] || ""}`.trim());
        }
      } else {
        elements.push(`${kind} (${cols})`);
      }
      continue;
    }
    if (DISCARDED_TABLE_ELEMENT_RE.test(part)) continue;

    const nameMatch = LEADING_IDENT_RE.exec(part);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    const colLower = unquoteIdentifier(name).toLowerCase();
    const rest = part.slice(name.length).replace(/^\s*\[([^\]]+)\]/, " $1");
    const colKey = `${tableKey}.${colLower}`;

    if (columnIsAutoIncrement(rest)) hints.incrementColumns.add(colKey);
    const comment = /\bCOMMENT\s+('(?:[^'\\]|\\.|'')*')/i.exec(rest);
    if (comment && !hints.columnNotes.has(colKey)) {
      hints.columnNotes.set(colKey, parseSqlString(comment[1], dialect === "mysql"));
    }

    const typeMatch =
      /^\s*([A-Za-z_][\w$]*(?:\s+(?:varying|precision|without\s+time\s+zone|with\s+time\s+zone))*(?:\s*\(\s*[\d\s,]*\))?(?:\s*\[\s*\d*\s*\])*)/i.exec(
        rest
      );
    let type = typeMatch?.[1]?.trim() || "TEXT";
    if (/^(?:NOT|NULL|PRIMARY|UNIQUE|DEFAULT|REFERENCES|CHECK|CONSTRAINT|AS)$/i.test(type)) type = "TEXT";

    let def = `${name} ${type}`;
    if (/\bNOT\s+NULL\b/i.test(rest)) def += " NOT NULL";
    if (!hasTableLevelPk && /\bPRIMARY\s+KEY\b/i.test(rest)) def += " PRIMARY KEY";
    if (/\bUNIQUE\b/i.test(rest)) def += " UNIQUE";
    if (level === 1 && !tableLevelFkCols.has(colLower)) {
      const ref = REFERENCES_RE.exec(rest);
      if (ref) {
        const refTarget = stripSchemaFromQName(ref[1]);
        def += ` REFERENCES ${refTarget}${ref[2] ? ` ${ref[2]}` : ""}${ref[3] || ""}`;
      }
    }
    elements.push(def);
  }

  if (!elements.some((e) => !/^(?:PRIMARY KEY|UNIQUE|FOREIGN KEY)\b/.test(e))) return null;

  const ddl = `CREATE TABLE ${cleanTableName} (\n  ${elements.join(",\n  ")}\n)`;
  return dialect === "sqlite" ? toDoubleQuotedIdentifiers(ddl) : ddl;
}

export function isCreateTableStatement(stmt: string): boolean {
  return CREATE_TABLE_RE.test(stmt);
}

/**
 * Detecta el motor de origen de un script por sus rasgos característicos.
 * Devuelve null si no hay indicios suficientes.
 */
export function detectSqlDialect(sql: string): SqlSourceDialect | null {
  const sample = sql.slice(0, 200_000);
  if (!sample.trim()) return null;

  const score: Record<SqlSourceDialect, number> = { postgres: 0, mysql: 0, mssql: 0, sqlite: 0 };
  const add = (dialect: SqlSourceDialect, re: RegExp, weight = 1) => {
    if (re.test(sample)) score[dialect] += weight;
  };

  add("postgres", /PostgreSQL database dump|pg_dump/i, 5);
  add("postgres", /\bCOPY\s+[\w."]+\s*(?:\([^)]*\))?\s+FROM\s+stdin/i, 3);
  add("postgres", /::regclass|::[a-z]+\b/i, 2);
  add("postgres", /\bOWNER\s+TO\b|SET\s+search_path|pg_catalog\./i, 2);
  add("postgres", /\b(?:BIG)?SERIAL\b|\bGENERATED\s+(?:ALWAYS|BY\s+DEFAULT)\s+AS\s+IDENTITY\b/i);
  add("postgres", /\b(?:character varying|timestamp with(?:out)? time zone|jsonb|uuid)\b/i);

  add("mysql", /MySQL dump|MariaDB dump|mysqldump/i, 5);
  add("mysql", /^\/\*!\d{5}/m, 3);
  add("mysql", /\bENGINE\s*=\s*\w+/i, 3);
  add("mysql", /`[^`\n]+`/, 2);
  add("mysql", /\bAUTO_INCREMENT\b/i, 2);
  add("mysql", /\bLOCK\s+TABLES\b|\bDEFAULT\s+CHARSET\b/i);

  add("mssql", /^\s*GO\s*$/im, 4);
  add("mssql", /\[dbo\]/i, 3);
  add("mssql", /\bIDENTITY\s*\(\s*\d+\s*,\s*\d+\s*\)/i, 3);
  add("mssql", /\bN?VARCHAR\s*\(\s*MAX\s*\)|\bNVARCHAR\b|\bsp_addextendedproperty\b/i, 2);
  add("mssql", /\bSET\s+(?:ANSI_NULLS|QUOTED_IDENTIFIER)\b|\bUSE\s+\[/i, 2);

  add("sqlite", /\bPRAGMA\b/i, 4);
  add("sqlite", /\bAUTOINCREMENT\b/i, 3);
  add("sqlite", /\bsqlite_sequence\b|\bWITHOUT\s+ROWID\b/i, 3);
  add("sqlite", /\bBEGIN\s+TRANSACTION\s*;/i);

  const best = (Object.entries(score) as [SqlSourceDialect, number][]).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 2 ? best[0] : null;
}
