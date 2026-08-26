/**
 * Integration tests for deep research (TOOL-09): a full run against an
 * injected stub engine (chat) and the mock search provider — start returns
 * tier metadata with a token estimate, the status endpoint walks
 * planning→searching→synthesizing→done, and the report carries citations.
 */
mod common;

use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use serde_json::{json, Value};
use tower::ServiceExt;

use common::{router_with, StubEngine};
use server_core::engine_bridge::EngineCallError;

// ==================== Stub engine ====================

/// Chat engine mirroring the old mock daemon: a two-query planner reply
/// for the query-planning prompt, otherwise a cited synthesis report.
fn research_engine() -> StubEngine {
    StubEngine::with_handler(|req| {
        if req["capability"] != "chat" {
            return Err(EngineCallError::rejected(400, "unexpected capability"));
        }
        let system = req["messages"][0]["content"].as_str().unwrap_or("");
        if system.contains("搜索查询") {
            // Planner: two complementary queries.
            return Ok(json!({
                "text": "橘猫 行为习性\n橘猫 饮食健康",
                "file": Value::Null,
                "model_used": "mock/chat",
                "provider": "mock",
                "duration_ms": 10,
                "request_id": "req-plan",
                "tokens_used": 40,
                "fallback_used": false,
                "routing_reason": "capability_default",
            }));
        }
        // Synthesis: cite the sources by number.
        Ok(json!({
            "text": "# 橘猫研究报告\n\n橘猫白天睡觉晚上活动 [1]。\n\n## 参考来源\n- [1] 模拟来源",
            "file": Value::Null,
            "model_used": "mock/chat",
            "provider": "mock",
            "duration_ms": 20,
            "request_id": "req-syn",
            "tokens_used": 120,
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

async fn configure_mock_search(app: &axum::Router) {
    // The generic meta endpoints don't exist; write through the search
    // config route instead.
    let (status, _) = post_json(
        app,
        "/api/search/config",
        json!({ "provider": "mock", "api_key": "mock-key-1234" }),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "mock search config accepted");
}

// ==================== Tests ====================

#[tokio::test]
async fn full_research_run_with_mock_search() {
    let app = router_with("research-full", Arc::new(research_engine()));
    configure_mock_search(&app).await;

    let (status, started) = post_json(
        &app,
        "/api/research/start",
        json!({ "topic": "橘猫", "tier": "quick" }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let data = &started["data"];
    let research_id = data["research_id"].as_str().expect("id").to_string();
    assert_eq!(data["sources_target"], 3, "quick tier targets 3 sources");
    assert!(
        data["estimated_tokens"].as_u64().unwrap() > 0,
        "token estimate present"
    );

    // Poll to terminal.
    let mut final_status = Value::Null;
    for _ in 0..100 {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri(format!("/api/research/{research_id}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let status = body_json(response).await;
        let phase = status["data"]["phase"].as_str().unwrap_or("");
        if phase == "done" || phase == "failed" {
            final_status = status;
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(30)).await;
    }
    let data = &final_status["data"];
    assert_eq!(data["phase"], "done", "status: {final_status}");
    // The planner's two queries each ran (检索路径树).
    let queries = data["queries"].as_array().expect("query progress");
    assert_eq!(queries.len(), 2);
    assert!(queries.iter().all(|q| q["results"].as_u64().unwrap() > 0));
    // Mock search dedups to unique URLs; capped at tier target.
    assert!(data["sources"].as_u64().unwrap() <= 3);
    // The report carries citations.
    let report = data["report_md"].as_str().expect("report");
    assert!(report.contains("# 橘猫研究报告"));
    assert!(report.contains("[1]"));
}

#[tokio::test]
async fn start_validates_topic_and_tier() {
    let app = router_with("research-validate", Arc::new(research_engine()));

    let (status, _) = post_json(
        &app,
        "/api/research/start",
        json!({ "topic": "", "tier": "quick" }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let (status, _) = post_json(
        &app,
        "/api/research/start",
        json!({ "topic": "x", "tier": "extreme" }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}
