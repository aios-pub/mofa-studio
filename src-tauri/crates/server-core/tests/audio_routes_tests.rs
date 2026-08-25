/**
 * Integration tests for the audio endpoints (CHAT-08): ASR upload → text
 * and TTS text → audio bytes, against a mock engine.
 */
use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{Json, Router};
use serde_json::{json, Value};
use tower::ServiceExt;

use server_core::ServerConfig;

// ==================== Mock engine ====================

async fn mock_invoke(Json(req): Json<Value>) -> Response {
    if req["capability"] == "asr" {
        // Echo the input_file so the test can assert the gateway staged it.
        let staged = req["input_file"].as_str().unwrap_or("").to_string();
        return Json(json!({
            "text": format!("识别自:{}", staged),
            "file": Value::Null,
            "model_used": "mock/asr",
            "provider": "mock",
            "duration_ms": 100,
            "request_id": "req-asr",
            "tokens_used": Value::Null,
            "fallback_used": false,
            "routing_reason": "capability_default",
        }))
        .into_response();
    }
    if req["capability"] == "tts" {
        let input = req["messages"][0]["content"].as_str().unwrap_or("");
        let dir = std::env::temp_dir().join("mofa-audio-gw-test");
        let _ = std::fs::create_dir_all(&dir);
        let path = dir.join(format!("mock_tts_{}.mp3", uuid::Uuid::new_v4()));
        std::fs::write(&path, format!("AUDIO({input})").as_bytes()).expect("write audio");
        return Json(json!({
            "text": Value::Null,
            "file": path.to_string_lossy(),
            "model_used": "mock/tts",
            "provider": "mock",
            "duration_ms": 100,
            "request_id": "req-tts",
            "tokens_used": Value::Null,
            "fallback_used": false,
            "routing_reason": "capability_default",
        }))
        .into_response();
    }
    (StatusCode::BAD_REQUEST, "unexpected capability").into_response()
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
    let data_dir = std::env::temp_dir().join(format!("mofa-audio-test-{tag}"));
    let _ = std::fs::remove_dir_all(&data_dir);
    let mut config = ServerConfig::for_data_dir(data_dir);
    config.engine_base_url = Some(engine_url);
    server_core::build_router(&config).expect("build router")
}

async fn body_string(response: Response) -> String {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("read body");
    String::from_utf8(bytes.to_vec()).expect("utf8 body")
}

#[tokio::test]
async fn transcriptions_stage_audio_and_return_text() {
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "asr");

    let boundary = "X-BOUNDARY-X";
    let body = format!(
        "--{b}\r\ncontent-disposition: form-data; name=\"file\"; filename=\"a.webm\"\r\ncontent-type: audio/webm\r\n\r\nFAKE_AUDIO\r\n--{b}--\r\n",
        b = boundary
    );
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/audio/transcriptions")
                .header(
                    "content-type",
                    format!("multipart/form-data; boundary={boundary}"),
                )
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let text = body_string(response).await;
    let parsed: Value = serde_json::from_str(&text).expect("json");
    let recognized = parsed["text"].as_str().expect("text");
    assert!(
        recognized.starts_with("识别自:"),
        "recognized: {recognized}"
    );
    // The staged file lived under the app data dir and was cleaned up.
    assert!(recognized.contains("asr_"));
}

#[tokio::test]
async fn speech_returns_audio_mpeg_bytes() {
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "tts");

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/audio/speech")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({ "input": "你好世界", "voice": "alloy" }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.headers().get(header::CONTENT_TYPE).unwrap(),
        "audio/mpeg"
    );
    let body = body_string(response).await;
    assert_eq!(body, "AUDIO(你好世界)");
}

#[tokio::test]
async fn speech_requires_input() {
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "tts-400");
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/audio/speech")
                .header("content-type", "application/json")
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}
