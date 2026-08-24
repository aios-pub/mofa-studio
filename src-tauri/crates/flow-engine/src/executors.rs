//! Node executors: the engine-facing side of the flow. A trait so tests
//! run against in-memory doubles while production talks to mofa-engine
//! over HTTP.

use async_trait::async_trait;
use serde_json::{json, Value};

use crate::types::FlowNode;

/// What a node produces.
#[derive(Debug, Clone)]
pub struct NodeOutput(pub Value);

#[derive(Debug, thiserror::Error)]
pub enum ExecError {
    #[error("{0}")]
    Failed(String),
    #[error("engine unreachable: {0}")]
    Unreachable(String),
}

/// Chat/image backend used by generation nodes.
#[async_trait]
pub trait EngineClient: Send + Sync {
    async fn chat(&self, prompt: &str, params: &Value) -> Result<String, ExecError>;
    async fn image_gen(&self, prompt: &str, params: &Value) -> Result<Vec<String>, ExecError>;
}

/// Execute one node given its resolved upstream outputs.
/// Pure node kinds run inline; generation nodes go through `engine`.
pub async fn execute_node(
    node: &FlowNode,
    upstream_outputs: &[Value],
    engine: &dyn EngineClient,
) -> Result<NodeOutput, ExecError> {
    // Upstream text: concatenation of text fields (prompt chain semantics).
    let upstream_text: Vec<String> = upstream_outputs
        .iter()
        .filter_map(|o| o.get("text").and_then(Value::as_str).map(str::to_string))
        .collect();
    let prompt = if upstream_text.is_empty() {
        node.params
            .get("text")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string()
    } else {
        upstream_text.join("\n")
    };

    match node.node_type {
        crate::types::NodeType::PromptText => Ok(NodeOutput(json!({
            "text": node.params.get("text").cloned().unwrap_or(Value::String(String::new())),
        }))),
        crate::types::NodeType::Constant => Ok(NodeOutput(json!({
            "value": node.params.get("value").cloned().unwrap_or(Value::Null),
        }))),
        crate::types::NodeType::LlmText => {
            let text = engine.chat(&prompt, &node.params).await?;
            Ok(NodeOutput(json!({ "text": text })))
        }
        crate::types::NodeType::ImageGen => {
            let images = engine.image_gen(&prompt, &node.params).await?;
            Ok(NodeOutput(json!({ "images": images })))
        }
        crate::types::NodeType::Output => {
            // Terminal node: forward the (single) upstream payload verbatim.
            let payload = upstream_outputs.first().cloned().unwrap_or(Value::Null);
            Ok(NodeOutput(json!({ "result": payload })))
        }
    }
}

/// HTTP EngineClient over mofa-engine's OpenAI-compatible gateway surface.
pub struct HttpEngineClient {
    pub base_url: String,
    pub client: reqwest::Client,
}

impl HttpEngineClient {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
            // Local/direct service; never route through a system proxy.
            client: reqwest::Client::builder()
                .no_proxy()
                .build()
                .expect("reqwest client"),
        }
    }
}

#[async_trait]
impl EngineClient for HttpEngineClient {
    async fn chat(&self, prompt: &str, params: &Value) -> Result<String, ExecError> {
        let mut body = json!({ "messages": [{ "role": "user", "content": prompt }] });
        if let Some(model) = params.get("model").and_then(Value::as_str) {
            body["model"] = json!(model);
        }
        let resp = self
            .client
            .post(format!("{}/v1/chat/completions", self.base_url))
            .json(&body)
            .send()
            .await
            .map_err(|e| ExecError::Unreachable(e.to_string()))?;
        if !resp.status().is_success() {
            return Err(ExecError::Failed(format!("chat HTTP {}", resp.status())));
        }
        let payload: Value = resp
            .json()
            .await
            .map_err(|e| ExecError::Failed(format!("bad chat payload: {e}")))?;
        Ok(payload
            .pointer("/choices/0/message/content")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string())
    }

    async fn image_gen(&self, prompt: &str, params: &Value) -> Result<Vec<String>, ExecError> {
        let mut body = json!({ "prompt": prompt });
        if let Some(n) = params.get("n").and_then(Value::as_u64) {
            body["n"] = json!(n);
        }
        if let Some(size) = params.get("size").and_then(Value::as_str) {
            body["size"] = json!(size);
        }
        let resp = self
            .client
            .post(format!("{}/v1/images/generations", self.base_url))
            .json(&body)
            .send()
            .await
            .map_err(|e| ExecError::Unreachable(e.to_string()))?;
        if !resp.status().is_success() {
            return Err(ExecError::Failed(format!(
                "image gen HTTP {}",
                resp.status()
            )));
        }
        let payload: Value = resp
            .json()
            .await
            .map_err(|e| ExecError::Failed(format!("bad image payload: {e}")))?;
        let images = payload
            .get("data")
            .and_then(Value::as_array)
            .map(|items| {
                items
                    .iter()
                    .filter_map(|i| {
                        i.get("b64_json")
                            .and_then(Value::as_str)
                            .map(str::to_string)
                    })
                    .collect()
            })
            .unwrap_or_default();
        Ok(images)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::NodeType;
    use serde_json::json;
    use std::sync::atomic::{AtomicUsize, Ordering};

    struct CountingEngine {
        chat_calls: AtomicUsize,
        image_calls: AtomicUsize,
    }

    #[async_trait]
    impl EngineClient for CountingEngine {
        async fn chat(&self, prompt: &str, _params: &Value) -> Result<String, ExecError> {
            self.chat_calls.fetch_add(1, Ordering::SeqCst);
            Ok(format!("echo:{prompt}"))
        }
        async fn image_gen(&self, prompt: &str, _params: &Value) -> Result<Vec<String>, ExecError> {
            self.image_calls.fetch_add(1, Ordering::SeqCst);
            Ok(vec![format!("img:{prompt}")])
        }
    }

    fn node(id: &str, ty: NodeType, params: Value) -> FlowNode {
        FlowNode {
            id: id.into(),
            node_type: ty,
            params,
        }
    }

    #[tokio::test]
    async fn prompt_node_emits_text() {
        let engine = CountingEngine {
            chat_calls: AtomicUsize::new(0),
            image_calls: AtomicUsize::new(0),
        };
        let out = execute_node(
            &node("p", NodeType::PromptText, json!({"text": "橘猫"})),
            &[],
            &engine,
        )
        .await
        .unwrap();
        assert_eq!(out.0["text"], "橘猫");
        assert_eq!(engine.chat_calls.load(Ordering::SeqCst), 0);
    }

    #[tokio::test]
    async fn llm_node_uses_upstream_text_as_prompt() {
        let engine = CountingEngine {
            chat_calls: AtomicUsize::new(0),
            image_calls: AtomicUsize::new(0),
        };
        let upstream = json!({ "text": "写个标题" });
        let out = execute_node(
            &node("llm", NodeType::LlmText, json!({})),
            &[upstream],
            &engine,
        )
        .await
        .unwrap();
        assert_eq!(out.0["text"], "echo:写个标题");
    }

    #[tokio::test]
    async fn image_node_calls_engine_and_wraps_images() {
        let engine = CountingEngine {
            chat_calls: AtomicUsize::new(0),
            image_calls: AtomicUsize::new(0),
        };
        let out = execute_node(
            &node("img", NodeType::ImageGen, json!({"size": "1024x1024"})),
            &[json!({ "text": "橘猫" })],
            &engine,
        )
        .await
        .unwrap();
        assert_eq!(out.0["images"][0], "img:橘猫");
        assert_eq!(engine.image_calls.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn output_node_forwards_first_upstream() {
        let engine = CountingEngine {
            chat_calls: AtomicUsize::new(0),
            image_calls: AtomicUsize::new(0),
        };
        let out = execute_node(
            &node("out", NodeType::Output, json!({})),
            &[json!({ "images": ["x"] }), json!({ "text": "y" })],
            &engine,
        )
        .await
        .unwrap();
        assert_eq!(out.0["result"]["images"][0], "x");
    }
}
