/**
 * Integration tests for local file operations (TASK-18): whitelist
 * grant/revoke, confined list/read/write/rename, and the audit trail.
 */
use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::response::Response;
use serde_json::{json, Value};
use tower::ServiceExt;

use server_core::ServerConfig;

fn gateway_router(tag: &str) -> axum::Router {
    let data_dir = std::env::temp_dir().join(format!("mofa-fileops-test-{tag}"));
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

fn scratch(tag: &str) -> std::path::PathBuf {
    let dir = std::env::temp_dir().join(format!("mofa-fileops-scratch-{tag}"));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

#[tokio::test]
async fn whitelist_gates_all_operations_and_audits() {
    let app = gateway_router("whitelist");
    let inside = scratch("inside");
    let outside = scratch("outside");

    // Nothing granted yet: list is forbidden.
    let (status, _) = post_json(
        &app,
        "/api/files/list",
        json!({ "path": inside.to_string_lossy() }),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);

    // Grant the inside root.
    let (status, granted) = post_json(
        &app,
        "/api/files/grant",
        json!({ "path": inside.to_string_lossy() }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(granted["data"]["already"], false);
    // Re-grant dedups.
    let (_, again) = post_json(
        &app,
        "/api/files/grant",
        json!({ "path": inside.to_string_lossy() }),
    )
    .await;
    assert_eq!(again["data"]["already"], true);

    // List works inside.
    std::fs::write(inside.join("a.txt"), b"hello").unwrap();
    let (status, listed) = post_json(
        &app,
        "/api/files/list",
        json!({ "path": inside.to_string_lossy() }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let names: Vec<&str> = listed["data"]["entries"]
        .as_array()
        .unwrap()
        .iter()
        .map(|e| e["name"].as_str().unwrap())
        .collect();
    assert!(names.contains(&"a.txt"));

    // Write inside succeeds and lands on disk.
    let (status, written) = post_json(
        &app,
        "/api/files/write",
        json!({ "path": inside.join("b.txt").to_string_lossy(), "content": "写入内容" }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(written["data"]["bytes"], 12);
    assert_eq!(
        std::fs::read_to_string(inside.join("b.txt")).unwrap(),
        "写入内容"
    );

    // Rename inside succeeds.
    let (status, _) = post_json(
        &app,
        "/api/files/rename",
        json!({
            "from": inside.join("b.txt").to_string_lossy(),
            "to": inside.join("c.txt").to_string_lossy(),
        }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert!(inside.join("c.txt").exists());
    assert!(!inside.join("b.txt").exists());

    // Outside root: write/rename forbidden.
    let (status, _) = post_json(
        &app,
        "/api/files/write",
        json!({ "path": outside.join("x.txt").to_string_lossy(), "content": "no" }),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, _) = post_json(
        &app,
        "/api/files/rename",
        json!({
            "from": inside.join("a.txt").to_string_lossy(),
            "to": outside.join("a.txt").to_string_lossy(),
        }),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);

    // Audit trail records success and failure with reasons.
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/files/audit")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let audit = body_json(response).await;
    let entries = audit["data"].as_array().unwrap();
    assert!(
        entries.len() >= 5,
        "grant+write+rename+2 failures: {entries:?}"
    );
    assert!(entries
        .iter()
        .any(|e| e["op"] == "write" && e["ok"] == true));
    assert!(entries
        .iter()
        .any(|e| e["op"] == "rename" && e["ok"] == false));

    // Revoke removes access.
    let (status, _) = post_json(
        &app,
        "/api/files/revoke",
        json!({ "path": inside.to_string_lossy() }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let (status, _) = post_json(
        &app,
        "/api/files/list",
        json!({ "path": inside.to_string_lossy() }),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn validation_rejects_missing_directories() {
    let app = gateway_router("validate");
    let (status, _) = post_json(&app, "/api/files/grant", json!({ "path": "" })).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    let (status, _) = post_json(
        &app,
        "/api/files/grant",
        json!({ "path": "/nonexistent/definitely/missing" }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    let (status, _) = post_json(&app, "/api/files/revoke", json!({ "path": "/tmp" })).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}
