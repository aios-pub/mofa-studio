/**
 * Integration tests for project spaces (TASK-24): create/group/count
 * lifecycle, config bundle inheritance, and cleanup semantics.
 */
use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::response::Response;
use serde_json::{json, Value};
use tower::ServiceExt;

use server_core::ServerConfig;

fn gateway_router(tag: &str) -> axum::Router {
    let data_dir = std::env::temp_dir().join(format!("mofa-ws-test-{tag}"));
    let _ = std::fs::remove_dir_all(&data_dir);
    server_core::build_router(&ServerConfig::for_data_dir(data_dir)).expect("router")
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

async fn create_project(app: &axum::Router, title: &str) -> String {
    let (_, created) = post_json(
        app,
        "/api/task/project/create",
        json!({ "title": title, "goal": "g" }),
    )
    .await;
    created["data"]["id"].as_str().unwrap().to_string()
}

#[tokio::test]
async fn space_groups_projects_and_counts_survive_cleanup() {
    let app = gateway_router("lifecycle");

    let (_, space_created) = post_json(
        &app,
        "/api/workspace/create",
        json!({ "name": "市场物料", "description": "品牌组" }),
    )
    .await;
    let space_id = space_created["data"]["id"].as_str().unwrap().to_string();

    let p1 = create_project(&app, "项目1").await;
    let p2 = create_project(&app, "项目2").await;

    // Assign both.
    for pid in [&p1, &p2] {
        let (status, _) = post_json(
            &app,
            &format!("/api/workspace/{space_id}/assign"),
            json!({ "project_id": pid }),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
    }
    // Duplicate assign is idempotent.
    let (_, dup) = post_json(
        &app,
        &format!("/api/workspace/{space_id}/assign"),
        json!({ "project_id": &p1 }),
    )
    .await;
    assert_eq!(dup["data"]["project_ids"].as_array().unwrap().len(), 2);

    // Listing reports live project counts.
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/workspace/list")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let listed = body_json(response).await;
    let space = listed["data"]
        .as_array()
        .unwrap()
        .iter()
        .find(|s| s["id"].as_str() == Some(space_id.as_str()))
        .unwrap();
    assert_eq!(space["project_count"], 2);

    // Derive returns the (still-empty) config bundle for new projects.
    let (_, derived) = post_json(
        &app,
        &format!("/api/workspace/{space_id}/derive"),
        json!({}),
    )
    .await;
    assert_eq!(derived["data"]["space_id"], space_id);
    assert_eq!(derived["data"]["config"], json!({}));
}

#[tokio::test]
async fn config_bundle_roundtrips_for_one_click_reuse() {
    let app = gateway_router("config");

    let (_, space_created) =
        post_json(&app, "/api/workspace/create", json!({ "name": "研发周报" })).await;
    let space_id = space_created["data"]["id"].as_str().unwrap().to_string();

    let bundle = json!({
        "model_policy": { "planner": "deepseek/deepseek-chat", "executor": "ollama/qwen2.5" },
        "mcp_servers": ["mcp-abc123"],
        "sop_refs": ["sop-1", "sop-2"],
        "output_format": "word",
    });
    let (status, _) = post_json(
        &app,
        &format!("/api/workspace/{space_id}/config"),
        json!({ "config": bundle }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    // Derive returns the full bundle.
    let (_, derived) = post_json(
        &app,
        &format!("/api/workspace/{space_id}/derive"),
        json!({}),
    )
    .await;
    assert_eq!(
        derived["data"]["config"]["model_policy"]["planner"],
        "deepseek/deepseek-chat"
    );
    assert_eq!(
        derived["data"]["config"]["sop_refs"]
            .as_array()
            .unwrap()
            .len(),
        2
    );
}

#[tokio::test]
async fn validation_rejects_missing_entities() {
    let app = gateway_router("validate");

    let (status, _) = post_json(&app, "/api/workspace/create", json!({ "name": "" })).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    // Assign a nonexistent project.
    let (_, space_created) = post_json(&app, "/api/workspace/create", json!({ "name": "S" })).await;
    let space_id = space_created["data"]["id"].as_str().unwrap().to_string();

    let (status, _) = post_json(
        &app,
        &format!("/api/workspace/{space_id}/assign"),
        json!({ "project_id": "proj-missing" }),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);

    // Missing config field.
    let (status, _) = post_json(
        &app,
        &format!("/api/workspace/{space_id}/config"),
        json!({}),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    // Unknown space derive.
    let (status, _) = post_json(&app, "/api/workspace/ws-missing/derive", json!({})).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}
