/**
 * Integration tests for TOOL-10's gateway music tasks: submit → background
 * engine invoke → poll to a base64 mp3 data URL with the clip label, plus
 * honest failure and validation paths. A mock engine (real socket)
 * reproduces the engine's music_gen contract.
 */
use axum::body::Body;
use axum::extract::Json;
use axum::http::{Request, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::Router;
use serde_json::{json, Value};
use tower::ServiceExt;

use server_core::ServerConfig;

/// Captured engine request for wire assertions.
static CAPTURED: std::sync::Mutex<Vec<Value>> = std::sync::Mutex::new(Vec::new());

async fn mock_invoke(Json(req): Json<Value>) -> Response {
    if req["capability"] == "music_gen" {
        CAPTURED
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .push(req.clone());
        // Write an mp3 artifact like the real engine and label it.
        let dir = std::env::temp_dir().join("mofa-music-gw-test");
        let _ = std::fs::create_dir_all(&dir);
        let path = dir.join(format!("mofa_music_{}.mp3", uuid::Uuid::new_v4()));
        std::fs::write(&path, b"ID3-mock-mp3").expect("write artifact");
        return axum::Json(json!({
            "text": "晨跑 · pop, upbeat",
            "file": path.to_string_lossy(),
            "model_used": "mock/suno-v4",
            "provider": "mock",
            "duration_ms": 42,
            "request_id": "req-music",
            "fallback_used": false,
        }))
        .into_response();
    }
    (StatusCode::NOT_FOUND, "unsupported capability").into_response()
}

async fn spawn_mock_engine() -> String {
    let app = Router::new()
        .route("/v1/invoke", post(mock_invoke))
        .route("/health", get(|| async { Json(json!({"status":"ok"})) }));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    format!("http://{addr}")
}

fn router(engine_url: String, tag: &str) -> Router {
    let data_dir = std::env::temp_dir().join(format!("mofa-music-gw-{tag}"));
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

#[tokio::test]
async fn music_task_completes_with_labeled_audio() {
    let engine = spawn_mock_engine().await;
    let app = router(engine, "ok");

    let submit = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/music/generations")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "prompt": "一首欢快的晨跑歌",
                        "style": "pop, upbeat",
                        "title": "晨跑",
                        "instrumental": false,
                        "model": "mock/suno-v4",
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(submit.status(), StatusCode::OK);
    let submit_body = body_json(submit).await;
    let task_id = submit_body["task_id"].as_str().unwrap().to_string();

    // Poll to completion.
    let mut done = None;
    for _ in 0..50 {
        let poll = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri(format!("/v1/music/generations/{task_id}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        let body = body_json(poll).await;
        if body["status"] != "running" {
            done = Some(body);
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(30)).await;
    }
    let done = done.expect("task finished");
    assert_eq!(done["status"], "succeeded");
    assert_eq!(done["label"], "晨跑 · pop, upbeat");
    let audio = done["audio"].as_str().unwrap();
    assert!(audio.starts_with("data:audio/mpeg;base64,"), "got: {audio}");

    // The engine received the Custom Mode fields.
    let captured = CAPTURED.lock().unwrap_or_else(|e| e.into_inner());
    let req = captured.last().unwrap();
    assert_eq!(req["capability"], "music_gen");
    assert_eq!(req["messages"][0]["content"], "一首欢快的晨跑歌");
    assert_eq!(req["params"]["style"], "pop, upbeat");
    assert_eq!(req["params"]["title"], "晨跑");
}

#[tokio::test]
async fn music_submit_requires_prompt() {
    let engine = spawn_mock_engine().await;
    let app = router(engine, "validate");
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/music/generations")
                .header("content-type", "application/json")
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn unknown_task_polls_404() {
    let engine = spawn_mock_engine().await;
    let app = router(engine, "404");
    let response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/music/generations/nope")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn engine_failure_fails_the_task_with_reason() {
    // Engine that rejects music calls.
    let app_engine = Router::new().route(
        "/v1/invoke",
        post(|| async {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({ "error": { "message": "no music provider configured" } })),
            )
        }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app_engine).await.unwrap();
    });

    let app = router(format!("http://{addr}"), "fail");
    let submit = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/music/generations")
                .header("content-type", "application/json")
                .body(Body::from(json!({ "prompt": "x" }).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    let task_id = body_json(submit).await["task_id"]
        .as_str()
        .unwrap()
        .to_string();

    let mut failed = None;
    for _ in 0..50 {
        let poll = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri(format!("/v1/music/generations/{task_id}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        let body = body_json(poll).await;
        if body["status"] != "running" {
            failed = Some(body);
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(30)).await;
    }
    let failed = failed.expect("task finished");
    assert_eq!(failed["status"], "failed");
    let reason = failed["error"].as_str().unwrap_or_default();
    assert!(
        reason.contains("503") || reason.contains("music"),
        "got: {reason}"
    );
}
