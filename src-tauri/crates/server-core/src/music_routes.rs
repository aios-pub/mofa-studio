/**
 * Async music generation tasks (TOOL-10 studio side): the engine's music
 * invoke polls the gateway for minutes, so — like video — POST returns a
 * task id immediately and GET polls; the finished mp3 arrives as a data URL
 * with the clip's title/tags label.
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

/// Span kind for the usage panel.
const KIND_MUSIC_GEN: &str = "music_gen_call";

#[derive(Debug, Clone, PartialEq)]
enum TaskPhase {
    Running,
    Succeeded,
    Failed,
}

#[derive(Debug, Clone)]
struct MusicTask {
    phase: TaskPhase,
    prompt: String,
    model: Option<String>,
    error: Option<String>,
    /// Clip label (title · tags) reported by the engine.
    label: Option<String>,
    /// data URL of the finished mp3.
    audio: Option<String>,
    created_at: String,
}

#[derive(Default)]
pub(crate) struct MusicTaskRegistry {
    tasks: Mutex<HashMap<String, MusicTask>>,
}

pub(crate) fn music_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/v1/music/generations", post(submit))
        .route("/v1/music/generations/{task_id}", get(status))
}

/// POST /v1/music/generations {prompt, lyrics?, style?, title?,
/// instrumental?, model?} — 风格/时长/情绪 ride the prompt or style field.
async fn submit(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let prompt = match body.get("prompt").and_then(Value::as_str) {
        Some(p) if !p.trim().is_empty() => p.trim().to_string(),
        _ => {
            return error_response(StatusCode::BAD_REQUEST, "field `prompt` is required");
        }
    };

    let mut engine_req = json!({
        "capability": "music_gen",
        "messages": [{ "role": "user", "content": prompt }],
        "params": {},
    });
    if let Some(model) = body.get("model").and_then(Value::as_str) {
        engine_req["model"] = json!(model);
    }
    for key in ["lyrics", "style", "title"] {
        if let Some(value) = body.get(key).and_then(Value::as_str) {
            if !value.trim().is_empty() {
                engine_req["params"][key] = json!(value);
            }
        }
    }
    if let Some(instrumental) = body.get("instrumental").and_then(Value::as_bool) {
        engine_req["params"]["instrumental"] = json!(instrumental);
    }

    let task_id = format!("mt-{}", uuid::Uuid::new_v4());
    state.music_tasks.tasks.lock().await.insert(
        task_id.clone(),
        MusicTask {
            phase: TaskPhase::Running,
            prompt: prompt.clone(),
            model: body
                .get("model")
                .and_then(Value::as_str)
                .map(str::to_string),
            error: None,
            label: None,
            audio: None,
            created_at: chrono::Utc::now()
                .format("%Y-%m-%dT%H:%M:%S%.3fZ")
                .to_string(),
        },
    );

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
        let (phase, audio, label, error) = match result {
            Ok(resp) if resp.status().is_success() => match resp.json::<Value>().await {
                Ok(payload) => {
                    let file = payload.get("file").and_then(Value::as_str).unwrap_or("");
                    if file.is_empty() {
                        (
                            TaskPhase::Failed,
                            None,
                            None,
                            Some("engine returned no audio file".to_string()),
                        )
                    } else {
                        match tokio::fs::read(file).await {
                            Ok(bytes) => {
                                use base64::Engine as _;
                                let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
                                let label = payload
                                    .get("text")
                                    .and_then(Value::as_str)
                                    .map(str::to_string);
                                (
                                    TaskPhase::Succeeded,
                                    Some(format!("data:audio/mpeg;base64,{b64}")),
                                    label,
                                    None,
                                )
                            }
                            Err(e) => (
                                TaskPhase::Failed,
                                None,
                                None,
                                Some(format!("audio artifact not readable ({file}: {e})")),
                            ),
                        }
                    }
                }
                Err(e) => (
                    TaskPhase::Failed,
                    None,
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
                    None,
                    Some(format!("engine HTTP {status}: {text}")),
                )
            }
            Err(e) => (
                TaskPhase::Failed,
                None,
                None,
                Some(format!("engine unreachable: {e}")),
            ),
        };
        spans::record_span(
            &task_state.store,
            KIND_MUSIC_GEN,
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
            None,
        );
        if let Some(task) = task_state.music_tasks.tasks.lock().await.get_mut(&task_key) {
            task.phase = phase;
            task.audio = audio;
            task.label = label;
            task.error = error;
        }
    });

    Json(json!({ "task_id": task_id, "status": "running" })).into_response()
}

/// GET /v1/music/generations/{task_id}
async fn status(State(state): State<Arc<AppState>>, Path(task_id): Path<String>) -> Response {
    let tasks = state.music_tasks.tasks.lock().await;
    match tasks.get(&task_id) {
        Some(task) => Json(json!({
            "task_id": task_id,
            "status": phase_str(&task.phase),
            "prompt": task.prompt,
            "model": task.model,
            "label": task.label,
            "audio": task.audio,
            "error": task.error,
            "created_at": task.created_at,
        }))
        .into_response(),
        None => error_response(StatusCode::NOT_FOUND, "unknown music task"),
    }
}

fn phase_str(phase: &TaskPhase) -> &'static str {
    match phase {
        TaskPhase::Running => "running",
        TaskPhase::Succeeded => "succeeded",
        TaskPhase::Failed => "failed",
    }
}

fn error_response(status: StatusCode, message: &str) -> Response {
    (
        status,
        Json(json!({ "error": { "message": message, "type": "music_task" }, "msg": message })),
    )
        .into_response()
}
