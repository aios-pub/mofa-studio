/**
 * llm-gateway — OpenAI-compatible proxy in front of mofa-engine.
 *
 * mofa-engine (https://github.com/mofa-org/mofa-engine) is the default LLM
 * inference engine for mofa-studio: capability routing, local-first model
 * selection, auto-failover and circuit breaking all live there. This module
 * exposes the OpenAI wire format the frontend already speaks
 * (`POST /v1/chat/completions`, `GET /v1/models`) and translates to the
 * engine's `POST /v1/invoke` / `POST /v1/invoke/stream` contract, so the
 * webview never talks to providers directly.
 *
 * Engine address resolution: `ServerConfig::engine_base_url` (tests, CLI
 * flag) → `MOFA_ENGINE_URL` env → default `http://127.0.0.1:8420`.
 */
use std::sync::Arc;

use axum::body::Body;
use axum::extract::State;
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::{json, Value};
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::StreamExt;

use crate::AppState;

/// Loopback address the stock mofa-engine binary listens on.
pub(crate) const DEFAULT_ENGINE_URL: &str = "http://127.0.0.1:8420";

/// Resolve the engine base URL from config, environment, then default.
pub(crate) fn resolve_engine_url(configured: Option<String>) -> String {
    configured
        .or_else(|| std::env::var("MOFA_ENGINE_URL").ok())
        .unwrap_or_else(|| DEFAULT_ENGINE_URL.to_string())
}

// ==================== Routes ====================

/// OpenAI-compatible gateway routes backed by mofa-engine.
pub(crate) fn llm_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/v1/chat/completions", post(chat_completions))
        .route("/v1/models", get(list_models))
        .route("/v1/engine/health", get(engine_health))
}

// ==================== Handlers ====================

/// POST /v1/chat/completions — translate the OpenAI chat contract to an
/// engine inference request. `stream: true` relays the engine's SSE chunk
/// stream (`started`/`text`/`completed`/`error`) as OpenAI
/// `chat.completion.chunk` frames ending in `data: [DONE]`.
async fn chat_completions(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let messages = match extract_messages(&body) {
        Ok(m) => m,
        Err(msg) => return openai_error(StatusCode::BAD_REQUEST, &msg),
    };

    let mut engine_req = json!({ "capability": "chat", "messages": messages });
    if let Some(model) = body.get("model").and_then(Value::as_str) {
        engine_req["model"] = json!(model);
    }
    let mut params = json!({});
    if let Some(t) = body.get("temperature").and_then(Value::as_f64) {
        params["temperature"] = json!(t);
    }
    if let Some(m) = body.get("max_tokens").and_then(Value::as_u64) {
        params["max_tokens"] = json!(m);
    }
    engine_req["params"] = params;

    let stream = body.get("stream").and_then(Value::as_bool).unwrap_or(false);
    if stream {
        chat_completions_stream(state, engine_req).await
    } else {
        chat_completions_blocking(state, engine_req).await
    }
}

/// Normalize the OpenAI `messages` array: keep role/content pairs, flattening
/// multipart content (vision payloads) down to their text parts for chat.
fn extract_messages(body: &Value) -> Result<Vec<Value>, String> {
    let raw = body
        .get("messages")
        .and_then(Value::as_array)
        .ok_or_else(|| "field `messages` must be a non-empty array".to_string())?;
    if raw.is_empty() {
        return Err("field `messages` must be a non-empty array".to_string());
    }
    let mut out = Vec::with_capacity(raw.len());
    for msg in raw {
        let role = msg
            .get("role")
            .and_then(Value::as_str)
            .unwrap_or("user")
            .to_string();
        let content = match msg.get("content") {
            Some(Value::String(s)) => s.clone(),
            Some(Value::Array(parts)) => parts
                .iter()
                .filter_map(|p| p.get("text").and_then(Value::as_str))
                .collect::<Vec<_>>()
                .join("\n"),
            _ => String::new(),
        };
        out.push(json!({ "role": role, "content": content }));
    }
    Ok(out)
}

/// Non-streaming path: one engine `invoke`, wrapped into a single OpenAI
/// completion object.
async fn chat_completions_blocking(state: Arc<AppState>, engine_req: Value) -> Response {
    let url = format!("{}/v1/invoke", state.engine_base_url);
    let upstream = match state.http.post(&url).json(&engine_req).send().await {
        Ok(resp) => resp,
        Err(e) => return engine_unreachable(&state.engine_base_url, &e),
    };
    let status = upstream.status();
    let payload: Value = match upstream.json().await {
        Ok(v) => v,
        Err(e) => {
            return openai_error(
                StatusCode::BAD_GATEWAY,
                &format!("invalid engine response: {e}"),
            )
        }
    };
    if !status.is_success() {
        let msg = payload
            .pointer("/error/message")
            .or_else(|| payload.get("message"))
            .and_then(Value::as_str)
            .unwrap_or("engine rejected the request")
            .to_string();
        return openai_error(map_engine_status(status), &msg);
    }

    let text = payload.get("text").and_then(Value::as_str).unwrap_or("");
    let tokens = payload
        .get("tokens_used")
        .and_then(Value::as_u64)
        .unwrap_or(0);
    Json(json!({
        "id": format!("chatcmpl-{}", payload.get("request_id").and_then(Value::as_str).unwrap_or("unknown")),
        "object": "chat.completion",
        "created": chrono::Utc::now().timestamp(),
        "model": payload.get("model_used").and_then(Value::as_str).unwrap_or("unknown"),
        "choices": [{
            "index": 0,
            "message": { "role": "assistant", "content": text },
            "finish_reason": "stop",
        }],
        "usage": {
            "prompt_tokens": 0,
            "completion_tokens": tokens,
            "total_tokens": tokens,
        },
        // Engine metadata beyond the OpenAI contract: which provider actually
        // served the request and whether routing fell back.
        "provider": payload.get("provider").cloned().unwrap_or(Value::Null),
        "fallback_used": payload.get("fallback_used").and_then(Value::as_bool).unwrap_or(false),
    }))
    .into_response()
}

/// Streaming path: relay the engine SSE stream, translating each
/// `StreamChunk` into an OpenAI `chat.completion.chunk` frame.
async fn chat_completions_stream(state: Arc<AppState>, engine_req: Value) -> Response {
    let url = format!("{}/v1/invoke/stream", state.engine_base_url);
    let upstream = match state.http.post(&url).json(&engine_req).send().await {
        Ok(resp) => resp,
        Err(e) => return engine_unreachable(&state.engine_base_url, &e),
    };
    let status = upstream.status();
    if !status.is_success() {
        let payload: Value = upstream.json().await.unwrap_or(Value::Null);
        let msg = payload
            .pointer("/error/message")
            .or_else(|| payload.get("message"))
            .and_then(Value::as_str)
            .unwrap_or("engine rejected the request")
            .to_string();
        return openai_error(map_engine_status(status), &msg);
    }

    let created = chrono::Utc::now().timestamp();
    let (tx, rx) = tokio::sync::mpsc::channel::<Result<Vec<u8>, std::io::Error>>(64);

    tokio::spawn(async move {
        let mut upstream_stream = Box::pin(upstream.bytes_stream());
        // Partial-line carry: SSE frames may split across network chunks,
        // and splitting at `\n` is UTF-8 safe (0x0A never appears inside a
        // multibyte sequence).
        let mut buf: Vec<u8> = Vec::new();
        let mut chat_id = String::from("chatcmpl-unknown");
        let mut model = String::from("unknown");

        while let Some(item) = upstream_stream.next().await {
            let bytes = match item {
                Ok(b) => b,
                Err(e) => {
                    let frame = error_frame(&e.to_string());
                    let _ = tx.send(Ok(frame)).await;
                    break;
                }
            };
            buf.extend_from_slice(&bytes);
            while let Some(pos) = buf.iter().position(|&b| b == b'\n') {
                let line: Vec<u8> = buf.drain(..=pos).collect();
                for frame in translate_sse_line(&line, created, &mut chat_id, &mut model) {
                    if tx.send(Ok(frame)).await.is_err() {
                        // Client disconnected; stop draining the engine.
                        return;
                    }
                }
            }
        }
        // Flush a trailing line if the engine closed without a final newline.
        if !buf.is_empty() {
            for frame in translate_sse_line(&buf, created, &mut chat_id, &mut model) {
                let _ = tx.send(Ok(frame)).await;
            }
        }
    });

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "text/event-stream")
        .header(header::CACHE_CONTROL, "no-cache")
        .body(Body::from_stream(ReceiverStream::new(rx)))
        .unwrap()
}

/// Translate one SSE line from the engine into zero or more OpenAI frames.
/// Each returned Vec is a complete `data: ...\n\n` block ready to send.
fn translate_sse_line(
    line: &[u8],
    created: i64,
    chat_id: &mut String,
    model: &mut String,
) -> Vec<Vec<u8>> {
    let line = String::from_utf8_lossy(line);
    let line = line.trim_end_matches(['\n', '\r']);
    let Some(data) = line.strip_prefix("data:") else {
        // Comments, keep-alive pings, `event:` lines — pass nothing through.
        return Vec::new();
    };
    let data = data.trim();
    if data.is_empty() || data == "[DONE]" {
        return Vec::new();
    }
    let chunk: Value = match serde_json::from_str(data) {
        Ok(v) => v,
        Err(_) => return Vec::new(), // non-JSON keep-alive payload
    };

    let mut frames = Vec::new();
    let chunk_type = chunk.get("type").and_then(Value::as_str).unwrap_or("");
    match chunk_type {
        "started" => {
            *chat_id = format!(
                "chatcmpl-{}",
                chunk
                    .get("request_id")
                    .and_then(Value::as_str)
                    .unwrap_or("unknown")
            );
            *model = chunk
                .get("model_used")
                .and_then(Value::as_str)
                .unwrap_or("unknown")
                .to_string();
            frames.push(sse_frame(json!({
                "id": chat_id,
                "object": "chat.completion.chunk",
                "created": created,
                "model": model,
                "choices": [{
                    "index": 0,
                    "delta": { "role": "assistant", "content": "" },
                    "finish_reason": null,
                }],
            })));
        }
        "text" => {
            if let Some(delta) = chunk.get("delta").and_then(Value::as_str) {
                frames.push(sse_frame(json!({
                    "id": chat_id,
                    "object": "chat.completion.chunk",
                    "created": created,
                    "model": model,
                    "choices": [{
                        "index": 0,
                        "delta": { "content": delta },
                        "finish_reason": null,
                    }],
                })));
            }
        }
        "completed" => {
            let usage = chunk.get("tokens_used").and_then(Value::as_u64);
            let mut final_chunk = json!({
                "id": chat_id,
                "object": "chat.completion.chunk",
                "created": created,
                "model": model,
                "choices": [{
                    "index": 0,
                    "delta": {},
                    "finish_reason": "stop",
                }],
            });
            if let Some(tokens) = usage {
                final_chunk["usage"] = json!({
                    "prompt_tokens": 0,
                    "completion_tokens": tokens,
                    "total_tokens": tokens,
                });
            }
            frames.push(sse_frame(final_chunk));
            frames.push(b"data: [DONE]\n\n".to_vec());
        }
        "error" => {
            let msg = chunk
                .pointer("/error/message")
                .or_else(|| chunk.pointer("/message"))
                .and_then(Value::as_str)
                .unwrap_or("engine stream failed");
            frames.push(error_frame(msg));
            frames.push(b"data: [DONE]\n\n".to_vec());
        }
        _ => {}
    }
    frames
}

/// Serialize one SSE `data:` frame carrying the given JSON value.
fn sse_frame(value: Value) -> Vec<u8> {
    format!("data: {value}\n\n").into_bytes()
}

/// OpenAI-style in-band error frame for stream failures.
fn error_frame(message: &str) -> Vec<u8> {
    sse_frame(json!({ "error": { "message": message, "type": "engine_error" } }))
}

/// GET /v1/models — engine capability cards in the OpenAI model-list shape.
async fn list_models(State(state): State<Arc<AppState>>) -> Response {
    let url = format!("{}/v1/capabilities", state.engine_base_url);
    let upstream = match state.http.get(&url).send().await {
        Ok(resp) => resp,
        Err(e) => return engine_unreachable(&state.engine_base_url, &e),
    };
    let status = upstream.status();
    let payload: Value = match upstream.json().await {
        Ok(v) => v,
        Err(e) => {
            return openai_error(
                StatusCode::BAD_GATEWAY,
                &format!("invalid engine response: {e}"),
            )
        }
    };
    if !status.is_success() {
        return openai_error(map_engine_status(status), "engine capabilities unavailable");
    }

    let cards = payload.as_array().cloned().unwrap_or_default();
    let data: Vec<Value> = cards
        .iter()
        .map(|card| json!({
            "id": card.get("id").cloned().unwrap_or(Value::String("unknown".into())),
            "object": "model",
            "created": 0,
            "owned_by": card.get("provider").cloned().unwrap_or(Value::String("mofa-engine".into())),
            "capability": card.get("capability").cloned().unwrap_or(Value::Null),
            "status": card.get("status").cloned().unwrap_or(Value::Null),
            "cost_tier": card.get("cost_tier").cloned().unwrap_or(Value::Null),
            "context_window": card.get("context_window").cloned().unwrap_or(Value::Null),
        }))
        .collect();
    Json(json!({ "object": "list", "data": data })).into_response()
}

/// GET /v1/engine/health — liveness probe for the configured engine.
/// Always 200; reachability is reported in the body so the UI can show a
/// setup hint instead of a failed request.
async fn engine_health(State(state): State<Arc<AppState>>) -> Response {
    let url = format!("{}/health", state.engine_base_url);
    let probe = state
        .http
        .get(&url)
        .timeout(std::time::Duration::from_secs(2))
        .send()
        .await;
    match probe {
        Ok(resp) if resp.status().is_success() => {
            let body: Value = resp.json().await.unwrap_or(Value::Null);
            Json(json!({
                "engine_url": state.engine_base_url,
                "reachable": true,
                "status": body.get("status").cloned().unwrap_or(json!("ok")),
                "version": body.get("version").cloned().unwrap_or(Value::Null),
            }))
            .into_response()
        }
        _ => Json(json!({
            "engine_url": state.engine_base_url,
            "reachable": false,
            "status": "unreachable",
        }))
        .into_response(),
    }
}

// ==================== Error helpers ====================

/// OpenAI-style error body. The extra top-level `msg` mirrors the
/// `{code, msg}` envelope convention so the frontend apiClient surfaces the
/// specific engine error instead of a generic status message.
fn openai_error(status: StatusCode, message: &str) -> Response {
    (
        status,
        Json(json!({
            "error": { "message": message, "type": "engine_error" },
            "msg": message,
        })),
    )
        .into_response()
}

/// Connection-level failure: the engine is not running at the configured URL.
fn engine_unreachable(url: &str, e: &reqwest::Error) -> Response {
    openai_error(
        StatusCode::SERVICE_UNAVAILABLE,
        &format!(
            "mofa-engine is not reachable at {url} ({e}). Start it with `cargo run --release` \
             inside the mofa-engine checkout, or set MOFA_ENGINE_URL to a running engine."
        ),
    )
}

/// Map an upstream engine HTTP status to the status the gateway reports.
fn map_engine_status(status: StatusCode) -> StatusCode {
    match status.as_u16() {
        404 => StatusCode::NOT_FOUND,
        400 => StatusCode::BAD_REQUEST,
        503 => StatusCode::SERVICE_UNAVAILABLE,
        504 => StatusCode::GATEWAY_TIMEOUT,
        _ => StatusCode::BAD_GATEWAY,
    }
}

// ==================== Tests ====================

#[cfg(test)]
mod tests {
    use super::*;

    fn started() -> Value {
        json!({
            "type": "started",
            "request_id": "req-42",
            "model_used": "mock-model",
            "provider": "mock",
        })
    }

    #[test]
    fn translates_started_text_completed_sequence() {
        let mut chat_id = String::new();
        let mut model = String::new();
        let mut out = Vec::new();
        for chunk in [
            started(),
            json!({"type":"text","delta":"Hel"}),
            json!({"type":"text","delta":"lo"}),
            json!({"type":"completed","duration_ms":9,"tokens_used":5,
                             "file":null,"fallback_used":false,"routing_reason":null}),
        ] {
            let line = format!("data: {chunk}\n");
            out.extend(translate_sse_line(
                line.as_bytes(),
                1_700_000_000,
                &mut chat_id,
                &mut model,
            ));
        }
        let text = String::from_utf8(out.concat()).unwrap();
        // Key order inside JSON objects is not guaranteed; assert per-field.
        assert!(text.contains("\"role\":\"assistant\""));
        assert!(text.contains("\"content\":\"\""));
        assert!(text.contains("\"delta\":{\"content\":\"Hel\"}"));
        assert!(text.contains("\"delta\":{\"content\":\"lo\"}"));
        assert!(text.contains("\"finish_reason\":\"stop\""));
        assert!(text.contains("\"completion_tokens\":5"));
        assert!(text.contains("\"model\":\"mock-model\""));
        assert!(text.contains("\"id\":\"chatcmpl-req-42\""));
        assert!(text.ends_with("data: [DONE]\n\n"));
        assert_eq!(text.matches("[DONE]").count(), 1);
    }

    #[test]
    fn translates_error_chunk_in_band() {
        let mut chat_id = String::new();
        let mut model = String::new();
        let line = b"data: {\"type\":\"error\",\"error\":{\"message\":\"boom\",\"code\":\"x\"}}\n";
        let out = translate_sse_line(line, 1, &mut chat_id, &mut model);
        let text = String::from_utf8(out.concat()).unwrap();
        assert!(text.contains("\"error\":{\"message\":\"boom\""));
        assert!(text.ends_with("data: [DONE]\n\n"));
    }

    #[test]
    fn skips_keepalive_and_non_json_lines() {
        let mut chat_id = String::new();
        let mut model = String::new();
        for line in ["", ": ping", "event: message", "data: ping"] {
            assert!(translate_sse_line(line.as_bytes(), 1, &mut chat_id, &mut model).is_empty());
        }
    }

    #[test]
    fn extract_messages_flattens_multipart_content() {
        let body = json!({
            "messages": [
                { "role": "user", "content": [
                    { "type": "text", "text": "describe" },
                    { "type": "image_url", "image_url": { "url": "data:..." } },
                ]},
            ]
        });
        let msgs = extract_messages(&body).unwrap();
        assert_eq!(msgs[0]["content"], "describe");
    }

    #[test]
    fn extract_messages_rejects_missing_or_empty() {
        assert!(extract_messages(&json!({})).is_err());
        assert!(extract_messages(&json!({"messages": []})).is_err());
        assert!(extract_messages(&json!({"messages": "hi"})).is_err());
    }

    #[test]
    fn engine_url_resolution_prefers_config_then_env() {
        assert_eq!(resolve_engine_url(Some("http://x:1".into())), "http://x:1");
        assert_eq!(resolve_engine_url(None), DEFAULT_ENGINE_URL);
    }
}
