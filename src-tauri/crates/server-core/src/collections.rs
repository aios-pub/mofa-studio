/**
 * Generic document-collection routes.
 *
 * Implements the REST dialect of the agentos backend used by
 * `services/real/base.ts` (`createActionApi`):
 * - List:    GET    /api/{collection}/list | /api/{collection}/fetch
 * - Detail:  GET    /api/{collection}/{id}
 * - Create:  POST   /api/{collection}/create
 * - Update:  POST   /api/{collection}/update   (id in body)
 * - Delete:  DELETE /api/{collection}/delete/{id}
 *
 * Any `/api/<domain>` not special-cased elsewhere persists here, which is
 * what makes the management pages (agents, prompts, skills, providers,
 * channels, workflows, ...) work offline against local SQLite.
 */

use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::Response;
use axum::routing::{delete, get, post};
use axum::{Json, Router};
use serde_json::Value;

use crate::{err_msg, ok_data, AppState};

// ==================== Handlers ====================

async fn list_handler(
    State(state): State<Arc<AppState>>,
    Path(collection): Path<String>,
) -> Response {
    ok_data(state.store.list(&collection))
}

async fn get_handler(
    State(state): State<Arc<AppState>>,
    Path((collection, id)): Path<(String, String)>,
) -> Response {
    match state.store.get(&collection, &id) {
        Some(doc) => ok_data(doc),
        None => err_msg(StatusCode::NOT_FOUND, "Document not found"),
    }
}

async fn create_handler(
    State(state): State<Arc<AppState>>,
    Path(collection): Path<String>,
    body: Option<Json<Value>>,
) -> Response {
    let mut doc = match body {
        Some(Json(value)) => value,
        None => Value::Object(Default::default()),
    };

    // Reuse a client-supplied id (mock services generate their own) so
    // create-then-update flows keep working; otherwise mint a UUID.
    let id = doc
        .get("id")
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    match state.store.insert(&collection, &id, doc.take()) {
        Ok(stored) => ok_data(stored),
        Err(e) => err_msg(StatusCode::BAD_REQUEST, &format!("Create failed: {e}")),
    }
}

async fn update_handler(
    State(state): State<Arc<AppState>>,
    Path(collection): Path<String>,
    body: Option<Json<Value>>,
) -> Response {
    let Json(patch) = match body {
        Some(json) => json,
        None => return err_msg(StatusCode::BAD_REQUEST, "Request body is required"),
    };

    let Some(id) = patch
        .get("id")
        .and_then(Value::as_str)
        .map(str::to_string)
    else {
        return err_msg(StatusCode::BAD_REQUEST, "Field 'id' is required");
    };

    match state.store.update(&collection, &id, &patch) {
        Some(doc) => ok_data(doc),
        None => err_msg(StatusCode::NOT_FOUND, "Document not found"),
    }
}

async fn delete_handler(
    State(state): State<Arc<AppState>>,
    Path((collection, id)): Path<(String, String)>,
) -> Response {
    if state.store.delete(&collection, &id) {
        ok_data(Value::Null)
    } else {
        err_msg(StatusCode::NOT_FOUND, "Document not found")
    }
}

// ==================== Conversation lookups ====================

/// GET /api/conversation/by-user?user_id=... (see services/real/conversations.ts)
async fn by_user_handler(
    State(state): State<Arc<AppState>>,
    Query(params): Query<Vec<(String, String)>>,
) -> Response {
    let user_id = param(&params, "user_id");
    match user_id {
        Some(user_id) => ok_data(state.store.filter_eq("conversation", "user_id", &user_id)),
        None => err_msg(StatusCode::BAD_REQUEST, "Query parameter 'user_id' is required"),
    }
}

/// GET /api/conversation/by-agent?agent_id=...
async fn by_agent_handler(
    State(state): State<Arc<AppState>>,
    Query(params): Query<Vec<(String, String)>>,
) -> Response {
    let agent_id = param(&params, "agent_id");
    match agent_id {
        Some(agent_id) => ok_data(state.store.filter_eq("conversation", "agent_id", &agent_id)),
        None => err_msg(StatusCode::BAD_REQUEST, "Query parameter 'agent_id' is required"),
    }
}

fn param(params: &[(String, String)], key: &str) -> Option<String> {
    params
        .iter()
        .find(|(k, _)| k == key)
        .map(|(_, v)| v.clone())
}

// ==================== Routes ====================

/// Generic collection routes plus the conversation lookup variants.
pub(crate) fn collection_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/{collection}/list", get(list_handler))
        .route("/api/{collection}/fetch", get(list_handler))
        .route("/api/{collection}/create", post(create_handler))
        .route("/api/{collection}/update", post(update_handler))
        .route("/api/{collection}/delete/{id}", delete(delete_handler))
        .route("/api/{collection}/{id}", get(get_handler))
        .route("/api/conversation/by-user", get(by_user_handler))
        .route("/api/conversation/by-agent", get(by_agent_handler))
}
