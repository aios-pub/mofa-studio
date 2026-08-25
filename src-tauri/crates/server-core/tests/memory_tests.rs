/**
 * Integration tests for long-term memory (TASK-19): the four privacy
 * powers (可见/可编辑/可删除/总开关) plus retrieval gating.
 */

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::response::Response;
use serde_json::{json, Value};
use tower::ServiceExt;

use server_core::ServerConfig;

fn gateway_router(tag: &str) -> axum::Router {
    let data_dir = std::env::temp_dir().join(format!("mofa-memory-test-{tag}"));
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
async fn four_privacy_powers_end_to_end() {
    let app = gateway_router("powers");

    // 可见: create then list.
    let (_, created) = post_json(
        &app,
        "/api/memory/create",
        json!({ "content": "用户偏好简洁的中文回复", "kind": "preference" }),
    )
    .await;
    let id = created["data"]["id"].as_str().unwrap().to_string();
    let response = app
        .clone()
        .oneshot(Request::builder().uri("/api/memory/list").body(Body::empty()).unwrap())
        .await
        .unwrap();
    let listed = body_json(response).await;
    assert!(listed["data"].as_array().unwrap().iter().any(|m| m["id"].as_str() == Some(id.as_str())));

    // 可编辑.
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/memory/{id}"))
                .header("content-type", "application/json")
                .body(Body::from(json!({ "content": "用户偏好英文回复" }).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let updated = body_json(response).await;
    assert_eq!(updated["data"]["content"], "用户偏好英文回复");

    // 可删除.
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/memory/{id}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let response = app
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/memory/{id}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn master_switch_gates_retrieval_not_management() {
    let app = gateway_router("switch");

    let (_, created) = post_json(
        &app,
        "/api/memory/create",
        json!({ "content": "项目背景：橘猫智能周报", "kind": "context" }),
    )
    .await;
    assert!(!created["data"]["id"].as_str().unwrap().is_empty());

    // Retrieval works while enabled.
    let (_, hits) = post_json(
        &app,
        "/api/memory/retrieve",
        json!({ "query": "橘猫 周报" }),
    )
    .await;
    assert_eq!(hits["data"]["disabled"], false);
    assert!(!hits["data"]["hits"].as_array().unwrap().is_empty());

    // 一键停用.
    let (_, toggled) = post_json(&app, "/api/memory/toggle", json!({ "enabled": false })).await;
    assert_eq!(toggled["data"]["enabled"], false);

    // Retrieval is gated off but listing (可见) still works.
    let (_, gated) = post_json(
        &app,
        "/api/memory/retrieve",
        json!({ "query": "橘猫" }),
    )
    .await;
    assert_eq!(gated["data"]["disabled"], true);
    assert!(gated["data"]["hits"].as_array().unwrap().is_empty());

    let response = app
        .oneshot(Request::builder().uri("/api/memory/status").body(Body::empty()).unwrap())
        .await
        .unwrap();
    let status = body_json(response).await;
    assert_eq!(status["data"]["enabled"], false);
    assert_eq!(status["data"]["count"], 1);
}

#[tokio::test]
async fn validation_rejects_bad_input() {
    let app = gateway_router("validate");
    let (status, _) = post_json(&app, "/api/memory/create", json!({ "content": "" })).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    let (status, _) = post_json(
        &app,
        "/api/memory/create",
        json!({ "content": "x", "kind": "unknown" }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    let (status, _) = post_json(&app, "/api/memory/retrieve", json!({ "query": "" })).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}
