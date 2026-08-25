/**
 * Backup import/export (PLAT-10): one JSON file carries every collection
 * (conversations, projects, SOPs, assets, memories, connectors, spans…).
 * Export snapshots the whole store; import restores each collection
 * entry, skipping already-present ids (merge, not clobber) and reporting
 * what landed.
 */
use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::Response;
use axum::routing::post;
use axum::{Json, Router};
use serde_json::{json, Value};

use crate::{err_msg, ok_data, AppState};

/// Collections that participate in a backup. Internal bookkeeping keys
/// (meta) are excluded: they carry runtime secrets (JWT secret, memory
/// switch, search keys stay in meta and are deliberately NOT exported —
/// backups must be shareable).
const BACKUP_COLLECTIONS: [&str; 13] = [
    "conversation",
    "agent",
    "asset",
    "span",
    "rag_doc",
    "rag_chunk",
    "project",
    "sop",
    "automation_run",
    "memory",
    "mcp_server",
    "prompt",
    "flowapp",
];

/// POST /api/backup/export → {format, version, exported_at, collections}
async fn export_backup(State(state): State<Arc<AppState>>) -> Response {
    let mut collections = serde_json::Map::new();
    for name in BACKUP_COLLECTIONS {
        let docs = state.store.list(name);
        if !docs.is_empty() {
            collections.insert(name.to_string(), Value::Array(docs));
        }
    }
    ok_data(json!({
        "format": "mofa-backup",
        "version": 1,
        "exported_at": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
        "collections": Value::Object(collections),
    }))
}

/// POST /api/backup/import {data} — merge-restore a backup file.
async fn import_backup(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    if body.get("format").and_then(Value::as_str) != Some("mofa-backup") {
        return err_msg(StatusCode::BAD_REQUEST, "不是有效的 mofa-backup 文件");
    }
    let Some(collections) = body.get("collections").and_then(Value::as_object) else {
        return err_msg(StatusCode::BAD_REQUEST, "备份缺少 collections 字段");
    };

    let mut imported = 0usize;
    let mut skipped = 0usize;
    let mut unknown: Vec<String> = Vec::new();

    for (name, docs) in collections {
        if !BACKUP_COLLECTIONS.contains(&name.as_str()) {
            unknown.push(name.clone());
            continue;
        }
        let Some(entries) = docs.as_array() else {
            continue;
        };
        for entry in entries {
            let Some(id) = entry.get("id").and_then(Value::as_str) else {
                skipped += 1;
                continue;
            };
            if state.store.get(name, id).is_some() {
                skipped += 1; // merge: existing ids win
                continue;
            }
            if state.store.insert(name, id, entry.clone()).is_ok() {
                imported += 1;
            } else {
                skipped += 1;
            }
        }
    }

    ok_data(json!({
        "imported": imported,
        "skipped": skipped,
        "unknown_collections": unknown,
    }))
}

// ==================== Flow App routes (FLOW-08) ====================

/// POST /api/flowapp/create — publish a canvas subgraph as a form app.
async fn flowapp_create(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let name = body
        .get("name")
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim();
    let graph = body.get("graph");
    let inputs = body.get("inputs").and_then(Value::as_array);
    if name.is_empty() || graph.is_none() || inputs.is_none_or(|i| i.is_empty()) {
        return err_msg(
            StatusCode::BAD_REQUEST,
            "name、graph 与 inputs（至少一项）必填",
        );
    }
    // Inputs must bind to prompt nodes that exist in the graph.
    let node_ids: Vec<String> = graph
        .and_then(Value::as_array)
        .map(|nodes| {
            nodes
                .iter()
                .filter(|n| n.get("type").and_then(Value::as_str) == Some("prompt_text"))
                .filter_map(|n| n.get("id").and_then(Value::as_str).map(str::to_string))
                .collect()
        })
        .unwrap_or_default();
    for input in inputs.unwrap() {
        let bound = input.get("nodeId").and_then(Value::as_str).unwrap_or("");
        if !node_ids.iter().any(|id| id == bound) {
            return err_msg(
                StatusCode::BAD_REQUEST,
                &format!("输入绑定的节点 '{bound}' 不存在或不是文本提示词节点"),
            );
        }
    }
    let id = format!("app-{}", uuid::Uuid::new_v4());
    let doc = json!({
        "id": id,
        "name": name,
        "description": body.get("description").and_then(Value::as_str).unwrap_or(""),
        "graph": graph,
        "inputs": inputs,
        "created_at": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
    });
    let _ = state.store.insert("flowapp", &id, doc.clone());
    ok_data(doc)
}

/// GET /api/flowapp/list
async fn flowapp_list(State(state): State<Arc<AppState>>) -> Response {
    ok_data(state.store.list("flowapp"))
}

/// DELETE /api/flowapp/delete/{id}
async fn flowapp_delete(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Response {
    if state.store.delete("flowapp", &id) {
        ok_data(json!({ "deleted": id }))
    } else {
        err_msg(StatusCode::NOT_FOUND, "App 不存在")
    }
}

pub(crate) fn backup_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/backup/export", post(export_backup))
        .route("/api/backup/import", post(import_backup))
        .route("/api/flowapp/create", post(flowapp_create))
        .route("/api/flowapp/list", axum::routing::get(flowapp_list))
        .route(
            "/api/flowapp/delete/{id}",
            axum::routing::delete(flowapp_delete),
        )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn backup_collection_list_excludes_secrets() {
        // The meta store (JWT secret, search keys) is not a collection and
        // is never exported; sensitive side-channels cannot appear.
        for name in BACKUP_COLLECTIONS {
            assert_ne!(name, "meta", "meta must not be backed up");
        }
    }
}
