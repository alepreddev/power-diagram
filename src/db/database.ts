import Database from "@tauri-apps/plugin-sql";
import { Parser } from "@dbml/core";

export interface Project {
  id: number;
  name: string;
  db_engine: "postgres" | "mysql" | "sqlite" | "mssql" | string;
  created_at: string;
  updated_at?: string;
  table_count?: number;
}

export interface Diagram {
  id: number;
  project_id: number;
  dbml_code: string;
  canvas_json: string;
  updated_at: string;
}

/**
 * Cuenta cuántas tablas están definidas en un bloque de código DBML.
 * Usa el parser oficial `dbmlv2` y cae en un conteo léxico tolerante si hay un error sintáctico temporal.
 */
export function countTablesInDbml(dbmlCode?: string | null): number {
  if (!dbmlCode || !dbmlCode.trim()) return 0;

  try {
    const database = Parser.parse(dbmlCode, "dbmlv2");
    return database.schemas.reduce((acc, schema) => acc + schema.tables.length, 0);
  } catch {
    const stripped = dbmlCode
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/'''[\s\S]*?'''/g, "")
      .replace(/\/\/.*$/gm, "");
    const matches = stripped.match(/^\s*table\s+(?:[A-Za-z0-9_."`'-]+)\s*(?:\[[^\]]*\])?\s*\{/gim);
    return matches ? matches.length : 0;
  }
}

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load("sqlite:erd_studio.db");

    // Activar foreign keys en SQLite
    await dbInstance.execute("PRAGMA foreign_keys = ON;");

    // Fallback de inicialización defensiva
    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        db_engine TEXT DEFAULT 'postgres',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS diagrams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        dbml_code TEXT DEFAULT '',
        canvas_json TEXT DEFAULT '{}',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );
    `);
  }
  return dbInstance;
}

export async function getProjects(): Promise<Project[]> {
  const db = await getDb();
  const rows = await db.select<
    Array<{
      id: number;
      name: string;
      db_engine: string;
      created_at: string;
      updated_at: string | null;
      dbml_code: string | null;
    }>
  >(`
    SELECT
      p.id,
      p.name,
      p.db_engine,
      p.created_at,
      COALESCE(MAX(d.updated_at), p.created_at) AS updated_at,
      COALESCE(MAX(d.dbml_code), '') AS dbml_code
    FROM projects p
    LEFT JOIN diagrams d ON d.project_id = p.id
    GROUP BY p.id
    ORDER BY COALESCE(MAX(d.updated_at), p.created_at) DESC, p.id DESC;
  `);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    db_engine: row.db_engine,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    table_count: countTablesInDbml(row.dbml_code),
  }));
}

export async function createProjectWithDiagram(
  name: string,
  dbEngine: string = "postgres",
  dbmlCode: string = "// Escribe tu esquema DBML aquí\n",
  canvasJson: string = "{}"
): Promise<Project> {
  const db = await getDb();
  const result = await db.execute(
    "INSERT INTO projects (name, db_engine) VALUES ($1, $2);",
    [name, dbEngine]
  );

  const projectId = result.lastInsertId;
  if (projectId === undefined) {
    throw new Error("No se pudo obtener el ID del proyecto recién creado.");
  }

  await db.execute(
    "INSERT INTO diagrams (project_id, dbml_code, canvas_json) VALUES ($1, $2, $3);",
    [projectId, dbmlCode, canvasJson]
  );

  const nowIso = new Date().toISOString();
  return {
    id: projectId,
    name,
    db_engine: dbEngine,
    created_at: nowIso,
    updated_at: nowIso,
    table_count: countTablesInDbml(dbmlCode),
  };
}

export async function createProject(
  name: string,
  dbEngine: string = "postgres"
): Promise<Project> {
  return createProjectWithDiagram(
    name,
    dbEngine,
    "// Escribe tu esquema DBML aquí\n",
    "{}"
  );
}

export async function duplicateProject(
  sourceProjectId: number,
  copyName: string
): Promise<Project> {
  const db = await getDb();
  const projects = await db.select<Project[]>(
    "SELECT * FROM projects WHERE id = $1 LIMIT 1;",
    [sourceProjectId]
  );
  if (projects.length === 0) {
    throw new Error("El diagrama de origen no existe.");
  }

  const source = projects[0];
  const diagram = await getDiagramByProjectId(sourceProjectId);

  return createProjectWithDiagram(
    copyName,
    source.db_engine,
    diagram?.dbml_code ?? "// Escribe tu esquema DBML aquí\n",
    diagram?.canvas_json ?? "{}"
  );
}

export async function deleteProject(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM projects WHERE id = $1;", [id]);
}

export async function updateProject(
  id: number,
  name: string,
  dbEngine: string
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE projects SET name = $1, db_engine = $2 WHERE id = $3;",
    [name, dbEngine, id]
  );
}

export async function getDiagramByProjectId(projectId: number): Promise<Diagram | null> {
  const db = await getDb();
  const rows = await db.select<Diagram[]>(
    "SELECT * FROM diagrams WHERE project_id = $1 LIMIT 1;",
    [projectId]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function saveDiagramState(
  projectId: number,
  dbmlCode: string,
  canvasJson: string
): Promise<void> {
  const db = await getDb();
  const existing = await getDiagramByProjectId(projectId);

  if (existing) {
    await db.execute(
      "UPDATE diagrams SET dbml_code = $1, canvas_json = $2, updated_at = CURRENT_TIMESTAMP WHERE project_id = $3;",
      [dbmlCode, canvasJson, projectId]
    );
  } else {
    await db.execute(
      "INSERT INTO diagrams (project_id, dbml_code, canvas_json) VALUES ($1, $2, $3);",
      [projectId, dbmlCode, canvasJson]
    );
  }
}
