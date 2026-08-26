//! Node executors: the engine-facing side of the flow. A trait so hosts
//! wire in a real client (server-core's `CoreFlowClient` over the embedded
//! engine) while tests run against in-memory doubles.

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
        crate::types::NodeType::HttpRequest => execute_http_node(&node.params, &prompt).await,
    }
}

/// Substitute flow placeholders in an HTTP template: `{{upstream}}` and
/// `{{text}}` both resolve to the joined upstream text (the flow's prompt
/// chain semantics).
pub fn substitute_http_template(template: &str, upstream_text: &str) -> String {
    template
        .replace("{{upstream}}", upstream_text)
        .replace("{{text}}", upstream_text)
}

/// FLOW-10 阶段一: call an external HTTP service from the flow. The URL,
/// method, headers, and body are node params; templates carry the upstream
/// text. The response body is returned as text plus parsed JSON when valid.
async fn execute_http_node(params: &Value, upstream_text: &str) -> Result<NodeOutput, ExecError> {
    let url = params
        .get("url")
        .and_then(Value::as_str)
        .filter(|u| !u.trim().is_empty())
        .ok_or_else(|| ExecError::Failed("http_request 节点缺少 url 参数".into()))?
        .to_string();
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err(ExecError::Failed(format!(
            "http_request 仅允许 http(s) URL，得到 {url}"
        )));
    }
    let method = params
        .get("method")
        .and_then(Value::as_str)
        .unwrap_or("GET")
        .to_uppercase();

    // Local/direct service calls; never route through a system proxy.
    let client = reqwest::Client::builder()
        .no_proxy()
        .build()
        .map_err(|e| ExecError::Failed(format!("http client: {e}")))?;
    let mut request = match method.as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        other => {
            return Err(ExecError::Failed(format!(
                "http_request 不支持的方法 {other}（GET/POST/PUT/DELETE）"
            )))
        }
    };
    if let Some(headers) = params.get("headers").and_then(Value::as_object) {
        for (key, value) in headers {
            if let Some(value) = value.as_str() {
                request = request.header(key.as_str(), value);
            }
        }
    }
    if let Some(body_template) = params.get("body").and_then(Value::as_str) {
        if method != "GET" {
            request = request.body(substitute_http_template(body_template, upstream_text));
        }
    }
    if method == "POST" || method == "PUT" {
        if params.get("body").and_then(Value::as_str).is_none() {
            // Default a JSON content-type so plain-JSON bodies work.
            request = request.header("content-type", "application/json");
        }
    }

    let response = request
        .send()
        .await
        .map_err(|e| ExecError::Unreachable(format!("外置服务不可达: {e}")))?;
    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|e| ExecError::Failed(format!("读取外置服务响应失败: {e}")))?;
    if !(200..300).contains(&status) {
        return Err(ExecError::Failed(format!(
            "外置服务 HTTP {status}: {}",
            body.chars().take(200).collect::<String>()
        )));
    }
    let json_body = serde_json::from_str::<Value>(&body).ok();
    Ok(NodeOutput(json!({
        "status": status,
        "text": body,
        "json": json_body,
    })))
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

    #[test]
    fn http_template_substitutes_upstream() {
        assert_eq!(
            substitute_http_template("prefix {{upstream}} suffix", "橘猫"),
            "prefix 橘猫 suffix"
        );
        assert_eq!(substitute_http_template("{{text}}", "hello"), "hello");
        // Unknown placeholders pass through untouched.
        assert_eq!(substitute_http_template("{{nope}}", "x"), "{{nope}}");
    }

    #[tokio::test]
    async fn http_node_get_returns_status_text_and_json() {
        let app = axum::Router::new().route(
            "/api/ping",
            axum::routing::get(|| async { axum::Json(serde_json::json!({ "pong": true })) }),
        );
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });

        let engine = CountingEngine {
            chat_calls: AtomicUsize::new(0),
            image_calls: AtomicUsize::new(0),
        };
        let out = execute_node(
            &node(
                "http",
                NodeType::HttpRequest,
                json!({ "url": format!("http://{addr}/api/ping"), "method": "GET" }),
            ),
            &[],
            &engine,
        )
        .await
        .unwrap();
        assert_eq!(out.0["status"], 200);
        assert_eq!(out.0["json"]["pong"], true);
    }

    #[tokio::test]
    async fn http_node_post_carries_substituted_body() {
        use std::sync::Arc;
        let seen: Arc<std::sync::Mutex<Option<(String, String)>>> =
            Arc::new(std::sync::Mutex::new(None));
        let seen_handler = seen.clone();
        let app = axum::Router::new().route(
            "/api/echo",
            axum::routing::post(move |headers: axum::http::HeaderMap, body: String| {
                let seen = seen_handler.clone();
                async move {
                    *seen.lock().unwrap() = Some((
                        headers
                            .get("content-type")
                            .and_then(|v| v.to_str().ok())
                            .unwrap_or("")
                            .to_string(),
                        body,
                    ));
                    axum::Json(serde_json::json!({ "ok": 1 }))
                }
            }),
        );
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });

        let engine = CountingEngine {
            chat_calls: AtomicUsize::new(0),
            image_calls: AtomicUsize::new(0),
        };
        let out = execute_node(
            &node(
                "http",
                NodeType::HttpRequest,
                json!({
                    "url": format!("http://{addr}/api/echo"),
                    "method": "POST",
                    "body": "{\"q\": \"{{upstream}}\"}",
                    "headers": { "content-type": "application/json" }
                }),
            ),
            &[json!({ "text": "天气" })],
            &engine,
        )
        .await
        .unwrap();
        assert_eq!(out.0["status"], 200);
        let (content_type, body) = seen.lock().unwrap().clone().unwrap();
        assert_eq!(content_type, "application/json");
        assert_eq!(body, r#"{"q": "天气"}"#);
    }

    #[tokio::test]
    async fn http_node_rejects_non_http_urls_and_bad_methods() {
        let engine = CountingEngine {
            chat_calls: AtomicUsize::new(0),
            image_calls: AtomicUsize::new(0),
        };
        let err = execute_node(
            &node(
                "h",
                NodeType::HttpRequest,
                json!({ "url": "file:///etc/passwd" }),
            ),
            &[],
            &engine,
        )
        .await
        .unwrap_err();
        assert!(err.to_string().contains("仅允许 http(s)"));

        let err = execute_node(
            &node(
                "h",
                NodeType::HttpRequest,
                json!({ "url": "http://127.0.0.1:9/x", "method": "TRACE" }),
            ),
            &[],
            &engine,
        )
        .await
        .unwrap_err();
        assert!(err.to_string().contains("不支持的方法"));
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
