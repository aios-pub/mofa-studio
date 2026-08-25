/**
 * Integration tests for SOP templates (TASK-20): create via the generic
 * collection + trigger binding (转自动化流水线).
 */
use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::response::Response;
use serde_json::{json, Value};
use tower::ServiceExt;

use server_core::ServerConfig;

fn gateway_router(tag: &str) -> axum::Router {
    let data_dir = std::env::temp_dir().join(format!("mofa-sop-test-{tag}"));
    let _ = std::fs::remove_dir_all(&data_dir);
    server_core::build_router(&ServerConfig::for_data_dir(data_dir)).expect("build router")
}

async fn body_json(response: Response) -> Value {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("read body");
    serde_json::from_slice(&bytes).expect("parse json")
}

async fn post_json(app: &axum::Router, uri: &str, body: Value) -> (StatusCode, Value) {
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
async fn create_then_bind_cron_trigger() {
    let app = gateway_router("trigger");

    let (status, created) = post_json(
        &app,
        "/api/sop/create",
        json!({
            "name": "周报 SOP",
            "description": "源自项目",
            "output_format": "word",
            "steps": [{ "title": "汇总", "prompt": "汇总 {{数据源}}", "strategy": "direct" }]
        }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let sop_id = created["data"]["id"].as_str().unwrap().to_string();
    assert!(sop_id.starts_with("sop-"));
    assert!(created["data"]["trigger"].is_null());

    // Bind a cron trigger → the template becomes an automation pipeline.
    let (status, bound) = post_json(
        &app,
        &format!("/api/sop/{sop_id}/trigger"),
        json!({ "kind": "cron", "cron": "0 9 * * 1" }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(bound["data"]["trigger"]["kind"], "cron");
    assert_eq!(bound["data"]["trigger"]["cron"], "0 9 * * 1");

    // The generic list reads the same doc.
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/sop/list")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let listed = body_json(response).await;
    let items = listed["data"].as_array().unwrap();
    assert!(items
        .iter()
        .any(|s| s["id"].as_str() == Some(sop_id.as_str())));
}

#[tokio::test]
async fn validation_rejects_bad_input() {
    let app = gateway_router("validate");

    let (status, _) = post_json(&app, "/api/sop/create", json!({ "name": "" })).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let (_, created) = post_json(
        &app,
        "/api/sop/create",
        json!({ "name": "S", "steps": [{ "title": "t", "prompt": "p", "strategy": "direct" }] }),
    )
    .await;
    let id = created["data"]["id"].as_str().unwrap().to_string();

    // cron kind without an expression
    let (status, _) = post_json(
        &app,
        &format!("/api/sop/{id}/trigger"),
        json!({ "kind": "cron" }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    // unknown kind
    let (status, _) = post_json(
        &app,
        &format!("/api/sop/{id}/trigger"),
        json!({ "kind": "webhook" }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    // missing template
    let (status, _) = post_json(
        &app,
        "/api/sop/sop-missing/trigger",
        json!({ "kind": "manual" }),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}
