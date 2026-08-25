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
use axum::extract::{Multipart, State};
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::{json, Value};
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::StreamExt;

use crate::{search, spans, AppState};

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
        .route("/v1/images/generations", post(image_generations))
        .route("/v1/images/edits", post(image_edits))
        .route("/v1/models", get(list_models))
        .route("/v1/engine/health", get(engine_health))
        .route(
            "/v1/config/providers",
            get(list_engine_providers).post(add_engine_provider),
        )
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

    let has_images = messages.iter().any(|m| {
        m.get("images")
            .and_then(Value::as_array)
            .is_some_and(|a| !a.is_empty())
    });
    // Vision auto-routing: image-bearing requests ask for the vlm capability
    // so the engine picks a vision-capable model.
    let capability = if has_images { "vlm" } else { "chat" };
    let mut engine_req = json!({ "capability": capability, "messages": messages });
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
    // Generic provider params (e.g. `enable_thinking` for hybrid reasoning
    // models) pass through verbatim; providers forward what they understand.
    if let Some(extra) = body.get("params").and_then(Value::as_object) {
        for (key, value) in extra {
            params[key.as_str()] = value.clone();
        }
    }
    engine_req["params"] = params;

    // CHAT-03 web search: run retrieval first, ground the prompt, and pass
    // sources through to the UI as citations.
    let web_search = body
        .get("web_search")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let mut web_sources: Vec<Value> = Vec::new();
    if web_search {
        let query = messages
            .iter()
            .rev()
            .find(|m| m.get("role").and_then(Value::as_str) == Some("user"))
            .and_then(|m| m.get("content").and_then(Value::as_str))
            .unwrap_or_default()
            .to_string();
        match search::run_search(&state, &query, 5).await {
            Ok(results) if !results.is_empty() => {
                let numbered: Vec<String> = results
                    .iter()
                    .enumerate()
                    .map(|(index, r)| {
                        format!("[{}] {} — {}\n{}", index + 1, r.title, r.url, r.snippet)
                    })
                    .collect();
                let grounding = format!(
                    "以下是联网检索到的参考资料（引用序号与来源列表对应）。回答时优先依据这些资料，并在句末用 [序号] 标注引用：\n\n{}",
                    numbered.join("\n\n"),
                );
                // Prepend as the first system message.
                let mut grounded =
                    vec![json!({ "role": "system", "content": grounding, "images": [] })];
                grounded.extend(messages.clone());
                engine_req["messages"] = Value::Array(grounded);
                web_sources = results
                    .iter()
                    .enumerate()
                    .map(|(index, r)| {
                        json!({
                            "index": index + 1,
                            "title": r.title,
                            "url": r.url,
                            "snippet": r.snippet,
                        })
                    })
                    .collect();
            }
            Ok(_) => {}
            Err(_msg) => {
                // Unconfigured/failed search surfaces as an in-band note; the
                // chat itself still answers without grounding.
                web_sources = vec![json!({ "error": "search_unavailable" })];
            }
        }
    }

    let stream = body.get("stream").and_then(Value::as_bool).unwrap_or(false);
    if stream {
        chat_completions_stream(state, engine_req, web_sources).await
    } else {
        chat_completions_blocking(state, engine_req, web_sources).await
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
        let mut images: Vec<String> = Vec::new();
        let content = match msg.get("content") {
            Some(Value::String(s)) => s.clone(),
            Some(Value::Array(parts)) => {
                let mut texts = Vec::new();
                for part in parts {
                    match part.get("type").and_then(Value::as_str) {
                        Some("image_url") => {
                            // Vision parts ride along as message images for
                            // the engine's multimodal format.
                            if let Some(url) =
                                part.pointer("/image_url/url").and_then(Value::as_str)
                            {
                                images.push(url.to_string());
                            }
                        }
                        _ => {
                            if let Some(text) = part.get("text").and_then(Value::as_str) {
                                texts.push(text.to_string());
                            }
                        }
                    }
                }
                texts.join("\n")
            }
            _ => String::new(),
        };
        out.push(json!({ "role": role, "content": content, "images": images }));
    }
    Ok(out)
}

/// Whether any message carries images (vision input).

/// Non-streaming path: one engine `invoke`, wrapped into a single OpenAI
/// completion object.
async fn chat_completions_blocking(
    state: Arc<AppState>,
    engine_req: Value,
    web_sources: Vec<Value>,
) -> Response {
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
        spans::record_span(
            &state.store,
            spans::KIND_LLM,
            spans::SOURCE_CHAT,
            body_model(&engine_req),
            None,
            None,
            None,
            0,
            "error",
            Some(&msg),
        );
        return openai_error(map_engine_status(status), &msg);
    }

    let text = payload.get("text").and_then(Value::as_str).unwrap_or("");
    let tokens = payload
        .get("tokens_used")
        .and_then(Value::as_u64)
        .unwrap_or(0);
    spans::record_span(
        &state.store,
        spans::KIND_LLM,
        spans::SOURCE_CHAT,
        payload
            .get("model_used")
            .and_then(Value::as_str)
            .unwrap_or("unknown"),
        payload.get("provider").and_then(Value::as_str),
        None,
        Some(tokens),
        payload
            .get("duration_ms")
            .and_then(Value::as_u64)
            .unwrap_or(0),
        "ok",
        None,
    );
    let reasoning = payload
        .get("reasoning")
        .and_then(Value::as_str)
        .filter(|r| !r.is_empty());
    Json(json!({
        "id": format!("chatcmpl-{}", payload.get("request_id").and_then(Value::as_str).unwrap_or("unknown")),
        "object": "chat.completion",
        "created": chrono::Utc::now().timestamp(),
        "model": payload.get("model_used").and_then(Value::as_str).unwrap_or("unknown"),
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": text,
                // DeepSeek-R1 style reasoning trace, when the model emits one.
                "reasoning_content": reasoning,
            },
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
        // CHAT-03 citations for web-grounded answers.
        "web_sources": if web_sources.is_empty() { Value::Null } else { Value::Array(web_sources) },
    }))
    .into_response()
}

/// Streaming path: relay the engine SSE stream, translating each
/// `StreamChunk` into an OpenAI `chat.completion.chunk` frame.
async fn chat_completions_stream(
    state: Arc<AppState>,
    engine_req: Value,
    web_sources: Vec<Value>,
) -> Response {
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

    // PLAT-15: one span per streamed call, recorded when the relay ends.
    let span_state = state.clone();

    // Leading frame carries the citation list before any text delta.
    let leading_frame = if web_sources.is_empty() {
        None
    } else {
        Some(sse_frame(json!({ "web_sources": web_sources })))
    };

    tokio::spawn(async move {
        if let Some(frame) = leading_frame {
            let _ = tx.send(Ok(frame)).await;
        }
        let mut upstream_stream = Box::pin(upstream.bytes_stream());
        // Partial-line carry: SSE frames may split across network chunks,
        // and splitting at `\n` is UTF-8 safe (0x0A never appears inside a
        // multibyte sequence).
        let mut buf: Vec<u8> = Vec::new();
        let mut chat_id = String::from("chatcmpl-unknown");
        let mut model = String::from("unknown");
        let mut tokens_seen: Option<u64> = None;
        let mut saw_error = false;

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
                for frame in translate_sse_line(
                    &line,
                    created,
                    &mut chat_id,
                    &mut model,
                    &mut tokens_seen,
                    &mut saw_error,
                ) {
                    if tx.send(Ok(frame)).await.is_err() {
                        // Client disconnected; stop draining the engine.
                        return;
                    }
                }
            }
        }
        // Flush a trailing line if the engine closed without a final newline.
        if !buf.is_empty() {
            for frame in translate_sse_line(
                &buf,
                created,
                &mut chat_id,
                &mut model,
                &mut tokens_seen,
                &mut saw_error,
            ) {
                let _ = tx.send(Ok(frame)).await;
            }
        }

        let status = if saw_error { "error" } else { "ok" };
        spans::record_span(
            &span_state.store,
            spans::KIND_LLM,
            spans::SOURCE_CHAT,
            if model.is_empty() { "unknown" } else { &model },
            None,
            None,
            tokens_seen,
            0,
            status,
            if saw_error {
                Some("stream failed in-band")
            } else {
                None
            },
        );
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
    tokens_seen: &mut Option<u64>,
    saw_error: &mut bool,
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
        "thinking" => {
            // Reasoning trace (DeepSeek-R1 style): forwarded as
            // `reasoning_content` so OpenAI-compatible clients can render it
            // in a separate collapsible area.
            if let Some(delta) = chunk.get("delta").and_then(Value::as_str) {
                frames.push(sse_frame(json!({
                    "id": chat_id,
                    "object": "chat.completion.chunk",
                    "created": created,
                    "model": model,
                    "choices": [{
                        "index": 0,
                        "delta": { "reasoning_content": delta },
                        "finish_reason": null,
                    }],
                })));
            }
        }
        "completed" => {
            let usage = chunk.get("tokens_used").and_then(Value::as_u64);
            if usage.is_some() {
                *tokens_seen = usage;
            }
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
            *saw_error = true;
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

/// The model field of an engine request, for span metadata.
fn body_model(engine_req: &Value) -> &str {
    engine_req
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or("auto")
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

/// POST /v1/images/generations — OpenAI image API over the engine's
/// `image_gen` capability. The engine writes artifacts to its output dir
/// and reports paths (`files`); the gateway reads them off the shared host
/// and returns base64 payloads in the OpenAI shape. `n` candidates come
/// from `n` concurrent engine invokes (the engine itself always yields one
/// image per call).
async fn image_generations(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Value>,
) -> Response {
    let Some(prompt) = body.get("prompt").and_then(Value::as_str) else {
        return openai_error(StatusCode::BAD_REQUEST, "field `prompt` is required");
    };

    let mut engine_req = json!({
        "capability": "image_gen",
        "messages": [{ "role": "user", "content": prompt }],
    });
    if let Some(model) = body.get("model").and_then(Value::as_str) {
        engine_req["model"] = json!(model);
    }
    let mut params = json!({});
    if let Some(size) = body.get("size").and_then(Value::as_str) {
        params["size"] = json!(size);
    }
    engine_req["params"] = params;

    let n = body.get("n").and_then(Value::as_u64).unwrap_or(1);
    let (payload, files) = match fan_out_image_jobs(&state, engine_req, n).await {
        Ok(v) => v,
        Err(resp) => return resp,
    };
    let data = match artifacts_to_data(&files).await {
        Ok(d) => d,
        Err(resp) => return resp,
    };
    if data.is_empty() {
        return openai_error(
            StatusCode::BAD_GATEWAY,
            "engine returned no image artifacts",
        );
    }

    spans::record_span(
        &state.store,
        spans::KIND_IMAGE_GEN,
        spans::SOURCE_STUDIO,
        payload
            .get("model_used")
            .and_then(Value::as_str)
            .unwrap_or("unknown"),
        payload.get("provider").and_then(Value::as_str),
        None,
        None,
        payload
            .get("duration_ms")
            .and_then(Value::as_u64)
            .unwrap_or(0),
        "ok",
        None,
    );

    Json(json!({
        "created": chrono::Utc::now().timestamp(),
        "data": data,
        // Engine metadata beyond the OpenAI contract.
        "model_used": payload.get("model_used").cloned().unwrap_or(Value::Null),
        "provider": payload.get("provider").cloned().unwrap_or(Value::Null),
    }))
    .into_response()
}

/// One engine image job (`image_gen` / `image_edit`) → its response payload
/// plus the artifact paths it produced. Prefers the full artifact list,
/// falling back to the single `file` mirror. `Err` carries the ready-to-serve
/// error response.
async fn engine_image_artifacts(
    state: &Arc<AppState>,
    engine_req: &Value,
) -> Result<(Value, Vec<String>), Response> {
    let url = format!("{}/v1/invoke", state.engine_base_url);
    let upstream = match state.http.post(&url).json(engine_req).send().await {
        Ok(resp) => resp,
        Err(e) => return Err(engine_unreachable(&state.engine_base_url, &e)),
    };
    let status = upstream.status();
    let payload: Value = match upstream.json().await {
        Ok(v) => v,
        Err(e) => {
            return Err(openai_error(
                StatusCode::BAD_GATEWAY,
                &format!("invalid engine response: {e}"),
            ))
        }
    };
    if !status.is_success() {
        let msg = payload
            .pointer("/error/message")
            .or_else(|| payload.get("message"))
            .and_then(Value::as_str)
            .unwrap_or("engine rejected the request")
            .to_string();
        return Err(openai_error(map_engine_status(status), &msg));
    }

    let files: Vec<String> = payload
        .get("files")
        .and_then(Value::as_array)
        .map(|a| {
            a.iter()
                .filter_map(Value::as_str)
                .map(str::to_string)
                .collect()
        })
        .filter(|v: &Vec<String>| !v.is_empty())
        .unwrap_or_else(|| {
            payload
                .get("file")
                .and_then(Value::as_str)
                .map(|f| vec![f.to_string()])
                .unwrap_or_default()
        });
    Ok((payload, files))
}

/// Run one image job `n` times concurrently (the engine yields a single
/// artifact per invoke), collecting every artifact. `n` is clamped to
/// `[1, 4]` — the four-grid candidate ceiling (TOOL-01). The first failure
/// fails the whole batch with that error.
async fn fan_out_image_jobs(
    state: &Arc<AppState>,
    engine_req: Value,
    n: u64,
) -> Result<(Value, Vec<String>), Response> {
    let n = n.clamp(1, 4) as usize;
    let handles: Vec<_> = (0..n)
        .map(|_| {
            let state = state.clone();
            let req = engine_req.clone();
            tokio::spawn(async move { engine_image_artifacts(&state, &req).await })
        })
        .collect();
    let mut first: Option<Value> = None;
    let mut files = Vec::new();
    for handle in handles {
        match handle.await {
            Ok(Ok((payload, mut paths))) => {
                if first.is_none() {
                    first = Some(payload);
                }
                files.append(&mut paths);
            }
            Ok(Err(resp)) => return Err(resp),
            Err(e) => {
                return Err(openai_error(
                    StatusCode::BAD_GATEWAY,
                    &format!("image job task failed: {e}"),
                ))
            }
        }
    }
    first
        .ok_or_else(|| {
            openai_error(
                StatusCode::BAD_GATEWAY,
                "engine returned no image artifacts",
            )
        })
        .map(|payload| (payload, files))
}

/// Read engine artifact paths off the shared host into OpenAI `b64_json`
/// entries. Artifacts live on the engine's machine — the honest error says
/// so when a path is unreadable.
async fn artifacts_to_data(files: &[String]) -> Result<Vec<Value>, Response> {
    let mut data = Vec::with_capacity(files.len());
    for path in files {
        match tokio::fs::read(path).await {
            Ok(bytes) => {
                use base64::Engine as _;
                data.push(json!({
                    "b64_json": base64::engine::general_purpose::STANDARD.encode(&bytes),
                }));
            }
            Err(e) => {
                return Err(openai_error(
                    StatusCode::BAD_GATEWAY,
                    &format!(
                        "engine artifact is not readable from the gateway host ({path}: {e}); \
                         is mofa-engine running on this machine?"
                    ),
                ));
            }
        }
    }
    Ok(data)
}

/// POST /v1/images/edits — the OpenAI image-edits contract over the engine's
/// `image_edit` capability (TOOL-01 垫图 I2I / 局部重绘). Multipart fields:
/// `image` (file, required), `mask` (file, optional — its fully transparent
/// areas mark the regions to regenerate), `prompt`, `model?`, `size?`, `n?`.
/// Uploads are forwarded inline as base64 data URLs; nothing is written to
/// the gateway's disk.
async fn image_edits(State(state): State<Arc<AppState>>, mut multipart: Multipart) -> Response {
    // Repeated `image` fields = multi-reference consistency (TOOL-01): the
    // first is the edited base, the rest are anchors.
    let mut images: Vec<(Vec<u8>, String)> = Vec::new();
    let mut mask: Option<(Vec<u8>, String)> = None;
    let mut prompt = String::new();
    let mut model: Option<String> = None;
    let mut size: Option<String> = None;
    let mut n: u64 = 1;

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "image" | "mask" => {
                let mime = field.content_type().unwrap_or("image/png").to_string();
                let bytes = match field.bytes().await {
                    Ok(b) => b.to_vec(),
                    Err(e) => {
                        return openai_error(
                            StatusCode::BAD_REQUEST,
                            &format!("reading upload `{name}` failed: {e}"),
                        )
                    }
                };
                if bytes.is_empty() {
                    return openai_error(
                        StatusCode::BAD_REQUEST,
                        &format!("field `{name}` is empty"),
                    );
                }
                if name == "image" {
                    images.push((bytes, mime));
                } else {
                    mask = Some((bytes, mime));
                }
            }
            "prompt" => {
                if let Ok(text) = field.text().await {
                    prompt = text;
                }
            }
            "model" => {
                if let Ok(text) = field.text().await {
                    if !text.trim().is_empty() {
                        model = Some(text);
                    }
                }
            }
            "size" => {
                if let Ok(text) = field.text().await {
                    if !text.trim().is_empty() {
                        size = Some(text);
                    }
                }
            }
            "n" => {
                if let Ok(text) = field.text().await {
                    n = text.trim().parse().unwrap_or(1);
                }
            }
            _ => {}
        }
    }

    if images.is_empty() {
        return openai_error(StatusCode::BAD_REQUEST, "field `image` is required");
    }
    if prompt.trim().is_empty() {
        return openai_error(StatusCode::BAD_REQUEST, "field `prompt` is required");
    }

    use base64::Engine as _;
    let engine = base64::engine::general_purpose::STANDARD;
    let image_urls: Vec<String> = images
        .iter()
        .map(|(bytes, mime)| format!("data:{mime};base64,{}", engine.encode(bytes)))
        .collect();
    let mut engine_req = json!({
        "capability": "image_edit",
        "messages": [{ "role": "user", "content": prompt, "images": image_urls }],
    });
    if let Some(m) = &model {
        engine_req["model"] = json!(m);
    }
    if let Some((mask_bytes, mask_mime)) = &mask {
        engine_req["input_mask"] = json!(format!(
            "data:{mask_mime};base64,{}",
            engine.encode(mask_bytes)
        ));
    }
    let mut params = json!({});
    if let Some(s) = &size {
        params["size"] = json!(s);
    }
    engine_req["params"] = params;

    let (payload, files) = match fan_out_image_jobs(&state, engine_req, n).await {
        Ok(v) => v,
        Err(resp) => return resp,
    };
    let data = match artifacts_to_data(&files).await {
        Ok(d) => d,
        Err(resp) => return resp,
    };
    if data.is_empty() {
        return openai_error(
            StatusCode::BAD_GATEWAY,
            "engine returned no image artifacts",
        );
    }

    spans::record_span(
        &state.store,
        spans::KIND_IMAGE_EDIT,
        spans::SOURCE_STUDIO,
        payload
            .get("model_used")
            .and_then(Value::as_str)
            .unwrap_or("unknown"),
        payload.get("provider").and_then(Value::as_str),
        None,
        None,
        payload
            .get("duration_ms")
            .and_then(Value::as_u64)
            .unwrap_or(0),
        "ok",
        None,
    );

    Json(json!({
        "created": chrono::Utc::now().timestamp(),
        "data": data,
        // Engine metadata beyond the OpenAI contract.
        "model_used": payload.get("model_used").cloned().unwrap_or(Value::Null),
        "provider": payload.get("provider").cloned().unwrap_or(Value::Null),
        // Honest signal for the UI: a mask was supplied → 局部重绘, else I2I.
        "masked": json!(!mask.is_none()),
    }))
    .into_response()
}

/// GET /v1/config/providers — masked provider listing from the engine.
async fn list_engine_providers(State(state): State<Arc<AppState>>) -> Response {
    let url = format!("{}/v1/config/providers", state.engine_base_url);
    match state.http.get(&url).send().await {
        Ok(resp) if resp.status().is_success() => {
            let payload: Value = resp.json().await.unwrap_or(Value::Null);
            Json(payload).into_response()
        }
        Ok(resp) => openai_error(
            map_engine_status(resp.status()),
            "engine provider listing failed",
        ),
        Err(e) => engine_unreachable(&state.engine_base_url, &e),
    }
}

/// POST /v1/config/providers — BYOK setup: register a provider on the
/// engine (persisted there, key stays server-side).
async fn add_engine_provider(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Value>,
) -> Response {
    let url = format!("{}/v1/config/providers", state.engine_base_url);
    let upstream = match state.http.post(&url).json(&body).send().await {
        Ok(resp) => resp,
        Err(e) => return engine_unreachable(&state.engine_base_url, &e),
    };
    let status = upstream.status();
    let payload: Value = upstream.json().await.unwrap_or(Value::Null);
    if !status.is_success() {
        let msg = payload
            .pointer("/message")
            .or_else(|| payload.pointer("/error/message"))
            .and_then(Value::as_str)
            .unwrap_or("engine rejected the provider config")
            .to_string();
        return openai_error(map_engine_status(status), &msg);
    }
    Json(payload).into_response()
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
    fn translates_thinking_chunks_as_reasoning_content() {
        let mut chat_id = String::new();
        let mut model = String::new();
        let mut out = Vec::new();
        for chunk in [
            started(),
            json!({"type":"thinking","delta":"先想"}),
            json!({"type":"thinking","delta":"再想"}),
            json!({"type":"text","delta":"答案"}),
            json!({"type":"completed","duration_ms":9,"tokens_used":5,
                   "file":null,"fallback_used":false,"routing_reason":null}),
        ] {
            let line = format!("data: {chunk}\n");
            out.extend(translate_sse_line(
                line.as_bytes(),
                1_700_000_000,
                &mut chat_id,
                &mut model,
                &mut None,
                &mut false,
            ));
        }
        let text = String::from_utf8(out.concat()).unwrap();
        assert!(text.contains("\"reasoning_content\":\"先想\""));
        assert!(text.contains("\"reasoning_content\":\"再想\""));
        assert!(text.contains("\"content\":\"答案\""));
        // Thinking deltas must not be folded into the answer content field.
        let answer_start = text.find("\"content\":\"答案\"").expect("answer delta");
        let first_thinking = text.find("\"reasoning_content\"").expect("thinking delta");
        assert!(first_thinking < answer_start);
        assert!(text.ends_with("data: [DONE]\n\n"));
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
                &mut None,
                &mut false,
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
        let mut tokens = None;
        let mut errored = false;
        let out = translate_sse_line(line, 1, &mut chat_id, &mut model, &mut tokens, &mut errored);
        let line_text = String::from_utf8_lossy(line);
        if line_text.contains("completed") {
            assert_eq!(tokens, Some(5));
        }
        if line_text.contains("error") {
            assert!(errored);
        }
        let text = String::from_utf8(out.concat()).unwrap();
        assert!(text.contains("\"error\":{\"message\":\"boom\""));
        assert!(text.ends_with("data: [DONE]\n\n"));
    }

    #[test]
    fn skips_keepalive_and_non_json_lines() {
        let mut chat_id = String::new();
        let mut model = String::new();
        for line in ["", ": ping", "event: message", "data: ping"] {
            assert!(translate_sse_line(
                line.as_bytes(),
                1,
                &mut chat_id,
                &mut model,
                &mut None,
                &mut false,
            )
            .is_empty());
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
