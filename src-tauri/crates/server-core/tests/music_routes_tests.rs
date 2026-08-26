/**
 * Integration tests for TOOL-10's gateway music tasks: submit → background
 * engine invoke → poll to a base64 mp3 data URL with the clip label, plus
 * honest failure and validation paths. An injected stub engine reproduces
 * the engine's music_gen contract.
 */
mod common;

use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use serde_json::{json, Value};
use tower::ServiceExt;

use common::{body_string, router_with, StubEngine};
use server_core::engine_bridge::EngineCallError;

// ==================== Stub engine ====================

/// Music engine that records every forwarded music_gen invoke (captured for
/// wire assertions) and writes a labeled mp3 artifact like the real engine.
struct MusicCapture {
    engine: StubEngine,
    captured: Arc<Mutex<Vec<Value>>>,
}

impl MusicCapture {
    fn new() -> Self {
        let captured: Arc<Mutex<Vec<Value>>> = Arc::new(Mutex::new(Vec::new()));
        let sink = captured.clone();
        let engine = StubEngine::with_handler(move |req| {
            if req["capability"] != "music_gen" {
                return Err(EngineCallError::rejected(404, "unsupported capability"));
            }
            sink.lock().unwrap_or_else(|e| e.into_inner()).push(req.clone());
            // Write an mp3 artifact like the real engine and label it.
            let dir = std::env::temp_dir().join("mofa-music-gw-test");
            let _ = std::fs::create_dir_all(&dir);
            let path = dir.join(format!("mofa_music_{}.mp3", uuid::Uuid::new_v4()));
            std::fs::write(&path, b"ID3-mock-mp3").expect("write artifact");
            Ok(json!({
                "text": "晨跑 · pop, upbeat",
                "file": path.to_string_lossy(),
                "model_used": "mock/suno-v4",
                "provider": "mock",
                "duration_ms": 42,
                "request_id": "req-music",
                "fallback_used": false,
            }))
        });
        Self { engine, captured }
    }
}

// ==================== Helpers ====================

async fn body_json(response: axum::response::Response) -> Value {
    serde_json::from_str(&body_string(response).await).expect("parse json")
}

// ==================== Tests ====================

#[tokio::test]
async fn music_task_completes_with_labeled_audio() {
    let capture = MusicCapture::new();
    let app = router_with("music-ok", Arc::new(capture.engine));

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
    let captured = capture.captured.lock().unwrap_or_else(|e| e.into_inner());
    let req = captured.last().unwrap();
    assert_eq!(req["capability"], "music_gen");
    assert_eq!(req["messages"][0]["content"], "一首欢快的晨跑歌");
    assert_eq!(req["params"]["style"], "pop, upbeat");
    assert_eq!(req["params"]["title"], "晨跑");
}

#[tokio::test]
async fn music_submit_requires_prompt() {
    let capture = MusicCapture::new();
    let app = router_with("music-validate", Arc::new(capture.engine));
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
    let capture = MusicCapture::new();
    let app = router_with("music-404", Arc::new(capture.engine));
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
    let engine = StubEngine::with_handler(|_req| {
        Err(EngineCallError::rejected(
            503,
            "no music provider configured",
        ))
    });
    let app = router_with("music-fail", Arc::new(engine));
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
