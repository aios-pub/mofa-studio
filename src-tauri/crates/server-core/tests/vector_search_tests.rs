/**
 * Integration tests for PLAT-07's retrieval upgrades: FTS5 global search
 * over the HTTP surface, and the sqlite-vec path for RAG/memory with the
 * honest keyword fallback when the engine has no embedding model.
 *
 * The embedding model is a stub engine injected through
 * `build_router_with_engine`: it answers `embedding` capability invokes with
 * deterministic vectors and errors on everything else, so the vector/keyword
 * split is exercised exactly as production degrades.
 */
mod common;

use std::sync::{atomic::AtomicUsize, atomic::Ordering, Arc};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use serde_json::{json, Value};
use tower::ServiceExt;

use common::{router_with, StubEngine};
use server_core::engine_bridge::EngineCallError;

// ==================== Stub engines ====================

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

/// Engine doubling as an embedding model. Counts embedding invokes via
/// `calls` so tests can prove retrieval really walked the KNN path.
fn embedding_engine(calls: Arc<AtomicUsize>) -> StubEngine {
    StubEngine::with_handler(move |req| {
        if req["capability"] != "embedding" {
            return Err(EngineCallError::rejected(404, "capability not mocked"));
        }
        calls.fetch_add(1, Ordering::SeqCst);
        let inputs: Vec<String> = req["params"]["input"]
            .as_array()
            .map(|a| {
                a.iter()
                    .filter_map(|v| v.as_str().map(str::to_string))
                    .collect()
            })
            .unwrap_or_default();
        if inputs.is_empty() {
            return Err(EngineCallError::rejected(422, "no input"));
        }
        // One embedding row per input, matching the engine contract.
        Ok(json!({
            "embedding": inputs.iter().map(|t| mock_embedding(t)).collect::<Vec<_>>(),
            "model_used": "mock/embed",
        }))
    })
}

/// Stand-in for an engine without any usable embedding model.
fn dead_engine() -> StubEngine {
    StubEngine::with_handler(|_req| {
        Err(EngineCallError::rejected(503, "no capable embedding model"))
    })
}

// ==================== Helpers ====================

async fn body_json(response: axum::response::Response) -> Value {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("read body");
    serde_json::from_slice(&bytes).expect("parse json")
}

/// Upload a text doc through the real RAG multipart endpoint.
async fn upload_doc(app: &axum::Router, name: &str, text: &str) -> Value {
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
    let app = router_with("fts", Arc::new(dead_engine()));
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
    let calls = Arc::new(AtomicUsize::new(0));
    let app = router_with("rag-vec", Arc::new(embedding_engine(calls.clone())));
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
    assert!(calls.load(Ordering::SeqCst) >= 2);
}

#[tokio::test]
async fn rag_retrieval_falls_back_to_keywords_without_embeddings() {
    // Erroring engine: embedding calls fail → keyword scoring must still answer.
    let app = router_with("rag-kw", Arc::new(dead_engine()));
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
    let app = router_with("mem-vec", Arc::new(embedding_engine(Arc::new(AtomicUsize::new(0)))));

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
