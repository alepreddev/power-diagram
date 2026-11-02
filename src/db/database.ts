import Database from "@tauri-apps/plugin-sql";

export interface Project {
  id: number;
  name: string;
  db_engine: "postgres" | "mysql" | "sqlite" | "mssql" | string;
  created_at: string;
}

export interface Diagram {
  id: number;
  project_id: number;
  dbml_code: string;
  canvas_json: string;
  updated_at: string;
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
  return db.select<Project[]>("SELECT * FROM projects ORDER BY created_at DESC;");
}

export async function createProject(
  name: string,
  dbEngine: string = "postgres"
): Promise<{ id: number; name: string; db_engine: string }> {
  const db = await getDb();
  const result = await db.execute(
    "INSERT INTO projects (name, db_engine) VALUES ($1, $2);",
    [name, dbEngine]
  );

  const projectId = result.lastInsertId;
  if (projectId === undefined) {
    throw new Error("No se pudo obtener el ID del proyecto recién creado.");
  }

  // Inicializar automáticamente un diagrama por defecto asociado al proyecto
  await db.execute(
    "INSERT INTO diagrams (project_id, dbml_code, canvas_json) VALUES ($1, $2, $3);",
    [projectId, "// Escribe tu esquema DBML aquí\n", "{}"]
  );

  return { id: projectId, name, db_engine: dbEngine };
}

export async function deleteProject(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM projects WHERE id = $1;", [id]);
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
