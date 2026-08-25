/**
 * Storage management (PLAT-09): category-scoped usage stats over the app
 * data directory, recycle-bin deletes (recoverable), and cache cleanup.
 * Categories: media artifacts, podcast renders, uploads, database, spans.
 */
use std::path::{Path, PathBuf};
use std::sync::Arc;

use axum::extract::{Path as AxumPath, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::{json, Value};

use crate::{err_msg, ok_data, AppState};

/// A storage category with its directory under the app data dir.
const CATEGORIES: [(&str, &str, &str); 5] = [
    // (key, label, subdir)
    ("media", "媒体产物", "media"),
    ("podcast", "播客成品", "podcast"),
    ("audio", "语音文件", "audio"),
    ("uploads", "上传文件", "uploads"),
    ("database", "数据库", "."),
];

fn dir_size(path: &Path) -> u64 {
    let meta = match std::fs::symlink_metadata(path) {
        Ok(meta) => meta,
        Err(_) => return 0,
    };
    if meta.is_file() {
        return meta.len();
    }
    if meta.is_dir() {
        let mut total = 0;
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                total += dir_size(&entry.path());
            }
        }
        return total;
    }
    0
}

fn count_files(path: &Path) -> u64 {
    if !path.is_dir() {
        return 0;
    }
    let mut count = 0;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                count += count_files(&p);
            } else {
                count += 1;
            }
        }
    }
    count
}

/// Category usage snapshot (pure over the filesystem, testable with a
/// tempdir).
pub(crate) struct CategoryUsage {
    pub key: &'static str,
    pub label: &'static str,
    pub bytes: u64,
    pub files: u64,
}

pub(crate) fn scan_categories(data_dir: &Path) -> Vec<CategoryUsage> {
    CATEGORIES
        .iter()
        .map(|(key, label, subdir)| {
            let path: PathBuf = if *subdir == "." {
                data_dir.to_path_buf()
            } else {
                data_dir.join(subdir)
            };
            CategoryUsage {
                key,
                label,
                bytes: dir_size(&path),
                files: count_files(&path),
            }
        })
        .collect()
}

// ==================== Recycle bin ====================

fn trash_dir(data_dir: &Path) -> PathBuf {
    data_dir.join("trash")
}

/// Move a file into the trash with a namespaced id (删除进回收站可恢复).
pub(crate) fn trash_file(data_dir: &Path, path: &Path) -> Result<String, String> {
    if !path.starts_with(data_dir) {
        return Err("只能回收应用数据目录内的文件".into());
    }
    if !path.is_file() {
        return Err("只能回收文件".into());
    }
    let trash = trash_dir(data_dir);
    std::fs::create_dir_all(&trash).map_err(|e| format!("创建回收站失败: {e}"))?;
    let id = format!("trash-{}", uuid::Uuid::new_v4());
    std::fs::rename(path, trash.join(&id)).map_err(|e| format!("移入回收站失败: {e}"))?;
    Ok(id)
}

pub(crate) fn restore_file(data_dir: &Path, trash_id: &str) -> Result<String, String> {
    if !trash_id.starts_with("trash-") {
        return Err("无效的回收站条目".into());
    }
    let trashed = trash_dir(data_dir).join(trash_id);
    if !trashed.is_file() {
        return Err("回收站中不存在该条目".into());
    }
    // Restore into the media category by default; the original path is not
    // tracked (id contains no path info) — a recovered file lands in a
    // dedicated restored/ folder the gallery can scan.
    let restored_dir = data_dir.join("media").join("restored");
    std::fs::create_dir_all(&restored_dir).map_err(|e| format!("创建目录失败: {e}"))?;
    let target = restored_dir.join(trash_id);
    std::fs::rename(&trashed, &target).map_err(|e| format!("恢复失败: {e}"))?;
    Ok(target.to_string_lossy().to_string())
}

fn list_trash(data_dir: &Path) -> Vec<Value> {
    let trash = trash_dir(data_dir);
    let mut items = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&trash) {
        for entry in entries.flatten() {
            let meta = match entry.metadata() {
                Ok(meta) => meta,
                Err(_) => continue,
            };
            if meta.is_file() {
                items.push(json!({
                    "id": entry.file_name().to_string_lossy(),
                    "size": meta.len(),
                    "trashed_at": chrono::DateTime::<chrono::Utc>::from(meta.created().unwrap_or(std::time::SystemTime::UNIX_EPOCH))
                        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
                        .to_string(),
                }));
            }
        }
    }
    items.sort_by(|a, b| b["trashed_at"].as_str().cmp(&a["trashed_at"].as_str()));
    items
}

// ==================== Handlers ====================

/// GET /api/storage/usage — category breakdown.
async fn usage(State(state): State<Arc<AppState>>) -> Response {
    let data_dir = state.data_dir.clone();
    let categories = match tokio::task::spawn_blocking(move || scan_categories(&data_dir)).await {
        Ok(categories) => categories,
        Err(e) => return err_msg(StatusCode::INTERNAL_SERVER_ERROR, &format!("扫描失败: {e}")),
    };
    let total: u64 = categories.iter().map(|c| c.bytes).sum();
    ok_data(json!({
        "total_bytes": total,
        "categories": categories.iter().map(|c| json!({
            "key": c.key,
            "label": c.label,
            "bytes": c.bytes,
            "files": c.files,
        })).collect::<Vec<_>>(),
        "trash": list_trash(&state.data_dir),
    }))
}

/// POST /api/storage/clean {category} — delete every file in a cache
/// category (media/podcast/audio/uploads). Database is not cleanable.
async fn clean(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let category = body.get("category").and_then(Value::as_str).unwrap_or("");
    let Some((_, _, subdir)) = CATEGORIES.iter().find(|(key, _, _)| *key == category) else {
        return err_msg(StatusCode::BAD_REQUEST, "未知分类");
    };
    if *subdir == "." {
        return err_msg(StatusCode::BAD_REQUEST, "数据库分类不可一键清理");
    }
    let dir = state.data_dir.join(subdir);
    let freed = match tokio::task::spawn_blocking(move || {
        let mut freed = 0u64;
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let size = dir_size(&path);
                if path.is_dir() {
                    let _ = std::fs::remove_dir_all(&path);
                } else {
                    let _ = std::fs::remove_file(&path);
                }
                freed += size;
            }
        }
        freed
    })
    .await
    {
        Ok(freed) => freed,
        Err(e) => return err_msg(StatusCode::INTERNAL_SERVER_ERROR, &format!("清理失败: {e}")),
    };
    ok_data(json!({ "category": category, "freed_bytes": freed }))
}

/// POST /api/storage/trash {path} — recycle a file (recoverable).
async fn trash(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let path = body.get("path").and_then(Value::as_str).unwrap_or("");
    if path.is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "path 必填");
    }
    let data_dir = state.data_dir.clone();
    let target = PathBuf::from(path);
    match tokio::task::spawn_blocking(move || trash_file(&data_dir, &target)).await {
        Ok(Ok(id)) => ok_data(json!({ "trash_id": id })),
        Ok(Err(e)) => err_msg(StatusCode::BAD_REQUEST, &e),
        Err(e) => err_msg(StatusCode::INTERNAL_SERVER_ERROR, &format!("任务失败: {e}")),
    }
}

/// POST /api/storage/trash/{id}/restore
async fn restore(
    State(state): State<Arc<AppState>>,
    AxumPath(trash_id): AxumPath<String>,
) -> Response {
    let data_dir = state.data_dir.clone();
    match tokio::task::spawn_blocking(move || restore_file(&data_dir, &trash_id)).await {
        Ok(Ok(path)) => ok_data(json!({ "restored_path": path })),
        Ok(Err(e)) => err_msg(StatusCode::NOT_FOUND, &e),
        Err(e) => err_msg(StatusCode::INTERNAL_SERVER_ERROR, &format!("任务失败: {e}")),
    }
}

/// POST /api/storage/trash/empty
async fn empty_trash(State(state): State<Arc<AppState>>) -> Response {
    let trash = trash_dir(&state.data_dir);
    let freed = match tokio::task::spawn_blocking(move || {
        let mut freed = 0u64;
        if let Ok(entries) = std::fs::read_dir(&trash) {
            for entry in entries.flatten() {
                let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                let _ = std::fs::remove_file(entry.path());
                freed += size;
            }
        }
        freed
    })
    .await
    {
        Ok(freed) => freed,
        Err(e) => return err_msg(StatusCode::INTERNAL_SERVER_ERROR, &format!("清空失败: {e}")),
    };
    ok_data(json!({ "freed_bytes": freed }))
}

pub(crate) fn storage_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/storage/usage", get(usage))
        .route("/api/storage/clean", post(clean))
        .route("/api/storage/trash", post(trash))
        .route("/api/storage/trash/empty", post(empty_trash))
        .route("/api/storage/trash/{id}/restore", post(restore))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_data(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("mofa-storage-test-{tag}"));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join("media")).unwrap();
        dir
    }

    #[test]
    fn scan_reports_per_category_bytes_and_files() {
        let dir = temp_data("scan");
        std::fs::write(dir.join("media/a.bin"), vec![0u8; 1024]).unwrap();
        std::fs::create_dir_all(dir.join("media/sub")).unwrap();
        std::fs::write(dir.join("media/sub/b.bin"), vec![0u8; 512]).unwrap();
        std::fs::write(dir.join("db-file"), vec![0u8; 256]).unwrap();
        let usage = scan_categories(&dir);
        let media = usage.iter().find(|c| c.key == "media").unwrap();
        assert_eq!(media.bytes, 1536);
        assert_eq!(media.files, 2);
        let database = usage.iter().find(|c| c.key == "database").unwrap();
        assert!(database.bytes >= 256);
    }

    #[test]
    fn trash_then_restore_round_trip() {
        let dir = temp_data("roundtrip");
        let file = dir.join("media/episode.mp3");
        std::fs::write(&file, b"audio").unwrap();

        let id = trash_file(&dir, &file).unwrap();
        assert!(!file.exists(), "original removed");
        assert!(dir.join("trash").join(&id).is_file(), "in trash");

        let restored = restore_file(&dir, &id).unwrap();
        assert!(Path::new(&restored).is_file());
        assert!(restored.contains("media/restored"));
        // Second restore of the same id fails honestly.
        assert!(restore_file(&dir, &id).is_err());
    }

    #[test]
    fn trash_rejects_paths_outside_the_data_dir() {
        let dir = temp_data("guard");
        let outside = std::env::temp_dir().join("mofa-storage-outside.txt");
        std::fs::write(&outside, b"x").unwrap();
        assert!(trash_file(&dir, &outside).is_err());
    }

    #[test]
    fn trash_rejects_directories_and_bad_ids() {
        let dir = temp_data("guards2");
        let sub = dir.join("media/subdir");
        std::fs::create_dir_all(&sub).unwrap();
        assert!(trash_file(&dir, &sub).is_err());
        assert!(restore_file(&dir, "not-a-trash-id").is_err());
    }
}
