/**
 * Integration tests for the llm-gateway: the OpenAI-compatible surface over
 * the embedded mofa-engine.
 *
 * A scripted [`StubEngine`] is injected through `build_router_with_engine`,
 * reproducing the canned engine behaviors while the assertions verify the
 * gateway's translation end-to-end: request mapping, response wrapping, SSE
 * chunk translation, model listing, and honest error pass-through.
 */
mod common;

use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use serde_json::{json, Value};
use tower::ServiceExt;

use common::{router_with, body_string, StubEngine};
use server_core::engine_bridge::EngineCallError;

// ==================== Handlers ====================

/// 1x1 PNG: header + IHDR chunk of a red pixel.
const PNG: &[u8] = &[
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44,
    0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
    0x77, 0x53, 0xDE,
];

fn write_artifact(prefix: &str) -> String {
    let dir = std::env::temp_dir().join("mofa-gateway-img-test");
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join(format!("{prefix}_{}.png", uuid::Uuid::new_v4()));
    std::fs::write(&path, PNG).expect("write artifact");
    path.to_string_lossy().to_string()
}

fn default_engine() -> StubEngine {
    StubEngine::with_handler(|req| {
        // Vision routing must carry the images and the flattened text.
        if req["capability"] == "vlm" {
            assert!(
                req["messages"][0]["images"]
                    .as_array()
                    .is_some_and(|a| !a.is_empty()),
                "gateway must forward image parts as message images"
            );
            assert_eq!(req["messages"][0]["content"], "图里是什么？");
        }
        // Echo back what the gateway forwarded so tests can assert the mapping.
        assert!(
            req["capability"] == "chat" || req["capability"] == "vlm",
            "gateway must request a chat-family capability"
        );
        assert!(
            req["messages"].as_array().is_some_and(|m| !m.is_empty()),
            "gateway must forward a non-empty messages array"
        );
        Ok(json!({
            "text": common::MOCK_TEXT,
            "reasoning": "mock reasoning trace",
            "model_used": "mock/mock-model",
            "provider": "mock",
            "duration_ms": 7,
            "request_id": "req-42",
            "tokens_used": 12,
            "fallback_used": false,
            "routing_reason": "capability_default",
            "cost_usd": 0.02,
        }))
    })
}

fn image_gen_engine() -> StubEngine {
    StubEngine::with_handler(|req| {
        assert!(
            req["messages"][0]["content"]
                .as_str()
                .is_some_and(|p| !p.is_empty()),
            "gateway must forward the prompt as message content"
        );
        Ok(json!({
            "text": null,
            "file": write_artifact("mock_img"),
            "model_used": "mock/mock-image",
            "provider": "mock",
            "duration_ms": 12,
            "request_id": "req-img",
            "fallback_used": false,
            "routing_reason": "capability_default",
        }))
    })
}

/// Image-edit engine that records every forwarded request, like the real
/// engine receives them, and writes one artifact per call.
struct EditCapture {
    engine: StubEngine,
    captured: Arc<Mutex<Vec<Value>>>,
}

impl EditCapture {
    fn new() -> Self {
        let captured: Arc<Mutex<Vec<Value>>> = Arc::new(Mutex::new(Vec::new()));
        let sink = captured.clone();
        let engine = StubEngine::with_handler(move |req| {
            sink.lock().unwrap_or_else(|e| e.into_inner()).push(req.clone());
            Ok(json!({
                "text": null,
                "file": write_artifact("mock_edit"),
                "model_used": "mock/mock-edit",
                "provider": "mock",
                "duration_ms": 15,
                "request_id": "req-edit",
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

fn chat_request(stream: bool) -> Request<Body> {
    Request::builder()
        .method("POST")
        .uri("/v1/chat/completions")
        .header("content-type", "application/json")
        .body(Body::from(
            json!({
                "messages": [{ "role": "user", "content": "hi" }],
                "model": "mock/mock-model",
                "temperature": 0.7,
                "max_tokens": 128,
                "stream": stream,
            })
            .to_string(),
        ))
        .unwrap()
}

// ==================== Tests ====================

#[tokio::test]
async fn non_streaming_chat_wraps_engine_response_in_openai_shape() {
    let app = router_with("blocking", Arc::new(default_engine()));
    let response = app.oneshot(chat_request(false)).await.unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_json(response).await;
    assert_eq!(body["object"], "chat.completion");
    assert_eq!(body["id"], "chatcmpl-req-42");
    assert_eq!(body["model"], "mock/mock-model");
    assert_eq!(body["provider"], "mock");
    assert_eq!(body["choices"][0]["message"]["role"], "assistant");
    assert_eq!(
        body["choices"][0]["message"]["content"],
        "hello from mock engine"
    );
    assert_eq!(
        body["choices"][0]["message"]["reasoning_content"],
        "mock reasoning trace"
    );
    assert_eq!(body["choices"][0]["finish_reason"], "stop");
    assert_eq!(body["usage"]["completion_tokens"], 12);
    assert_eq!(body["usage"]["total_tokens"], 12);
}

#[tokio::test]
async fn streaming_chat_translates_engine_chunks_to_openai_sse() {
    let mut engine = StubEngine::default();
    engine.stream_chunks = vec![
        json!({"type":"started","request_id":"req-42","model_used":"mock/mock-model","provider":"mock"}),
        json!({"type":"reasoning","delta":"thinking hard"}),
        json!({"type":"text","delta":"Hel"}),
        json!({"type":"text","delta":"lo"}),
        json!({"type":"completed","duration_ms":9,"tokens_used":5,"file":null,"fallback_used":false,"routing_reason":null}),
    ];
    let app = router_with("stream", Arc::new(engine));
    let response = app.oneshot(chat_request(true)).await.unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.headers().get(header::CONTENT_TYPE).unwrap(),
        "text/event-stream"
    );
    let body = body_string(response).await;

    // Deltas arrive as OpenAI chunks, in order.
    let thinking = body
        .find("\"reasoning_content\":\"thinking hard\"")
        .expect("thinking delta");
    let hello = body.find("\"content\":\"Hel\"").expect("first delta");
    let lo = body.find("\"content\":\"lo\"").expect("second delta");
    assert!(thinking < hello, "thinking must stream ahead of the answer");
    assert!(hello < lo, "text deltas must preserve engine order");
    // Key order inside JSON objects is not guaranteed; assert per-field.
    assert!(body.contains("\"role\":\"assistant\""));
    assert!(body.contains("\"content\":\"\""));
    assert!(body.contains("\"model\":\"mock/mock-model\""));
    assert!(body.contains("\"id\":\"chatcmpl-req-42\""));

    // Terminal chunk carries finish_reason and usage, then [DONE].
    assert!(body.contains("\"finish_reason\":\"stop\""));
    assert!(body.contains("\"completion_tokens\":5"));
    assert!(body.trim_end().ends_with("data: [DONE]"));
    assert_eq!(body.matches("[DONE]").count(), 1, "exactly one DONE marker");

    // Raw engine protocol must not leak through.
    assert!(!body.contains("\"type\":\"started\""));
    assert!(!body.contains("\"type\":\"text\""));
}

#[tokio::test]
async fn models_list_maps_engine_capabilities() {
    let app = router_with("models", Arc::new(StubEngine::default()));
    let response = app
        .oneshot(
            Request::builder()
                .uri("/v1/models")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_json(response).await;
    assert_eq!(body["object"], "list");
    assert_eq!(body["data"].as_array().map(Vec::len), Some(1));
    assert_eq!(body["data"][0]["id"], "mock/mock-model");
    assert_eq!(body["data"][0]["object"], "model");
    assert_eq!(body["data"][0]["owned_by"], "mock");
    assert_eq!(body["data"][0]["capability"], "chat");
}

#[tokio::test]
async fn engine_health_reports_reachability() {
    let app = router_with("health-up", Arc::new(StubEngine::default()));
    let response = app
        .oneshot(
            Request::builder()
                .uri("/v1/engine/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_json(response).await;
    assert_eq!(body["reachable"], true);
    assert_eq!(body["status"], "ok");
    // The embedded engine has no separate address to probe.
    assert_eq!(body["engine_url"], "embedded");
}

#[tokio::test]
async fn engine_failure_is_surfaced_verbatim() {
    // An unhealthy embedded engine (e.g. no provider configured at all)
    // surfaces its reason instead of a generic proxy failure.
    let engine = StubEngine::with_handler(|_req| {
        Err(EngineCallError::rejected(503, "no provider configured"))
    });
    let app = router_with("down", Arc::new(engine));
    let response = app.oneshot(chat_request(false)).await.unwrap();
    let status = response.status();

    let raw = body_string(response).await;
    let body: Value = serde_json::from_str(&raw).unwrap_or(Value::Null);
    assert_eq!(
        status,
        StatusCode::SERVICE_UNAVAILABLE,
        "unexpected response: {raw}"
    );
    let msg = body["error"]["message"].as_str().unwrap();
    assert!(
        msg.contains("no provider configured"),
        "message should explain the failure: {msg}"
    );
}

#[tokio::test]
async fn invalid_body_without_messages_is_rejected() {
    let app = router_with("invalid", Arc::new(StubEngine::default()));
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("content-type", "application/json")
                .body(Body::from(json!({ "model": "x" }).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let body = body_json(response).await;
    assert!(body["error"]["message"]
        .as_str()
        .unwrap()
        .contains("messages"));
}

#[tokio::test]
async fn image_generations_returns_b64_artifacts() {
    let app = router_with("images", Arc::new(image_gen_engine()));
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/images/generations")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "prompt": "一只橘猫",
                        "model": "mock/mock-image",
                        "n": 2,
                        "size": "1024x1024",
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_json(response).await;
    let data = body["data"].as_array().expect("data array");
    assert_eq!(data.len(), 2, "n=2 artifacts come back");
    assert_eq!(body["model_used"], "mock/mock-image");

    // b64 round-trip preserves the PNG magic.
    use base64::Engine as _;
    for item in data {
        let b64 = item["b64_json"].as_str().expect("b64_json");
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(b64)
            .expect("valid base64");
        assert_eq!(&bytes[..8], &PNG[..8]);
    }
}

#[tokio::test]
async fn image_generations_requires_prompt() {
    let app = router_with("images-400", Arc::new(image_gen_engine()));
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/images/generations")
                .header("content-type", "application/json")
                .body(Body::from(json!({ "n": 1 }).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let body = body_json(response).await;
    assert!(body["error"]["message"]
        .as_str()
        .unwrap()
        .contains("prompt"));
}

// ==================== Image edits (TOOL-01 垫图 I2I / 局部重绘) ====================

/// Hand-roll a multipart/form-data body with a fixed boundary. Field specs:
/// `(name, optional filename, optional content-type, value)`.
fn multipart_body(boundary: &str, fields: &[(&str, Option<&str>, Option<&str>, &str)]) -> Body {
    let mut body = String::new();
    for (name, filename, content_type, value) in fields {
        body.push_str(&format!(
            "--{boundary}\r\ncontent-disposition: form-data; name=\"{name}\""
        ));
        if let Some(filename) = filename {
            body.push_str(&format!("; filename=\"{filename}\""));
        }
        body.push_str("\r\n");
        if let Some(ct) = content_type {
            body.push_str(&format!("content-type: {ct}\r\n"));
        }
        body.push_str(&format!("\r\n{value}\r\n"));
    }
    body.push_str(&format!("--{boundary}--\r\n"));
    Body::from(body)
}

fn edits_request(
    boundary: &str,
    fields: &[(&str, Option<&str>, Option<&str>, &str)],
) -> Request<Body> {
    Request::builder()
        .method("POST")
        .uri("/v1/images/edits")
        .header(
            "content-type",
            format!("multipart/form-data; boundary={boundary}"),
        )
        .body(multipart_body(boundary, fields))
        .unwrap()
}

/// Decode the data-URL payload the gateway forwarded (base64 after the comma).
fn data_url_payload(url: &str) -> Vec<u8> {
    use base64::Engine as _;
    let payload = url.split(',').nth(1).expect("data url payload");
    base64::engine::general_purpose::STANDARD
        .decode(payload)
        .expect("valid base64")
}

#[tokio::test]
async fn image_edits_forwards_image_and_mask_as_data_urls() {
    let capture = EditCapture::new();
    let app = router_with("edits", Arc::new(capture.engine));
    let response = app
        .oneshot(edits_request(
            "mofa-edits-boundary",
            &[
                ("image", Some("input.png"), Some("image/png"), "INPUTPNG"),
                ("mask", Some("mask.png"), Some("image/png"), "MASKPNG"),
                ("prompt", None, None, "把天空换成夜景"),
                ("model", None, None, "mock/mock-edit"),
                ("size", None, None, "1024x1024"),
                ("n", None, None, "1"),
            ],
        ))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_json(response).await;
    assert_eq!(body["masked"], true, "mask present → 局部重绘");
    assert_eq!(body["model_used"], "mock/mock-edit");
    let data = body["data"].as_array().expect("data array");
    assert_eq!(data.len(), 1);
    let bytes = data_url_payload(&format!(
        "data:image/png;base64,{}",
        data[0]["b64_json"].as_str().unwrap()
    ));
    assert_eq!(&bytes[..4], &[0x89, 0x50, 0x4E, 0x47]);

    // What the engine actually received: uploads inlined as data URLs.
    let captured = capture.captured.lock().unwrap_or_else(|e| e.into_inner());
    assert_eq!(captured.len(), 1);
    let req = &captured[0];
    assert_eq!(req["capability"], "image_edit");
    assert_eq!(req["model"], "mock/mock-edit");
    assert_eq!(req["messages"][0]["content"], "把天空换成夜景");
    let image_url = req["messages"][0]["images"][0].as_str().unwrap();
    assert!(image_url.starts_with("data:image/png;base64,"));
    assert_eq!(data_url_payload(image_url), b"INPUTPNG");
    let mask_url = req["input_mask"].as_str().unwrap();
    assert!(mask_url.starts_with("data:image/png;base64,"));
    assert_eq!(data_url_payload(mask_url), b"MASKPNG");
    assert_eq!(req["params"]["size"], "1024x1024");
}

#[tokio::test]
async fn image_edits_without_mask_is_whole_image_i2i() {
    let capture = EditCapture::new();
    let app = router_with("edits-i2i", Arc::new(capture.engine));
    let response = app
        .oneshot(edits_request(
            "mofa-i2i-boundary",
            &[
                ("image", Some("ref.jpg"), Some("image/jpeg"), "JPEGREF"),
                ("prompt", None, None, "整体改成水彩风格"),
            ],
        ))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_json(response).await;
    assert_eq!(body["masked"], false, "no mask → whole-image I2I");

    let captured = capture.captured.lock().unwrap_or_else(|e| e.into_inner());
    assert_eq!(captured.len(), 1);
    let req = &captured[0];
    let image_url = req["messages"][0]["images"][0].as_str().unwrap();
    assert!(
        image_url.starts_with("data:image/jpeg;base64,"),
        "upload mime preserved"
    );
    assert_eq!(data_url_payload(image_url), b"JPEGREF");
    assert!(
        req.get("input_mask").is_none(),
        "mask must be absent, not null/empty"
    );
}

#[tokio::test]
async fn image_edits_fan_out_n_candidates() {
    let capture = EditCapture::new();
    let app = router_with("edits-n", Arc::new(capture.engine));
    let response = app
        .oneshot(edits_request(
            "mofa-n-boundary",
            &[
                ("image", Some("input.png"), Some("image/png"), "INPUTPNG"),
                ("prompt", None, None, "重绘三次对比"),
                ("n", None, None, "3"),
            ],
        ))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_json(response).await;
    assert_eq!(body["data"].as_array().unwrap().len(), 3);
    assert_eq!(capture.captured.lock().unwrap_or_else(|e| e.into_inner()).len(), 3);
}

#[tokio::test]
async fn image_edits_forwards_every_reference_image() {
    let capture = EditCapture::new();
    let app = router_with("edits-multi", Arc::new(capture.engine));
    let response = app
        .oneshot(edits_request(
            "mofa-multi-boundary",
            &[
                ("image", Some("base.png"), Some("image/png"), "BASE"),
                ("image", Some("ref.png"), Some("image/png"), "REF1"),
                ("prompt", None, None, "保持角色一致"),
            ],
        ))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let captured = capture.captured.lock().unwrap_or_else(|e| e.into_inner());
    assert_eq!(captured.len(), 1);
    let urls = captured[0]["messages"][0]["images"]
        .as_array()
        .expect("images array");
    assert_eq!(urls.len(), 2, "base + one reference anchor");
    assert_eq!(data_url_payload(urls[0].as_str().unwrap()), b"BASE");
    assert_eq!(data_url_payload(urls[1].as_str().unwrap()), b"REF1");
}

#[tokio::test]
async fn image_edits_requires_image_and_prompt() {
    let capture = EditCapture::new();
    let app = router_with("edits-400", Arc::new(capture.engine));
    let no_image = app
        .clone()
        .oneshot(edits_request(
            "mofa-400a-boundary",
            &[("prompt", None, None, "缺图")],
        ))
        .await
        .unwrap();
    assert_eq!(no_image.status(), StatusCode::BAD_REQUEST);
    assert!(body_json(no_image).await["error"]["message"]
        .as_str()
        .unwrap()
        .contains("image"));

    let no_prompt = app
        .oneshot(edits_request(
            "mofa-400b-boundary",
            &[("image", Some("input.png"), Some("image/png"), "INPUTPNG")],
        ))
        .await
        .unwrap();
    assert_eq!(no_prompt.status(), StatusCode::BAD_REQUEST);
    assert!(body_json(no_prompt).await["error"]["message"]
        .as_str()
        .unwrap()
        .contains("prompt"));
}

#[tokio::test]
async fn vision_input_routes_vlm_and_carries_images() {
    let app = router_with("vision", Arc::new(default_engine()));
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "messages": [{
                            "role": "user",
                            "content": [
                                { "type": "text", "text": "图里是什么？" },
                                { "type": "image_url", "image_url": { "url": "data:image/png;base64,QUJD" } },
                            ],
                        }],
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = body_json(response).await;
    assert_eq!(
        body["choices"][0]["message"]["content"],
        "hello from mock engine"
    );
}
