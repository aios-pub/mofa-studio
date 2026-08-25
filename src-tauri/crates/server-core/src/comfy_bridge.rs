/**
 * ComfyUI bridge (FLOW-09): whole-graph delegated execution — the mofa
 * graph maps onto a ComfyUI API-compatible prompt JSON, submits to the
 * local ComfyUI's /prompt endpoint, and polls /history for the finished
 * images. Hard boundary per the PRD: our canvas nodes never mix with
 * ComfyUI latent nodes — a bridge submission is entirely ComfyUI-side.
 */
use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::Response;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::{json, Value};

use crate::{err_msg, ok_data, AppState};

const META_KEY: &str = "comfy_base_url";
const DEFAULT_BASE: &str = "http://127.0.0.1:8188";

fn comfy_base(state: &AppState) -> String {
    state
        .store
        .get_meta(META_KEY)
        .filter(|v| !v.is_empty())
        .unwrap_or_else(|| DEFAULT_BASE.to_string())
}

/// GET /api/comfy/status — local ComfyUI detection (PLAT 探测).
async fn status(State(state): State<Arc<AppState>>) -> Response {
    let base = comfy_base(&state);
    match state.http.get(format!("{base}/system_stats")).send().await {
        Ok(resp) if resp.status().is_success() => {
            let payload: Value = resp.json().await.unwrap_or(Value::Null);
            ok_data(json!({
                "base_url": base,
                "reachable": true,
                "system": payload.get("system").cloned().unwrap_or(Value::Null),
            }))
        }
        _ => ok_data(json!({ "base_url": base, "reachable": false })),
    }
}

/// POST /api/comfy/config {base_url}
async fn config(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let base = body.get("base_url").and_then(Value::as_str).unwrap_or("");
    if base.is_empty() || !base.starts_with("http") {
        return err_msg(StatusCode::BAD_REQUEST, "base_url 必须以 http 开头");
    }
    state.store.set_meta(META_KEY, base.trim_end_matches('/'));
    ok_data(json!({ "base_url": base }))
}

/// Build a ComfyUI /prompt body from a text prompt + model — the bridge
/// maps our simplest subgraph (prompt → checkpoint → save) onto the
/// canonical ComfyUI text-to-image API graph. Pure and testable.
pub(crate) fn build_prompt_body(prompt: &str, model: &str, steps: u32) -> Value {
    let negative = "lowres, bad anatomy, watermark";
    json!({
        "prompt": {
            "3": {
                "class_type": "KSampler",
                "inputs": {
                    "seed": 42,
                    "steps": steps,
                    "cfg": 7.0,
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": 1.0,
                    "model": ["4", 0],
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "latent_image": ["5", 0],
                }
            },
            "4": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": { "ckpt_name": model }
            },
            "5": {
                "class_type": "EmptyLatentImage",
                "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }
            },
            "6": {
                "class_type": "CLIPTextEncode",
                "inputs": { "text": prompt, "clip": ["4", 1] }
            },
            "7": {
                "class_type": "CLIPTextEncode",
                "inputs": { "text": negative, "clip": ["4", 1] }
            },
            "8": {
                "class_type": "SaveImage",
                "inputs": { "filename_prefix": "mofa_bridge", "images": ["3", 0] }
            }
        }
    })
}

/// POST /api/comfy/submit {prompt, model?, steps?} → {prompt_id}
/// Whole-graph delegation: submit and return ComfyUI's prompt_id.
async fn submit(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let prompt = body.get("prompt").and_then(Value::as_str).unwrap_or("");
    if prompt.trim().is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "prompt 必填");
    }
    let model = body
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or("sd_xl_base_1.0.safetensors");
    let steps = body
        .get("steps")
        .and_then(Value::as_u64)
        .unwrap_or(20)
        .clamp(1, 150) as u32;

    let base = comfy_base(&state);
    let payload = build_prompt_body(prompt, model, steps);
    let resp = match state
        .http
        .post(format!("{base}/prompt"))
        .json(&payload)
        .send()
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            return err_msg(
                StatusCode::SERVICE_UNAVAILABLE,
                &format!("ComfyUI 不可达（{base}）: {e}——请先启动本机 ComfyUI"),
            )
        }
    };
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return err_msg(
            StatusCode::BAD_GATEWAY,
            &format!(
                "ComfyUI 拒绝提交（HTTP {status}）: {}",
                text.chars().take(300).collect::<String>()
            ),
        );
    }
    let result: Value = resp.json().await.unwrap_or(Value::Null);
    let prompt_id = result
        .get("prompt_id")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();
    if prompt_id.is_empty() {
        return err_msg(StatusCode::BAD_GATEWAY, "ComfyUI 未返回 prompt_id");
    }
    ok_data(json!({ "prompt_id": prompt_id }))
}

/// POST /api/comfy/history/{prompt_id} — poll for finished images. The
/// bridge returns view URLs (ComfyUI serves /view); the gallery can fetch
/// them into the asset model.
async fn history(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(prompt_id): axum::extract::Path<String>,
) -> Response {
    let base = comfy_base(&state);
    let resp = match state
        .http
        .get(format!("{base}/history/{prompt_id}"))
        .send()
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            return err_msg(
                StatusCode::SERVICE_UNAVAILABLE,
                &format!("ComfyUI 不可达: {e}"),
            )
        }
    };
    if !resp.status().is_success() {
        return err_msg(StatusCode::BAD_GATEWAY, "ComfyUI history 查询失败");
    }
    let history: Value = resp.json().await.unwrap_or(Value::Null);
    // /history/{id} returns { "<id>": { outputs: {...}, status: {...} } }
    let entry = history.get(&prompt_id);
    let Some(entry) = entry else {
        return ok_data(json!({ "state": "pending", "images": [] }));
    };
    let state_value = entry
        .pointer("/status/completed")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let mut images: Vec<Value> = Vec::new();
    if let Some(outputs) = entry.get("outputs").and_then(Value::as_object) {
        for node in outputs.values() {
            if let Some(items) = node.get("images").and_then(Value::as_array) {
                for item in items {
                    let filename = item.get("filename").and_then(Value::as_str).unwrap_or("");
                    let subfolder = item.get("subfolder").and_then(Value::as_str).unwrap_or("");
                    let filetype = item.get("type").and_then(Value::as_str).unwrap_or("output");
                    if !filename.is_empty() {
                        images.push(json!({
                            "filename": filename,
                            "view_url": format!(
                                "{base}/view?filename={filename}&subfolder={subfolder}&type={filetype}"
                            ),
                        }));
                    }
                }
            }
        }
    }
    ok_data(json!({
        "state": if state_value { "completed" } else { "running" },
        "images": images,
    }))
}

pub(crate) fn comfy_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/comfy/status", get(status))
        .route("/api/comfy/config", post(config))
        .route("/api/comfy/submit", post(submit))
        .route("/api/comfy/history/{prompt_id}", post(history))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prompt_body_is_a_valid_comfyui_graph() {
        let body = build_prompt_body("一只橘猫", "model.safetensors", 25);
        let prompt = &body["prompt"];
        // The canonical 6-node graph: sampler, loader, latent, 2x encode,
        // save (nodes 3-8 with ids 3,4,5,6,7,8).
        assert_eq!(prompt.as_object().unwrap().len(), 6);
        assert_eq!(prompt["4"]["class_type"], "CheckpointLoaderSimple");
        assert_eq!(prompt["4"]["inputs"]["ckpt_name"], "model.safetensors");
        assert_eq!(prompt["6"]["inputs"]["text"], "一只橘猫");
        assert_eq!(prompt["3"]["inputs"]["steps"], 25);
        // SaveImage consumes the sampler output — the graph is connected.
        assert_eq!(prompt["8"]["inputs"]["images"], json!(["3", 0]));
        // Every link references an existing node id.
        for node in prompt.as_object().unwrap().values() {
            for (key, value) in node["inputs"].as_object().unwrap() {
                if key != "text"
                    && key != "ckpt_name"
                    && key != "filename_prefix"
                    && key != "seed"
                    && key != "steps"
                    && key != "cfg"
                    && key != "sampler_name"
                    && key != "scheduler"
                    && key != "denoise"
                    && key != "width"
                    && key != "height"
                    && key != "batch_size"
                {
                    let link = value.as_array().unwrap();
                    assert!(
                        prompt
                            .as_object()
                            .unwrap()
                            .contains_key(link[0].as_str().unwrap()),
                        "dangling link {key} -> {value}"
                    );
                }
            }
        }
    }
}
