/**
 * Integration tests for the automation executor (TASK-05): a cron-bound
 * SOP fires on a matching tick, runs unattended through review gates,
 * and lands in the execution history.
 */
use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{Json, Router};
use serde_json::{json, Value};
use tower::ServiceExt;

use server_core::ServerConfig;

async fn mock_invoke(Json(req): Json<Value>) -> Response {
    let prompt = req["messages"][0]["content"].as_str().unwrap_or("");
    Json(json!({
        "text": format!("自动产物（{prompt}）"),
        "file": Value::Null,
        "model_used": "mock/chat",
        "provider": "mock",
        "duration_ms": 5,
        "request_id": "req-auto",
        "tokens_used": 10,
        "fallback_used": false,
        "routing_reason": "capability_default",
    }))
    .into_response()
}

async fn spawn_mock_engine() -> String {
    let app = Router::new().route("/v1/invoke", post(mock_invoke));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    format!("http://{addr}")
}

fn gateway_router(engine_url: String, tag: &str) -> Router {
    let data_dir = std::env::temp_dir().join(format!("mofa-auto-test-{tag}"));
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
async fn matching_cron_fires_unattended_run_with_history() {
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "fire");

    // Create a cron-bound SOP with a gated step.
    let (_, created) = post_json(
        &app,
        "/api/sop/create",
        json!({ "name": "晨报", "steps": [
            { "title": "汇总", "prompt": "汇总昨夜数据", "strategy": "direct" },
            { "title": "定稿", "prompt": "定稿", "strategy": "review_required" },
        ]}),
    )
    .await;
    let sop_id = created["data"]["id"].as_str().unwrap().to_string();
    let (_, _) = post_json(
        &app,
        &format!("/api/sop/{sop_id}/trigger"),
        json!({ "kind": "cron", "cron": "30 8 * * *" }),
    )
    .await;

    // Tick at a matching minute: 08:30.
    let (status, ticked) = post_json(
        &app,
        "/api/automation/tick",
        json!({ "now": "2026-08-25T08:30:00Z" }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(ticked["data"]["checked"], 1);
    assert_eq!(ticked["data"]["fired"], 1);
    let records = ticked["data"]["records"].as_array().unwrap();
    assert_eq!(records.len(), 1);
    assert_eq!(records[0]["ok"], true, "gates auto-approved to delivery");

    // Non-matching minute fires nothing.
    let (_, idle) = post_json(
        &app,
        "/api/automation/tick",
        json!({ "now": "2026-08-25T09:30:00Z" }),
    )
    .await;
    assert_eq!(idle["data"]["fired"], 0);

    // History lists the run.
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/automation/runs")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let history = body_json(response).await;
    assert_eq!(history["data"].as_array().unwrap().len(), 1);
}

#[tokio::test]
async fn manual_sops_never_fire_on_ticks() {
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "manual");

    let (_, created) = post_json(
        &app,
        "/api/sop/create",
        json!({ "name": "手动", "steps": [{ "title": "t", "prompt": "p", "strategy": "direct" }] }),
    )
    .await;
    let sop_id = created["data"]["id"].as_str().unwrap().to_string();
    post_json(
        &app,
        &format!("/api/sop/{sop_id}/trigger"),
        json!({ "kind": "manual" }),
    )
    .await;

    let (_, ticked) = post_json(
        &app,
        "/api/automation/tick",
        json!({ "now": "2026-08-25T08:30:00Z" }),
    )
    .await;
    assert_eq!(ticked["data"]["fired"], 0);
}
