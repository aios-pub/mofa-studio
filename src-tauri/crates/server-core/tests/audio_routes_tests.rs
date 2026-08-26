/**
 * Integration tests for the audio endpoints (CHAT-08): ASR upload → text
 * and TTS text → audio bytes, against an injected stub engine.
 */
mod common;

use std::sync::Arc;

use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use serde_json::{json, Value};
use tower::ServiceExt;

use common::{body_string, router_with, StubEngine};
use server_core::engine_bridge::EngineCallError;

// ==================== Stub engine ====================

/// Stub reproducing the engine's audio contract: asr echoes the staged
/// `input_file` back through `text`; tts writes a labeled mp3 artifact.
fn audio_engine() -> StubEngine {
    StubEngine::with_handler(|req| {
        if req["capability"] == "asr" {
            // Echo the input_file so the test can assert the gateway staged it.
            let staged = req["input_file"].as_str().unwrap_or("").to_string();
            return Ok(json!({
                "text": format!("识别自:{}", staged),
                "file": Value::Null,
                "model_used": "mock/asr",
                "provider": "mock",
                "duration_ms": 100,
                "request_id": "req-asr",
                "tokens_used": Value::Null,
                "fallback_used": false,
                "routing_reason": "capability_default",
            }));
        }
        if req["capability"] == "tts" {
            let input = req["messages"][0]["content"].as_str().unwrap_or("");
            let dir = std::env::temp_dir().join("mofa-audio-gw-test");
            let _ = std::fs::create_dir_all(&dir);
            let path = dir.join(format!("mock_tts_{}.mp3", uuid::Uuid::new_v4()));
            std::fs::write(&path, format!("AUDIO({input})").as_bytes()).expect("write audio");
            return Ok(json!({
                "text": Value::Null,
                "file": path.to_string_lossy(),
                "model_used": "mock/tts",
                "provider": "mock",
                "duration_ms": 100,
                "request_id": "req-tts",
                "tokens_used": Value::Null,
                "fallback_used": false,
                "routing_reason": "capability_default",
            }));
        }
        Err(EngineCallError::rejected(400, "unexpected capability"))
    })
}

// ==================== Tests ====================

#[tokio::test]
async fn transcriptions_stage_audio_and_return_text() {
    let app = router_with("audio-asr", Arc::new(audio_engine()));

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
    let app = router_with("audio-tts", Arc::new(audio_engine()));

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
    let app = router_with("audio-tts-400", Arc::new(audio_engine()));
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
