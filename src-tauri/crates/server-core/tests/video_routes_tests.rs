/**
 * Integration tests for async video tasks (TOOL-02): submit returns a task
 * id immediately; polling walks running → succeeded with a data-URL video
 * read from the engine's artifact path.
 */
mod common;

use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use serde_json::{json, Value};
use tower::ServiceExt;

use common::{body_string, router_with, StubEngine};

// ==================== Stub engine ====================

/// Video engine that records every forwarded invoke and writes one mp4
/// artifact per call, like the real engine's video_gen contract.
struct VideoCapture {
    engine: StubEngine,
    captured: Arc<Mutex<Vec<Value>>>,
}

impl VideoCapture {
    fn new() -> Self {
        let captured: Arc<Mutex<Vec<Value>>> = Arc::new(Mutex::new(Vec::new()));
        let sink = captured.clone();
        let engine = StubEngine::with_handler(move |req| {
            sink.lock().unwrap_or_else(|e| e.into_inner()).push(req.clone());
            assert_eq!(
                req["capability"], "video_gen",
                "video tasks hit the video capability"
            );

            // Write an "mp4" artifact like the real engine would.
            let dir = std::env::temp_dir().join("mofa-video-gw-test");
            let _ = std::fs::create_dir_all(&dir);
            let path = dir.join(format!("mock_video_{}.mp4", uuid::Uuid::new_v4()));
            std::fs::write(&path, b"FAKE_MP4_BYTES").expect("write artifact");

            Ok(json!({
                "text": Value::Null,
                "file": path.to_string_lossy(),
                "files": [path.to_string_lossy()],
                "model_used": "mock/seedance",
                "provider": "mock-video",
                "duration_ms": 4200,
                "request_id": "req-v",
                "tokens_used": Value::Null,
                "fallback_used": false,
                "routing_reason": "capability_default",
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
async fn video_task_lifecycle_submit_then_poll_to_success() {
    let capture = VideoCapture::new();
    let app = router_with("video-lifecycle", Arc::new(capture.engine));

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/videos/generations")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "prompt": "一只橘猫追激光笔",
                        "size": "1280x720",
                        "duration": 5,
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let submitted = body_json(response).await;
    let task_id = submitted["task_id"].as_str().expect("task id").to_string();
    assert!(!task_id.is_empty());

    // Poll until terminal.
    let mut final_status = Value::Null;
    for _ in 0..50 {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri(format!("/v1/videos/generations/{task_id}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let status = body_json(response).await;
        if status["status"] == "succeeded" || status["status"] == "failed" {
            final_status = status;
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }
    assert_eq!(
        final_status["status"], "succeeded",
        "status: {final_status}"
    );
    let video = final_status["video"].as_str().expect("video data url");
    assert!(
        video.starts_with("data:video/mp4;base64,"),
        "video: {video}"
    );

    // The engine saw the mapped request.
    let invocations = capture.captured.lock().unwrap_or_else(|e| e.into_inner());
    assert_eq!(invocations.len(), 1);
    assert_eq!(invocations[0]["messages"][0]["content"], "一只橘猫追激光笔");
    assert_eq!(invocations[0]["params"]["size"], "1280x720");
    assert_eq!(invocations[0]["params"]["duration"], 5);
}

#[tokio::test]
async fn submit_requires_prompt_and_unknown_tasks_404() {
    let capture = VideoCapture::new();
    let app = router_with("video-validation", Arc::new(capture.engine));

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/videos/generations")
                .header("content-type", "application/json")
                .body(Body::from(json!({ "size": "1280x720" }).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/v1/videos/generations/vt-missing")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
