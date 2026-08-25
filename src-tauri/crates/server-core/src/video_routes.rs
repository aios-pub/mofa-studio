/**
 * Async video generation tasks (TOOL-02 studio side): the engine's video
 * invoke polls the vendor for minutes, so the gateway exposes a task API —
 * POST returns a task id immediately, GET polls the state, and the video
 * arrives base64-encoded when done.
 */
use std::collections::HashMap;
use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::{json, Value};
use tokio::sync::Mutex;

use crate::{spans, AppState};

#[derive(Debug, Clone, PartialEq)]
#[allow(dead_code)] // Queued is part of the wire contract for future queuing
enum TaskPhase {
    Queued,
    Running,
    Succeeded,
    Failed,
}

#[derive(Debug, Clone)]
struct VideoTask {
    phase: TaskPhase,
    prompt: String,
    model: Option<String>,
    error: Option<String>,
    /// data URL of the finished video.
    video: Option<String>,
    created_at: String,
}

/// In-memory task registry (per server lifetime; tasks are ephemeral).
#[derive(Default)]
pub(crate) struct VideoTaskRegistry {
    tasks: Mutex<HashMap<String, VideoTask>>,
}

pub(crate) fn video_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/v1/videos/generations", post(submit))
        .route("/v1/videos/generations/{task_id}", get(status))
}

/// POST /v1/videos/generations {prompt, model?, size?, duration?}
async fn submit(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let prompt = match body.get("prompt").and_then(Value::as_str) {
        Some(p) if !p.trim().is_empty() => p.trim().to_string(),
        _ => {
            return error_response(StatusCode::BAD_REQUEST, "field `prompt` is required");
        }
    };

    let mut engine_req = json!({
        "capability": "video_gen",
        "messages": [{ "role": "user", "content": prompt }],
        "params": {},
    });
    if let Some(model) = body.get("model").and_then(Value::as_str) {
        engine_req["model"] = json!(model);
    }
    if let Some(size) = body.get("size").and_then(Value::as_str) {
        engine_req["params"]["size"] = json!(size);
    }
    if let Some(duration) = body.get("duration").and_then(Value::as_u64) {
        engine_req["params"]["duration"] = json!(duration);
    }

    let task_id = format!("vt-{}", uuid::Uuid::new_v4());
    state.video_tasks.tasks.lock().await.insert(
        task_id.clone(),
        VideoTask {
            phase: TaskPhase::Running,
            prompt: prompt.clone(),
            model: body
                .get("model")
                .and_then(Value::as_str)
                .map(str::to_string),
            error: None,
            video: None,
            created_at: chrono::Utc::now()
                .format("%Y-%m-%dT%H:%M:%S%.3fZ")
                .to_string(),
        },
    );

    // Drive the engine call in the background; the task card polls status.
    let task_state = state.clone();
    let task_key = task_id.clone();
    let request_model = engine_req
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or("auto")
        .to_string();
    tokio::spawn(async move {
        let url = format!("{}/v1/invoke", task_state.engine_base_url);
        let started = std::time::Instant::now();
        let result = task_state.http.post(&url).json(&engine_req).send().await;
        let (phase, video, error) = match result {
            Ok(resp) if resp.status().is_success() => match resp.json::<Value>().await {
                Ok(payload) => {
                    let file = payload.get("file").and_then(Value::as_str).unwrap_or("");
                    if file.is_empty() {
                        (
                            TaskPhase::Failed,
                            None,
                            Some("engine returned no video file".to_string()),
                        )
                    } else {
                        match tokio::fs::read(file).await {
                            Ok(bytes) => {
                                use base64::Engine as _;
                                let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
                                (
                                    TaskPhase::Succeeded,
                                    Some(format!("data:video/mp4;base64,{b64}")),
                                    None,
                                )
                            }
                            Err(e) => (
                                TaskPhase::Failed,
                                None,
                                Some(format!("video artifact not readable ({file}: {e})")),
                            ),
                        }
                    }
                }
                Err(e) => (
                    TaskPhase::Failed,
                    None,
                    Some(format!("invalid engine response: {e}")),
                ),
            },
            Ok(resp) => {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();
                (
                    TaskPhase::Failed,
                    None,
                    Some(format!("engine HTTP {status}: {text}")),
                )
            }
            Err(e) => (
                TaskPhase::Failed,
                None,
                Some(format!("engine unreachable: {e}")),
            ),
        };
        spans::record_span(
            &task_state.store,
            spans::KIND_IMAGE_GEN,
            spans::SOURCE_STUDIO,
            &request_model,
            None,
            None,
            None,
            started.elapsed().as_millis() as u64,
            if phase == TaskPhase::Succeeded {
                "ok"
            } else {
                "error"
            },
            error.as_deref(),
        );
        if let Some(task) = task_state.video_tasks.tasks.lock().await.get_mut(&task_key) {
            task.phase = phase;
            task.video = video;
            task.error = error;
        }
    });

    Json(json!({ "task_id": task_id, "status": "running" })).into_response()
}

/// GET /v1/videos/generations/{task_id}
async fn status(State(state): State<Arc<AppState>>, Path(task_id): Path<String>) -> Response {
    let tasks = state.video_tasks.tasks.lock().await;
    match tasks.get(&task_id) {
        Some(task) => Json(json!({
            "task_id": task_id,
            "status": phase_str(&task.phase),
            "prompt": task.prompt,
            "model": task.model,
            "video": task.video,
            "error": task.error,
            "created_at": task.created_at,
        }))
        .into_response(),
        None => error_response(StatusCode::NOT_FOUND, "unknown video task"),
    }
}

fn phase_str(phase: &TaskPhase) -> &'static str {
    match phase {
        TaskPhase::Queued => "queued",
        TaskPhase::Running => "running",
        TaskPhase::Succeeded => "succeeded",
        TaskPhase::Failed => "failed",
    }
}

fn error_response(status: StatusCode, message: &str) -> Response {
    (
        status,
        Json(json!({ "error": { "message": message, "type": "video_task" }, "msg": message })),
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn phase_strings_match_the_wire_contract() {
        assert_eq!(phase_str(&TaskPhase::Queued), "queued");
        assert_eq!(phase_str(&TaskPhase::Running), "running");
        assert_eq!(phase_str(&TaskPhase::Succeeded), "succeeded");
        assert_eq!(phase_str(&TaskPhase::Failed), "failed");
    }
}
