/**
 * Audio endpoints (CHAT-08): OpenAI-compatible ASR (multipart upload →
 * engine asr via input_file) and TTS (text → engine tts → audio/mpeg
 * bytes). Local-first: uploads land under the app data dir.
 */

use std::sync::Arc;

use axum::body::Body;
use axum::extract::{Multipart, State};
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{Json, Router};
use serde_json::{json, Value};

use crate::{err_msg, AppState};

pub(crate) fn audio_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/v1/audio/transcriptions", post(transcribe))
        .route("/v1/audio/speech", post(speech))
}

/// POST /v1/audio/transcriptions (multipart: file) → {text}
async fn transcribe(State(state): State<Arc<AppState>>, mut multipart: Multipart) -> Response {
    let dir = state.data_dir.join("audio");
    if let Err(e) = tokio::fs::create_dir_all(&dir).await {
        return err_msg(StatusCode::INTERNAL_SERVER_ERROR, &format!("创建目录失败: {e}"));
    }
    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        if field.name() != Some("file") {
            continue;
        }
        let bytes = match field.bytes().await {
            Ok(b) => b,
            Err(e) => return err_msg(StatusCode::BAD_REQUEST, &format!("读取上传失败: {e}")),
        };
        if bytes.is_empty() {
            return err_msg(StatusCode::BAD_REQUEST, "音频文件为空");
        }
        let path = dir.join(format!("asr_{}.webm", uuid::Uuid::new_v4()));
        if let Err(e) = tokio::fs::write(&path, &bytes).await {
            return err_msg(StatusCode::INTERNAL_SERVER_ERROR, &format!("写入失败: {e}"));
        }
        let engine_req = json!({
            "capability": "asr",
            "input_file": path.to_string_lossy(),
            "messages": [],
        });
        let url = format!("{}/v1/invoke", state.engine_base_url);
        let upstream = match state.http.post(&url).json(&engine_req).send().await {
            Ok(resp) => resp,
            Err(e) => {
                let _ = tokio::fs::remove_file(&path).await;
                return err_msg(
                    StatusCode::SERVICE_UNAVAILABLE,
                    &format!("mofa-engine 不可达: {e}"),
                );
            }
        };
        let _ = tokio::fs::remove_file(&path).await;
        let status = upstream.status();
        let payload: Value = upstream.json().await.unwrap_or(Value::Null);
        if !status.is_success() {
            let msg = payload
                .pointer("/error/message")
                .or_else(|| payload.get("message"))
                .and_then(Value::as_str)
                .unwrap_or("engine asr failed");
            return err_msg(StatusCode::BAD_GATEWAY, msg);
        }
        return Json(json!({ "text": payload.get("text").and_then(Value::as_str).unwrap_or("") }))
            .into_response();
    }
    err_msg(StatusCode::BAD_REQUEST, "multipart 中没有 file 字段")
}

/// POST /v1/audio/speech {input, voice?, model?} → audio/mpeg bytes
async fn speech(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let input = body.get("input").and_then(Value::as_str).unwrap_or("");
    if input.trim().is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "field `input` is required");
    }
    let mut engine_req = json!({
        "capability": "tts",
        "messages": [{ "role": "user", "content": input }],
        "params": {},
    });
    if let Some(voice) = body.get("voice").and_then(Value::as_str) {
        engine_req["params"]["voice"] = json!(voice);
    }
    if let Some(model) = body.get("model").and_then(Value::as_str) {
        engine_req["model"] = json!(model);
    }

    let url = format!("{}/v1/invoke", state.engine_base_url);
    let upstream = match state.http.post(&url).json(&engine_req).send().await {
        Ok(resp) => resp,
        Err(e) => {
            return err_msg(
                StatusCode::SERVICE_UNAVAILABLE,
                &format!("mofa-engine 不可达: {e}"),
            )
        }
    };
    let status = upstream.status();
    let payload: Value = match upstream.json().await {
        Ok(v) => v,
        Err(e) => return err_msg(StatusCode::BAD_GATEWAY, &format!("invalid engine response: {e}")),
    };
    if !status.is_success() {
        let msg = payload
            .pointer("/error/message")
            .or_else(|| payload.get("message"))
            .and_then(Value::as_str)
            .unwrap_or("engine tts failed");
        return err_msg(StatusCode::BAD_GATEWAY, msg);
    }
    let file = payload.get("file").and_then(Value::as_str).unwrap_or("");
    if file.is_empty() {
        return err_msg(StatusCode::BAD_GATEWAY, "engine returned no audio file");
    }
    match tokio::fs::read(file).await {
        Ok(bytes) => (
            StatusCode::OK,
            [(header::CONTENT_TYPE, "audio/mpeg")],
            Body::from(bytes),
        )
            .into_response(),
        Err(e) => err_msg(
            StatusCode::BAD_GATEWAY,
            &format!("audio artifact not readable ({file}: {e})"),
        ),
    }
}
