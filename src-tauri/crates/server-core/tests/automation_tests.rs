/**
 * Integration tests for the automation executor (TASK-05): a cron-bound
 * SOP fires on a matching tick, runs unattended through review gates,
 * and lands in the execution history.
 */
mod common;

use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use serde_json::{json, Value};
use tower::ServiceExt;

use common::{router_with, StubEngine};

// ==================== Stub engine ====================

/// Echo step-model engine replacing the mock `/v1/invoke` daemon the
/// suite previously spawned on loopback.
fn auto_engine() -> StubEngine {
    StubEngine::with_handler(|req| {
        let prompt = req["messages"][0]["content"].as_str().unwrap_or("");
        Ok(json!({
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
    })
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
async fn matching_cron_fires_unattended_run_with_history() {
    let app = router_with("auto-fire", Arc::new(auto_engine()));

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
    let app = router_with("auto-manual", Arc::new(auto_engine()));

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
