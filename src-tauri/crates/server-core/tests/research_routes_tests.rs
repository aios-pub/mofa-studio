/**
 * Integration tests for deep research (TOOL-09): a full run against a
 * mock engine (chat) and the mock search provider — start returns tier
 * metadata with a token estimate, the status endpoint walks
 * planning→searching→synthesizing→done, and the report carries citations.
 */

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{Json, Router};
use serde_json::{json, Value};
use tower::ServiceExt;

use server_core::ServerConfig;

// ==================== Mock engine ====================

async fn mock_invoke(Json(req): Json<Value>) -> Response {
    if req["capability"] != "chat" {
        return (StatusCode::BAD_REQUEST, "unexpected capability").into_response();
    }
    let system = req["messages"][0]["content"].as_str().unwrap_or("");
    if system.contains("搜索查询") {
        // Planner: two complementary queries.
        return Json(json!({
            "text": "橘猫 行为习性\n橘猫 饮食健康",
            "file": Value::Null,
            "model_used": "mock/chat",
            "provider": "mock",
            "duration_ms": 10,
            "request_id": "req-plan",
            "tokens_used": 40,
            "fallback_used": false,
            "routing_reason": "capability_default",
        }))
        .into_response();
    }
    // Synthesis: cite the sources by number.
    Json(json!({
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
    let data_dir = std::env::temp_dir().join(format!("mofa-research-test-{tag}"));
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

async fn configure_mock_search(app: &Router) {
    // The generic meta endpoints don't exist; write through the search
    // config route instead.
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/search/config")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({ "provider": "mock", "api_key": "mock-key-1234" }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK, "mock search config accepted");
}

#[tokio::test]
async fn full_research_run_with_mock_search() {
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "full");
    configure_mock_search(&app).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/research/start")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({ "topic": "橘猫", "tier": "quick" }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let started = body_json(response).await;
    let data = &started["data"];
    let research_id = data["research_id"].as_str().expect("id").to_string();
    assert_eq!(data["sources_target"], 3, "quick tier targets 3 sources");
    assert!(data["estimated_tokens"].as_u64().unwrap() > 0, "token estimate present");

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
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "validate");

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/research/start")
                .header("content-type", "application/json")
                .body(Body::from(json!({ "topic": "", "tier": "quick" }).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/research/start")
                .header("content-type", "application/json")
                .body(Body::from(json!({ "topic": "x", "tier": "extreme" }).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}
