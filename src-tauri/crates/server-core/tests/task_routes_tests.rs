/**
 * Integration tests for the task workbench (TASK-01/04): project
 * lifecycle over an injected stub engine — plan, run-to-review-gate,
 * approve, resume-to-delivered, plus retry after failure.
 */
mod common;

use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use serde_json::{json, Value};
use tower::ServiceExt;

use common::{router_with, StubEngine};

// ==================== Stub engine ====================

/// Echo step-model engine that also counts invokes, replacing the mock
/// `/v1/invoke` daemon the suite previously spawned on loopback.
fn task_engine() -> (StubEngine, Arc<AtomicUsize>) {
    let calls = Arc::new(AtomicUsize::new(0));
    let sink = calls.clone();
    let engine = StubEngine::with_handler(move |req| {
        sink.fetch_add(1, Ordering::SeqCst);
        let prompt = req["messages"][0]["content"].as_str().unwrap_or("");
        Ok(json!({
            "text": format!("产物（{prompt}）"),
            "file": Value::Null,
            "model_used": "mock/chat",
            "provider": "mock",
            "duration_ms": 10,
            "request_id": "req-t",
            "tokens_used": 20,
            "fallback_used": false,
            "routing_reason": "capability_default",
        }))
    });
    (engine, calls)
}

// ==================== Helpers ====================

async fn body_json(response: axum::response::Response) -> Value {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("read body");
    serde_json::from_slice(&bytes).expect("parse json")
}

async fn post_json(app: &axum::Router, uri: &str, body: Value) -> (StatusCode, Value) {
    let (status, bytes) = common::post_json(app.clone(), uri, body).await;
    let parsed = serde_json::from_slice(&bytes).expect("parse json");
    (status, parsed)
}

// ==================== Tests ====================

#[tokio::test]
async fn project_lifecycle_plan_review_deliver() {
    let (engine, calls) = task_engine();
    let app = router_with("task-lifecycle", Arc::new(engine));

    // Create the project.
    let (status, created) = post_json(
        &app,
        "/api/task/project/create",
        json!({ "title": "产品周报", "goal": "汇总本周数据产出周报", "output_format": "word" }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let project_id = created["data"]["id"].as_str().expect("id").to_string();
    assert_eq!(created["data"]["phase"], "planning");

    // Set the plan (one review gate inside).
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

    // First run: pauses at the review gate.
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

    // Approve → resume → deliver.
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
        calls.load(Ordering::SeqCst),
        2,
        "one model call per step"
    );
}

#[tokio::test]
async fn list_and_detail_roundtrip() {
    let (engine, _calls) = task_engine();
    let app = router_with("task-list", Arc::new(engine));

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
    let (engine, _calls) = task_engine();
    let app = router_with("task-validate", Arc::new(engine));

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

    // Run without a plan.
    let (status, body) = post_json(&app, &format!("/api/task/project/{id}/run"), json!({})).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(body["msg"].as_str().unwrap().contains("计划"));

    // Empty plan.
    let (status, _) = post_json(
        &app,
        &format!("/api/task/project/{id}/plan"),
        json!({ "steps": [] }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}
