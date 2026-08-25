/**
 * Integration tests for FLOW-05's local track: the model center proxies
 * pulls, storage accounting, and deletion through a mock Ollama (real
 * socket, /api/pull JSON-line stream, /api/tags, /api/delete).
 *
 * The flows share one test because `OLLAMA_URL` is process-global and the
 * default test runner executes in parallel.
 */
use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::{json, Value};
use tower::ServiceExt;

use server_core::ServerConfig;

/// OLLAMA_URL is process-global and tests run in parallel: serialize the
/// tests that touch it.
static ENV_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

async fn mock_ollama() -> String {
    let app = Router::new()
        .route(
            "/api/pull",
            post(|| async {
                // Two progress lines then success — the ollama wire shape.
                let body = concat!(
                    "{\"status\":\"pulling manifest\"}\n",
                    "{\"status\":\"downloading sha256:abc\",\"completed\":40,\"total\":100}\n",
                    "{\"status\":\"downloading sha256:abc\",\"completed\":90,\"total\":100}\n",
                    "{\"status\":\"success\"}\n",
                );
                (
                    [(axum::http::header::CONTENT_TYPE, "application/x-ndjson")],
                    body,
                )
            }),
        )
        .route(
            "/api/tags",
            get(|| async {
                Json(json!({
                    "models": [
                        { "name": "qwen3:8b", "size": 4_900_000_000u64, "modified_at": "2026-08-01T00:00:00Z" },
                        { "name": "llama3:70b", "size": 40_000_000_000u64, "modified_at": "2026-07-01T00:00:00Z" }
                    ]
                }))
            }),
        )
        .route(
            "/api/delete",
            axum::routing::delete(|Json(body): Json<Value>| async move {
                assert_eq!(body["name"], "llama3:70b");
                StatusCode::OK.into_response()
            }),
        );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    format!("http://{addr}")
}

fn router(tag: &str) -> Router {
    let data_dir = std::env::temp_dir().join(format!("mofa-model-center-{tag}"));
    let _ = std::fs::remove_dir_all(&data_dir);
    let mut config = ServerConfig::for_data_dir(data_dir);
    config.engine_base_url = Some("http://127.0.0.1:9".into());
    server_core::build_router(&config).expect("build router")
}

async fn body_json(response: Response) -> Value {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("read body");
    serde_json::from_slice(&bytes).expect("parse json")
}

#[tokio::test]
async fn local_model_lifecycle_pull_storage_delete() {
    let _guard = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let ollama = mock_ollama().await;
    // Scoped env override — safe because this is the only test in the binary.
    std::env::set_var("OLLAMA_URL", &ollama);
    let app = router("lifecycle");

    // 1) Storage accounting sums model sizes.
    let storage = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/models/storage")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(storage.status(), StatusCode::OK);
    let storage = body_json(storage).await;
    let models = storage["data"]["models"].as_array().unwrap();
    assert_eq!(models.len(), 2);
    assert_eq!(models[0]["name"], "qwen3:8b");
    assert_eq!(
        storage["data"]["total_bytes"].as_u64(),
        Some(44_900_000_000)
    );

    // 2) A pull tracks progress from the stream and lands on done.
    let start = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/models/pulls")
                .header("content-type", "application/json")
                .body(Body::from(json!({ "name": "qwen3:8b" }).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(start.status(), StatusCode::OK);
    let start = body_json(start).await;
    let pull_id = start["data"]["id"].as_str().unwrap().to_string();

    // Poll until the mock's stream completes.
    let mut done = false;
    for _ in 0..50 {
        let list = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri("/api/models/pulls")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        let list = body_json(list).await;
        let pulls = list["data"].as_array().cloned().unwrap_or_default();
        if let Some(task) = pulls.iter().find(|t| t["id"] == pull_id.as_str()) {
            if task["status"] == "done" {
                assert_eq!(task["percent"], 100);
                done = true;
                break;
            }
        }
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }
    assert!(done, "pull must reach done through the progress stream");

    // 3) Deleting frees the model via Ollama.
    let deleted = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/models/delete")
                .header("content-type", "application/json")
                .body(Body::from(json!({ "name": "llama3:70b" }).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(deleted.status(), StatusCode::OK);

    // 4) Unknown pulls cancel honestly (404, no silent success).
    let cancel = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/models/pull/nope/cancel")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(cancel.status(), StatusCode::NOT_FOUND);
    std::env::remove_var("OLLAMA_URL");
}

#[tokio::test]
async fn pull_rejects_missing_name() {
    // No OLLAMA_URL needed: validation fails before any socket.
    let app = router("validate");
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/models/pulls")
                .header("content-type", "application/json")
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn storage_reports_unreachable_ollama_honestly() {
    let _guard = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    // Point at a dead port; the honest 503 names the proxy boundary.
    std::env::set_var("OLLAMA_URL", "http://127.0.0.1:9");
    let app = router("unreachable");
    let response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/models/storage")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    let body = body_json(response).await;
    assert!(body["msg"].as_str().unwrap_or("").contains("Ollama"));
    std::env::remove_var("OLLAMA_URL");
}
