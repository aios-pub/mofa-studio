/**
 * Integration tests for the RAG endpoints (CHAT-11): upload → chunk →
 * retrieve with citation sources.
 */
mod common;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::response::Response;
use serde_json::{json, Value};
use tower::ServiceExt;


fn gateway_router(tag: &str) -> axum::Router  {
    common::router_with(
        tag,
        std::sync::Arc::new(common::StubEngine::default()),
    )
}

async fn body_json(response: Response) -> Value {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("read body");
    serde_json::from_slice(&bytes).expect("parse json")
}

fn multipart_body(boundary: &str, filename: &str, content: &str) -> Body {
    Body::from(format!(
        "--{b}\r\ncontent-disposition: form-data; name=\"file\"; filename=\"{f}\"\r\ncontent-type: text/plain\r\n\r\n{c}\r\n--{b}--\r\n",
        b = boundary,
        f = filename,
        c = content
    ))
}

#[tokio::test]
async fn upload_chunks_and_query_citations() {
    let app = gateway_router("roundtrip");
    let boundary = "RAG-BOUNDARY";

    // A document long enough to chunk, with a distinctive fact in the middle.
    let filler = "这是一段与问题无关的填充内容，用于把文档撑到多个分块。".repeat(60);
    let content = format!("{filler}\n橘猫的习性是白天睡觉晚上活动，喜欢晒太阳。\n{filler}");
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
                .body(multipart_body(boundary, "猫科资料.txt", &content))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let uploaded = body_json(response).await;
    let data = &uploaded["data"];
    let doc_id = data["doc_id"].as_str().expect("doc id").to_string();
    assert!(data["chunks"].as_u64().unwrap() >= 2, "chunked: {data}");
    assert!(data["chars"].as_u64().unwrap() > 2000);

    // Query for the distinctive fact.
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rag/query")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({ "doc_id": doc_id, "query": "橘猫的习性是什么", "top_k": 2 })
                        .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let queried = body_json(response).await;
    let hits = queried["data"]["hits"].as_array().expect("hits");
    assert!(!hits.is_empty());
    // The top hit contains the fact and carries a citation source.
    assert!(hits[0]["text"].as_str().unwrap().contains("白天睡觉"));
    assert!(
        hits[0]["source"]
            .as_str()
            .unwrap()
            .contains("猫科资料.txt 第"),
        "source: {hits:?}"
    );
}

#[tokio::test]
async fn upload_rejects_unsupported_formats_with_pdf_hint() {
    let app = gateway_router("reject");
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rag/upload")
                .header("content-type", "multipart/form-data; boundary=B")
                .body(multipart_body("B", "幻灯片.pptx", "binary"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let body = body_json(response).await;
    assert!(body["msg"].as_str().unwrap().contains("PDF"));
}

#[tokio::test]
async fn query_requires_doc_and_query() {
    let app = gateway_router("validate");
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/rag/query")
                .header("content-type", "application/json")
                .body(Body::from(json!({ "doc_id": "" }).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}
