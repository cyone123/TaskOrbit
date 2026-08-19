use serde::Serialize;
use serde_json::Value;
use std::fs::{self, OpenOptions};
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
pub struct LoadStateResult {
    pub state: Option<Value>,
    #[serde(rename = "backupState")]
    pub backup_state: Option<Value>,
    pub source: String,
    pub warning: Option<String>,
}

/// Resolve the JSON data file path inside the platform app-data directory.
fn store_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to resolve app data dir: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("failed to create app data dir: {e}"))?;
    Ok(dir.join("data.json"))
}

fn backup_path(path: &Path) -> PathBuf {
    path.with_file_name("data.json.bak")
}

fn temp_path(path: &Path) -> PathBuf {
    path.with_file_name("data.json.tmp")
}

fn corrupt_path(path: &Path) -> PathBuf {
    path.with_file_name("data.json.corrupt")
}

fn read_json(path: &Path) -> Result<Value, String> {
    let raw =
        fs::read_to_string(path).map_err(|e| format!("failed to read {}: {e}", path.display()))?;
    serde_json::from_str(&raw).map_err(|e| format!("failed to parse {}: {e}", path.display()))
}

fn remove_if_exists(path: &Path) -> Result<(), String> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("failed to remove {}: {error}", path.display())),
    }
}

fn sync_file(path: &Path) -> Result<(), String> {
    let file = OpenOptions::new()
        .read(true)
        // Windows requires a write-capable handle for FlushFileBuffers,
        // which is what File::sync_all uses under the hood.
        .write(true)
        .open(path)
        .map_err(|e| format!("failed to reopen {}: {e}", path.display()))?;
    file.sync_all()
        .map_err(|e| format!("failed to flush {}: {e}", path.display()))
}

#[cfg(test)]
mod tests {
    use super::sync_file;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn sync_file_accepts_a_newly_written_file() {
        let unique_id = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after the Unix epoch")
            .as_nanos();
        let path = PathBuf::from(std::env::temp_dir()).join(format!(
            "task-orbit-sync-{}-{unique_id}.tmp",
            std::process::id()
        ));

        fs::write(&path, "test data").expect("should create the temporary test file");
        let result = sync_file(&path);
        let _ = fs::remove_file(&path);

        assert!(result.is_ok(), "sync_file failed: {:?}", result.err());
    }
}

/// Load the persisted application state, falling back to the last valid backup.
#[tauri::command]
pub fn load_state(app: AppHandle) -> Result<LoadStateResult, String> {
    let path = store_path(&app)?;
    let backup = backup_path(&path);

    if path.exists() {
        match read_json(&path) {
            Ok(state) => {
                return Ok(LoadStateResult {
                    state: Some(state),
                    backup_state: if backup.exists() {
                        read_json(&backup).ok()
                    } else {
                        None
                    },
                    source: "primary".to_string(),
                    warning: None,
                });
            }
            Err(primary_error) if backup.exists() => match read_json(&backup) {
                Ok(state) => {
                    return Ok(LoadStateResult {
                        state: Some(state),
                        backup_state: None,
                        source: "backup".to_string(),
                        warning: Some(format!(
                            "主数据无法读取，已从备份恢复。原始错误：{primary_error}"
                        )),
                    });
                }
                Err(backup_error) => {
                    return Err(format!(
                        "主数据和备份均无法读取。主数据：{primary_error}；备份：{backup_error}"
                    ));
                }
            },
            Err(error) => return Err(error),
        }
    }

    if backup.exists() {
        let state = read_json(&backup)?;
        return Ok(LoadStateResult {
            state: Some(state),
            backup_state: None,
            source: "backup".to_string(),
            warning: Some("未找到主数据，已从备份恢复。".to_string()),
        });
    }

    Ok(LoadStateResult {
        state: None,
        backup_state: None,
        source: "empty".to_string(),
        warning: None,
    })
}

/// Persist the entire application state using a temporary file and backup.
#[tauri::command]
pub fn save_state(app: AppHandle, state: Value) -> Result<(), String> {
    let path = store_path(&app)?;
    let backup = backup_path(&path);
    let temp = temp_path(&path);
    let raw = serde_json::to_string_pretty(&state)
        .map_err(|e| format!("failed to serialize state: {e}"))?;

    remove_if_exists(&temp)?;
    fs::write(&temp, raw).map_err(|e| format!("failed to write temporary state: {e}"))?;
    sync_file(&temp)?;

    if path.exists() {
        if read_json(&path).is_ok() {
            remove_if_exists(&backup)?;
            fs::rename(&path, &backup)
                .map_err(|e| format!("failed to create state backup: {e}"))?;
        } else {
            // Do not overwrite a known-good backup with a corrupt primary.
            remove_if_exists(&corrupt_path(&path))?;
            fs::rename(&path, corrupt_path(&path))
                .map_err(|e| format!("failed to preserve corrupt state: {e}"))?;
        }
    }

    if let Err(error) = fs::rename(&temp, &path) {
        if !path.exists() && backup.exists() {
            let _ = fs::rename(&backup, &path);
        }
        return Err(format!("failed to replace state file: {error}"));
    }

    Ok(())
}

/// Remove persisted state and its recovery files.
#[tauri::command]
pub fn reset_state(app: AppHandle) -> Result<(), String> {
    let path = store_path(&app)?;
    remove_if_exists(&path)?;
    remove_if_exists(&backup_path(&path))?;
    remove_if_exists(&temp_path(&path))?;
    remove_if_exists(&corrupt_path(&path))?;
    Ok(())
}
