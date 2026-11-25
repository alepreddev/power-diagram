import { Parser } from "@dbml/core";
import type { AppLanguage } from "@/i18n/translations";
import type { RelationshipType } from "./dbmlParser";
import { saveFileCrossPlatform } from "./fileSave";

export interface DictionaryColumn {
  name: string;
  type: string;
  pk: boolean;
  unique: boolean;
  notNull: boolean;
  increment: boolean;
  defaultValue?: string;
  fkTarget?: string;
  note?: string;
}

export interface DictionaryIndex {
  name?: string;
  columns: string[];
  pk: boolean;
  unique: boolean;
  type?: string;
  note?: string;
}

export interface DictionaryTable {
  name: string;
  schema?: string;
  groupName?: string;
  headerColor?: string;
  note?: string;
  columns: DictionaryColumn[];
  indexes: DictionaryIndex[];
}

export interface DictionaryEnum {
  name: string;
  values: Array<{ name: string; note?: string }>;
}

export interface DictionaryRelationship {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  cardinality: RelationshipType;
  onDelete?: string;
  onUpdate?: string;
}

export interface DictionaryStickyNote {
  name: string;
  content: string;
}

export interface DataDictionaryModel {
  projectName: string;
  dbEngine: string;
  generatedAtIso: string;
  tables: DictionaryTable[];
  enums: DictionaryEnum[];
  relationships: DictionaryRelationship[];
  notes: DictionaryStickyNote[];
  stats: {
    tableCount: number;
    columnCount: number;
    relationCount: number;
    enumCount: number;
  };
  parseError?: string;
}

const ENGINE_DISPLAY: Record<string, string> = {
  postgres: "PostgreSQL",
  mysql: "MySQL",
  sqlite: "SQLite",
  mssql: "SQL Server (MSSQL)",
};

function formatEngineLabel(engine: string): string {
  return ENGINE_DISPLAY[engine.toLowerCase()] || engine.toUpperCase();
}

function slugifyName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "diagrama"
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeMdCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\r?\n+/g, " ").trim();
}

function formatDbDefault(rawDefault: unknown): string | undefined {
  if (rawDefault === null || rawDefault === undefined) return undefined;
  if (typeof rawDefault === "string" || typeof rawDefault === "number" || typeof rawDefault === "boolean") {
    return String(rawDefault);
  }
  if (typeof rawDefault === "object") {
    const defObj = rawDefault as { value?: unknown; type?: string };
    if (defObj.value !== undefined && defObj.value !== null) {
      if (defObj.type === "string") {
        return `'${String(defObj.value)}'`;
      }
      if (defObj.type === "expression") {
        return `\`${String(defObj.value)}\``;
      }
      return String(defObj.value);
    }
  }
  return undefined;
}

/**
 * Extrae el modelo completo del Diccionario de Datos desde el código DBML activo (`dbmlv2`).
 */
export function extractDataDictionary(
  projectName: string,
  dbEngine: string,
  dbmlCode: string
): DataDictionaryModel {
  const baseModel: DataDictionaryModel = {
    projectName: projectName.trim() || "Diagrama",
    dbEngine: formatEngineLabel(dbEngine),
    generatedAtIso: new Date().toISOString(),
    tables: [],
    enums: [],
    relationships: [],
    notes: [],
    stats: {
      tableCount: 0,
      columnCount: 0,
      relationCount: 0,
      enumCount: 0,
    },
  };

  if (!dbmlCode || !dbmlCode.trim()) {
    return baseModel;
  }

  try {
    const database = Parser.parse(dbmlCode, "dbmlv2");
    const tableGroupLookup = new Map<string, string>();
    const fkLookup = new Map<string, string>();

    for (const schema of database.schemas) {
      for (const group of schema.tableGroups || []) {
        for (const tbl of group.tables || []) {
          if (tbl.name) {
            tableGroupLookup.set(tbl.name.toLowerCase(), group.name);
          }
        }
      }

      for (const ref of schema.refs || []) {
        if (!ref.endpoints || ref.endpoints.length < 2) continue;
        const [ep1, ep2] = ref.endpoints;
        const t1 = ep1.tableName;
        const t2 = ep2.tableName;
        const c1 = ep1.fieldNames?.[0] || "";
        const c2 = ep2.fieldNames?.[0] || "";
        if (!t1 || !t2 || !c1 || !c2) continue;

        let cardinality: RelationshipType = "1:n";
        if (ep1.relation === "1" && ep2.relation === "1") {
          cardinality = "1:1";
          fkLookup.set(`${t1.toLowerCase()}.${c1.toLowerCase()}`, `${t2}.${c2}`);
        } else if (ep1.relation === "*" && ep2.relation === "1") {
          cardinality = "n:1";
          fkLookup.set(`${t1.toLowerCase()}.${c1.toLowerCase()}`, `${t2}.${c2}`);
        } else if (ep1.relation === "1" && ep2.relation === "*") {
          cardinality = "1:n";
          fkLookup.set(`${t2.toLowerCase()}.${c2.toLowerCase()}`, `${t1}.${c1}`);
        } else if (ep1.relation === "*" && ep2.relation === "*") {
          cardinality = "n:m";
          fkLookup.set(`${t1.toLowerCase()}.${c1.toLowerCase()}`, `${t2}.${c2}`);
        }

        baseModel.relationships.push({
          sourceTable: t1,
          sourceColumn: c1,
          targetTable: t2,
          targetColumn: c2,
          cardinality,
          onDelete: typeof ref.onDelete === "string" && ref.onDelete ? ref.onDelete : undefined,
          onUpdate: typeof ref.onUpdate === "string" && ref.onUpdate ? ref.onUpdate : undefined,
        });
      }

      for (const table of schema.tables) {
        const indexPkCols = new Set<string>();
        const indexUniqueCols = new Set<string>();
        const indexes: DictionaryIndex[] = [];

        for (const idx of table.indexes || []) {
          const cols = (idx.columns || [])
            .map((c) => (typeof c.value === "string" ? c.value.trim() : ""))
            .filter(Boolean);
          if (idx.pk) {
            for (const c of cols) indexPkCols.add(c.toLowerCase());
          }
          if (idx.unique && cols.length === 1) {
            indexUniqueCols.add(cols[0].toLowerCase());
          }
          if (cols.length > 0) {
            indexes.push({
              name: idx.name || undefined,
              columns: cols,
              pk: Boolean(idx.pk),
              unique: Boolean(idx.unique),
              type: idx.type || undefined,
              note: idx.note || undefined,
            });
          }
        }

        const columns: DictionaryColumn[] = table.fields.map((field) => {
          let typeName = "text";
          if (field.type) {
            typeName =
              typeof field.type === "string" ? field.type : field.type.type_name || "text";
          }
          const lowerField = field.name.toLowerCase();
          const isPk = Boolean(field.pk) || indexPkCols.has(lowerField);
          const isUnique = Boolean(field.unique) || indexUniqueCols.has(lowerField);
          const fkKey = `${table.name.toLowerCase()}.${lowerField}`;

          return {
            name: field.name,
            type: typeName,
            pk: isPk,
            unique: isUnique,
            notNull: Boolean(field.not_null) || isPk,
            increment: Boolean(field.increment),
            defaultValue: formatDbDefault((field as unknown as { dbdefault?: unknown }).dbdefault),
            fkTarget: fkLookup.get(fkKey),
            note: field.note || undefined,
          };
        });

        baseModel.tables.push({
          name: table.name,
          schema: schema.name && schema.name !== "public" ? schema.name : undefined,
          groupName: tableGroupLookup.get(table.name.toLowerCase()),
          headerColor: (table.headerColor as unknown as string) || undefined,
          note: table.note || undefined,
          columns,
          indexes,
        });
      }

      for (const enumDef of schema.enums || []) {
        baseModel.enums.push({
          name: enumDef.name,
          values: (enumDef.values || []).map((v) => ({
            name: v.name,
            note: v.note || undefined,
          })),
        });
      }
    }

    for (const sticky of database.notes || []) {
      if (sticky.content?.trim()) {
        baseModel.notes.push({
          name: sticky.name,
          content: sticky.content.trim(),
        });
      }
    }

    baseModel.stats = {
      tableCount: baseModel.tables.length,
      columnCount: baseModel.tables.reduce((acc, t) => acc + t.columns.length, 0),
      relationCount: baseModel.relationships.length,
      enumCount: baseModel.enums.length,
    };

    return baseModel;
  } catch (err: unknown) {
    const errObj = err as { message?: string; diags?: Array<{ message?: string }> };
    baseModel.parseError =
      errObj.diags?.[0]?.message || errObj.message || "Error sintáctico en DBML";
    return baseModel;
  }
}

const DOC_LABELS = {
  es: {
    docTitle: "Diccionario de Datos",
    engine: "Motor SQL",
    generatedAt: "Generado el",
    tables: "Tablas",
    columns: "Columnas",
    relations: "Relaciones",
    enums: "Enumeraciones",
    tocTitle: "Índice de Tablas",
    groupLabel: "Grupo",
    colName: "Columna",
    colType: "Tipo",
    colAttributes: "Atributos",
    colDefault: "Default",
    colReference: "Referencia (FK)",
    colDescription: "Descripción",
    indexesTitle: "Índices",
    enumsSection: "Catálogo de Enumeraciones (Enums)",
    enumValue: "Valor",
    relationsSection: "Relaciones del Esquema",
    relOrigin: "Origen",
    relTarget: "Destino",
    relCardinality: "Cardinalidad",
    relActions: "Reglas Referenciales",
    notesSection: "Notas del Modelo",
    emptySchema: "El diagrama aún no contiene tablas definidas.",
    yes: "Sí",
    no: "No",
  },
  en: {
    docTitle: "Data Dictionary",
    engine: "SQL Engine",
    generatedAt: "Generated on",
    tables: "Tables",
    columns: "Columns",
    relations: "Relationships",
    enums: "Enums",
    tocTitle: "Table Index",
    groupLabel: "Group",
    colName: "Column",
    colType: "Type",
    colAttributes: "Attributes",
    colDefault: "Default",
    colReference: "Reference (FK)",
    colDescription: "Description",
    indexesTitle: "Indexes",
    enumsSection: "Enumerations Catalog (Enums)",
    enumValue: "Value",
    relationsSection: "Schema Relationships",
    relOrigin: "Source",
    relTarget: "Target",
    relCardinality: "Cardinality",
    relActions: "Referential Actions",
    notesSection: "Model Notes",
    emptySchema: "This diagram does not contain any defined tables yet.",
    yes: "Yes",
    no: "No",
  },
} as const;

function buildColumnBadges(col: DictionaryColumn): string[] {
  const badges: string[] = [];
  if (col.pk) badges.push("PK");
  if (col.fkTarget) badges.push("FK");
  if (col.unique && !col.pk) badges.push("UQ");
  if (col.notNull) badges.push("NN");
  if (col.increment) badges.push("AI");
  return badges;
}

/**
 * Genera el Diccionario de Datos completo en formato GitHub-Flavored Markdown (`.md`).
 */
export function generateDataDictionaryMarkdown(
  model: DataDictionaryModel,
  lang: AppLanguage = "es"
): string {
  const L = DOC_LABELS[lang];
  const locale = lang === "en" ? "en-US" : "es-ES";
  const formattedDate = new Date(model.generatedAtIso).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const lines: string[] = [];
  lines.push(`# ${L.docTitle}: ${model.projectName}`);
  lines.push("");
  lines.push(
    `> **${L.engine}:** \`${model.dbEngine}\` · **${L.generatedAt}:** ${formattedDate}`
  );
  lines.push(
    `> **${L.tables}:** ${model.stats.tableCount} · **${L.columns}:** ${model.stats.columnCount} · **${L.relations}:** ${model.stats.relationCount} · **${L.enums}:** ${model.stats.enumCount}`
  );
  lines.push("");

  if (model.tables.length === 0) {
    lines.push(`_${L.emptySchema}_`);
    return `${lines.join("\n")}\n`;
  }

  // Índice de tablas
  lines.push(`## ${L.tocTitle}`);
  lines.push("");
  for (const tbl of model.tables) {
    const anchor = tbl.name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
    const groupSuffix = tbl.groupName ? ` _(${L.groupLabel}: ${tbl.groupName})_` : "";
    const noteSuffix = tbl.note ? ` — ${escapeMdCell(tbl.note)}` : "";
    lines.push(`- [\`${tbl.name}\`](#${anchor})${groupSuffix}${noteSuffix}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  // Detalle por tabla
  lines.push(`## ${L.tables}`);
  lines.push("");

  for (const tbl of model.tables) {
    lines.push(`### ${tbl.name}`);
    if (tbl.groupName) {
      lines.push(`**${L.groupLabel}:** \`${tbl.groupName}\``);
    }
    if (tbl.note) {
      lines.push("");
      lines.push(`> ${tbl.note.replace(/\r?\n/g, "\n> ")}`);
    }
    lines.push("");
    lines.push(
      `| ${L.colName} | ${L.colType} | ${L.colAttributes} | ${L.colDefault} | ${L.colReference} | ${L.colDescription} |`
    );
    lines.push("| :--- | :--- | :--- | :--- | :--- | :--- |");

    for (const col of tbl.columns) {
      const attrs = buildColumnBadges(col).join(", ") || "—";
      const defVal = col.defaultValue ? `\`${escapeMdCell(col.defaultValue)}\`` : "—";
      const fkVal = col.fkTarget ? `\`→ ${escapeMdCell(col.fkTarget)}\`` : "—";
      const desc = col.note ? escapeMdCell(col.note) : "—";
      lines.push(
        `| \`${escapeMdCell(col.name)}\` | \`${escapeMdCell(col.type)}\` | ${attrs} | ${defVal} | ${fkVal} | ${desc} |`
      );
    }
    lines.push("");

    if (tbl.indexes.length > 0) {
      lines.push(`**${L.indexesTitle}:**`);
      for (const idx of tbl.indexes) {
        const flags = [
          idx.pk ? "PK" : "",
          idx.unique ? "UNIQUE" : "",
          idx.type ? idx.type.toUpperCase() : "",
        ]
          .filter(Boolean)
          .join(", ");
        const idxLabel = idx.name ? `\`${idx.name}\`: ` : "";
        const noteSuffix = idx.note ? ` — _${escapeMdCell(idx.note)}_` : "";
        lines.push(
          `- ${idxLabel}(\`${idx.columns.join("`, `")}\`)${flags ? ` [${flags}]` : ""}${noteSuffix}`
        );
      }
      lines.push("");
    }
  }

  // Enumeraciones
  if (model.enums.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push(`## ${L.enumsSection}`);
    lines.push("");
    for (const en of model.enums) {
      lines.push(`### \`${en.name}\``);
      lines.push("");
      lines.push(`| ${L.enumValue} | ${L.colDescription} |`);
      lines.push("| :--- | :--- |");
      for (const v of en.values) {
        lines.push(`| \`${escapeMdCell(v.name)}\` | ${v.note ? escapeMdCell(v.note) : "—"} |`);
      }
      lines.push("");
    }
  }

  // Relaciones
  if (model.relationships.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push(`## ${L.relationsSection}`);
    lines.push("");
    lines.push(
      `| ${L.relOrigin} | ${L.relCardinality} | ${L.relTarget} | ${L.relActions} |`
    );
    lines.push("| :--- | :---: | :--- | :--- |");
    for (const rel of model.relationships) {
      const actions = [
        rel.onDelete ? `ON DELETE ${rel.onDelete.toUpperCase()}` : "",
        rel.onUpdate ? `ON UPDATE ${rel.onUpdate.toUpperCase()}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      lines.push(
        `| \`${rel.sourceTable}.${rel.sourceColumn}\` | **${rel.cardinality.toUpperCase()}** | \`${rel.targetTable}.${rel.targetColumn}\` | ${actions || "—"} |`
      );
    }
    lines.push("");
  }

  // Notas libres
  if (model.notes.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push(`## ${L.notesSection}`);
    lines.push("");
    for (const n of model.notes) {
      lines.push(`### ${escapeMdCell(n.name)}`);
      lines.push("");
      lines.push(n.content);
      lines.push("");
    }
  }

  return `${lines.join("\n").trim()}\n`;
}

/**
 * Genera un documento HTML5 autónomo, profesional y optimizado para impresión/PDF (`@media print`).
 */
export function generateDataDictionaryHtml(
  model: DataDictionaryModel,
  lang: AppLanguage = "es"
): string {
  const L = DOC_LABELS[lang];
  const locale = lang === "en" ? "en-US" : "es-ES";
  const formattedDate = new Date(model.generatedAtIso).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const tablesHtml = model.tables
    .map((tbl) => {
      const accent = tbl.headerColor || "#6366f1";
      const anchor = `tbl-${slugifyName(tbl.name)}`;
      const rowsHtml = tbl.columns
        .map((col) => {
          const badges = buildColumnBadges(col)
            .map((b) => `<span class="badge badge-${b.toLowerCase()}">${b}</span>`)
            .join(" ");
          return `
            <tr>
              <td class="mono font-semibold">${escapeHtml(col.name)}</td>
              <td class="mono muted">${escapeHtml(col.type)}</td>
              <td>${badges || '<span class="muted">—</span>'}</td>
              <td class="mono">${col.defaultValue ? escapeHtml(col.defaultValue) : '<span class="muted">—</span>'}</td>
              <td class="mono fk-link">${col.fkTarget ? `→ ${escapeHtml(col.fkTarget)}` : '<span class="muted">—</span>'}</td>
              <td>${col.note ? escapeHtml(col.note) : '<span class="muted">—</span>'}</td>
            </tr>`;
        })
        .join("");

      const indexesHtml =
        tbl.indexes.length > 0
          ? `<div class="indexes-box">
              <strong>${escapeHtml(L.indexesTitle)}:</strong>
              <ul>
                ${tbl.indexes
                  .map((idx) => {
                    const flags = [
                      idx.pk ? "PK" : "",
                      idx.unique ? "UNIQUE" : "",
                      idx.type ? idx.type.toUpperCase() : "",
                    ]
                      .filter(Boolean)
                      .join(", ");
                    return `<li>${idx.name ? `<code class="mono">${escapeHtml(idx.name)}</code>: ` : ""}(<code class="mono">${idx.columns.map(escapeHtml).join(", ")}</code>)${flags ? ` <span class="badge">${escapeHtml(flags)}</span>` : ""}${idx.note ? ` — ${escapeHtml(idx.note)}` : ""}</li>`;
                  })
                  .join("")}
              </ul>
            </div>`
          : "";

      return `
        <section class="card" id="${escapeHtml(anchor)}">
          <div class="card-header" style="border-left: 4px solid ${escapeHtml(accent)};">
            <div>
              <h3>${escapeHtml(tbl.name)}</h3>
              ${tbl.note ? `<p class="table-note">${escapeHtml(tbl.note)}</p>` : ""}
            </div>
            ${tbl.groupName ? `<span class="group-pill">${escapeHtml(L.groupLabel)}: ${escapeHtml(tbl.groupName)}</span>` : ""}
          </div>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(L.colName)}</th>
                <th>${escapeHtml(L.colType)}</th>
                <th>${escapeHtml(L.colAttributes)}</th>
                <th>${escapeHtml(L.colDefault)}</th>
                <th>${escapeHtml(L.colReference)}</th>
                <th>${escapeHtml(L.colDescription)}</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          ${indexesHtml}
        </section>`;
    })
    .join("\n");

  const enumsHtml =
    model.enums.length > 0
      ? `<h2 class="section-title">${escapeHtml(L.enumsSection)}</h2>
         <div class="enum-grid">
           ${model.enums
             .map(
               (en) => `
               <section class="card">
                 <div class="card-header" style="border-left: 4px solid #f59e0b;">
                   <h3>${escapeHtml(en.name)}</h3>
                 </div>
                 <table>
                   <thead>
                     <tr>
                       <th>${escapeHtml(L.enumValue)}</th>
                       <th>${escapeHtml(L.colDescription)}</th>
                     </tr>
                   </thead>
                   <tbody>
                     ${en.values
                       .map(
                         (v) => `
                         <tr>
                           <td class="mono font-semibold">${escapeHtml(v.name)}</td>
                           <td>${v.note ? escapeHtml(v.note) : '<span class="muted">—</span>'}</td>
                         </tr>`
                       )
                       .join("")}
                   </tbody>
                 </table>
               </section>`
             )
             .join("")}
         </div>`
      : "";

  const relationsHtml =
    model.relationships.length > 0
      ? `<h2 class="section-title">${escapeHtml(L.relationsSection)}</h2>
         <section class="card">
           <table>
             <thead>
               <tr>
                 <th>${escapeHtml(L.relOrigin)}</th>
                 <th>${escapeHtml(L.relCardinality)}</th>
                 <th>${escapeHtml(L.relTarget)}</th>
                 <th>${escapeHtml(L.relActions)}</th>
               </tr>
             </thead>
             <tbody>
               ${model.relationships
                 .map((rel) => {
                   const actions = [
                     rel.onDelete ? `ON DELETE ${rel.onDelete.toUpperCase()}` : "",
                     rel.onUpdate ? `ON UPDATE ${rel.onUpdate.toUpperCase()}` : "",
                   ]
                     .filter(Boolean)
                     .join(" · ");
                   return `
                     <tr>
                       <td class="mono">${escapeHtml(rel.sourceTable)}.${escapeHtml(rel.sourceColumn)}</td>
                       <td><span class="badge">${escapeHtml(rel.cardinality.toUpperCase())}</span></td>
                       <td class="mono">${escapeHtml(rel.targetTable)}.${escapeHtml(rel.targetColumn)}</td>
                       <td class="mono muted">${actions ? escapeHtml(actions) : "—"}</td>
                     </tr>`;
                 })
                 .join("")}
             </tbody>
           </table>
         </section>`
      : "";

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(L.docTitle)} — ${escapeHtml(model.projectName)}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
      --surface: #ffffff;
      --bg: #f8fafc;
      --accent: #4f46e5;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px 24px 56px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: var(--ink);
      background: var(--bg);
      line-height: 1.5;
      font-size: 13px;
    }
    .container { max-width: 1020px; margin: 0 auto; }
    header.doc-header {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }
    header.doc-header h1 { margin: 0 0 6px; font-size: 22px; letter-spacing: -0.02em; }
    .meta-line { color: var(--muted); font-size: 12px; margin-bottom: 16px; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }
    .stat-box {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 14px;
    }
    .stat-box .num { font-size: 18px; font-weight: 700; color: var(--accent); }
    .stat-box .lbl { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .section-title { font-size: 16px; margin: 28px 0 12px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
    .toc-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      list-style: none;
      padding: 0;
      margin: 0 0 24px;
    }
    .toc-list a {
      display: inline-block;
      padding: 4px 10px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      text-decoration: none;
      color: var(--ink);
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 12px;
    }
    .toc-list a:hover { border-color: var(--accent); color: var(--accent); }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      margin-bottom: 18px;
      overflow: hidden;
      break-inside: avoid;
    }
    .card-header {
      padding: 12px 16px;
      background: #f8fafc;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .card-header h3 { margin: 0; font-size: 15px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
    .table-note { margin: 4px 0 0; font-size: 12px; color: var(--muted); }
    .group-pill {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      background: #eef2ff;
      color: #4338ca;
      white-space: nowrap;
    }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted);
      background: #fcfcfd;
      padding: 8px 14px;
      border-bottom: 1px solid var(--border);
    }
    td { padding: 8px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; }
    .font-semibold { font-weight: 600; }
    .muted { color: var(--muted); }
    .fk-link { color: #0284c7; }
    .badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .badge-pk { background: #fef3c7; color: #b45309; border-color: #fcd34d; }
    .badge-fk { background: #e0f2fe; color: #0369a1; border-color: #7dd3fc; }
    .badge-uq { background: #ede9fe; color: #6d28d9; border-color: #c4b5fd; }
    .badge-nn { background: #dcfce7; color: #15803d; border-color: #86efac; }
    .indexes-box {
      padding: 10px 16px;
      background: #fafafa;
      border-top: 1px solid var(--border);
      font-size: 12px;
    }
    .indexes-box ul { margin: 4px 0 0; padding-left: 18px; }
    .enum-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .toc-list { display: none; }
      .card { break-inside: avoid; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="doc-header">
      <h1>${escapeHtml(L.docTitle)} — ${escapeHtml(model.projectName)}</h1>
      <div class="meta-line">
        <strong>${escapeHtml(L.engine)}:</strong> ${escapeHtml(model.dbEngine)} &nbsp;·&nbsp;
        <strong>${escapeHtml(L.generatedAt)}:</strong> ${escapeHtml(formattedDate)}
      </div>
      <div class="stats-grid">
        <div class="stat-box"><div class="num">${model.stats.tableCount}</div><div class="lbl">${escapeHtml(L.tables)}</div></div>
        <div class="stat-box"><div class="num">${model.stats.columnCount}</div><div class="lbl">${escapeHtml(L.columns)}</div></div>
        <div class="stat-box"><div class="num">${model.stats.relationCount}</div><div class="lbl">${escapeHtml(L.relations)}</div></div>
        <div class="stat-box"><div class="num">${model.stats.enumCount}</div><div class="lbl">${escapeHtml(L.enums)}</div></div>
      </div>
    </header>

    ${
      model.tables.length === 0
        ? `<p class="muted">${escapeHtml(L.emptySchema)}</p>`
        : `
          <ul class="toc-list">
            ${model.tables
              .map(
                (t) =>
                  `<li><a href="#tbl-${escapeHtml(slugifyName(t.name))}">${escapeHtml(t.name)}</a></li>`
              )
              .join("")}
          </ul>
          <h2 class="section-title">${escapeHtml(L.tables)}</h2>
          ${tablesHtml}
          ${enumsHtml}
          ${relationsHtml}`
    }
  </div>
</body>
</html>`;
}

export async function exportDataDictionaryFile(
  projectName: string,
  content: string,
  format: "md" | "html"
): Promise<boolean> {
  const slug = slugifyName(projectName);
  if (format === "md") {
    return saveFileCrossPlatform(content, {
      defaultFilename: `${slug}_diccionario.md`,
      filterName: "Markdown (*.md)",
      extensions: ["md"],
      mimeType: "text/markdown;charset=utf-8",
    });
  }

  return saveFileCrossPlatform(content, {
    defaultFilename: `${slug}_diccionario.html`,
    filterName: "HTML Document (*.html)",
    extensions: ["html"],
    mimeType: "text/html;charset=utf-8",
  });
}

/**
 * Dispara el diálogo nativo de impresión / Guardar como PDF usando un `<iframe>` oculto
 * sin depender de ventanas emergentes bloqueables.
 */
export function printDataDictionaryHtml(htmlContent: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 1500);
  };

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      cleanup();
    }
  };

  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();
  } else {
    iframe.srcdoc = htmlContent;
  }
}
