import { Parser } from "@dbml/core";
import {
  StreamLanguage,
  foldService,
  LanguageSupport,
  type StringStream,
} from "@codemirror/language";
import {
  snippetCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { linter, type Diagnostic } from "@codemirror/lint";
import { tags } from "@lezer/highlight";
import { keymap, type Extension } from "@uiw/react-codemirror";
import type { DiagramNode } from "./dbmlParser";

interface DbmlStreamState {
  inBlockComment: boolean;
  inTripleQuote: boolean;
  bracketDepth: number;
}

const STRUCTURAL_KEYWORDS = new Set([
  "table",
  "ref",
  "enum",
  "tablegroup",
  "note",
  "project",
  "indexes",
  "as",
]);

const BRACKET_MODIFIERS = new Set([
  "pk",
  "primary",
  "key",
  "unique",
  "increment",
  "not",
  "null",
  "cascade",
  "restrict",
  "set",
  "no",
  "action",
  "true",
  "false",
]);

const BRACKET_PROPERTIES = new Set([
  "note",
  "default",
  "headercolor",
  "color",
  "delete",
  "update",
  "ref",
  "name",
  "type",
]);

const SQL_TYPES = new Set([
  "int",
  "integer",
  "bigint",
  "smallint",
  "tinyint",
  "int2",
  "int4",
  "int8",
  "serial",
  "smallserial",
  "bigserial",
  "varchar",
  "char",
  "nvarchar",
  "nchar",
  "text",
  "boolean",
  "bool",
  "timestamp",
  "timestamptz",
  "datetime",
  "datetime2",
  "date",
  "time",
  "timetz",
  "numeric",
  "decimal",
  "float",
  "double",
  "real",
  "money",
  "uuid",
  "uniqueidentifier",
  "json",
  "jsonb",
  "blob",
  "bytea",
  "inet",
]);

function readQuoted(stream: StringStream, quote: string): void {
  let escaped = false;
  while (!stream.eol()) {
    const ch = stream.next();
    if (ch === quote && !escaped) break;
    escaped = !escaped && ch === "\\";
  }
}

export const dbmlStreamLanguage = StreamLanguage.define<DbmlStreamState>({
  name: "dbml",
  startState: () => ({
    inBlockComment: false,
    inTripleQuote: false,
    bracketDepth: 0,
  }),
  tokenTable: {
    comment: tags.comment,
    string: tags.string,
    number: tags.number,
    keyword: tags.keyword,
    typeName: tags.typeName,
    modifier: tags.modifier,
    propertyName: tags.propertyName,
    color: tags.color,
    operator: tags.operator,
    brace: tags.brace,
    squareBracket: tags.squareBracket,
    paren: tags.paren,
    punctuation: tags.punctuation,
    identifier: tags.variableName,
  },
  token(stream, state) {
    // 1. Comentario de bloque /* ... */
    if (state.inBlockComment) {
      while (!stream.eol()) {
        if (stream.match("*/")) {
          state.inBlockComment = false;
          break;
        }
        stream.next();
      }
      return "comment";
    }

    // 2. Cadena multilínea ''' ... '''
    if (state.inTripleQuote) {
      while (!stream.eol()) {
        if (stream.match("'''")) {
          state.inTripleQuote = false;
          break;
        }
        stream.next();
      }
      return "string";
    }

    if (stream.eatSpace()) return null;

    // Comentarios
    if (stream.match("//")) {
      stream.skipToEnd();
      return "comment";
    }
    if (stream.match("/*")) {
      state.inBlockComment = true;
      return "comment";
    }

    // Cadenas y nombres entrecomillados
    if (stream.match("'''")) {
      state.inTripleQuote = true;
      return "string";
    }
    const ch = stream.peek();
    if (ch === "'" || ch === '"' || ch === "`") {
      stream.next();
      readQuoted(stream, ch);
      return "string";
    }

    // Color hexadecimal (#6366f1)
    if (stream.match(/^#[0-9a-fA-F]{3,8}\b/)) {
      return "color";
    }

    // Delimitadores y corchetes de configuración
    if (ch === "[") {
      stream.next();
      state.bracketDepth++;
      return "squareBracket";
    }
    if (ch === "]") {
      stream.next();
      state.bracketDepth = Math.max(0, state.bracketDepth - 1);
      return "squareBracket";
    }
    if (ch === "{" || ch === "}") {
      stream.next();
      return "brace";
    }
    if (ch === "(" || ch === ")") {
      stream.next();
      return "paren";
    }
    if (ch === "." || ch === ",") {
      stream.next();
      return "punctuation";
    }

    // Operadores de relación DBML
    if (stream.match("<>") || stream.match(/[><:-]/)) {
      return "operator";
    }

    // Números
    if (stream.match(/^\d+(?:\.\d+)?\b/)) {
      return "number";
    }

    // Identificadores / palabras clave
    if (stream.match(/^[A-Za-z_\u00C0-\uFFFF][\w$\u00C0-\uFFFF]*/)) {
      const word = stream.current().toLowerCase();

      if (state.bracketDepth > 0) {
        if (BRACKET_PROPERTIES.has(word)) return "propertyName";
        if (BRACKET_MODIFIERS.has(word)) return "modifier";
        return "identifier";
      }

      if (STRUCTURAL_KEYWORDS.has(word)) {
        return "keyword";
      }
      if (SQL_TYPES.has(word)) {
        return "typeName";
      }
      return "identifier";
    }

    stream.next();
    return null;
  },
  languageData: {
    commentTokens: { line: "//", block: { open: "/*", close: "*/" } },
    closeBrackets: { brackets: ["(", "[", "{", "'", '"', "`"] },
  },
});

/**
 * Servicio de plegado (code folding) para bloques `{ ... }` de DBML.
 */
const dbmlFoldService = foldService.of((state, lineStart, lineEnd) => {
  const lineText = state.doc.sliceString(lineStart, lineEnd);
  const openIdx = lineText.indexOf("{");
  if (openIdx === -1) return null;

  // Ignorar si la llave está después de un comentario //
  const commentIdx = lineText.indexOf("//");
  if (commentIdx !== -1 && commentIdx < openIdx) return null;

  const maxLines = Math.min(state.doc.lines, state.doc.lineAt(lineStart).number + 500);
  let depth = 1;

  // Revisar el resto de la misma línea primero
  for (let i = openIdx + 1; i < lineText.length; i++) {
    if (lineText[i] === "{") depth++;
    else if (lineText[i] === "}") {
      depth--;
      if (depth === 0) return null; // Abre y cierra en la misma línea
    }
  }

  for (let lineNum = state.doc.lineAt(lineStart).number + 1; lineNum <= maxLines; lineNum++) {
    const line = state.doc.line(lineNum);
    const text = line.text;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "/" && text[i + 1] === "/") break;
      if (text[i] === "{") depth++;
      else if (text[i] === "}") {
        depth--;
        if (depth === 0) {
          return { from: lineEnd, to: line.from + i };
        }
      }
    }
  }

  return null;
});

const TOP_LEVEL_SNIPPETS: readonly Completion[] = [
  snippetCompletion(
    "Table ${nombre_tabla} {\n  id integer [pk, increment]\n  ${columna} varchar [not null]\n  created_at timestamp\n}",
    {
      label: "Table",
      detail: "Bloque de tabla DBML",
      type: "keyword",
      boost: 10,
    }
  ),
  snippetCompletion("Ref: ${tabla_origen}.${col_fk} > ${tabla_destino}.id", {
    label: "Ref",
    detail: "Relación entre columnas",
    type: "keyword",
    boost: 9,
  }),
  snippetCompletion("Enum ${nombre_enum} {\n  ${valor_1}\n  ${valor_2}\n}", {
    label: "Enum",
    detail: "Enumeración DBML",
    type: "keyword",
    boost: 8,
  }),
  snippetCompletion("TableGroup ${nombre_grupo} [color: #6366f1] {\n  ${tabla_1}\n}", {
    label: "TableGroup",
    detail: "Grupo visual de tablas",
    type: "keyword",
    boost: 7,
  }),
  snippetCompletion("Note ${nombre_nota} {\n  '${contenido}'\n}", {
    label: "Note",
    detail: "Nota adhesiva en el lienzo",
    type: "keyword",
    boost: 6,
  }),
  snippetCompletion("Project ${nombre_proyecto} {\n  database_type: 'PostgreSQL'\n  Note: '${descripcion}'\n}", {
    label: "Project",
    detail: "Metadatos del proyecto",
    type: "keyword",
    boost: 4,
  }),
];

const BRACKET_COMPLETIONS: readonly Completion[] = [
  { label: "pk", detail: "Primary Key", type: "keyword", boost: 10 },
  { label: "increment", detail: "Auto-incremento", type: "keyword", boost: 9 },
  { label: "not null", detail: "Obligatorio (NOT NULL)", type: "keyword", boost: 8 },
  { label: "unique", detail: "Valor único (UNIQUE)", type: "keyword", boost: 7 },
  { label: "null", detail: "Permite nulos", type: "keyword", boost: 4 },
  snippetCompletion("note: '${descripcion}'", {
    label: "note",
    detail: "Descripción de tabla o columna",
    type: "property",
    boost: 6,
  }),
  snippetCompletion("default: ${valor}", {
    label: "default",
    detail: "Valor por defecto",
    type: "property",
    boost: 5,
  }),
  snippetCompletion("headercolor: #${6366f1}", {
    label: "headercolor",
    detail: "Color de cabecera de tabla",
    type: "property",
    boost: 5,
  }),
  snippetCompletion("color: #${6366f1}", {
    label: "color",
    detail: "Color de grupo",
    type: "property",
    boost: 4,
  }),
  snippetCompletion("ref: > ${tabla}.${id}", {
    label: "ref",
    detail: "Clave foránea inline",
    type: "property",
    boost: 6,
  }),
  { label: "delete: cascade", detail: "ON DELETE CASCADE", type: "property", boost: 5 },
  { label: "delete: set null", detail: "ON DELETE SET NULL", type: "property", boost: 4 },
  { label: "delete: restrict", detail: "ON DELETE RESTRICT", type: "property", boost: 4 },
  { label: "delete: no action", detail: "ON DELETE NO ACTION", type: "property", boost: 3 },
  { label: "update: cascade", detail: "ON UPDATE CASCADE", type: "property", boost: 3 },
  { label: "update: no action", detail: "ON UPDATE NO ACTION", type: "property", boost: 2 },
];

const COLUMN_TYPE_COMPLETIONS: readonly Completion[] = [
  "integer",
  "bigint",
  "smallint",
  "serial",
  "bigserial",
  "varchar",
  "varchar(255)",
  "char(10)",
  "text",
  "boolean",
  "timestamp",
  "timestamptz",
  "date",
  "time",
  "numeric",
  "decimal(10,2)",
  "float",
  "double",
  "uuid",
  "json",
  "jsonb",
  "bytea",
].map((t, idx) => ({
  label: t,
  type: "type",
  detail: "Tipo SQL/DBML",
  boost: 10 - Math.min(8, Math.floor(idx / 3)),
}));

function detectEnclosingBlock(docTextBefore: string): {
  depth: number;
  blockKind: "table" | "enum" | "tablegroup" | "note" | "project" | "other" | null;
  inBrackets: boolean;
} {
  let depth = 0;
  let bracketDepth = 0;
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let lastTopHeader = "";
  let currentHeaderBuf = "";

  for (let i = 0; i < docTextBefore.length; i++) {
    const ch = docTextBefore[i];
    const next = docTextBefore[i + 1];

    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }
    if (!inSingle && !inDouble && ch === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === "'" && !inDouble && docTextBefore[i - 1] !== "\\") {
      inSingle = !inSingle;
      continue;
    }
    if (ch === '"' && !inSingle && docTextBefore[i - 1] !== "\\") {
      inDouble = !inDouble;
      continue;
    }
    if (inSingle || inDouble) continue;

    if (ch === "[") bracketDepth++;
    else if (ch === "]") bracketDepth = Math.max(0, bracketDepth - 1);
    else if (ch === "{") {
      if (depth === 0) {
        lastTopHeader = currentHeaderBuf.trim();
      }
      depth++;
      currentHeaderBuf = "";
    } else if (ch === "}") {
      depth = Math.max(0, depth - 1);
      if (depth === 0) {
        lastTopHeader = "";
        currentHeaderBuf = "";
      }
    } else if (depth === 0) {
      if (ch === "\n") currentHeaderBuf = "";
      else currentHeaderBuf += ch;
    }
  }

  let blockKind: "table" | "enum" | "tablegroup" | "note" | "project" | "other" | null = null;
  if (depth > 0) {
    const firstWord = lastTopHeader.split(/\s+/)[0]?.toLowerCase() || "";
    if (firstWord === "table") blockKind = "table";
    else if (firstWord === "enum") blockKind = "enum";
    else if (firstWord === "tablegroup") blockKind = "tablegroup";
    else if (firstWord === "note") blockKind = "note";
    else if (firstWord === "project") blockKind = "project";
    else blockKind = "other";
  }

  return {
    depth,
    blockKind,
    inBrackets: bracketDepth > 0,
  };
}

function createDbmlCompletionSource(getNodes: () => DiagramNode[]) {
  return (context: CompletionContext): CompletionResult | null => {
    const line = context.state.doc.lineAt(context.pos);
    const lineBefore = line.text.slice(0, context.pos - line.from);

    // No sugerir dentro de comentarios //
    if (lineBefore.includes("//")) return null;

    const docBefore = context.state.doc.sliceString(
      Math.max(0, context.pos - 8000),
      context.pos
    );
    const { depth, blockKind, inBrackets } = detectEnclosingBlock(docBefore);

    const nodes = getNodes();
    const tables = nodes.filter((n) => n.type === "table");
    const enums = nodes.filter((n) => n.type === "enum");

    // Caso A: Autocompletado de `tabla.columna` después de escribir `tabla.`
    const dotMatch = /([A-Za-z_][\w$]*)\.([A-Za-z_][\w$]*)?$/.exec(lineBefore);
    if (dotMatch) {
      const tableNameLower = dotMatch[1].toLowerCase();
      const targetTable = tables.find((t) => t.data.label.toLowerCase() === tableNameLower);
      if (targetTable && targetTable.type === "table") {
        const from = context.pos - (dotMatch[2]?.length ?? 0);
        return {
          from,
          options: targetTable.data.columns.map((col) => ({
            label: col.name,
            type: col.pk ? "property" : "variable",
            detail: `${col.type}${col.pk ? " · PK" : ""}`,
            boost: col.pk ? 10 : 5,
          })),
        };
      }
    }

    const word = context.matchBefore(/[A-Za-z_][\w$]*/);
    if (!word && !context.explicit) return null;
    const from = word ? word.from : context.pos;

    // Caso B: Dentro de corchetes `[ ... ]`
    if (inBrackets) {
      // Si acaba de escribir `ref: > ` o similar, sugerir tabla.columna
      if (/ref\s*:\s*(?:<>|[><-])\s*[A-Za-z_\w$]*$/i.test(lineBefore)) {
        const refOptions: Completion[] = [];
        for (const tbl of tables) {
          if (tbl.type !== "table") continue;
          for (const col of tbl.data.columns) {
            refOptions.push({
              label: `${tbl.data.label}.${col.name}`,
              type: "property",
              detail: `${col.type}${col.pk ? " · PK" : ""}`,
              boost: col.pk ? 10 : 3,
            });
          }
        }
        return { from, options: refOptions };
      }

      return {
        from,
        options: BRACKET_COMPLETIONS,
      };
    }

    // Caso C: En una línea `Ref:`
    if (/^\s*Ref\b/i.test(lineBefore)) {
      const afterOperator = /(?:<>|[><-])\s*[A-Za-z_\w$]*$/.test(lineBefore);
      const refEndpoints: Completion[] = [];
      for (const tbl of tables) {
        if (tbl.type !== "table") continue;
        for (const col of tbl.data.columns) {
          refEndpoints.push({
            label: `${tbl.data.label}.${col.name}`,
            type: col.pk ? "property" : "variable",
            detail: `${col.type}${col.pk ? " · PK" : ""}`,
            boost: afterOperator ? (col.pk ? 10 : 3) : col.pk ? 4 : 8,
          });
        }
      }
      return { from, options: refEndpoints };
    }

    // Caso D: Nivel raíz fuera de bloques `{ ... }`
    if (depth === 0) {
      return {
        from,
        options: TOP_LEVEL_SNIPPETS,
      };
    }

    // Caso E: Dentro de `TableGroup ... { ... }` → sugerir tablas existentes
    if (blockKind === "tablegroup") {
      return {
        from,
        options: tables.map((tbl) => ({
          label: tbl.data.label,
          type: "class",
          detail: "Tabla del diagrama",
        })),
      };
    }

    // Caso F: Dentro de `Table ... { ... }`
    if (blockKind === "table") {
      const trimmedBeforeWord = lineBefore.slice(0, from - line.from).trim();
      // Si ya se escribió el nombre de la columna, sugerir tipos SQL + Enums definidos
      if (trimmedBeforeWord.length > 0 && !/\s/.test(trimmedBeforeWord)) {
        const enumTypeOptions: Completion[] = enums.map((en) => ({
          label: en.data.label,
          type: "enum",
          detail: "Enum del diagrama",
          boost: 12,
        }));
        return {
          from,
          options: [...enumTypeOptions, ...COLUMN_TYPE_COMPLETIONS],
        };
      }

      // Al inicio de una línea dentro de Table: sugerir sub-bloque Indexes o Note
      if (trimmedBeforeWord.length === 0) {
        return {
          from,
          options: [
            snippetCompletion("Indexes {\n  ${columna} [unique]\n}", {
              label: "Indexes",
              detail: "Bloque de índices de la tabla",
              type: "keyword",
            }),
            snippetCompletion("Note: '${descripcion_tabla}'", {
              label: "Note",
              detail: "Nota descriptiva de la tabla",
              type: "property",
            }),
          ],
        };
      }
    }

    return null;
  };
}

/**
 * Linter reactivo conectado a `@dbml/core` (`dbmlv2`) que subraya en rojo la línea/columna exacta del error.
 */
const dbmlCoreLinter = linter(
  (view): Diagnostic[] => {
    const code = view.state.doc.toString();
    if (!code.trim()) return [];

    try {
      Parser.parse(code, "dbmlv2");
      return [];
    } catch (err: unknown) {
      const errorObj = err as {
        message?: string;
        diags?: Array<{
          message?: string;
          location?: {
            start?: { line?: number; column?: number };
            end?: { line?: number; column?: number };
          };
        }>;
      };

      const diagnostics: Diagnostic[] = [];
      const diags =
        errorObj.diags && errorObj.diags.length > 0
          ? errorObj.diags
          : [{ message: errorObj.message || "Error sintáctico en DBML" }];

      for (const diag of diags) {
        const startLineNum = Math.min(
          Math.max(1, diag.location?.start?.line ?? 1),
          view.state.doc.lines
        );
        const startLine = view.state.doc.line(startLineNum);
        const startColOffset = Math.max(0, (diag.location?.start?.column ?? 1) - 1);
        const from = Math.min(startLine.from + startColOffset, startLine.to);

        let to = startLine.to;
        if (diag.location?.end?.line && diag.location?.end?.column) {
          const endLineNum = Math.min(
            Math.max(startLineNum, diag.location.end.line),
            view.state.doc.lines
          );
          const endLine = view.state.doc.line(endLineNum);
          const endColOffset = Math.max(0, diag.location.end.column - 1);
          to = Math.min(Math.max(from + 1, endLine.from + endColOffset), endLine.to);
        } else if (from < startLine.to) {
          to = startLine.to;
        }

        diagnostics.push({
          from,
          to: Math.max(from, to),
          severity: "error",
          message: diag.message || "Error sintáctico en DBML",
        });
      }

      return diagnostics;
    }
  },
  { delay: 300 }
);

/**
 * Construye el paquete completo de extensiones DBML para CodeMirror 6:
 * resaltado léxico, plegado de bloques, autocompletado contextual, linter `@dbml/core` y atajo de formato.
 */
export function createDbmlEditorExtensions(
  getNodes: () => DiagramNode[],
  onFormat: () => void
): Extension[] {
  const completionExtension = dbmlStreamLanguage.data.of({
    autocomplete: createDbmlCompletionSource(getNodes),
  });

  const formatKeymap = keymap.of([
    {
      key: "Shift-Alt-f",
      run: () => {
        onFormat();
        return true;
      },
    },
    {
      key: "Mod-Shift-f",
      run: () => {
        onFormat();
        return true;
      },
    },
  ]);

  return [
    new LanguageSupport(dbmlStreamLanguage, [completionExtension, dbmlFoldService]),
    dbmlCoreLinter,
    formatKeymap,
  ];
}
