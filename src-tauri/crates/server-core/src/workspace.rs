/**
 * Project spaces (TASK-24): task-grouping containers. A space groups
 * projects and carries a config bundle (model policy / MCP connectors /
 * SOP references) that new tasks inherit in one click.
 */
use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::Response;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::{json, Value};

use crate::{err_msg, ok_data, AppState};

const SPACE_COLLECTION: &str = "workspace";

/// POST /api/workspace/create {name, description?}
async fn create(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let name = body
        .get("name")
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim();
    if name.is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "name 必填");
    }
    let id = format!("ws-{}", uuid::Uuid::new_v4());
    let _ = state.store.insert(
        SPACE_COLLECTION,
        &id,
        json!({
            "id": id,
            "name": name,
            "description": body.get("description").and_then(Value::as_str).unwrap_or(""),
            "project_ids": [],
            // Config bundle new tasks inherit (一键复用).
            "config": body.get("config").cloned().unwrap_or(json!({})),
            "created_at": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
        }),
    );
    ok_data(json!({ "id": id, "name": name }))
}

/// GET /api/workspace/list — with per-space project counts.
async fn list(State(state): State<Arc<AppState>>) -> Response {
    let projects: Vec<Value> = state.store.list("project");
    let spaces: Vec<Value> = state
        .store
        .list(SPACE_COLLECTION)
        .into_iter()
        .map(|mut space| {
            let members: Vec<String> = space
                .get("project_ids")
                .and_then(Value::as_array)
                .map(|ids| {
                    ids.iter()
                        .filter_map(|v| v.as_str().map(str::to_string))
                        .collect()
                })
                .unwrap_or_default();
            // Drop members whose projects no longer exist.
            let live: Vec<String> = members
                .iter()
                .filter(|id| {
                    projects
                        .iter()
                        .any(|p| p.get("id").and_then(Value::as_str) == Some(id.as_str()))
                })
                .cloned()
                .collect();
            space["project_count"] = json!(live.len());
            space["project_ids"] = json!(live);
            space
        })
        .collect();
    ok_data(spaces)
}

/// GET /api/workspace/{id}
async fn detail(State(state): State<Arc<AppState>>, Path(id): Path<String>) -> Response {
    match state.store.get(SPACE_COLLECTION, &id) {
        Some(space) => ok_data(space),
        None => err_msg(StatusCode::NOT_FOUND, "空间不存在"),
    }
}

/// POST /api/workspace/{id}/assign {project_id} — group a project.
async fn assign(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Response {
    let project_id = body.get("project_id").and_then(Value::as_str).unwrap_or("");
    if project_id.is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "project_id 必填");
    }
    if state.store.get("project", project_id).is_none() {
        return err_msg(StatusCode::NOT_FOUND, "项目不存在");
    }
    let Some(mut space) = state.store.get(SPACE_COLLECTION, &id) else {
        return err_msg(StatusCode::NOT_FOUND, "空间不存在");
    };
    let mut members: Vec<String> = space
        .get("project_ids")
        .and_then(Value::as_array)
        .map(|ids| {
            ids.iter()
                .filter_map(|v| v.as_str().map(str::to_string))
                .collect()
        })
        .unwrap_or_default();
    if !members.iter().any(|m| m == project_id) {
        members.push(project_id.to_string());
    }
    space["project_ids"] = json!(members);
    let _ = state.store.update(SPACE_COLLECTION, &id, &space);
    ok_data(space)
}

/// POST /api/workspace/{id}/config {config} — update the inheritable
/// config bundle (model policy, connectors, SOP refs).
async fn set_config(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Response {
    let Some(config) = body.get("config") else {
        return err_msg(StatusCode::BAD_REQUEST, "config 必填");
    };
    match state
        .store
        .update(SPACE_COLLECTION, &id, &json!({ "config": config }))
    {
        Some(space) => ok_data(space),
        None => err_msg(StatusCode::NOT_FOUND, "空间不存在"),
    }
}

/// POST /api/workspace/{id}/derive — the one-click reuse: read the config
/// bundle and return a new-project payload pre-filled from it. The caller
/// (ProjectsPage create flow) merges this into the立项 body.
async fn derive(State(state): State<Arc<AppState>>, Path(id): Path<String>) -> Response {
    let Some(space) = state.store.get(SPACE_COLLECTION, &id) else {
        return err_msg(StatusCode::NOT_FOUND, "空间不存在");
    };
    let config = space.get("config").cloned().unwrap_or(json!({}));
    ok_data(json!({
        "space_id": id,
        "space_name": space.get("name").cloned().unwrap_or(Value::Null),
        "config": config,
    }))
}

/// DELETE /api/workspace/{id}
async fn remove(State(state): State<Arc<AppState>>, Path(id): Path<String>) -> Response {
    if state.store.delete(SPACE_COLLECTION, &id) {
        ok_data(json!({ "deleted": id }))
    } else {
        err_msg(StatusCode::NOT_FOUND, "空间不存在")
    }
}

pub(crate) fn workspace_routes_state() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/workspace/create", post(create))
        .route("/api/workspace/list", get(list))
        .route("/api/workspace/{id}", get(detail).delete(remove))
        .route("/api/workspace/{id}/assign", post(assign))
        .route("/api/workspace/{id}/config", post(set_config))
        .route("/api/workspace/{id}/derive", post(derive))
}
