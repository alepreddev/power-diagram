/**
 * Formateador no destructivo para código DBML.
 *
 * Normaliza indentación (2 espacios), espaciado en bloques `{ ... }`, atributos `[ ... ]`,
 * directivas `Ref:`, palabras clave principales y saltos de línea entre bloques,
 * preservando comentarios de línea (`//`), bloques de comentario y cadenas multilínea (`'''`).
 */

const TOP_LEVEL_KEYWORDS: ReadonlyArray<[RegExp, string]> = [
  [/^table\b/i, "Table"],
  [/^tablegroup\b/i, "TableGroup"],
  [/^enum\b/i, "Enum"],
  [/^note\b/i, "Note"],
  [/^project\b/i, "Project"],
  [/^ref\b/i, "Ref"],
];

/**
 * Divide una línea en código activo y comentario final `// ...` (respetando comillas).
 */
function splitTrailingComment(line: string): { code: string; comment: string } {
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const prev = i > 0 ? line[i - 1] : "";

    if (ch === "'" && !inDouble && !inBacktick && prev !== "\\") {
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle && !inBacktick && prev !== "\\") {
      inDouble = !inDouble;
    } else if (ch === "`" && !inSingle && !inDouble && prev !== "\\") {
      inBacktick = !inBacktick;
    } else if (
      ch === "/" &&
      line[i + 1] === "/" &&
      !inSingle &&
      !inDouble &&
      !inBacktick
    ) {
      return {
        code: line.slice(0, i).trimEnd(),
        comment: line.slice(i).trim(),
      };
    }
  }

  return { code: line.trimEnd(), comment: "" };
}

/**
 * Cuenta llaves `{` y `}` fuera de comillas en un fragmento de código sin comentarios `//`.
 */
function countBracesOutsideStrings(code: string): {
  leadingCloses: number;
  netChange: number;
} {
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let leadingCloses = 0;
  let seenOther = false;
  let netChange = 0;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    const prev = i > 0 ? code[i - 1] : "";

    if (ch === "'" && !inDouble && !inBacktick && prev !== "\\") {
      inSingle = !inSingle;
      seenOther = true;
    } else if (ch === '"' && !inSingle && !inBacktick && prev !== "\\") {
      inDouble = !inDouble;
      seenOther = true;
    } else if (ch === "`" && !inSingle && !inDouble && prev !== "\\") {
      inBacktick = !inBacktick;
      seenOther = true;
    } else if (!inSingle && !inDouble && !inBacktick) {
      if (ch === "}") {
        if (!seenOther) leadingCloses++;
        netChange--;
      } else if (ch === "{") {
        seenOther = true;
        netChange++;
      } else if (!/\s/.test(ch)) {
        seenOther = true;
      }
    }
  }

  return { leadingCloses, netChange };
}

/**
 * Normaliza el espaciado interno de bloques de configuración `[pk, not null, note: '...']`
 * respetando literales entre comillas.
 */
function normalizeBracketSettings(text: string): string {
  let result = "";
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let bracketDepth = 0;

  while (i < text.length) {
    const ch = text[i];
    const prev = i > 0 ? text[i - 1] : "";

    if (ch === "'" && !inDouble && prev !== "\\") {
      inSingle = !inSingle;
      result += ch;
      i++;
      continue;
    }
    if (ch === '"' && !inSingle && prev !== "\\") {
      inDouble = !inDouble;
      result += ch;
      i++;
      continue;
    }

    if (!inSingle && !inDouble) {
      if (ch === "[") {
        bracketDepth++;
        // Evitar espacio si es tipo array ej. text[]
        const prevNonSpace = result.length > 0 ? result[result.length - 1] : "";
        if (bracketDepth === 1 && text[i + 1] === "]") {
          result += "[]";
          bracketDepth--;
          i += 2;
          continue;
        }
        if (bracketDepth === 1 && prevNonSpace && prevNonSpace !== " ") {
          result += " ";
        }
        result += "[";
        i++;
        while (i < text.length && text[i] === " ") i++;
        continue;
      }

      if (ch === "]" && bracketDepth > 0) {
        bracketDepth--;
        result = result.replace(/ +$/, "");
        result += "]";
        i++;
        continue;
      }

      if (bracketDepth > 0 && ch === ",") {
        result = result.replace(/ +$/, "");
        result += ", ";
        i++;
        while (i < text.length && text[i] === " ") i++;
        continue;
      }

      if (bracketDepth > 0 && ch === ":") {
        result = result.replace(/ +$/, "");
        result += ": ";
        i++;
        while (i < text.length && text[i] === " ") i++;
        continue;
      }
    }

    result += ch;
    i++;
  }

  return result;
}

/**
 * Colapsa espacios múltiples fuera de comillas y normaliza operadores / llaves.
 */
function normalizeCodeFragment(rawCode: string, depth: number): string {
  let code = rawCode.trim();
  if (!code) return "";

  // Colapsar espacios múltiples fuera de comillas
  let compact = "";
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    const prev = i > 0 ? code[i - 1] : "";
    if (ch === "'" && !inDouble && !inBacktick && prev !== "\\") {
      inSingle = !inSingle;
      compact += ch;
    } else if (ch === '"' && !inSingle && !inBacktick && prev !== "\\") {
      inDouble = !inDouble;
      compact += ch;
    } else if (ch === "`" && !inSingle && !inDouble && prev !== "\\") {
      inBacktick = !inBacktick;
      compact += ch;
    } else if (!inSingle && !inDouble && !inBacktick && /\s/.test(ch)) {
      if (compact.length > 0 && compact[compact.length - 1] !== " ") {
        compact += " ";
      }
    } else {
      compact += ch;
    }
  }
  code = compact;

  // Normalizar palabras clave de nivel raíz o sub-bloques
  if (depth === 0) {
    for (const [regex, canonical] of TOP_LEVEL_KEYWORDS) {
      if (regex.test(code)) {
        code = code.replace(regex, canonical);
        break;
      }
    }

    // Normalizar espaciado en directivas Ref de una línea
    if (/^Ref\b/.test(code) && !code.endsWith("{")) {
      code = code
        .replace(/^Ref\s*:\s*/i, "Ref: ")
        .replace(/\s*(<>|[><-])\s*/g, " $1 ");
    }
  } else if (/^indexes\b/i.test(code)) {
    code = code.replace(/^indexes\b/i, "Indexes");
  } else if (/^note\s*:/i.test(code)) {
    code = code.replace(/^note\s*:\s*/i, "Note: ");
  }

  // Asegurar un espacio limpio antes de `{` de apertura al final de la línea
  if (code.endsWith("{") && code.length > 1 && !code.endsWith(" {")) {
    code = `${code.slice(0, -1).trimEnd()} {`;
  }

  return normalizeBracketSettings(code);
}

/**
 *Cuenta ocurrencias no escapadas de `'''` en una línea.
 */
function countTripleQuotes(line: string): number {
  let count = 0;
  let idx = 0;
  while (idx <= line.length - 3) {
    if (line.slice(idx, idx + 3) === "'''" && line[idx - 1] !== "\\") {
      count++;
      idx += 3;
    } else {
      idx++;
    }
  }
  return count;
}

export function formatDbmlCode(source: string): string {
  if (!source || !source.trim()) return "";

  const rawLines = source.replace(/\r\n/g, "\n").split("\n");
  const formatted: string[] = [];

  let depth = 0;
  let inBlockComment = false;
  let inTripleString = false;
  let prevWasBlank = false;
  let prevWasClosingBrace = false;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();

    // 1. Dentro de cadena multilínea ''' ... ''' (preservar contenido literal intacto)
    if (inTripleString) {
      if (countTripleQuotes(rawLine) % 2 === 1) {
        inTripleString = false;
        if (trimmed === "'''") {
          const indent = "  ".repeat(Math.max(1, depth));
          formatted.push(`${indent}'''`);
        } else {
          formatted.push(rawLine.trimEnd());
        }
      } else {
        formatted.push(rawLine.trimEnd());
      }
      prevWasBlank = false;
      prevWasClosingBrace = false;
      continue;
    }

    // 2. Dentro de comentario de bloque (preservar alineación interna)
    if (inBlockComment) {
      formatted.push(rawLine.trimEnd());
      if (trimmed.includes("*/")) {
        inBlockComment = false;
      }
      prevWasBlank = false;
      prevWasClosingBrace = false;
      continue;
    }

    // 3. Líneas en blanco: colapsar múltiples líneas vacías seguidas
    if (!trimmed) {
      if (!prevWasBlank && formatted.length > 0 && depth === 0) {
        formatted.push("");
        prevWasBlank = true;
      }
      continue;
    }

    // Inicio de comentario de bloque /* ...
    if (trimmed.startsWith("/*")) {
      const indent = "  ".repeat(depth);
      formatted.push(`${indent}${trimmed}`);
      if (!trimmed.includes("*/") || trimmed.endsWith("/*")) {
        inBlockComment = true;
      }
      prevWasBlank = false;
      prevWasClosingBrace = false;
      continue;
    }

    // Comentario de línea completa //
    if (trimmed.startsWith("//")) {
      if (prevWasClosingBrace && depth === 0 && !prevWasBlank) {
        formatted.push("");
      }
      const indent = "  ".repeat(depth);
      formatted.push(`${indent}${trimmed}`);
      prevWasBlank = false;
      prevWasClosingBrace = false;
      continue;
    }

    const { code, comment } = splitTrailingComment(rawLine);

    // Detectar apertura o cierre de ''' en esta línea
    const tripleCount = countTripleQuotes(code);
    if (tripleCount % 2 === 1) {
      inTripleString = true;
    }

    const { leadingCloses, netChange } = countBracesOutsideStrings(code);
    const lineDepth = Math.max(0, depth - leadingCloses);

    // Insertar línea en blanco automática antes de un nuevo bloque raíz tras `}`
    const isTopBlockDeclaration =
      lineDepth === 0 &&
      /^(?:table|tablegroup|enum|note|project)\b/i.test(code.trim());
    if (
      lineDepth === 0 &&
      !prevWasBlank &&
      (prevWasClosingBrace ||
        (isTopBlockDeclaration &&
          formatted.length > 0 &&
          !formatted[formatted.length - 1].trim().startsWith("//")))
    ) {
      formatted.push("");
    }

    // Quitar línea en blanco justo antes de una llave de cierre `}`
    if (leadingCloses > 0 && formatted.length > 0 && formatted[formatted.length - 1] === "") {
      formatted.pop();
    }

    const normalizedCode = normalizeCodeFragment(code, lineDepth);
    const indent = "  ".repeat(lineDepth);
    const combined =
      normalizedCode && comment
        ? `${indent}${normalizedCode} ${comment}`
        : normalizedCode
          ? `${indent}${normalizedCode}`
          : `${indent}${comment}`;

    formatted.push(combined);

    depth = Math.max(0, depth + netChange);
    prevWasBlank = false;
    prevWasClosingBrace = normalizedCode === "}" && depth === 0;
  }

  return `${formatted.join("\n").trim()}\n`;
}
