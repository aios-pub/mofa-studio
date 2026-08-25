/**
 * Integration tests for the ComfyUI bridge (FLOW-09): detection, config,
 * whole-graph submit, and history polling — against a mock ComfyUI.
 */
use axum::body::Body;
use axum::extract::Path;
use axum::http::{Request, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::{json, Value};
use tower::ServiceExt;

use server_core::ServerConfig;

// ==================== Mock ComfyUI ====================

async fn system_stats() -> Response {
    Json(json!({
        "system": { "os": "macos", "comfyui_version": "0.3" },
        "devices": [],
    }))
    .into_response()
}

async fn prompt(Json(body): Json<Value>) -> Response {
    // Validate the delegated graph shape before accepting.
    let nodes = body["prompt"].as_object().cloned().unwrap_or_default();
    assert!(nodes.len() >= 5, "expected the 5-node bridge graph");
    assert!(nodes
        .values()
        .any(|n| n["class_type"] == "CheckpointLoaderSimple"));
    Json(json!({ "prompt_id": "cb-1234" })).into_response()
}

async fn history_handler(Path(prompt_id): Path<String>) -> Response {
    if prompt_id != "cb-1234" {
        return Json(json!({})).into_response();
    }
    Json(json!({
        "cb-1234": {
            "outputs": {
                "8": { "images": [{ "filename": "mofa_bridge_00001_.png", "subfolder": "", "type": "output" }] }
            },
            "status": { "completed": true, "status_str": "success" }
        }
    }))
    .into_response()
}

async fn spawn_mock_comfy() -> String {
    let app = Router::new()
        .route("/system_stats", get(system_stats))
        .route("/prompt", post(prompt))
        .route("/history/{id}", get(history_handler));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    format!("http://{addr}")
}

fn gateway_router(comfy_url: String, tag: &str) -> Router {
    let data_dir = std::env::temp_dir().join(format!("mofa-comfy-test-{tag}"));
    let _ = std::fs::remove_dir_all(&data_dir);
    let router = server_core::build_router(&ServerConfig::for_data_dir(data_dir)).expect("router");
    let _ = comfy_url;
    router
}

async fn body_json(response: Response) -> Value {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("read body");
    serde_json::from_slice(&bytes).expect("parse json")
}

async fn post_json(app: &Router, uri: &str, body: Value) -> (StatusCode, Value) {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(uri)
                .header("content-type", "application/json")
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    (status, body_json(response).await)
}

#[tokio::test]
async fn detect_config_submit_poll_roundtrip() {
    let comfy = spawn_mock_comfy().await;
    let app = gateway_router(comfy.clone(), "roundtrip");

    // Configure the bridge to the mock.
    let (status, _) = post_json(&app, "/api/comfy/config", json!({ "base_url": comfy })).await;
    assert_eq!(status, StatusCode::OK);

    // Detection sees the mock.
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/comfy/status")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let detected = body_json(response).await;
    assert_eq!(detected["data"]["reachable"], true);
    assert_eq!(detected["data"]["system"]["comfyui_version"], "0.3");

    // Whole-graph submit returns the prompt_id.
    let (status, submitted) = post_json(
        &app,
        "/api/comfy/submit",
        json!({ "prompt": "一只橘猫", "model": "sd_xl.safetensors", "steps": 30 }),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{submitted}");
    let prompt_id = submitted["data"]["prompt_id"].as_str().unwrap().to_string();

    // History poll finds the finished image with a view URL.
    let (status, history) =
        post_json(&app, &format!("/api/comfy/history/{prompt_id}"), json!({})).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(history["data"]["state"], "completed");
    let images = history["data"]["images"].as_array().unwrap();
    assert_eq!(images.len(), 1);
    assert!(images[0]["view_url"]
        .as_str()
        .unwrap()
        .contains("/view?filename=mofa_bridge_00001_.png"));
}

#[tokio::test]
async fn unreachable_comfy_reports_honestly_and_validation_works() {
    let comfy = spawn_mock_comfy().await;
    let app = gateway_router(comfy, "validate");

    // No config → default 8188 unreachable → submit 503 with the start hint.
    let (status, body) = post_json(&app, "/api/comfy/submit", json!({ "prompt": "x" })).await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert!(body["msg"].as_str().unwrap().contains("启动本机 ComfyUI"));

    // Empty prompt rejected.
    let (status, _) = post_json(&app, "/api/comfy/submit", json!({ "prompt": "" })).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    // Bad base_url rejected.
    let (status, _) = post_json(&app, "/api/comfy/config", json!({ "base_url": "ftp://x" })).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    // Unknown history id stays pending (empty mapping).
    let comfy2 = spawn_mock_comfy().await;
    let _ = post_json(&app, "/api/comfy/config", json!({ "base_url": comfy2 })).await;
    let (_, pending) = post_json(&app, "/api/comfy/history/unknown", json!({})).await;
    assert_eq!(pending["data"]["state"], "pending");
}
