/**
 * Integration tests for backup (PLAT-10): export captures every populated
 * collection; import merge-restores (existing ids win) and rejects
 * foreign files.
 */
use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::response::Response;
use serde_json::{json, Value};
use tower::ServiceExt;

use server_core::ServerConfig;

fn gateway_router(tag: &str) -> axum::Router {
    let data_dir = std::env::temp_dir().join(format!("mofa-backup-test-{tag}"));
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
async fn export_import_roundtrip_with_merge_semantics() {
    // Source app with data.
    let source = gateway_router("source");
    let (_, created) = post_json(
        &source,
        "/api/task/project/create",
        json!({ "title": "周报", "goal": "汇总" }),
    )
    .await;
    let project_id = created["data"]["id"].as_str().unwrap().to_string();

    let (_, mem) = post_json(
        &source,
        "/api/memory/create",
        json!({ "content": "偏好简洁", "kind": "preference" }),
    )
    .await;
    assert!(!mem["data"]["id"].as_str().unwrap().is_empty());

    // Export.
    let (_, backup) = post_json(&source, "/api/backup/export", json!({})).await;
    let payload = &backup["data"];
    assert_eq!(payload["format"], "mofa-backup");
    let projects = payload["collections"]["project"].as_array().unwrap();
    assert!(projects
        .iter()
        .any(|p| p["id"].as_str() == Some(project_id.as_str())));
    assert!(payload["collections"]["memory"].as_array().unwrap().len() >= 1);

    // Fresh app: import the backup.
    let target = gateway_router("target");
    let (status, result) = post_json(&target, "/api/backup/import", backup["data"].clone()).await;
    assert_eq!(status, StatusCode::OK);
    assert!(
        result["data"]["imported"].as_u64().unwrap() >= 2,
        "{result}"
    );

    // Re-import: merge means everything now skips.
    let (_, again) = post_json(&target, "/api/backup/import", backup["data"].clone()).await;
    assert_eq!(again["data"]["imported"], 0);
    assert!(again["data"]["skipped"].as_u64().unwrap() >= 2);
}

#[tokio::test]
async fn import_rejects_foreign_files_and_unknown_collections() {
    let app = gateway_router("validate");

    let (status, body) = post_json(&app, "/api/backup/import", json!({ "format": "other" })).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(body["msg"].as_str().unwrap().contains("mofa-backup"));

    // Unknown collections are reported, not silently dropped.
    let (_, result) = post_json(
        &app,
        "/api/backup/import",
        json!({
            "format": "mofa-backup",
            "collections": {
                "some_plugin": [{ "id": "x" }],
                "memory": [{ "id": "m-1", "content": "c", "kind": "preference" }],
            }
        }),
    )
    .await;
    assert_eq!(result["data"]["imported"], 1);
    let unknown = result["data"]["unknown_collections"].as_array().unwrap();
    assert_eq!(unknown, &[json!("some_plugin")]);
}
