use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Resolve the JSON data file path inside the platform app-data directory.
fn store_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to resolve app data dir: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("failed to create app data dir: {e}"))?;
    Ok(dir.join("data.json"))
}

/// Load the persisted application state. Returns `null` when nothing has been saved yet.
#[tauri::command]
pub fn load_state(app: AppHandle) -> Result<Value, String> {
    let path = store_path(&app)?;
    if !path.exists() {
        return Ok(Value::Null);
    }
    let raw = fs::read_to_string(&path).map_err(|e| format!("failed to read state: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("failed to parse state: {e}"))
}

/// Persist the entire application state to disk.
#[tauri::command]
pub fn save_state(app: AppHandle, state: Value) -> Result<(), String> {
    let path = store_path(&app)?;
    let raw =
        serde_json::to_string_pretty(&state).map_err(|e| format!("failed to serialize state: {e}"))?;
    fs::write(&path, raw).map_err(|e| format!("failed to write state: {e}"))
}

/// Remove the persisted state (used for "reset to defaults").
#[tauri::command]
pub fn reset_state(app: AppHandle) -> Result<(), String> {
    let path = store_path(&app)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("failed to remove state: {e}"))?;
    }
    Ok(())
}
