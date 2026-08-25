/**
 * FLOW-05 模型管理中心 (local track): proxy model lifecycle through the
 * local Ollama service — resumable pulls with live progress, disk-usage
 * listing, and deletion. Per the PRD boundary, local inference itself stays
 * behind Ollama; this module never runs models.
 *
 * Ollama wire contract used here:
 *   POST /api/pull  {name, stream:true} → JSON lines {status, completed?, total?}
 *   GET  /api/tags  → {models: [{name, size}]}
 *   DELETE /api/delete {name} → 200
 */
use std::collections::HashMap;
use std::sync::Arc;
use std::sync::Mutex;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::{json, Value};

use crate::{err_msg, ok_data, AppState};

/// Where the local Ollama lives (env override for tests).
fn ollama_base() -> String {
    std::env::var("OLLAMA_URL")
        .ok()
        .filter(|u| !u.is_empty())
        .unwrap_or_else(|| "http://127.0.0.1:11434".to_string())
}

/// One in-flight or finished pull.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct PullTask {
    pub id: String,
    pub name: String,
    /// pulling | done | error | cancelled
    pub status: String,
    /// 0..100 when the provider reports byte progress; None = indeterminate.
    pub percent: Option<u64>,
    pub detail: Option<String>,
}

#[derive(Default)]
pub(crate) struct PullRegistry {
    tasks: Mutex<HashMap<String, PullTask>>,
}

impl PullRegistry {
    fn snapshot(&self) -> Vec<PullTask> {
        self.tasks
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .values()
            .cloned()
            .collect()
    }

    fn update(&self, id: &str, mutate: impl FnOnce(&mut PullTask)) {
        let mut tasks = self.tasks.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(task) = tasks.get_mut(id) {
            mutate(task);
        }
    }

    fn cancel(&self, id: &str) -> bool {
        let mut tasks = self.tasks.lock().unwrap_or_else(|e| e.into_inner());
        match tasks.get_mut(id) {
            Some(task) if task.status == "pulling" => {
                task.status = "cancelled".into();
                true
            }
            _ => false,
        }
    }
}

/// Map one `{"status": "...", "completed": n, "total": m}` pull line to a
/// percent. `success` terminals the stream; missing sizes stay indeterminate.
pub(crate) fn pull_percent(line: &Value) -> Option<u64> {
    let completed = line.get("completed").and_then(Value::as_u64)?;
    let total = line
        .get("total")
        .and_then(Value::as_u64)
        .filter(|t| *t > 0)?;
    Some((completed * 100) / total)
}

pub(crate) fn model_center_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/models/pulls", get(list_pulls).post(start_pull))
        .route("/api/models/pull/{id}/cancel", post(cancel_pull))
        .route("/api/models/storage", get(storage))
        .route("/api/models/delete", post(delete_model))
}

/// GET /api/models/pulls → every pull task (newest first is the UI's job).
async fn list_pulls(State(state): State<Arc<AppState>>) -> Response {
    let pulls = state.model_pulls.snapshot();
    ok_data(json!(pulls
        .into_iter()
        .map(|t| json!({
            "id": t.id, "name": t.name, "status": t.status,
            "percent": t.percent, "detail": t.detail,
        }))
        .collect::<Vec<_>>()))
    .into_response()
}

/// POST /api/models/pulls {name} → starts an Ollama pull in the background;
/// progress lands on the task the list endpoint reports.
async fn start_pull(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let Some(name) = body.get("name").and_then(Value::as_str).map(str::trim) else {
        return err_msg(StatusCode::BAD_REQUEST, "field `name` is required");
    };
    if name.is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "field `name` is required");
    }
    // One pull per model name: reuse the in-flight task instead of stacking.
    let existing = state
        .model_pulls
        .snapshot()
        .into_iter()
        .find(|t| t.name == name && t.status == "pulling");
    if let Some(task) = existing {
        return ok_data(json!({ "id": task.id, "status": "pulling", "reused": true }))
            .into_response();
    }

    let id = format!("pull-{}", uuid::Uuid::new_v4());
    let task = PullTask {
        id: id.clone(),
        name: name.to_string(),
        status: "pulling".into(),
        percent: None,
        detail: None,
    };
    state
        .model_pulls
        .tasks
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .insert(id.clone(), task);

    let state = state.clone();
    let pull_id = id.clone();
    let model = name.to_string();
    tokio::spawn(async move {
        run_pull(state, pull_id, model).await;
    });

    ok_data(json!({ "id": id, "status": "pulling", "reused": false })).into_response()
}

/// Drive one pull to completion, translating the Ollama JSON-line stream
/// into registry updates. Cancellation is cooperative: the registry flips to
/// `cancelled` and the loop exits on the next progress line.
async fn run_pull(state: Arc<AppState>, id: String, name: String) {
    let url = format!("{}/api/pull", ollama_base());
    let response = state
        .http
        .post(&url)
        .json(&json!({ "name": name, "stream": true }))
        .send()
        .await;
    let response = match response {
        Ok(r) => r,
        Err(e) => {
            state.model_pulls.update(&id, |t| {
                t.status = "error".into();
                t.detail = Some(format!("本地 Ollama 不可达: {e}"));
            });
            return;
        }
    };
    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        state.model_pulls.update(&id, |t| {
            t.status = "error".into();
            t.detail = Some(format!("Ollama HTTP {status}: {text}"));
        });
        return;
    }

    use tokio_stream::StreamExt;
    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    while let Some(chunk) = stream.next().await {
        let chunk = match chunk {
            Ok(c) => c,
            Err(e) => {
                state.model_pulls.update(&id, |t| {
                    t.status = "error".into();
                    t.detail = Some(format!("拉取中断: {e}（Ollama 支持断点续传，重试会继续）"));
                });
                return;
            }
        };
        buffer.push_str(&String::from_utf8_lossy(&chunk));
        // The stream is newline-delimited JSON objects.
        while let Some(newline) = buffer.find('\n') {
            let line: String = buffer.drain(..=newline).collect();
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            let Ok(event) = serde_json::from_str::<Value>(line) else {
                continue;
            };
            let status = event.get("status").and_then(Value::as_str).unwrap_or("");
            if status == "success" {
                state.model_pulls.update(&id, |t| {
                    t.status = "done".into();
                    t.percent = Some(100);
                });
                return;
            }
            if let Some(error) = event.get("error").and_then(Value::as_str) {
                state.model_pulls.update(&id, |t| {
                    t.status = "error".into();
                    t.detail = Some(error.to_string());
                });
                return;
            }
            let percent = pull_percent(&event);
            // Cooperative cancel check rides the progress tick.
            let cancelled = state
                .model_pulls
                .tasks
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .get(&id)
                .map(|t| t.status == "cancelled")
                .unwrap_or(false);
            if cancelled {
                return;
            }
            state.model_pulls.update(&id, |t| {
                if t.status == "pulling" {
                    t.percent = percent;
                }
            });
        }
    }
    // Stream ended without a terminal event.
    state.model_pulls.update(&id, |t| {
        if t.status == "pulling" {
            t.status = "error".into();
            t.detail = Some("Ollama 流提前结束".into());
        }
    });
}

/// POST /api/models/pull/:id/cancel
async fn cancel_pull(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Response {
    if state.model_pulls.cancel(&id) {
        ok_data(json!({ "id": id, "status": "cancelled" })).into_response()
    } else {
        err_msg(StatusCode::NOT_FOUND, "任务不存在或已结束")
    }
}

/// GET /api/models/storage → local models with sizes (disk accounting).
async fn storage(State(state): State<Arc<AppState>>) -> Response {
    let url = format!("{}/api/tags", ollama_base());
    let response = match state.http.get(&url).send().await {
        Ok(r) => r,
        Err(e) => {
            return err_msg(
                StatusCode::SERVICE_UNAVAILABLE,
                &format!("本地 Ollama 不可达: {e}（本地模型经 Ollama 代理，见 FLOW-05 边界声明）"),
            )
        }
    };
    if !response.status().is_success() {
        return err_msg(StatusCode::BAD_GATEWAY, "Ollama 模型列表获取失败");
    }
    let payload: Value = response.json().await.unwrap_or(Value::Null);
    let mut models = Vec::new();
    let mut total: u64 = 0;
    if let Some(list) = payload.get("models").and_then(Value::as_array) {
        for model in list {
            let name = model.get("name").and_then(Value::as_str).unwrap_or("");
            let size = model.get("size").and_then(Value::as_u64).unwrap_or(0);
            total += size;
            models.push(json!({
                "name": name,
                "size_bytes": size,
                "modified_at": model.get("modified_at").cloned().unwrap_or(Value::Null),
            }));
        }
    }
    ok_data(json!({ "models": models, "total_bytes": total })).into_response()
}

/// POST /api/models/delete {name} → free the disk.
async fn delete_model(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let Some(name) = body.get("name").and_then(Value::as_str).map(str::trim) else {
        return err_msg(StatusCode::BAD_REQUEST, "field `name` is required");
    };
    let url = format!("{}/api/delete", ollama_base());
    let response = match state
        .http
        .delete(&url)
        .json(&json!({ "name": name }))
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return err_msg(
                StatusCode::SERVICE_UNAVAILABLE,
                &format!("本地 Ollama 不可达: {e}"),
            )
        }
    };
    if !response.status().is_success() {
        let status = response.status();
        return err_msg(
            StatusCode::BAD_GATEWAY,
            &format!("删除失败: Ollama HTTP {status}"),
        );
    }
    ok_data(json!({ "deleted": name })).into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pull_percent_maps_byte_progress_and_guards_zero_total() {
        assert_eq!(
            pull_percent(&json!({ "status": "pulling", "completed": 25, "total": 100 })),
            Some(25)
        );
        assert_eq!(pull_percent(&json!({ "status": "pulling" })), None);
        assert_eq!(
            pull_percent(&json!({ "status": "pulling", "completed": 5, "total": 0 })),
            None
        );
    }

    #[test]
    fn registry_updates_and_cancels() {
        let registry = PullRegistry::default();
        registry.tasks.lock().unwrap().insert(
            "p1".into(),
            PullTask {
                id: "p1".into(),
                name: "qwen3:8b".into(),
                status: "pulling".into(),
                percent: None,
                detail: None,
            },
        );
        registry.update("p1", |t| t.percent = Some(40));
        assert_eq!(registry.snapshot()[0].percent, Some(40));
        assert!(registry.cancel("p1"));
        assert_eq!(registry.snapshot()[0].status, "cancelled");
        // Cancelling twice / unknown ids is a no-op.
        assert!(!registry.cancel("p1"));
        assert!(!registry.cancel("missing"));
    }
}
