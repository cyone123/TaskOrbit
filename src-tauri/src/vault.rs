use serde::{Deserialize, Serialize};
use serde_yaml::{Mapping, Value as YamlValue};
use std::collections::hash_map::DefaultHasher;
use std::fs::{self, OpenOptions};
use std::hash::{Hash, Hasher};
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

const FRONTMATTER_START: &str = "---";
const FRONTMATTER_END: &str = "---";
const SCHEMA_VERSION: i64 = 1;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultLocation {
    pub root_path: String,
    pub notes_folder: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotePathRequest {
    pub root_path: String,
    pub notes_folder: String,
    pub relative_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteWriteRequest {
    pub root_path: String,
    pub notes_folder: String,
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub markdown: String,
    #[serde(default)]
    pub relative_path: Option<String>,
    #[serde(default)]
    pub pinned: bool,
    #[serde(default)]
    pub task_ids: Vec<String>,
    #[serde(default)]
    pub daily_plan_ids: Vec<String>,
    #[serde(default)]
    pub expected_content_hash: Option<String>,
    #[serde(default)]
    pub project_folder: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateVaultRequest {
    pub parent_path: String,
    pub vault_name: String,
    pub notes_folder: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenNoteRequest {
    pub root_path: String,
    pub notes_folder: String,
    pub relative_path: String,
    #[serde(default)]
    pub vault_name: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteSummary {
    pub id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub relative_path: String,
    pub updated_at: u64,
    pub created_at: u64,
    pub pinned: bool,
    pub task_ids: Vec<String>,
    pub daily_plan_ids: Vec<String>,
    pub content_hash: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    #[serde(flatten)]
    pub summary: NoteSummary,
    pub markdown: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatedVault {
    pub root_path: String,
    pub vault_name: String,
    pub notes_folder: String,
}

struct ParsedNote {
    summary: NoteSummary,
    markdown: String,
    is_task_orbit_note: bool,
}

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or_default()
}

fn hash_bytes(bytes: &[u8]) -> String {
    let mut hasher = DefaultHasher::new();
    bytes.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

fn hash_string(value: &str) -> String {
    hash_bytes(value.as_bytes())
}

fn normalize_relative_path(value: &str) -> Result<PathBuf, String> {
    let normalized = value.replace('\\', "/");
    let path = PathBuf::from(normalized);
    if path.is_absolute() {
        return Err("Vault 子目录必须是相对路径。".to_string());
    }

    let mut result = PathBuf::new();
    for component in path.components() {
        match component {
            Component::Normal(part) => {
                if part == ".obsidian" {
                    return Err("不能访问 .obsidian 目录。".to_string());
                }
                result.push(part);
            }
            Component::CurDir => {}
            Component::ParentDir => return Err("路径不能包含上级目录。".to_string()),
            Component::RootDir | Component::Prefix(_) => {
                return Err("Vault 子目录必须是相对路径。".to_string())
            }
        }
    }
    Ok(result)
}

fn canonical_root(path: &str) -> Result<PathBuf, String> {
    let root = PathBuf::from(path);
    let canonical = fs::canonicalize(&root)
        .map_err(|error| format!("无法访问 Vault 目录 {}：{error}", root.display()))?;
    if !canonical.is_dir() {
        return Err("选择的 Vault 路径不是目录。".to_string());
    }
    Ok(canonical)
}

fn ensure_within(path: &Path, root: &Path) -> Result<(), String> {
    if path.starts_with(root) {
        Ok(())
    } else {
        Err("笔记路径必须位于当前 Vault 的笔记目录内。".to_string())
    }
}

fn notes_root(location: &VaultLocation, create: bool) -> Result<(PathBuf, PathBuf), String> {
    let root = canonical_root(&location.root_path)?;
    let relative = normalize_relative_path(&location.notes_folder)?;
    if relative.as_os_str().is_empty() {
        return Err("笔记目录不能为空，建议使用 Task Orbit/Notes。".to_string());
    }
    let notes = root.join(relative);
    if create {
        fs::create_dir_all(&notes)
            .map_err(|error| format!("无法创建笔记目录 {}：{error}", notes.display()))?;
    }
    let canonical_notes = fs::canonicalize(&notes)
        .map_err(|error| format!("无法访问笔记目录 {}：{error}", notes.display()))?;
    ensure_within(&canonical_notes, &root)?;
    if !canonical_notes.is_dir() {
        return Err("笔记目录不是目录。".to_string());
    }
    Ok((root, canonical_notes))
}

fn safe_existing_note_path(notes_root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let relative = normalize_relative_path(relative_path)?;
    if relative.as_os_str().is_empty() || !is_markdown_path(&relative) {
        return Err("笔记路径必须指向 .md 文件。".to_string());
    }
    let candidate = notes_root.join(relative);
    let canonical = fs::canonicalize(&candidate)
        .map_err(|error| format!("无法访问笔记文件 {}：{error}", candidate.display()))?;
    ensure_within(&canonical, notes_root)?;
    if !canonical.is_file() {
        return Err("笔记路径不是文件。".to_string());
    }
    Ok(canonical)
}

fn safe_new_note_path(notes_root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let relative = normalize_relative_path(relative_path)?;
    if relative.as_os_str().is_empty() || !is_markdown_path(&relative) {
        return Err("笔记路径必须指向 .md 文件。".to_string());
    }
    let candidate = notes_root.join(relative);
    let parent = candidate
        .parent()
        .ok_or_else(|| "无效的笔记路径。".to_string())?;
    fs::create_dir_all(parent).map_err(|error| format!("无法创建笔记目录：{error}"))?;
    let canonical_parent =
        fs::canonicalize(parent).map_err(|error| format!("无法访问笔记目录：{error}"))?;
    ensure_within(&canonical_parent, notes_root)?;
    Ok(candidate)
}

fn is_markdown_path(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|value| value.eq_ignore_ascii_case("md"))
        .unwrap_or(false)
}

fn sanitize_segment(value: &str, fallback: &str) -> String {
    let mut result = value
        .chars()
        .map(|character| match character {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '-',
            character if character.is_control() => '-',
            character => character,
        })
        .collect::<String>();
    result = result.trim().trim_matches('.').to_string();
    if result.is_empty() {
        return fallback.to_string();
    }
    result.chars().take(80).collect()
}

fn relative_note_path(notes_root: &Path, path: &Path) -> Result<String, String> {
    let relative = path
        .strip_prefix(notes_root)
        .map_err(|_| "笔记路径不在笔记目录内。".to_string())?;
    Ok(relative.to_string_lossy().replace('\\', "/"))
}

fn value_string(mapping: &Mapping, key: &str) -> Option<String> {
    mapping
        .get(YamlValue::String(key.to_string()))
        .and_then(|value| value.as_str().map(ToString::to_string))
        .filter(|value| !value.trim().is_empty())
}

fn value_bool(mapping: &Mapping, key: &str) -> bool {
    mapping
        .get(YamlValue::String(key.to_string()))
        .and_then(YamlValue::as_bool)
        .unwrap_or(false)
}

fn value_strings(mapping: &Mapping, key: &str) -> Vec<String> {
    let Some(value) = mapping.get(YamlValue::String(key.to_string())) else {
        return Vec::new();
    };
    if let Some(items) = value.as_sequence() {
        return items
            .iter()
            .filter_map(|item| item.as_str().map(ToString::to_string))
            .filter(|item| !item.is_empty())
            .collect();
    }
    value
        .as_str()
        .map(|item| vec![item.to_string()])
        .unwrap_or_default()
}

fn first_heading(markdown: &str) -> Option<String> {
    markdown.lines().find_map(|line| {
        line.strip_prefix("# ")
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToString::to_string)
    })
}

fn fallback_title(markdown: &str, path: &Path) -> String {
    first_heading(markdown).unwrap_or_else(|| {
        path.file_stem()
            .and_then(|value| value.to_str())
            .filter(|value| !value.is_empty())
            .unwrap_or("未命名笔记")
            .to_string()
    })
}

fn split_frontmatter(raw: &str) -> (Mapping, String) {
    let normalized = raw.replace("\r\n", "\n");
    let mut lines = normalized.split('\n');
    if lines.next() != Some(FRONTMATTER_START) {
        return (Mapping::new(), normalized);
    }

    let mut yaml_lines = Vec::new();
    let mut found_end = false;
    for line in &mut lines {
        if line == FRONTMATTER_END || line == "..." {
            found_end = true;
            break;
        }
        yaml_lines.push(line);
    }
    if !found_end {
        return (Mapping::new(), normalized);
    }

    let frontmatter = serde_yaml::from_str::<YamlValue>(&yaml_lines.join("\n"))
        .ok()
        .and_then(|value| value.as_mapping().cloned())
        .unwrap_or_default();
    // `rendered_note` uses one blank line between frontmatter and Markdown.
    // Consume that separator once so repeated saves do not turn it into an
    // extra leading line in the editor content.
    let markdown = lines.collect::<Vec<_>>().join("\n");
    let markdown = markdown.strip_prefix('\n').unwrap_or(&markdown).to_string();
    (frontmatter, markdown)
}

fn parse_note(raw: &str, relative_path: String, path: &Path) -> ParsedNote {
    let (frontmatter, markdown) = split_frontmatter(raw);
    let has_metadata = [
        "task-orbit-schema",
        "task-orbit-note-id",
        "task-orbit-project-id",
        "task-orbit-task-ids",
        "task-orbit-daily-plan-ids",
        "task-orbit-pinned",
    ]
    .iter()
    .any(|key| frontmatter.contains_key(YamlValue::String((*key).to_string())));
    let id = value_string(&frontmatter, "task-orbit-note-id")
        .unwrap_or_else(|| format!("note_{}", hash_string(&relative_path)));
    let project_id = value_string(&frontmatter, "task-orbit-project-id");
    let title = value_string(&frontmatter, "task-orbit-title")
        .or_else(|| first_heading(&markdown))
        .unwrap_or_else(|| fallback_title(&markdown, path));
    let metadata = fs::metadata(path).ok();
    let updated_at = metadata
        .as_ref()
        .and_then(|value| value.modified().ok())
        .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
        .map(|value| value.as_millis() as u64)
        .unwrap_or_else(now_millis);
    let created_at = metadata
        .as_ref()
        .and_then(|value| value.created().ok())
        .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
        .map(|value| value.as_millis() as u64)
        .unwrap_or(updated_at);

    ParsedNote {
        summary: NoteSummary {
            id,
            project_id,
            title,
            relative_path,
            updated_at,
            created_at,
            pinned: value_bool(&frontmatter, "task-orbit-pinned"),
            task_ids: value_strings(&frontmatter, "task-orbit-task-ids"),
            daily_plan_ids: value_strings(&frontmatter, "task-orbit-daily-plan-ids"),
            content_hash: hash_string(raw),
        },
        markdown,
        is_task_orbit_note: has_metadata,
    }
}

fn note_from_path(path: &Path, notes_root: &Path) -> Result<ParsedNote, String> {
    let raw = fs::read_to_string(path)
        .map_err(|error| format!("无法读取笔记 {}：{error}", path.display()))?;
    let relative_path = relative_note_path(notes_root, path)?;
    Ok(parse_note(&raw, relative_path, path))
}

fn collect_notes(
    directory: &Path,
    notes_root: &Path,
    notes: &mut Vec<NoteSummary>,
) -> Result<(), String> {
    let entries = fs::read_dir(directory)
        .map_err(|error| format!("无法扫描笔记目录 {}：{error}", directory.display()))?;
    for entry in entries {
        let entry = entry.map_err(|error| format!("读取笔记目录失败：{error}"))?;
        let path = entry.path();
        let file_type = entry
            .file_type()
            .map_err(|error| format!("读取文件类型失败：{error}"))?;
        if file_type.is_dir() {
            if entry.file_name() == ".obsidian" {
                continue;
            }
            let canonical = fs::canonicalize(&path)
                .map_err(|error| format!("无法访问目录 {}：{error}", path.display()))?;
            ensure_within(&canonical, notes_root)?;
            collect_notes(&canonical, notes_root, notes)?;
            continue;
        }
        if !file_type.is_file()
            || path
                .extension()
                .and_then(|value| value.to_str())
                .map(|value| value.eq_ignore_ascii_case("md"))
                != Some(true)
        {
            continue;
        }
        let canonical = fs::canonicalize(&path)
            .map_err(|error| format!("无法访问笔记 {}：{error}", path.display()))?;
        ensure_within(&canonical, notes_root)?;
        let parsed = note_from_path(&canonical, notes_root)?;
        if parsed.is_task_orbit_note {
            notes.push(parsed.summary);
        }
    }
    Ok(())
}

fn set_yaml_value(mapping: &mut Mapping, key: &str, value: YamlValue) {
    mapping.insert(YamlValue::String(key.to_string()), value);
}

fn yaml_strings(values: &[String]) -> YamlValue {
    YamlValue::Sequence(
        values
            .iter()
            .map(|value| YamlValue::String(value.clone()))
            .collect(),
    )
}

fn rendered_note(frontmatter: &Mapping, markdown: &str) -> Result<String, String> {
    let yaml = serde_yaml::to_string(&YamlValue::Mapping(frontmatter.clone()))
        .map_err(|error| format!("无法生成笔记元数据：{error}"))?;
    if markdown.is_empty() {
        Ok(format!("---\n{yaml}---\n"))
    } else {
        Ok(format!("---\n{yaml}---\n\n{markdown}"))
    }
}

fn note_path_for_title(path: &Path, title: &str, notes_root: &Path) -> Result<PathBuf, String> {
    let parent = path
        .parent()
        .ok_or_else(|| "无法确定笔记所在目录。".to_string())?;
    ensure_within(parent, notes_root)?;
    let filename = format!("{}.md", sanitize_segment(title, "未命名笔记"));
    Ok(parent.join(filename))
}

fn paths_refer_to_same_file(left: &Path, right: &Path) -> bool {
    if left == right {
        return true;
    }
    match (fs::canonicalize(left), fs::canonicalize(right)) {
        (Ok(left), Ok(right)) => left == right,
        _ => false,
    }
}

fn sync_file(path: &Path) -> Result<(), String> {
    let file = OpenOptions::new()
        .read(true)
        // Windows requires a write-capable handle for FlushFileBuffers,
        // which is what File::sync_all uses under the hood.
        .write(true)
        .open(path)
        .map_err(|error| format!("无法重新打开临时笔记：{error}"))?;
    file.sync_all()
        .map_err(|error| format!("无法写入磁盘：{error}"))
}

fn atomic_write(path: &Path, content: &str) -> Result<(), String> {
    let temp = path.with_file_name(format!(
        ".{}.task-orbit.tmp",
        path.file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("note")
    ));
    if temp.exists() {
        fs::remove_file(&temp).map_err(|error| format!("无法清理临时笔记：{error}"))?;
    }
    fs::write(&temp, content).map_err(|error| format!("无法写入临时笔记：{error}"))?;
    sync_file(&temp)?;
    match fs::rename(&temp, path) {
        Ok(()) => Ok(()),
        Err(rename_error) if path.exists() => {
            // Windows does not replace an existing file with rename. Keep the
            // temp-file path for the normal atomic path and use a narrow
            // fallback only when the platform rejects the replacement.
            fs::remove_file(path)
                .map_err(|error| format!("无法替换旧笔记：{error}（原始错误：{rename_error}）"))?;
            fs::rename(&temp, path).map_err(|error| format!("无法完成笔记替换：{error}"))
        }
        Err(error) => Err(format!("无法保存笔记：{error}")),
    }
}

#[cfg(test)]
mod tests {
    use super::{atomic_write, rendered_note, split_frontmatter};
    use serde_yaml::{Mapping, Value as YamlValue};
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn atomic_write_syncs_a_new_note_file() {
        let unique_id = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after the Unix epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "task-orbit-note-{}-{unique_id}.md",
            std::process::id()
        ));

        let result = atomic_write(&path, "# Test note");
        let content = fs::read_to_string(&path).ok();
        let _ = fs::remove_file(&path);
        let _ = fs::remove_file(path.with_file_name(format!(
            ".{}.task-orbit.tmp",
            path.file_name().and_then(|value| value.to_str()).unwrap_or("note")
        )));

        assert!(result.is_ok(), "atomic_write failed: {:?}", result.err());
        assert_eq!(content.as_deref(), Some("# Test note"));
    }

    #[test]
    fn frontmatter_round_trip_does_not_add_leading_markdown_lines() {
        let mut frontmatter = Mapping::new();
        frontmatter.insert(
            YamlValue::String("task-orbit-title".to_string()),
            YamlValue::String("Test note".to_string()),
        );
        let markdown = "# Test note\n\n正文";

        let first_raw = rendered_note(&frontmatter, markdown).expect("should render note");
        let (_, first_markdown) = split_frontmatter(&first_raw);
        let second_raw =
            rendered_note(&frontmatter, &first_markdown).expect("should re-render note");
        let (_, second_markdown) = split_frontmatter(&second_raw);

        assert_eq!(first_markdown, markdown);
        assert_eq!(second_markdown, markdown);
    }
}

fn unique_note_path(
    notes_root: &Path,
    project_folder: Option<&str>,
    title: &str,
) -> Result<PathBuf, String> {
    let folder = sanitize_segment(project_folder.unwrap_or("未分类"), "未分类");
    let filename = sanitize_segment(title, "未命名笔记");
    let directory = notes_root.join(folder);
    fs::create_dir_all(&directory).map_err(|error| format!("无法创建项目笔记目录：{error}"))?;
    let canonical_directory =
        fs::canonicalize(&directory).map_err(|error| format!("无法访问项目笔记目录：{error}"))?;
    ensure_within(&canonical_directory, notes_root)?;
    let mut candidate = directory.join(format!("{filename}.md"));
    let mut index = 2;
    while candidate.exists() {
        candidate = directory.join(format!("{filename} {index}.md"));
        index += 1;
    }
    Ok(candidate)
}

#[tauri::command]
pub fn scan_notes(request: VaultLocation) -> Result<Vec<NoteSummary>, String> {
    let (_root, notes) = notes_root(&request, true)?;
    let mut result = Vec::new();
    collect_notes(&notes, &notes, &mut result)?;
    result.sort_by(|left, right| {
        right
            .pinned
            .cmp(&left.pinned)
            .then_with(|| right.updated_at.cmp(&left.updated_at))
    });
    Ok(result)
}

#[tauri::command]
pub fn read_note(request: NotePathRequest) -> Result<Note, String> {
    let (_root, notes) = notes_root(
        &VaultLocation {
            root_path: request.root_path,
            notes_folder: request.notes_folder,
        },
        false,
    )?;
    let path = safe_existing_note_path(&notes, &request.relative_path)?;
    let parsed = note_from_path(&path, &notes)?;
    Ok(Note {
        summary: parsed.summary,
        markdown: parsed.markdown,
    })
}

#[tauri::command]
pub fn write_note(request: NoteWriteRequest) -> Result<Note, String> {
    if request.id.trim().is_empty() || request.project_id.trim().is_empty() {
        return Err("笔记必须包含稳定的笔记 ID 和项目 ID。".to_string());
    }
    if request.title.trim().is_empty() {
        return Err("请输入笔记标题。".to_string());
    }
    let location = VaultLocation {
        root_path: request.root_path.clone(),
        notes_folder: request.notes_folder.clone(),
    };
    let (_root, notes) = notes_root(&location, true)?;
    let (mut path, existing_raw) = if let Some(relative_path) = request
        .relative_path
        .as_deref()
        .filter(|value| !value.is_empty())
    {
        let candidate = notes.join(normalize_relative_path(relative_path)?);
        if candidate.exists() {
            let existing = safe_existing_note_path(&notes, relative_path)?;
            let raw = fs::read_to_string(&existing)
                .map_err(|error| format!("无法读取待更新笔记：{error}"))?;
            (existing, Some(raw))
        } else {
            (safe_new_note_path(&notes, relative_path)?, None)
        }
    } else {
        (
            unique_note_path(&notes, request.project_folder.as_deref(), &request.title)?,
            None,
        )
    };

    if let (Some(expected), Some(raw)) = (
        request.expected_content_hash.as_deref(),
        existing_raw.as_deref(),
    ) {
        let actual = hash_string(raw);
        if expected != actual {
            return Err("笔记已在 Obsidian 或其他程序中发生变化，请刷新后再保存。".to_string());
        }
    }
    if let Some(raw) = existing_raw.as_deref() {
        let parsed = parse_note(raw, relative_note_path(&notes, &path)?, &path);
        if parsed.summary.id != request.id {
            return Err("目标笔记与当前笔记 ID 不一致，已停止覆盖。".to_string());
        }
    }

    let mut frontmatter = existing_raw
        .as_deref()
        .map(|raw| split_frontmatter(raw).0)
        .unwrap_or_default();
    set_yaml_value(
        &mut frontmatter,
        "task-orbit-schema",
        YamlValue::Number(SCHEMA_VERSION.into()),
    );
    set_yaml_value(
        &mut frontmatter,
        "task-orbit-note-id",
        YamlValue::String(request.id),
    );
    set_yaml_value(
        &mut frontmatter,
        "task-orbit-title",
        YamlValue::String(request.title.clone()),
    );
    set_yaml_value(
        &mut frontmatter,
        "task-orbit-project-id",
        YamlValue::String(request.project_id),
    );
    set_yaml_value(
        &mut frontmatter,
        "task-orbit-task-ids",
        yaml_strings(&request.task_ids),
    );
    set_yaml_value(
        &mut frontmatter,
        "task-orbit-daily-plan-ids",
        yaml_strings(&request.daily_plan_ids),
    );
    set_yaml_value(
        &mut frontmatter,
        "task-orbit-pinned",
        YamlValue::Bool(request.pinned),
    );

    let content = rendered_note(&frontmatter, &request.markdown)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("无法创建笔记目录：{error}"))?;
    }
    let original_path = path.clone();
    let mut renamed = false;
    if existing_raw.is_some() {
        let target = note_path_for_title(&path, &request.title, &notes)?;
        if !paths_refer_to_same_file(&path, &target) {
            if target.exists() {
                let relative = relative_note_path(&notes, &target)?;
                return Err(format!("无法重命名笔记：目标文件已存在（{relative}）。"));
            }
            fs::rename(&path, &target).map_err(|error| format!("无法按标题重命名笔记：{error}"))?;
            path = target;
            renamed = true;
        }
    }
    if let Err(error) = atomic_write(&path, &content) {
        if renamed {
            if let Err(rollback_error) = fs::rename(&path, &original_path) {
                return Err(format!(
                    "无法保存笔记：{error}；恢复原笔记名称失败：{rollback_error}"
                ));
            }
        }
        return Err(error);
    }
    let parsed = parse_note(&content, relative_note_path(&notes, &path)?, &path);
    Ok(Note {
        summary: parsed.summary,
        markdown: parsed.markdown,
    })
}

#[tauri::command]
pub fn delete_note(request: NotePathRequest) -> Result<(), String> {
    let (_root, notes) = notes_root(
        &VaultLocation {
            root_path: request.root_path,
            notes_folder: request.notes_folder,
        },
        false,
    )?;
    let path = safe_existing_note_path(&notes, &request.relative_path)?;
    fs::remove_file(&path).map_err(|error| format!("无法删除笔记：{error}"))
}

#[tauri::command]
pub fn create_vault(request: CreateVaultRequest) -> Result<CreatedVault, String> {
    let parent = canonical_root(&request.parent_path)?;
    let name = sanitize_segment(&request.vault_name, "Task Orbit Vault");
    let root = parent.join(&name);
    if root.exists() {
        if !root.is_dir() {
            return Err("目标 Vault 名称已被文件占用。".to_string());
        }
        if fs::read_dir(&root)
            .map_err(|error| format!("无法检查目标 Vault：{error}"))?
            .next()
            .is_some()
        {
            return Err("目标文件夹不是空目录，为避免覆盖已有内容，请选择其他名称。".to_string());
        }
    } else {
        fs::create_dir(&root).map_err(|error| format!("无法创建 Vault：{error}"))?;
    }
    let notes_folder = normalize_relative_path(&request.notes_folder)?;
    if notes_folder.as_os_str().is_empty() {
        return Err("笔记目录不能为空。".to_string());
    }
    fs::create_dir_all(root.join(&notes_folder))
        .map_err(|error| format!("无法创建 Vault 笔记目录：{error}"))?;
    let canonical =
        fs::canonicalize(&root).map_err(|error| format!("无法确认 Vault 路径：{error}"))?;
    Ok(CreatedVault {
        root_path: canonical.to_string_lossy().to_string(),
        vault_name: name,
        notes_folder: notes_folder.to_string_lossy().replace('\\', "/"),
    })
}

fn percent_encode(value: &str) -> String {
    value
        .bytes()
        .map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' | b'/' => {
                (byte as char).to_string()
            }
            _ => format!("%{byte:02X}"),
        })
        .collect()
}

fn launch_uri(uri: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", uri])
            .spawn()
            .map_err(|error| format!("无法打开 Obsidian：{error}"))?;
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(uri)
            .spawn()
            .map_err(|error| format!("无法打开 Obsidian：{error}"))?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(uri)
            .spawn()
            .map_err(|error| format!("无法打开 Obsidian：{error}"))?;
    }
    Ok(())
}

#[tauri::command]
pub fn open_note_in_obsidian(request: OpenNoteRequest) -> Result<(), String> {
    let (_root, notes) = notes_root(
        &VaultLocation {
            root_path: request.root_path.clone(),
            notes_folder: request.notes_folder,
        },
        false,
    )?;
    let path = safe_existing_note_path(&notes, &request.relative_path)?;
    let relative = relative_note_path(&notes, &path)?;
    let vault_name = request
        .vault_name
        .filter(|value| !value.trim().is_empty())
        .or_else(|| {
            Path::new(&request.root_path)
                .file_name()
                .and_then(|value| value.to_str())
                .map(ToString::to_string)
        })
        .ok_or_else(|| "无法确定 Vault 名称。".to_string())?;
    let uri = format!(
        "obsidian://open?vault={}&file={}",
        percent_encode(&vault_name),
        percent_encode(&relative),
    );
    launch_uri(&uri)
}
