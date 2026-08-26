/**
 * Integration tests for the embedded server router.
 * Uses tower's oneshot so no real sockets are opened.
 */
mod common;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::Router;
use serde_json::{json, Value};
use tower::ServiceExt;

fn test_router(tag: &str) -> Router  {
    common::router_with(
        tag,
        std::sync::Arc::new(common::StubEngine::default()),
    )
}


async fn json_body(response: axum::http::Response<Body>) -> Value {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("read body");
    serde_json::from_slice(&bytes).expect("parse json")
}

#[tokio::test]
async fn health_returns_ok() {
    let app = test_router("health");
    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn local_login_always_succeeds() {
    let app = test_router("login");
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({ "username": "anyone", "password": "anything" }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = json_body(response).await;
    assert_eq!(body["code"], 0);
    assert!(body["data"]["access_token"]
        .as_str()
        .is_some_and(|t| !t.is_empty()));
    assert_eq!(body["data"]["user"]["username"], "local");
}

#[tokio::test]
async fn collection_crud_roundtrip() {
    let app = test_router("crud");

    // Create
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/agent/create")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({ "name": "writer", "status": "online" }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let created = json_body(response).await;
    assert_eq!(created["code"], 0);
    let id = created["data"]["id"].as_str().unwrap().to_string();
    assert!(created["data"]["created_at"].as_str().is_some());

    // List
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/agent/list")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let list = json_body(response).await;
    assert_eq!(list["data"].as_array().unwrap().len(), 1);

    // Get by id
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/agent/{id}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let fetched = json_body(response).await;
    assert_eq!(fetched["data"]["name"], "writer");

    // Update (id in body, shallow merge)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/agent/update")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({ "id": id, "name": "editor" }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    let updated = json_body(response).await;
    assert_eq!(updated["data"]["name"], "editor");
    assert_eq!(
        updated["data"]["status"], "online",
        "unpatched fields must survive"
    );

    // Delete
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/agent/delete/{id}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/agent/list")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let list = json_body(response).await;
    assert_eq!(list["data"].as_array().unwrap().len(), 0);
}

#[tokio::test]
async fn unknown_endpoint_returns_honest_404() {
    let app = test_router("fallback");
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/some/unknown/endpoint")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    let body = json_body(response).await;
    assert_eq!(body["code"], 1);
}

#[tokio::test]
async fn analytics_overview_counts_conversations() {
    let app = test_router("analytics");

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/conversation/create")
                .header("content-type", "application/json")
                .body(Body::from(json!({ "title": "first chat" }).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/analytics/overview")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let overview = json_body(response).await;
    assert_eq!(overview["data"]["total_conversations"], 1);
}
