/**
 * Task workbench routes (M3 TASK-01/02/04): project CRUD persisted through
 * the generic store, plan editing, run/resume driving agent-runtime with
 * the engine chat as the step model, and review approve/reject.
 */
use std::sync::Arc;

use agent_runtime::{approve, reject, run_project, Project, StepModel, StepStatus};
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::Response;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::{json, Value};

use crate::{err_msg, ok_data, AppState};

async fn load_project(state: &AppState, id: &str) -> Option<Project> {
    let raw = state.store.get("project", id)?;
    serde_json::from_value(raw).ok()
}

async fn save_project(state: &AppState, project: &Project) {
    let value = serde_json::to_value(project).unwrap_or(Value::Null);
    // insert on first save, update afterwards (insert would hit the PK).
    if state
        .store
        .insert("project", &project.id, value.clone())
        .is_err()
    {
        let _ = state.store.update("project", &project.id, &value);
    }
}

/// The engine chat adapter for step execution.
struct EngineStepModel {
    http: reqwest::Client,
    base_url: String,
    model: Option<String>,
}

#[async_trait::async_trait]
impl StepModel for EngineStepModel {
    async fn execute(&self, prompt: &str, _step: &agent_runtime::Step) -> Result<String, String> {
        let mut body = json!({
            "capability": "chat",
            "messages": [{ "role": "user", "content": prompt }],
            "params": {},
        });
        if let Some(model) = &self.model {
            body["model"] = json!(model);
        }
        let resp = self
            .http
            .post(format!("{}/v1/invoke", self.base_url))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("引擎不可达: {e}"))?;
        if !resp.status().is_success() {
            return Err(format!("引擎 HTTP {}", resp.status()));
        }
        let payload: Value = resp
            .json()
            .await
            .map_err(|e| format!("响应解析失败: {e}"))?;
        Ok(payload
            .get("text")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string())
    }
}

// ==================== Handlers ====================

/// POST /api/task/project/create {title, goal, output_format}
async fn create(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let title = body.get("title").and_then(Value::as_str).unwrap_or("");
    let goal = body.get("goal").and_then(Value::as_str).unwrap_or("");
    if title.trim().is_empty() || goal.trim().is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "title 与 goal 均为必填");
    }
    let output_format = body
        .get("output_format")
        .and_then(Value::as_str)
        .unwrap_or("markdown")
        .to_string();
    let project = Project::new(title.trim(), goal.trim(), output_format);
    save_project(&state, &project).await;
    ok_data(serde_json::to_value(&project).unwrap_or(Value::Null))
}

/// GET /api/task/project/list
async fn list(State(state): State<Arc<AppState>>) -> Response {
    let projects: Vec<Value> = state
        .store
        .list("project")
        .into_iter()
        .map(|doc| {
            // Enrich with a progress summary the workbench renders directly.
            let phase = doc
                .get("phase")
                .and_then(Value::as_str)
                .unwrap_or("planning");
            json!({
                "id": doc.get("id").cloned().unwrap_or(Value::Null),
                "title": doc.get("title").cloned().unwrap_or(Value::Null),
                "goal": doc.get("goal").cloned().unwrap_or(Value::Null),
                "output_format": doc.get("output_format").cloned().unwrap_or(Value::Null),
                "phase": phase,
                "updated_at": doc.get("updated_at").cloned().unwrap_or(Value::Null),
            })
        })
        .collect();
    ok_data(projects)
}

/// GET /api/task/project/{id}
async fn detail(State(state): State<Arc<AppState>>, Path(id): Path<String>) -> Response {
    match load_project(&state, &id).await {
        Some(project) => ok_data(serde_json::to_value(&project).unwrap_or(Value::Null)),
        None => err_msg(StatusCode::NOT_FOUND, "项目不存在"),
    }
}

/// POST /api/task/project/{id}/plan {steps: [{title, prompt, strategy}]}
async fn set_plan(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Response {
    let mut project = match load_project(&state, &id).await {
        Some(p) => p,
        None => return err_msg(StatusCode::NOT_FOUND, "项目不存在"),
    };
    let Some(raw_steps) = body.get("steps").and_then(Value::as_array) else {
        return err_msg(StatusCode::BAD_REQUEST, "steps 必填");
    };
    let steps: Vec<agent_runtime::Step> = raw_steps
        .iter()
        .filter_map(|raw| {
            let title = raw.get("title").and_then(Value::as_str)?;
            let prompt = raw.get("prompt").and_then(Value::as_str)?;
            let strategy = match raw.get("strategy").and_then(Value::as_str) {
                Some("review_required") => agent_runtime::StepStrategy::ReviewRequired,
                Some("expert") => agent_runtime::StepStrategy::Expert,
                _ => agent_runtime::StepStrategy::Direct,
            };
            Some(agent_runtime::step(title, prompt, strategy))
        })
        .collect();
    if steps.is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "至少需要一个步骤");
    }
    project.set_plan(steps);
    save_project(&state, &project).await;
    ok_data(serde_json::to_value(&project).unwrap_or(Value::Null))
}

/// POST /api/task/project/{id}/run — drive pending steps; pauses at review
/// gates and returns the current state either way (断点续跑 = call again).
async fn run(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Response {
    let mut project = match load_project(&state, &id).await {
        Some(p) => p,
        None => return err_msg(StatusCode::NOT_FOUND, "项目不存在"),
    };
    if project.steps.is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "项目还没有计划，先设置步骤");
    }
    let model_override = body
        .get("model")
        .and_then(Value::as_str)
        .map(str::to_string);
    let executor_model = EngineStepModel {
        http: state.http.clone(),
        base_url: state.engine_base_url.clone(),
        model: model_override,
    };
    let outcome = run_project(&mut project, &executor_model).await;
    save_project(&state, &project).await;
    let payload = serde_json::to_value(&project).unwrap_or(Value::Null);
    match outcome {
        Ok(()) => ok_data(json!({ "status": "completed", "project": payload })),
        Err(err) if err.is_review_pause() => {
            ok_data(json!({ "status": "awaiting_review", "project": payload }))
        }
        Err(err) => {
            ok_data(json!({ "status": "failed", "error": err.to_string(), "project": payload }))
        }
    }
}

/// POST /api/task/project/{id}/review/{step_id} {approve: bool}
async fn review(
    State(state): State<Arc<AppState>>,
    Path((id, step_id)): Path<(String, String)>,
    Json(body): Json<Value>,
) -> Response {
    let mut project = match load_project(&state, &id).await {
        Some(p) => p,
        None => return err_msg(StatusCode::NOT_FOUND, "项目不存在"),
    };
    let approved = body.get("approve").and_then(Value::as_bool).unwrap_or(true);
    let result = if approved {
        approve(&mut project, &step_id)
    } else {
        reject(&mut project, &step_id)
    };
    match result {
        Ok(()) => {
            save_project(&state, &project).await;
            ok_data(serde_json::to_value(&project).unwrap_or(Value::Null))
        }
        Err(e) => err_msg(StatusCode::BAD_REQUEST, &e),
    }
}

/// POST /api/task/project/{id}/retry/{step_id} — re-open a failed step.
async fn retry(
    State(state): State<Arc<AppState>>,
    Path((id, step_id)): Path<(String, String)>,
) -> Response {
    let mut project = match load_project(&state, &id).await {
        Some(p) => p,
        None => return err_msg(StatusCode::NOT_FOUND, "项目不存在"),
    };
    let Some(step) = project.steps.iter().find(|s| s.id == step_id) else {
        return err_msg(StatusCode::NOT_FOUND, "步骤不存在");
    };
    if step.status != StepStatus::Failed {
        return err_msg(StatusCode::BAD_REQUEST, "只能重试失败的步骤");
    }
    // Failed → Pending is modeled by transitioning through the runnable
    // re-entry: agent-runtime treats Pending/Rework as runnable, so we
    // reset to Rework (legal pause-state semantics).
    let ok = project
        .transition_step(&step_id, StepStatus::Rework, None, None)
        .is_ok()
        || {
            // Direct reset for the failed state (runtime permits retry).
            let idx = project.steps.iter().position(|s| s.id == step_id);
            if let Some(idx) = idx {
                project.steps[idx].status = StepStatus::Pending;
                true
            } else {
                false
            }
        };
    if !ok {
        return err_msg(StatusCode::BAD_REQUEST, "重试失败");
    }
    save_project(&state, &project).await;
    ok_data(serde_json::to_value(&project).unwrap_or(Value::Null))
}

pub(crate) fn task_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/task/project/create", post(create))
        .route("/api/task/project/list", get(list))
        .route("/api/task/project/{id}", get(detail))
        .route("/api/task/project/{id}/plan", post(set_plan))
        .route("/api/task/project/{id}/run", post(run))
        .route("/api/task/project/{id}/review/{step_id}", post(review))
        .route("/api/task/project/{id}/retry/{step_id}", post(retry))
}
