/**
 * Integration tests for workflow execution over HTTP (FLOW-04): a chain
 * graph runs end-to-end against a mock engine, incremental re-runs hit
 * the signature cache, and the SSE stream surfaces node statuses live.
 */
use axum::body::Body;
use axum::extract::Json;
use axum::http::{Request, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::Router;
use serde_json::{json, Value};
use tower::ServiceExt;

use server_core::ServerConfig;

// ==================== Mock engine ====================

async fn mock_chat_completions(Json(_body): Json<Value>) -> Response {
    Json(json!({
        "id": "chatcmpl-1",
        "choices": [{ "message": { "role": "assistant", "content": "扩写后的提示词" }, "finish_reason": "stop" }],
        "usage": { "prompt_tokens": 1, "completion_tokens": 2 },
    }))
    .into_response()
}

async fn mock_images_generations(Json(body): Json<Value>) -> Response {
    // Distinct output per prompt+size so cache behavior is observable.
    let prompt = body["prompt"].as_str().unwrap_or("");
    let size = body["size"].as_str().unwrap_or("1024x1024");
    Json(json!({
        "created": 1,
        "data": [{ "b64_json": base64_of(format!("{prompt}@{size}")) }],
        "model_used": "mock/mock-image",
        "provider": "mock",
    }))
    .into_response()
}

fn base64_of(input: String) -> String {
    // Tiny deterministic stand-in: hex-encode (not real base64, but unique
    // per input which is all the assertions need).
    input
        .bytes()
        .map(|b| format!("{b:02x}"))
        .collect::<String>()
}

async fn spawn_mock_engine() -> String {
    let app = Router::new()
        .route("/v1/chat/completions", post(mock_chat_completions))
        .route("/v1/images/generations", post(mock_images_generations));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    format!("http://{addr}")
}

// ==================== Helpers ====================

fn gateway_router(engine_url: String, tag: &str) -> Router {
    let data_dir = std::env::temp_dir().join(format!("mofa-flow-test-{tag}"));
    let _ = std::fs::remove_dir_all(&data_dir);
    let mut config = ServerConfig::for_data_dir(data_dir);
    config.engine_base_url = Some(engine_url);
    server_core::build_router(&config).expect("build router")
}

async fn body_json(response: Response) -> Value {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("read body");
    serde_json::from_slice(&bytes).expect("parse json")
}

async fn body_string(response: Response) -> String {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("read body");
    String::from_utf8(bytes.to_vec()).expect("utf8")
}

fn chain_graph(prompt: &str, size: &str) -> Value {
    json!({
        "nodes": [
            { "id": "prompt", "type": "prompt_text", "params": { "text": prompt } },
            { "id": "gen", "type": "image_gen", "params": { "size": size } },
            { "id": "out", "type": "output", "params": {} },
        ],
        "edges": [
            { "from": "prompt", "to": "gen" },
            { "from": "gen", "to": "out" },
        ],
    })
}

fn execute_request(graph: Value) -> Request<Body> {
    Request::builder()
        .method("POST")
        .uri("/api/flow/execute")
        .header("content-type", "application/json")
        .body(Body::from(graph.to_string()))
        .unwrap()
}

fn stream_request(graph: Value) -> Request<Body> {
    Request::builder()
        .method("POST")
        .uri("/api/flow/execute/stream")
        .header("content-type", "application/json")
        .body(Body::from(graph.to_string()))
        .unwrap()
}

// ==================== Tests ====================

#[tokio::test]
async fn chain_runs_end_to_end_and_caches_on_rerun() {
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "chain");

    let first = app
        .clone()
        .oneshot(execute_request(chain_graph("橘猫", "1024x1024")))
        .await
        .unwrap();
    assert_eq!(first.status(), StatusCode::OK);
    let first = body_json(first).await;
    assert_eq!(first["ok"], true, "first run: {first}");
    assert_eq!(first["executed"], 3);
    assert_eq!(first["cached"], 0);
    let gen_output = first["node_outputs"]["gen"]["images"][0]
        .as_str()
        .expect("image payload");
    // 橘猫@1024x1024 in hex — the mock's deterministic per-prompt payload.
    assert!(
        gen_output.starts_with("e6a998e78cab40"),
        "prompt+size payload: {gen_output}"
    );

    // Identical rerun: everything served from the signature cache.
    let second = app
        .clone()
        .oneshot(execute_request(chain_graph("橘猫", "1024x1024")))
        .await
        .unwrap();
    let second = body_json(second).await;
    assert_eq!(second["cached"], 3, "rerun hits cache: {second}");
    assert_eq!(second["executed"], 0);

    // Size-only change (last generator param): prompt cached, gen+out rerun.
    let third = app
        .oneshot(execute_request(chain_graph("橘猫", "768x1024")))
        .await
        .unwrap();
    let third = body_json(third).await;
    assert_eq!(third["executed"], 2);
    assert_eq!(third["cached"], 1);
}

#[tokio::test]
async fn stream_endpoint_surfaces_node_statuses() {
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "stream");

    let response = app
        .oneshot(stream_request(chain_graph("橘猫", "1024x1024")))
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.headers().get("content-type").unwrap(),
        "text/event-stream"
    );
    let body = body_string(response).await;

    // Lifecycle per node: queued → running/cached → done, plus the final
    // finished event and the aggregate result frame.
    assert!(body.contains(r#""node_id":"prompt""#));
    assert!(body.contains(r#""status":"queued""#));
    assert!(body.contains(r#""status":"running""#));
    assert!(body.contains(r#""status":"done""#));
    assert!(body.contains(r#""type":"execution_finished""#));
    assert!(body.contains(r#""executed":3"#));
    // The aggregate result frame repeats node outputs.
    assert!(body.contains("node_outputs"));
}

#[tokio::test]
async fn invalid_graph_reports_honestly() {
    let engine = spawn_mock_engine().await;
    let app = gateway_router(engine, "invalid");

    // Cycle: a→b→a.
    let cyclic = json!({
        "nodes": [
            { "id": "a", "type": "llm_text", "params": {} },
            { "id": "b", "type": "llm_text", "params": {} },
        ],
        "edges": [
            { "from": "a", "to": "b" },
            { "from": "b", "to": "a" },
        ],
    });
    let response = app.clone().oneshot(execute_request(cyclic)).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = body_json(response).await;
    assert_eq!(body["ok"], false);
    assert!(body["error"].as_str().unwrap().contains("cycle"));

    // Generator without input.
    let orphan = json!({
        "nodes": [{ "id": "gen", "type": "image_gen", "params": {} }],
        "edges": [],
    });
    let response = app.oneshot(execute_request(orphan)).await.unwrap();
    let body = body_json(response).await;
    assert_eq!(body["ok"], false);
    assert!(body["error"]
        .as_str()
        .unwrap()
        .contains("requires at least one upstream"));
}

// ==================== FLOW-06: PNG metadata recovery + version history ====================

/// A minimal structurally-valid PNG (the embed path only splices chunks).
fn minimal_png_bytes() -> Vec<u8> {
    fn chunk(kind: &[u8], data: &[u8]) -> Vec<u8> {
        fn crc32(data: &[u8]) -> u32 {
            let mut table = [0u32; 256];
            for (i, entry) in table.iter_mut().enumerate() {
                let mut c = i as u32;
                for _ in 0..8 {
                    c = if c & 1 != 0 {
                        0xEDB8_8320 ^ (c >> 1)
                    } else {
                        c >> 1
                    };
                }
                *entry = c;
            }
            let mut crc = 0xFFFF_FFFFu32;
            for &b in data {
                crc = table[((crc ^ b as u32) & 0xFF) as usize] ^ (crc >> 8);
            }
            crc ^ 0xFFFF_FFFF
        }
        let mut crc_input = Vec::new();
        crc_input.extend_from_slice(kind);
        crc_input.extend_from_slice(data);
        let mut out = Vec::new();
        out.extend_from_slice(&(data.len() as u32).to_be_bytes());
        out.extend_from_slice(&crc_input);
        out.extend_from_slice(&crc32(&crc_input).to_be_bytes());
        out
    }
    let mut png = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    png.extend_from_slice(&chunk(b"IHDR", &[0; 13]));
    png.extend_from_slice(&chunk(b"IDAT", b"z"));
    png.extend_from_slice(&chunk(b"IEND", &[]));
    png
}

#[tokio::test]
async fn execute_embeds_workflow_into_output_pngs() {
    use base64::Engine as _;
    let png_b64 = base64::engine::general_purpose::STANDARD.encode(minimal_png_bytes());
    let app_engine = Router::new().route(
        "/v1/images/generations",
        post(move |Json(body): Json<Value>| {
            let prompt = body["prompt"].as_str().unwrap_or("").to_string();
            let b64 = png_b64.clone();
            async move {
                Json(json!({
                    "created": 1,
                    "data": [{ "b64_json": b64, "prompt_echo": prompt }],
                    "model_used": "mock/mock-image",
                }))
            }
        }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app_engine).await.unwrap();
    });

    let data_dir = std::env::temp_dir().join("mofa-flow-png-meta-test");
    let _ = std::fs::remove_dir_all(&data_dir);
    let mut config = ServerConfig::for_data_dir(data_dir);
    config.engine_base_url = Some(format!("http://{addr}"));
    let app = server_core::build_router(&config).unwrap();

    let graph = json!({
        "nodes": [
            { "id": "p", "type": "prompt_text", "params": { "text": "橘猫" } },
            { "id": "i", "type": "image_gen", "params": {} },
            { "id": "o", "type": "output", "params": {} },
        ],
        "edges": [
            { "from": "p", "to": "i" },
            { "from": "i", "to": "o" },
        ],
    });
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/flow/execute")
                .header("content-type", "application/json")
                .body(Body::from(graph.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let result: Value = serde_json::from_slice(&bytes).unwrap();

    // Every image output now carries the workflow snapshot.
    let outputs = result["node_outputs"].as_object().unwrap();
    let mut checked = 0;
    for output in outputs.values() {
        let Some(images) = output.get("images").and_then(Value::as_array) else {
            continue;
        };
        for image in images {
            let b64 = image.as_str().unwrap();
            let decoded = base64::engine::general_purpose::STANDARD
                .decode(b64)
                .unwrap();
            let workflow = server_core::png_meta::extract_workflow(&decoded)
                .expect("workflow snapshot embedded");
            let parsed: Value = serde_json::from_str(&workflow).unwrap();
            assert_eq!(parsed["nodes"].as_array().unwrap().len(), 3);
            checked += 1;
        }
    }
    assert!(checked >= 1, "no image outputs found: {result}");
}

#[tokio::test]
async fn flow_doc_version_history_round_trip() {
    let engine = spawn_mock_engine().await;
    let data_dir = std::env::temp_dir().join("mofa-flow-docs-test");
    let _ = std::fs::remove_dir_all(&data_dir);
    let mut config = ServerConfig::for_data_dir(data_dir);
    config.engine_base_url = Some(engine);
    let app = server_core::build_router(&config).unwrap();

    let graph_v1 = json!({ "nodes": [{ "id": "a", "type": "prompt_text", "params": {"text": "v1"} }], "edges": [] });
    let graph_v2 = json!({ "nodes": [{ "id": "a", "type": "prompt_text", "params": {"text": "v2"} }], "edges": [] });

    // Save twice under one doc id.
    let save = |app: &Router, id: &str, name: &str, graph: Value| {
        let app = app.clone();
        let uri = "/api/flow/docs".to_string();
        let body = json!({ "id": id, "name": name, "graph": graph }).to_string();
        async move {
            app.oneshot(
                Request::builder()
                    .method("POST")
                    .uri(uri)
                    .header("content-type", "application/json")
                    .body(Body::from(body))
                    .unwrap(),
            )
            .await
            .unwrap()
        }
    };
    let first = save(&app, "doc-1", "我的工作流", graph_v1.clone()).await;
    assert_eq!(first.status(), StatusCode::OK);
    let second = save(&app, "doc-1", "我的工作流", graph_v2.clone()).await;
    assert_eq!(second.status(), StatusCode::OK);

    // Listing shows the doc with latest_version=2.
    let list = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/flow/docs")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let docs: Value = serde_json::from_slice(
        &axum::body::to_bytes(list.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!(docs["data"][0]["latest_version"], 2);

    // Version index (newest first) omits graph payloads.
    let versions = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/flow/docs/doc-1/versions")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let idx: Value = serde_json::from_slice(
        &axum::body::to_bytes(versions.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!(idx["data"].as_array().unwrap().len(), 2);
    assert_eq!(idx["data"][0]["version_index"], 2);
    assert!(idx["data"][0].get("graph").is_none());

    // Each version fetches its exact graph.
    for (index, expected) in [(1u64, &graph_v1), (2u64, &graph_v2)] {
        let fetch = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri(format!("/api/flow/docs/doc-1/versions/{index}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        let body: Value = serde_json::from_slice(
            &axum::body::to_bytes(fetch.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();
        assert_eq!(body["data"], *expected, "version {index}");
    }

    // Unknown doc/version → honest 404s.
    for uri in [
        "/api/flow/docs/nope/versions",
        "/api/flow/docs/doc-1/versions/99",
    ] {
        let missing = app
            .clone()
            .oneshot(Request::builder().uri(uri).body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(missing.status(), StatusCode::NOT_FOUND, "{uri}");
    }
}
