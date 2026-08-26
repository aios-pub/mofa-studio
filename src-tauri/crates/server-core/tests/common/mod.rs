//! Shared harness for integration tests: a stub engine injected through
//! `build_router_with_engine`, replacing the old axum-based mock daemon.
//!
//! The stub reproduces the canned behaviors the tests assert against
//! (echo chat, artifact-writing image jobs, scripted stream chunks), while
//! the router under test runs exactly as production does - in-process
//! calls, no socket hop.
//!
//! Each integration test includes this module; helpers used by only some
//! of them would otherwise trip dead_code warnings.
#![allow(dead_code)]
use std::sync::Arc;

use async_trait::async_trait;
use serde_json::{json, Value};
use tower::ServiceExt;

use server_core::engine_bridge::{EngineCallError, LlmEngine};

/// Handler producing the invoke response for a given wire request.
pub type InvokeHandler = Arc<dyn Fn(Value) -> Result<Value, EngineCallError> + Send + Sync>;

/// Fixed payload the default stub serves for chat/vlm invokes.
pub const MOCK_TEXT: &str = "hello from mock engine";

/// Scripted engine: per-request handler plus static capability/health data.
pub struct StubEngine {
    pub on_invoke: InvokeHandler,
    /// Chunks yielded when the gateway relays `stream: true`.
    pub stream_chunks: Vec<Value>,
    /// Model cards served to `/v1/models`.
    pub capabilities: Vec<Value>,
}

impl Default for StubEngine {
    fn default() -> Self {
        Self {
            on_invoke: Arc::new(|req| {
                let capability = req.get("capability").and_then(Value::as_str).unwrap_or("");
                Ok(json!({
                    "text": MOCK_TEXT,
                    "capability": capability,
                    "file": Value::Null,
                    "model_used": "mock/mock-model",
                    "provider": "mock",
                    "duration_ms": 7,
                    "request_id": "req-42",
                    "tokens_used": 12,
                    "fallback_used": false,
                    "routing_reason": "capability_default",
                    "cost_usd": 0.02,
                }))
            }),
            stream_chunks: vec![
                json!({"type":"started","request_id":"req-42","model_used":"mock/mock-model","provider":"mock"}),
                json!({"type":"text","delta":"Hel"}),
                json!({"type":"text","delta":"lo"}),
                json!({"type":"completed","duration_ms":9,"tokens_used":5,"file":null,"fallback_used":false,"routing_reason":null}),
            ],
            capabilities: vec![json!({
                "id": "mock/mock-model",
                "name": "Mock Model",
                "provider": "mock",
                "capability": "chat",
                "capabilities": ["chat"],
                "status": "hot",
                "availability": "discovered",
                "residency": "loaded",
                "execution": { "active_requests": 0, "max_concurrency": 4 },
                "cost_tier": "free",
                "context_window": 8192,
                "memory_estimate_bytes": 4096,
            })],
        }
    }
}

impl StubEngine {
    /// Build a stub whose invoke responses come from `handler`.
    pub fn with_handler(
        handler: impl Fn(Value) -> Result<Value, EngineCallError> + Send + Sync + 'static,
    ) -> Self {
        Self {
            on_invoke: Arc::new(handler),
            ..Self::default()
        }
    }
}

#[async_trait]
impl LlmEngine for StubEngine {
    async fn invoke(&self, req: Value) -> Result<Value, EngineCallError> {
        (self.on_invoke)(req)
    }

    fn invoke_stream(
        &self,
        _req: Value,
    ) -> Result<tokio::sync::mpsc::Receiver<Value>, EngineCallError> {
        let (tx, rx) = tokio::sync::mpsc::channel(16);
        let chunks = self.stream_chunks.clone();
        tokio::spawn(async move {
            for chunk in chunks {
                if tx.send(chunk).await.is_err() {
                    break;
                }
            }
        });
        Ok(rx)
    }

    async fn capabilities(&self) -> Vec<Value> {
        self.capabilities.clone()
    }

    async fn health(&self) -> Value {
        json!({ "status": "ok", "embedded": true, "providers": 1 })
    }

    async fn add_provider_config(&self, provider: &Value) -> Result<Value, EngineCallError> {
        // The real bridge rejects an openai_compatible provider without key;
        // mirror that so BYOK setup-path assertions stay meaningful.
        let kind = provider.get("kind").and_then(Value::as_str).unwrap_or("");
        if kind == "openai_compatible"
            && provider
                .get("api_key")
                .and_then(Value::as_str)
                .unwrap_or("")
                .trim()
                .is_empty()
        {
            return Err(EngineCallError::rejected(
                400,
                "openai_compatible providers require an api_key",
            ));
        }
        Ok(json!({
            "name": provider.get("name").cloned().unwrap_or(Value::Null),
            "persisted": true,
        }))
    }

    async fn list_providers(&self) -> Value {
        json!({ "providers": [{ "name": "mock", "models": ["mock/mock-model"] }] })
    }
}

// ==================== Router helpers ====================

/// Build the full application router with `engine` injected.
pub fn router_with(tag: &str, engine: Arc<StubEngine>) -> axum::Router {
    let data_dir = std::env::temp_dir().join(format!("mofa-test-{tag}"));
    let _ = std::fs::remove_dir_all(&data_dir);
    server_core::build_router_with_engine(&server_core::ServerConfig::for_data_dir(data_dir), engine)
        .expect("build router")
}

/// Send a JSON POST and return (status, body-bytes).
pub async fn post_json(
    app: axum::Router,
    uri: &str,
    body: Value,
) -> (axum::http::StatusCode, axum::body::Bytes) {
    let response = app
        .oneshot(
            axum::http::Request::builder()
                .method(axum::http::Method::POST)
                .uri(uri)
                .header(axum::http::header::CONTENT_TYPE, "application/json")
                .body(axum::body::Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .expect("infallible service");
    let status = response.status();
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("read body");
    (status, bytes)
}

/// Read the whole response body as a string.
pub async fn body_string(response: axum::response::Response) -> String {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("read body");
    String::from_utf8(bytes.to_vec()).expect("utf8 body")
}
