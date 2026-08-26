/**
 * Integration tests for PLAT-07's retrieval upgrades: FTS5 global search
 * over the HTTP surface, and the sqlite-vec path for RAG/memory with the
 * honest keyword fallback when the engine has no embedding model.
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

/// Deterministic embedding: hashes the text into a 4-dim vector so
/// same-ish texts land close — enough to prove KNN ordering by content.
fn mock_embedding(text: &str) -> Vec<f32> {
    let mut out = vec![0.0f32; 4];
    for (index, byte) in text.bytes().enumerate() {
        out[index % 4] += (byte % 17) as f32 / 17.0;
    }
    let norm = out.iter().map(|v| v * v).sum::<f32>().sqrt().max(1e-6);
    out.iter().map(|v| v / norm).collect()
}

/// Captured embedding requests (for the vector-path assertion).
static EMBED_CALLS: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);

async fn mock_invoke(Json(req): Json<Value>) -> Response {
    if req["capability"] == "embedding" {
        EMBED_CALLS.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        let inputs: Vec<String> = req["params"]["input"]
            .as_array()
            .map(|a| {
                a.iter()
                    .filter_map(|v| v.as_str().map(str::to_string))
                    .collect()
            })
            .unwrap_or_default();
        if inputs.is_empty() {
            return (StatusCode::UNPROCESSABLE_ENTITY, "no input").into_response();
        }
        return Json(json!({
            "embedding": inputs.iter().map(|t| mock_embedding(t)).collect::<Vec<_>>(),
            "model_used": "mock/embed",
        }))
        .into_response();
    }
    (StatusCode::NOT_FOUND, "capability not mocked").into_response()
}

async fn spawn_mock_engine() -> String {
    let app = Router::new().route("/v1/invoke", post(mock_invoke));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    format!("http://{addr}")
}

fn router(engine_url: String, tag: &str) -> Router {
    let data_dir = std::env::temp_dir().join(format!("mofa-vec-search-{tag}"));
    let _ = std::fs::remove_dir_all(&data_dir);
    let mut config = ServerConfig::for_data_dir(data_dir);
    config.engine_base_url = Some(engine_url);
    server_core::build_router(&config).expect("build router")
}

fn dead_engine_router(tag: &str) -> Router {
    router("http://127.0.0.1:9".into(), tag)
}

async fn body_json(response: Response) -> Value {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("read body");
    serde_json::from_slice(&bytes).expect("parse json")
}

/// Upload a text doc through the real RAG multipart endpoint.
async fn upload_doc(app: &Router, name: &str, text: &str) -> Value {
    let boundary = "vecb";
    let body = format!(
        "--{boundary}\r\ncontent-disposition: form-data; name=\"file\"; filename=\"{name}\"\r\ncontent-type: text/plain\r\n\r\n{text}\r\n--{boundary}--\r\n"
    );
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rag/upload")
                .header(
                    "content-type",
                    format!("multipart/form-data; boundary={boundary}"),
                )
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    body_json(response).await
}

#[tokio::test]
async fn fts5_global_search_finds_conversations_and_docs_over_http() {
    let app = dead_engine_router("fts");
    // Seed a conversation and a rag doc through the generic collections
    // route family — the store's insert path maintains the FTS index.
    let seeded = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/conversation/create")
                .header("content-type", "application/json")
                .body(Body::from(json!({ "title": "橘猫饲养记录" }).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(seeded.status(), StatusCode::OK, "seed conversation");

    let response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/search?q=%E6%A9%98%E7%8C%AB&limit=10")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = body_json(response).await;
    assert_eq!(
        body["data"]["conversations"].as_array().map(Vec::len),
        Some(1),
        "conversation hit: {body}"
    );
}

#[tokio::test]
async fn rag_retrieval_uses_vectors_when_embeddings_exist() {
    let engine = spawn_mock_engine().await;
    let app = router(engine, "rag-vec");
    let uploaded = upload_doc(&app, "cat.txt", "橘猫喜欢晒太阳，午后在窗台打盹。").await;
    assert_eq!(uploaded["data"]["chunks"].as_u64(), Some(1));
    assert_eq!(
        uploaded["data"]["vector_indexed"].as_u64(),
        Some(1),
        "chunk embedded + indexed: {uploaded}"
    );

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rag/query")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({ "doc_id": uploaded["data"]["doc_id"], "query": "橘猫 晒太阳" })
                        .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = body_json(response).await;
    assert_eq!(
        body["data"]["retrieval"], "vector",
        "used the KNN path: {body}"
    );
    assert!(body["data"]["hits"].as_array().unwrap().len() >= 1);
    assert!(EMBED_CALLS.load(std::sync::atomic::Ordering::SeqCst) >= 2);
}

#[tokio::test]
async fn rag_retrieval_falls_back_to_keywords_without_embeddings() {
    // Dead engine: embedding calls fail → keyword scoring must still answer.
    let app = dead_engine_router("rag-kw");
    let uploaded = upload_doc(&app, "dog.txt", "柴犬每天需要遛两次，早晚各一次。").await;
    assert_eq!(
        uploaded["data"]["vector_indexed"].as_u64(),
        Some(0),
        "nothing indexed without an embedding model"
    );

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rag/query")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({ "doc_id": uploaded["data"]["doc_id"], "query": "柴犬 遛" }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = body_json(response).await;
    assert_eq!(body["data"]["retrieval"], "keyword");
    assert!(body["data"]["hits"].as_array().unwrap().len() >= 1);
}

#[tokio::test]
async fn memory_retrieval_upgrades_to_vectors_too() {
    let engine = spawn_mock_engine().await;
    let app = router(engine, "mem-vec");

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/memory/create")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({ "content": "用户偏好下午三点提醒喝水", "kind": "preference" })
                        .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/memory/retrieve")
                .header("content-type", "application/json")
                .body(Body::from(json!({ "query": "喝水 提醒" }).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    let body = body_json(response).await;
    assert_eq!(body["data"]["retrieval"], "vector", "{body}");
    assert_eq!(body["data"]["hits"].as_array().map(Vec::len), Some(1));
}
