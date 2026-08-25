use axum::body::Body;
/**
 * Integration tests for async video tasks (TOOL-02): submit returns a task
 * id immediately; polling walks running → succeeded with a data-URL video
 * read from the engine's artifact path.
 */
use axum::extract::State;
use axum::http::{Request, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{Json, Router};
use serde_json::{json, Value};
use std::sync::Arc;
use std::sync::Mutex;
use tower::ServiceExt;

use server_core::ServerConfig;

// ==================== Mock engine ====================

struct MockEngineState {
    invocations: Mutex<Vec<Value>>,
}

async fn mock_invoke(
    State(state): State<Arc<MockEngineState>>,
    Json(req): Json<Value>,
) -> Response {
    state.invocations.lock().unwrap().push(req.clone());
    assert_eq!(
        req["capability"], "video_gen",
        "video tasks hit the video capability"
    );

    // Write an "mp4" artifact like the real engine would.
    let dir = std::env::temp_dir().join("mofa-video-gw-test");
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join(format!("mock_video_{}.mp4", uuid::Uuid::new_v4()));
    std::fs::write(&path, b"FAKE_MP4_BYTES").expect("write artifact");

    Json(json!({
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
    .into_response()
}

async fn spawn_mock_engine() -> (String, Arc<MockEngineState>) {
    let state = Arc::new(MockEngineState {
        invocations: Mutex::new(Vec::new()),
    });
    let state_for_route = state.clone();
    let app = Router::new()
        .route("/v1/invoke", post(mock_invoke))
        .with_state(state_for_route);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    (format!("http://{addr}"), state)
}

// ==================== Helpers ====================

fn gateway_router(engine_url: String, tag: &str) -> Router {
    let data_dir = std::env::temp_dir().join(format!("mofa-video-test-{tag}"));
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

// ==================== Tests ====================

#[tokio::test]
async fn video_task_lifecycle_submit_then_poll_to_success() {
    let (engine, mock) = spawn_mock_engine().await;
    let app = gateway_router(engine, "lifecycle");

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
    let invocations = mock.invocations.lock().unwrap();
    assert_eq!(invocations.len(), 1);
    assert_eq!(invocations[0]["messages"][0]["content"], "一只橘猫追激光笔");
    assert_eq!(invocations[0]["params"]["size"], "1280x720");
    assert_eq!(invocations[0]["params"]["duration"], 5);
}

#[tokio::test]
async fn submit_requires_prompt_and_unknown_tasks_404() {
    let (engine, _mock) = spawn_mock_engine().await;
    let app = gateway_router(engine, "validation");

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
