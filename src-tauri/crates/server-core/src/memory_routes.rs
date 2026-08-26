/**
 * Long-term memory (TASK-19): user preferences, project context, and
 * decisions stored for retrieval into chats and tasks. The four privacy
 * powers are hard requirements (可见/可编辑/可删除/总开关) — implemented
 * as first-class endpoints, with the master switch gating retrieval.
 * Retrieval v1 is CJK-bigram keyword scoring (same honest basis as the
 * RAG module); sqlite-vec embeddings are the documented upgrade path.
 */
use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::Response;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::{json, Value};

use crate::vector::VectorBackend;
use crate::{err_msg, ok_data, AppState};

const MEMORY_COLLECTION: &str = "memory";
const SWITCH_KEY: &str = "memory_enabled";

fn memory_enabled(state: &AppState) -> bool {
    state
        .store
        .get_meta(SWITCH_KEY)
        .map(|v| v != "false")
        .unwrap_or(true) // default on; the switch is opt-out
}

/// Score a memory entry against a query (CJK bigrams + ASCII words).
fn score_entry(query: &str, content: &str) -> u64 {
    let q = query.to_lowercase();
    let c = content.to_lowercase();
    let mut score = 0u64;
    let chars: Vec<char> = q.chars().collect();
    for i in 0..chars.len().saturating_sub(1) {
        let bigram: String = chars[i..i + 2].iter().collect();
        if c.contains(&bigram) {
            score += 2;
        }
    }
    for word in q.split_whitespace() {
        if word.len() > 1
            && word
                .chars()
                .all(|ch| ch.is_ascii_alphanumeric() || ch == '-')
            && c.contains(word)
        {
            score += 3;
        }
    }
    score
}

// ==================== Handlers ====================

/// POST /api/memory/create {content, kind?}
async fn create(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let content = body
        .get("content")
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim();
    if content.is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "content 不能为空");
    }
    let kind = body
        .get("kind")
        .and_then(Value::as_str)
        .unwrap_or("preference");
    if !["preference", "context", "decision"].contains(&kind) {
        return err_msg(
            StatusCode::BAD_REQUEST,
            "kind 必须是 preference / context / decision",
        );
    }
    let id = format!("mem-{}", uuid::Uuid::new_v4());
    let doc = json!({
        "id": id,
        "content": content,
        "kind": kind,
        "created_at": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
    });
    let _ = state.store.insert(MEMORY_COLLECTION, &id, doc.clone());
    // PLAT-07: index for vector retrieval when embeddings are reachable;
    // the keyword path keeps serving otherwise.
    if let Some(rows) = crate::embeddings::embed(&state, &[content.to_string()]).await {
        if let Some(vector) = rows.first() {
            let _ = state.vectors.upsert("memory", &id, vector);
        }
    }
    ok_data(doc)
}

/// GET /api/memory/list — 可见.
async fn list(State(state): State<Arc<AppState>>) -> Response {
    ok_data(state.store.list(MEMORY_COLLECTION))
}

/// POST /api/memory/{id} {content} — 可编辑.
async fn update(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Response {
    let content = body
        .get("content")
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim();
    if content.is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "content 不能为空");
    }
    match state
        .store
        .update(MEMORY_COLLECTION, &id, &json!({ "content": content }))
    {
        Some(updated) => ok_data(updated),
        None => err_msg(StatusCode::NOT_FOUND, "记忆条目不存在"),
    }
}

/// DELETE /api/memory/{id} — 可删除.
async fn remove(State(state): State<Arc<AppState>>, Path(id): Path<String>) -> Response {
    if state.store.delete(MEMORY_COLLECTION, &id) {
        ok_data(json!({ "deleted": id }))
    } else {
        err_msg(StatusCode::NOT_FOUND, "记忆条目不存在")
    }
}

/// POST /api/memory/toggle {enabled} — 总开关一键停用.
async fn toggle(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let enabled = body.get("enabled").and_then(Value::as_bool).unwrap_or(true);
    state
        .store
        .set_meta(SWITCH_KEY, if enabled { "true" } else { "false" });
    ok_data(json!({ "enabled": enabled }))
}

/// GET /api/memory/status — switch state + count for the UI.
async fn status(State(state): State<Arc<AppState>>) -> Response {
    ok_data(json!({
        "enabled": memory_enabled(&state),
        "count": state.store.count(MEMORY_COLLECTION),
    }))
}

/// POST /api/memory/retrieve {query, top_k?} — gated by the master switch.
async fn retrieve(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    if !memory_enabled(&state) {
        return ok_data(json!({ "disabled": true, "hits": [] }));
    }
    let query = body.get("query").and_then(Value::as_str).unwrap_or("");
    if query.trim().is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "query 不能为空");
    }
    let top_k = body
        .get("top_k")
        .and_then(Value::as_u64)
        .unwrap_or(3)
        .min(10) as usize;
    // PLAT-07: vector retrieval first; keyword scoring stays the fallback.
    let entries = state.store.list(MEMORY_COLLECTION);
    let by_id: std::collections::HashMap<String, Value> = entries
        .iter()
        .filter_map(|e| {
            e.get("id")
                .and_then(Value::as_str)
                .map(|id| (id.to_string(), e.clone()))
        })
        .collect();
    let vector_hits = crate::embeddings::embed(&state, &[query.to_string()])
        .await
        .and_then(|rows| rows.first().cloned())
        .and_then(|query_vector| state.vectors.query("memory", &query_vector, top_k).ok())
        .map(|knn| {
            knn.iter()
                .filter_map(|(id, _distance)| by_id.get(id).cloned())
                .collect::<Vec<Value>>()
        })
        .filter(|hits: &Vec<Value>| !hits.is_empty());

    let (retrieval, hits) = match vector_hits {
        Some(hits) => ("vector", hits),
        None => {
            let mut scored: Vec<(u64, Value)> = entries
                .into_iter()
                .map(|entry| {
                    let content = entry.get("content").and_then(Value::as_str).unwrap_or("");
                    (score_entry(query, content), entry)
                })
                .filter(|(score, _)| *score > 0)
                .collect();
            scored.sort_by(|a, b| b.0.cmp(&a.0));
            (
                "keyword",
                scored
                    .into_iter()
                    .take(top_k)
                    .map(|(_, entry)| entry)
                    .collect(),
            )
        }
    };
    ok_data(json!({ "disabled": false, "retrieval": retrieval, "hits": hits }))
}

pub(crate) fn memory_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/memory/create", post(create))
        .route("/api/memory/list", get(list))
        .route("/api/memory/status", get(status))
        .route(
            "/api/memory/{id}",
            axum::routing::put(update).delete(remove),
        )
        .route("/api/memory/toggle", post(toggle))
        .route("/api/memory/retrieve", post(retrieve))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scoring_favors_relevant_content() {
        assert!(
            score_entry("橘猫 习性", "橘猫的习性是白天睡觉")
                > score_entry("橘猫 习性", "量子计算原理")
        );
        assert!(score_entry("rust async", "rust async runtime notes") > 0);
    }
}
