/**
 * SOP template routes (TASK-20): templates live in the generic `sop`
 * collection; trigger binding updates the stored doc (转自动化流水线).
 */

use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::Response;
use axum::routing::post;
use axum::{Json, Router};
use serde_json::{json, Value};

use crate::{err_msg, ok_data, AppState};

/// POST /api/sop/create — save a packed template.
async fn create(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let name = body.get("name").and_then(Value::as_str).unwrap_or("").trim();
    let steps = body.get("steps").and_then(Value::as_array);
    if name.is_empty() || steps.is_none_or(|s| s.is_empty()) {
        return err_msg(StatusCode::BAD_REQUEST, "name 与 steps（至少一步）必填");
    }
    let id = format!("sop-{}", uuid::Uuid::new_v4());
    let doc = json!({
        "id": id,
        "name": name,
        "description": body.get("description").and_then(Value::as_str).unwrap_or(""),
        "output_format": body.get("output_format").and_then(Value::as_str).unwrap_or("markdown"),
        "steps": steps,
        "trigger": Value::Null,
        "created_at": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
    });
    let _ = state.store.insert("sop", &id, doc.clone());
    ok_data(doc)
}

/// POST /api/sop/{id}/trigger — bind a trigger (converts to pipeline).
async fn bind_trigger(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Response {
    let kind = body.get("kind").and_then(Value::as_str).unwrap_or("manual");
    if !["cron", "manual"].contains(&kind) {
        return err_msg(StatusCode::BAD_REQUEST, "kind 必须是 cron 或 manual");
    }
    let trigger = if kind == "cron" {
        let cron = body.get("cron").and_then(Value::as_str).unwrap_or("");
        if cron.is_empty() {
            return err_msg(StatusCode::BAD_REQUEST, "cron 触发需要 cron 表达式");
        }
        json!({ "kind": "cron", "cron": cron })
    } else {
        json!({ "kind": "manual" })
    };
    match state.store.update("sop", &id, &json!({ "trigger": trigger })) {
        Some(updated) => ok_data(updated),
        None => err_msg(StatusCode::NOT_FOUND, "SOP 模板不存在"),
    }
}

pub(crate) fn sop_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/sop/create", post(create))
        .route("/api/sop/{id}/trigger", post(bind_trigger))
}
