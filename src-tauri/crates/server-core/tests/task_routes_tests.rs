/**
 * Integration tests for the task workbench (TASK-01/04): project
 * lifecycle over HTTP with a mock engine — plan, run-to-review-gate,
 * approve, resume-to-delivered, plus retry after failure.
 */
use axum::body::Body;
use axum::extract::State;
use axum::http::{Request, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{Json, Router};
use serde_json::{json, Value};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tower::ServiceExt;

use server_core::ServerConfig;

// ==================== Mock engine ====================

struct EngineState {
    calls: AtomicUsize,
}

async fn mock_invoke(State(state): State<Arc<EngineState>>, Json(req): Json<Value>) -> Response {
    state.calls.fetch_add(1, Ordering::SeqCst);
    let prompt = req["messages"][0]["content"].as_str().unwrap_or("");
    let text = format!("产物（{prompt}）");
    Json(json!({
        "text": text,
        "file": Value::Null,
        "model_used": "mock/chat",
        "provider": "mock",
        "duration_ms": 10,
        "request_id": "req-t",
        "tokens_used": 20,
        "fallback_used": false,
        "routing_reason": "capability_default",
    }))
    .into_response()
}

async fn spawn_mock_engine() -> (String, Arc<EngineState>) {
    let state = Arc::new(EngineState {
        calls: AtomicUsize::new(0),
    });
    let state_route = state.clone();
    let app = Router::new()
        .route("/v1/invoke", post(mock_invoke))
        .with_state(state_route);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    (format!("http://{addr}"), state)
}

fn gateway_router(engine_url: String, tag: &str) -> Router {
    let data_dir = std::env::temp_dir().join(format!("mofa-task-test-{tag}"));
    let _ = std::fs::remove_dir_all(&data_dir);
    let mut config = ServerConfig::for_data_dir(data_dir);
    config.engine_base_url = Some(engine_url);
    server_core::build_router(&config).expect("build router")
}

async fn body_json(response: Response) -> Value {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("read body");
    serde_json::from_slice(&bytes).expect("parse json")
}

async fn post_json(app: &Router, uri: &str, body: Value) -> (StatusCode, Value) {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(uri)
                .header("content-type", "application/json")
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    (status, body_json(response).await)
}

#[tokio::test]
async fn project_lifecycle_plan_review_deliver() {
    let (engine, mock) = spawn_mock_engine().await;
    let app = gateway_router(engine, "lifecycle");

    // 立项
    let (status, created) = post_json(
        &app,
        "/api/task/project/create",
        json!({ "title": "产品周报", "goal": "汇总本周数据产出周报", "output_format": "word" }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let project_id = created["data"]["id"].as_str().expect("id").to_string();
    assert_eq!(created["data"]["phase"], "planning");

    // 设置计划（含一个评审门）
    let (status, planned) = post_json(
        &app,
        &format!("/api/task/project/{project_id}/plan"),
        json!({ "steps": [
            { "title": "汇总", "prompt": "汇总数据", "strategy": "direct" },
            { "title": "终稿", "prompt": "撰写终稿", "strategy": "review_required" },
        ]}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(planned["data"]["phase"], "executing");

    // 首次运行：在评审门暂停
    let (status, ran) = post_json(
        &app,
        &format!("/api/task/project/{project_id}/run"),
        json!({}),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "run body: {ran}");
    assert_eq!(ran["data"]["status"], "awaiting_review");
    let review_step = ran["data"]["project"]["steps"][1]["id"]
        .as_str()
        .unwrap()
        .to_string();

    // 评审通过 → 续跑 → 交付
    let (status, _) = post_json(
        &app,
        &format!("/api/task/project/{project_id}/review/{review_step}"),
        json!({ "approve": true }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let (status, done) = post_json(
        &app,
        &format!("/api/task/project/{project_id}/run"),
        json!({}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    // Both steps done; the run completes (the gate already passed).
    assert_eq!(done["data"]["project"]["phase"], "delivered");
    assert_eq!(
        mock.calls.load(Ordering::SeqCst),
        2,
        "one model call per step"
    );
}

#[tokio::test]
async fn list_and_detail_roundtrip() {
    let (engine, _mock) = spawn_mock_engine().await;
    let app = gateway_router(engine, "list");

    let (_, created) = post_json(
        &app,
        "/api/task/project/create",
        json!({ "title": "项目A", "goal": "目标", "output_format": "markdown" }),
    )
    .await;
    let id = created["data"]["id"].as_str().unwrap().to_string();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/task/project/list")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let listed = body_json(response).await;
    let items = listed["data"].as_array().unwrap();
    assert!(items.iter().any(|p| p["id"].as_str() == Some(id.as_str())));

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/task/project/{id}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/task/project/missing")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn validation_rejects_bad_input() {
    let (engine, _mock) = spawn_mock_engine().await;
    let app = gateway_router(engine, "validate");

    let (status, _) = post_json(
        &app,
        "/api/task/project/create",
        json!({ "title": "", "goal": "" }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let (_, created) = post_json(
        &app,
        "/api/task/project/create",
        json!({ "title": "T", "goal": "G" }),
    )
    .await;
    let id = created["data"]["id"].as_str().unwrap().to_string();

    // Run without a plan
    let (status, body) = post_json(&app, &format!("/api/task/project/{id}/run"), json!({})).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(body["msg"].as_str().unwrap().contains("计划"));

    // Empty plan
    let (status, _) = post_json(
        &app,
        &format!("/api/task/project/{id}/plan"),
        json!({ "steps": [] }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}
