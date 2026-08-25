/**
 * Local file operations (TASK-18): authorized-directory whitelist — tasks
 * only touch explicitly granted roots. Every mutating operation lands in
 * an audit log (file_audit collection, expert-mode queryable). Path
 * confinement is enforced by canonicalized-prefix checks; symlinks are
 * not followed out of the whitelist.
 */
use std::path::{Path, PathBuf};
use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::Response;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::{json, Value};

use crate::{err_msg, ok_data, AppState};

const WHITELIST_COLLECTION: &str = "file_whitelist";
const AUDIT_COLLECTION: &str = "file_audit";

fn load_whitelist(state: &AppState) -> Vec<PathBuf> {
    state
        .store
        .list(WHITELIST_COLLECTION)
        .iter()
        .filter_map(|doc| doc.get("path").and_then(Value::as_str).map(PathBuf::from))
        .collect()
}

/// Whether a canonicalized target sits inside one of the granted roots.
/// The caller canonicalizes; missing targets are rejected upstream.
fn is_within(target: &Path, roots: &[PathBuf]) -> bool {
    roots.iter().any(|root| target.starts_with(root))
}

fn audit(state: &AppState, op: &str, path: &str, ok: bool, detail: Option<&str>) {
    let id = format!("audit-{}", uuid::Uuid::new_v4());
    let doc = json!({
        "id": id,
        "op": op,
        "path": path,
        "ok": ok,
        "detail": detail,
        "created_at": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
    });
    let _ = state.store.insert(AUDIT_COLLECTION, &id, doc);
}

// ==================== Handlers ====================

/// POST /api/files/grant {path} — grant a directory (授权).
async fn grant(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let raw = body.get("path").and_then(Value::as_str).unwrap_or("");
    if raw.is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "path 必填");
    }
    let path = PathBuf::from(raw);
    if !path.is_dir() {
        return err_msg(StatusCode::BAD_REQUEST, "目录不存在");
    }
    let canonical = std::fs::canonicalize(&path)
        .map_err(|e| format!("无法解析路径: {e}"))
        .unwrap_or_default();
    let canonical = canonical.to_string_lossy().to_string();
    // Dedup on canonical path.
    let existing = state.store.list(WHITELIST_COLLECTION);
    if existing
        .iter()
        .any(|doc| doc.get("path").and_then(Value::as_str) == Some(canonical.as_str()))
    {
        return ok_data(json!({ "path": canonical, "already": true }));
    }
    let id = format!("dir-{}", uuid::Uuid::new_v4());
    let _ = state.store.insert(
        WHITELIST_COLLECTION,
        &id,
        json!({ "id": id, "path": canonical }),
    );
    audit(&state, "grant", &canonical, true, None);
    ok_data(json!({ "path": canonical, "already": false }))
}

/// GET /api/files/roots — the whitelist.
async fn roots(State(state): State<Arc<AppState>>) -> Response {
    ok_data(state.store.list(WHITELIST_COLLECTION))
}

/// POST /api/files/revoke {path}
async fn revoke(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let raw = body.get("path").and_then(Value::as_str).unwrap_or("");
    let canonical = std::fs::canonicalize(raw)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| raw.to_string());
    let docs = state.store.list(WHITELIST_COLLECTION);
    let matched: Vec<String> = docs
        .iter()
        .filter(|doc| doc.get("path").and_then(Value::as_str) == Some(canonical.as_str()))
        .filter_map(|doc| doc.get("id").and_then(Value::as_str).map(str::to_string))
        .collect();
    if matched.is_empty() {
        return err_msg(StatusCode::NOT_FOUND, "该目录未在白名单中");
    }
    for id in &matched {
        let _ = state.store.delete(WHITELIST_COLLECTION, id);
    }
    audit(&state, "revoke", &canonical, true, None);
    ok_data(json!({ "revoked": canonical }))
}

/// POST /api/files/list {path} — list a directory inside the whitelist.
async fn list_dir(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let raw = body.get("path").and_then(Value::as_str).unwrap_or("");
    let whitelist = load_whitelist(&state);
    let canonical = match std::fs::canonicalize(raw) {
        Ok(c) => c,
        Err(_) => return err_msg(StatusCode::BAD_REQUEST, "路径不存在"),
    };
    if !is_within(&canonical, &whitelist) {
        return err_msg(StatusCode::FORBIDDEN, "目录未授权（先在白名单中授予访问）");
    }
    let entries: Vec<Value> = std::fs::read_dir(&canonical)
        .map(|dir| {
            dir.flatten()
                .map(|entry| {
                    let meta = entry.metadata().ok();
                    json!({
                        "name": entry.file_name().to_string_lossy(),
                        "is_dir": meta.as_ref().map(|m| m.is_dir()).unwrap_or(false),
                        "size": meta.as_ref().map(|m| m.len()).unwrap_or(0),
                    })
                })
                .collect()
        })
        .unwrap_or_default();
    ok_data(json!({ "path": canonical.to_string_lossy(), "entries": entries }))
}

/// POST /api/files/rename {from, to} — confined + audited.
async fn rename(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let from = body.get("from").and_then(Value::as_str).unwrap_or("");
    let to = body.get("to").and_then(Value::as_str).unwrap_or("");
    if from.is_empty() || to.is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "from 与 to 必填");
    }
    let whitelist = load_whitelist(&state);
    let from_canon = std::fs::canonicalize(from)
        .map_err(|_| "源文件不存在")
        .unwrap_or_default();
    if !is_within(&from_canon, &whitelist) {
        audit(&state, "rename", from, false, Some("未授权"));
        return err_msg(StatusCode::FORBIDDEN, "源路径未授权");
    }
    // The destination must also stay inside the whitelist (its parent
    // must exist so canonicalize works).
    let to_parent = Path::new(to).parent().unwrap_or(Path::new("."));
    let to_canon = std::fs::canonicalize(to_parent)
        .map_err(|_| "目标目录不存在")
        .unwrap_or_default();
    if !is_within(&to_canon, &whitelist) {
        audit(&state, "rename", to, false, Some("目标未授权"));
        return err_msg(StatusCode::FORBIDDEN, "目标目录未授权");
    }
    match std::fs::rename(from, to) {
        Ok(()) => {
            audit(&state, "rename", from, true, Some(to));
            ok_data(json!({ "from": from, "to": to }))
        }
        Err(e) => {
            audit(&state, "rename", from, false, Some(&e.to_string()));
            err_msg(
                StatusCode::INTERNAL_SERVER_ERROR,
                &format!("重命名失败: {e}"),
            )
        }
    }
}

/// POST /api/files/write {path, content} — confined + audited.
async fn write(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let path = body.get("path").and_then(Value::as_str).unwrap_or("");
    let content = body.get("content").and_then(Value::as_str).unwrap_or("");
    if path.is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "path 必填");
    }
    let whitelist = load_whitelist(&state);
    let parent = Path::new(path).parent().unwrap_or(Path::new("."));
    let parent_canon = std::fs::canonicalize(parent)
        .map_err(|_| "目录不存在")
        .unwrap_or_default();
    if !is_within(&parent_canon, &whitelist) {
        audit(&state, "write", path, false, Some("未授权"));
        return err_msg(StatusCode::FORBIDDEN, "目录未授权");
    }
    match std::fs::write(path, content) {
        Ok(()) => {
            audit(
                &state,
                "write",
                path,
                true,
                Some(&format!("{} bytes", content.len())),
            );
            ok_data(json!({ "path": path, "bytes": content.len() }))
        }
        Err(e) => {
            audit(&state, "write", path, false, Some(&e.to_string()));
            err_msg(StatusCode::INTERNAL_SERVER_ERROR, &format!("写入失败: {e}"))
        }
    }
}

/// GET /api/files/audit — the audit trail (专家模式可查).
async fn audit_log(State(state): State<Arc<AppState>>) -> Response {
    ok_data(state.store.list(AUDIT_COLLECTION))
}

pub(crate) fn fileops_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/files/grant", post(grant))
        .route("/api/files/revoke", post(revoke))
        .route("/api/files/roots", get(roots))
        .route("/api/files/list", post(list_dir))
        .route("/api/files/rename", post(rename))
        .route("/api/files/write", post(write))
        .route("/api/files/audit", get(audit_log))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn confinement_checks_prefixes() {
        let roots = vec![PathBuf::from("/Users/x/data")];
        assert!(is_within(Path::new("/Users/x/data/sub/file.txt"), &roots));
        assert!(!is_within(Path::new("/Users/x/data-evil/file.txt"), &roots));
        assert!(!is_within(Path::new("/etc/passwd"), &roots));
    }
}
