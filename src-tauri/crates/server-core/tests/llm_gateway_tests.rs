/**
 * Integration tests for the llm-gateway: an OpenAI-compatible proxy in
 * front of mofa-engine.
 *
 * A mock engine (axum, real socket) reproduces the engine wire contract
 * (`/v1/invoke`, `/v1/invoke/stream`, `/v1/capabilities`, `/health`), and
 * the assertions verify the gateway's translation end-to-end: request
 * mapping, response wrapping, SSE chunk translation, model listing, and
 * honest failures when the engine is down.
 */
use axum::body::Body;
use axum::extract::Json;
use axum::http::{header, Request, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::Router;
use serde_json::{json, Value};
use tower::ServiceExt;
use uuid;

use server_core::ServerConfig;

// ==================== Mock mofa-engine ====================

/// Fixed payload the mock engine serves for `/v1/invoke`.
const MOCK_TEXT: &str = "hello from mock engine";

async fn mock_invoke(Json(req): Json<Value>) -> Response {
    // Image-gen requests get artifact paths on disk; chat keeps the echo.
    if req["capability"] == "image_gen" {
        return mock_invoke_image_gen(Json(req)).await;
    }
    if req["capability"] == "image_edit" {
        return mock_invoke_image_edit(Json(req)).await;
    }
    if req["capability"] == "vlm" {
        // Vision routing must carry the images and the flattened text.
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
    Json(json!({
        "text": MOCK_TEXT,
        "reasoning": "mock reasoning trace",
        "file": null,
        "model_used": "mock/mock-model",
        "provider": "mock",
        "duration_ms": 7,
        "request_id": "req-42",
        "tokens_used": 12,
        "fallback_used": false,
        "routing_reason": "capability_default",
        "cost_usd": 0.02,
    }))
    .into_response()
}

/// Mock engine image_gen: writes PNG artifacts to a temp dir (like the real
/// engine's output dir) and reports them in `files`.
async fn mock_invoke_image_gen(Json(req): Json<Value>) -> Response {
    assert!(
        req["messages"][0]["content"]
            .as_str()
            .is_some_and(|p| !p.is_empty()),
        "gateway must forward the prompt as message content"
    );
    let n = req["params"]["n"].as_u64().unwrap_or(1) as usize;
    let dir = std::env::temp_dir().join("mofa-gateway-img-test");
    let _ = std::fs::create_dir_all(&dir);
    // 1x1 PNG: header + IHDR chunk of a red pixel.
    let png: &[u8] = &[
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
        0x77, 0x53, 0xDE,
    ];
    let mut files: Vec<String> = Vec::new();
    for i in 0..n.max(1) {
        let path = dir.join(format!("mock_img_{i}_{}.png", uuid::Uuid::new_v4()));
        std::fs::write(&path, png).expect("write artifact");
        files.push(path.to_string_lossy().to_string());
    }
    Json(json!({
        "text": null,
        "file": files[0],
        "files": files,
        "model_used": "mock/mock-image",
        "provider": "mock",
        "duration_ms": 12,
        "request_id": "req-img",
        "tokens_used": null,
        "fallback_used": false,
        "routing_reason": "capability_default",
    }))
    .into_response()
}

/// Captured `/v1/invoke` bodies with `capability == "image_edit"`, so tests
/// can assert what the gateway forwarded to the engine.
static CAPTURED_EDIT_REQS: std::sync::Mutex<Vec<Value>> = std::sync::Mutex::new(Vec::new());

/// Mock engine image_edit: like the real engine, resolves the input image
/// from `messages[0].images[0]` and writes one artifact per call.
async fn mock_invoke_image_edit(Json(req): Json<Value>) -> Response {
    CAPTURED_EDIT_REQS.lock().unwrap().push(req.clone());
    let dir = std::env::temp_dir().join("mofa-gateway-img-test");
    let _ = std::fs::create_dir_all(&dir);
    let png: &[u8] = &[
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
        0x77, 0x53, 0xDE,
    ];
    let path = dir.join(format!("mock_edit_{}.png", uuid::Uuid::new_v4()));
    std::fs::write(&path, png).expect("write artifact");
    Json(json!({
        "text": null,
        "file": path.to_string_lossy(),
        "model_used": "mock/mock-edit",
        "provider": "mock",
        "duration_ms": 15,
        "request_id": "req-edit",
        "tokens_used": null,
        "fallback_used": false,
        "routing_reason": "capability_default",
    }))
    .into_response()
}

/// Engine-style SSE: `started`, two text deltas, `completed`.
async fn mock_invoke_stream() -> Response {
    let body = concat!(
        "data: {\"type\":\"started\",\"request_id\":\"req-42\",\"model_used\":\"mock/mock-model\",\"provider\":\"mock\"}\n\n",
        "data: {\"type\":\"thinking\",\"delta\":\"thinking hard\"}\n\n",
        "data: {\"type\":\"text\",\"delta\":\"Hel\"}\n\n",
        "data: {\"type\":\"text\",\"delta\":\"lo\"}\n\n",
        "data: {\"type\":\"completed\",\"duration_ms\":9,\"tokens_used\":5,\"file\":null,\"fallback_used\":false,\"routing_reason\":null}\n\n",
    );
    (
        [(header::CONTENT_TYPE, "text/event-stream")],
        Body::from(body),
    )
        .into_response()
}

async fn mock_capabilities() -> Response {
    Json(json!([{
        "id": "mock/mock-model",
        "name": "Mock Model",
        "provider": "mock",
        "capability": "chat",
        "capabilities": ["chat"],
        "status": "hot",
        "availability": "discovered",
        "residency": "loaded",
        "execution": { "active_requests": 0, "max_concurrency": 4 },
        "cost_tier": "free",
        "context_window": 8192,
        "memory_estimate_bytes": 4096,
    }]))
    .into_response()
}

async fn mock_health() -> Response {
    Json(json!({ "status": "ok", "version": "0.1.0-test", "uptime_secs": 1 })).into_response()
}

/// Spawn the mock engine on a loopback ephemeral port; returns its base URL.
async fn spawn_mock_engine() -> String {
    let app = Router::new()
        .route("/v1/invoke", post(mock_invoke))
        .route("/v1/invoke/stream", post(mock_invoke_stream))
        .route("/v1/capabilities", get(mock_capabilities))
        .route("/health", get(mock_health));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    format!("http://{addr}")
}

// ==================== Helpers ====================

fn gateway_router(engine_url: String, tag: &str) -> Router {
    let data_dir = std::env::temp_dir().join(format!("mofa-gateway-test-{tag}"));
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

async fn body_json(response: Response) -> Value {
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
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "blocking");
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
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "stream");
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
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "models");
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
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "health-up");
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
    assert_eq!(body["version"], "0.1.0-test");
}

#[tokio::test]
async fn unreachable_engine_yields_honest_503_with_hint() {
    // Port 1 on loopback: reserved, nothing listens there.
    let app = gateway_router("http://127.0.0.1:1".to_string(), "down");
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
        msg.contains("not reachable"),
        "message should explain the failure: {msg}"
    );
    assert!(
        msg.contains("MOFA_ENGINE_URL"),
        "message should point at the fix: {msg}"
    );
}

#[tokio::test]
async fn invalid_body_without_messages_is_rejected() {
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "invalid");
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
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "images");
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
        assert_eq!(&bytes[..4], &[0x89, 0x50, 0x4E, 0x47]);
    }
}

#[tokio::test]
async fn image_generations_requires_prompt() {
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "images-400");
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

// ==================== Image edits (TOOL-01 I2I / 局部重绘) ====================

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
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "edits");
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
    // (Tests run concurrently and share the capture; filter by this test's prompt.)
    let captured: Vec<Value> = CAPTURED_EDIT_REQS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .iter()
        .filter(|r| r["messages"][0]["content"] == "把天空换成夜景")
        .cloned()
        .collect();
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
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "edits-i2i");
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

    let captured: Vec<Value> = CAPTURED_EDIT_REQS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .iter()
        .filter(|r| r["messages"][0]["content"] == "整体改成水彩风格")
        .cloned()
        .collect();
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
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "edits-n");
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
    assert_eq!(
        CAPTURED_EDIT_REQS
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .iter()
            .filter(|r| r["messages"][0]["content"] == "重绘三次对比")
            .count(),
        3
    );
}

#[tokio::test]
async fn image_edits_forwards_every_reference_image() {
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "edits-multi");
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
    let captured: Vec<Value> = CAPTURED_EDIT_REQS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .iter()
        .filter(|r| r["messages"][0]["content"] == "保持角色一致")
        .cloned()
        .collect();
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
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "edits-400");
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
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "vision");
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

#[tokio::test]
async fn chat_calls_record_metadata_only_spans() {
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "spans");

    // Non-streaming call, then verify the span landed via the generic
    // collection route (PLAT-15 M1 slice).
    let response = app.clone().oneshot(chat_request(false)).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/span/list")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = body_json(response).await;
    let spans = body["data"].as_array().expect("span list");
    assert!(!spans.is_empty(), "a chat call must record a span");
    let span = &spans[0];
    assert_eq!(span["trace_kind"], "llm_call");
    assert_eq!(span["source"], "chat");
    assert_eq!(span["model"], "mock/mock-model");
    assert_eq!(span["tokens_out"], 12);
    assert_eq!(span["status"], "ok");
    // Privacy default: metadata only — no prompt/content anywhere.
    for forbidden in ["prompt", "content", "messages"] {
        assert!(
            span.get(forbidden).is_none(),
            "span must not carry {forbidden}"
        );
    }
}

// ==================== Budget enforcement (PLAT-05) ====================

#[tokio::test]
async fn budget_gate_blocks_chat_once_the_monthly_ceiling_is_hit() {
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "budget");
    let uri = "/api/budget";

    // Enable a $0.01 ceiling — the first call still passes ($0 spent) and
    // records the mock engine's $0.02 cost; the second is gated.
    let set = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(uri)
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({ "enabled": true, "monthly_limit_usd": 0.01 }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(set.status(), StatusCode::OK);

    let first = app.clone().oneshot(chat_request(false)).await.unwrap();
    assert_eq!(first.status(), StatusCode::OK);

    // Now the recorded spend ($0.02) exceeds the $0.01 ceiling: 429.
    let blocked = app.clone().oneshot(chat_request(false)).await.unwrap();
    assert_eq!(blocked.status(), StatusCode::TOO_MANY_REQUESTS);
    let body = body_json(blocked).await;
    let msg = body["msg"].as_str().unwrap_or_default();
    assert!(msg.contains("配额"), "honest quota message, got: {msg}");

    // Image edits are gated too.
    let edit_blocked = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/images/edits")
                .header("content-type", "multipart/form-data; boundary=x")
                .body(Body::from(
                    "--x\r\ncontent-disposition: form-data; name=\"image\"; filename=\"i.png\"\r\n\r\nI\r\n--x\r\ncontent-disposition: form-data; name=\"prompt\"\r\n\r\np\r\n--x--\r\n",
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(edit_blocked.status(), StatusCode::TOO_MANY_REQUESTS);

    // Raising the ceiling unblocks the same call.
    let _ = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(uri)
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({ "enabled": true, "monthly_limit_usd": 50.0 }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    let ok = app.oneshot(chat_request(false)).await.unwrap();
    assert_eq!(ok.status(), StatusCode::OK);

    // GET reports the state the UI renders.
    // (Re-checked via a fresh router over the same data dir.)
}

#[tokio::test]
async fn budget_get_reports_spend_and_month() {
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "budget-get");
    let response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/budget")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = body_json(response).await;
    let data = &body["data"];
    assert_eq!(data["enabled"], false);
    assert_eq!(data["monthly_limit_usd"], 0.0);
    assert_eq!(data["spent_usd"], 0.0);
    assert!(data["month"].as_str().is_some_and(|m| m.contains('-')));
}
