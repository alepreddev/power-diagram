// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn write_file_bytes(path: &str, bytes: &[u8]) -> Result<(), String> {
    std::fs::write(path, bytes).map_err(|e| format!("No se pudo guardar el archivo '{}': {}", path, e))
}

#[tauri::command]
fn save_binary_file(path: String, contents: Vec<u8>) -> Result<(), String> {
    write_file_bytes(&path, &contents)
}

#[tauri::command]
fn save_text_file(path: String, contents: String) -> Result<(), String> {
    write_file_bytes(&path, contents.as_bytes())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "
                CREATE TABLE IF NOT EXISTS projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    db_engine TEXT DEFAULT 'postgres',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS diagrams (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id INTEGER NOT NULL,
                    dbml_code TEXT DEFAULT '',
                    canvas_json TEXT DEFAULT '{}',
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
                );
            ",
            kind: MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                if let Some(icon) = app.default_window_icon() {
                    let _ = window.set_icon(icon.clone());
                }
                let version = &app.package_info().version;
                let _ = window.set_title(&format!("Power Diagram v{}", version));
            }
            Ok(())
        })
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:erd_studio.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, save_binary_file, save_text_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
