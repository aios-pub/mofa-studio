/**
 * MCP Host (TASK-22): manages Model Context Protocol server connectors
 * and bridges their tools. Implements the MCP stdio transport natively —
 * newline-delimited JSON-RPC 2.0 over the server process's stdin/stdout
 * (the protocol's canonical transport), so no external SDK is needed.
 */
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::Response;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::{json, Value};

use crate::{err_msg, ok_data, AppState};

const MCP_COLLECTION: &str = "mcp_server";
const PROTOCOL_VERSION: &str = "2025-06-18";

/// A configured MCP server connector (stdio command form).
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct McpServerConfig {
    pub id: String,
    pub name: String,
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub env: std::collections::BTreeMap<String, String>,
    #[serde(default)]
    pub created_at: String,
}

/// Build a JSON-RPC request frame (one line of JSON).
pub fn encode_request(id: u64, method: &str, params: Value) -> String {
    let frame = json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": method,
        "params": params,
    });
    format!("{frame}\n")
}

/// Extract the result payload from a JSON-RPC response line; errors map
/// to an Err carrying the RPC error message.
pub fn decode_response(line: &str) -> Result<Value, String> {
    let parsed: Value =
        serde_json::from_str(line.trim()).map_err(|e| format!("响应不是有效 JSON: {e}"))?;
    if let Some(error) = parsed.get("error") {
        return Err(error
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("unknown RPC error")
            .to_string());
    }
    Ok(parsed.get("result").cloned().unwrap_or(Value::Null))
}

/// A live MCP server session over stdio.
pub struct McpSession {
    child: Child,
    stdin: std::process::ChildStdin,
    reader: BufReader<std::process::ChildStdout>,
    next_id: u64,
}

impl McpSession {
    /// Spawn the server and perform the MCP initialize handshake.
    pub fn connect(config: &McpServerConfig) -> Result<Self, String> {
        let mut command = Command::new(&config.command);
        command
            .args(&config.args)
            .envs(&config.env)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null());
        let mut child = command
            .spawn()
            .map_err(|e| format!("启动 MCP 服务失败（{}）: {e}", config.command))?;
        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| "无法获取 stdin".to_string())?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "无法获取 stdout".to_string())?;
        let mut session = Self {
            child,
            stdin,
            reader: BufReader::new(stdout),
            next_id: 1,
        };
        // initialize → notifications/initialized per the protocol.
        let init_params = json!({
            "protocolVersion": PROTOCOL_VERSION,
            "capabilities": {},
            "clientInfo": { "name": "mofa-studio", "version": "1.0" },
        });
        let result = session.request("initialize", init_params)?;
        if result.get("protocolVersion").is_none() {
            return Err("initialize 响应缺少 protocolVersion".into());
        }
        session.notify("notifications/initialized", json!({}));
        Ok(session)
    }

    fn request(&mut self, method: &str, params: Value) -> Result<Value, String> {
        let id = self.next_id;
        self.next_id += 1;
        let frame = encode_request(id, method, params);
        self.stdin
            .write_all(frame.as_bytes())
            .map_err(|e| format!("写入失败: {e}"))?;
        self.stdin.flush().map_err(|e| format!("flush 失败: {e}"))?;
        self.read_response()
    }

    fn notify(&mut self, method: &str, params: Value) {
        let frame = json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
        });
        let _ = self.stdin.write_all(format!("{frame}\n").as_bytes());
        let _ = self.stdin.flush();
    }

    fn read_response(&mut self) -> Result<Value, String> {
        let mut line = String::new();
        let read = self
            .reader
            .read_line(&mut line)
            .map_err(|e| format!("读取失败: {e}"))?;
        if read == 0 {
            return Err("MCP 服务提前退出".into());
        }
        decode_response(&line)
    }

    /// List the server's tools.
    pub fn list_tools(&mut self) -> Result<Vec<Value>, String> {
        let result = self.request("tools/list", json!({}))?;
        Ok(result
            .get("tools")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default())
    }

    /// Invoke a tool by name with JSON arguments.
    pub fn call_tool(&mut self, name: &str, arguments: Value) -> Result<Value, String> {
        let result = self.request(
            "tools/call",
            json!({ "name": name, "arguments": arguments }),
        )?;
        if result.get("isError").and_then(Value::as_bool) == Some(true) {
            return Err("工具执行返回错误".into());
        }
        Ok(result)
    }
}

impl Drop for McpSession {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

// ==================== Handlers ====================

/// POST /api/mcp/servers {name, command, args?, env?}
async fn add_server(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let name = body
        .get("name")
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim();
    let command = body
        .get("command")
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim();
    if name.is_empty() || command.is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "name 与 command 必填");
    }
    let id = format!("mcp-{}", uuid::Uuid::new_v4());
    let config = McpServerConfig {
        id: id.clone(),
        name: name.to_string(),
        command: command.to_string(),
        args: body
            .get("args")
            .and_then(Value::as_array)
            .map(|a| {
                a.iter()
                    .filter_map(|v| v.as_str().map(str::to_string))
                    .collect()
            })
            .unwrap_or_default(),
        env: body
            .get("env")
            .and_then(Value::as_object)
            .map(|o| {
                o.iter()
                    .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                    .collect()
            })
            .unwrap_or_default(),
        created_at: chrono::Utc::now()
            .format("%Y-%m-%dT%H:%M:%S%.3fZ")
            .to_string(),
    };
    let _ = state.store.insert(
        MCP_COLLECTION,
        &id,
        serde_json::to_value(&config).unwrap_or(Value::Null),
    );
    ok_data(json!({ "id": id, "name": name }))
}

/// GET /api/mcp/servers — registered connectors.
async fn list_servers(State(state): State<Arc<AppState>>) -> Response {
    ok_data(state.store.list(MCP_COLLECTION))
}

/// DELETE /api/mcp/servers/{id}
async fn remove_server(State(state): State<Arc<AppState>>, Path(id): Path<String>) -> Response {
    if state.store.delete(MCP_COLLECTION, &id) {
        ok_data(json!({ "deleted": id }))
    } else {
        err_msg(StatusCode::NOT_FOUND, "连接器不存在")
    }
}

fn load_server(state: &AppState, id: &str) -> Result<McpServerConfig, Response> {
    state
        .store
        .get(MCP_COLLECTION, id)
        .and_then(|doc| serde_json::from_value(doc).ok())
        .ok_or_else(|| err_msg(StatusCode::NOT_FOUND, "连接器不存在"))
}

/// POST /api/mcp/servers/{id}/tools — live tools/list over a fresh session.
async fn tools(State(state): State<Arc<AppState>>, Path(id): Path<String>) -> Response {
    let config = match load_server(&state, &id) {
        Ok(c) => c,
        Err(resp) => return resp,
    };
    match tokio::task::spawn_blocking(move || {
        let mut session = McpSession::connect(&config)?;
        session.list_tools()
    })
    .await
    {
        Ok(Ok(tools)) => ok_data(json!({ "tools": tools })),
        Ok(Err(e)) => err_msg(StatusCode::BAD_GATEWAY, &e),
        Err(e) => err_msg(StatusCode::INTERNAL_SERVER_ERROR, &format!("任务失败: {e}")),
    }
}

/// POST /api/mcp/servers/{id}/call {tool, arguments}
async fn call(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Response {
    let tool = body.get("tool").and_then(Value::as_str).unwrap_or("");
    if tool.is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "tool 必填");
    }
    let config = match load_server(&state, &id) {
        Ok(c) => c,
        Err(resp) => return resp,
    };
    let arguments = body.get("arguments").cloned().unwrap_or(json!({}));
    let tool_owned = tool.to_string();
    match tokio::task::spawn_blocking(move || {
        let mut session = McpSession::connect(&config)?;
        session.call_tool(&tool_owned, arguments)
    })
    .await
    {
        Ok(Ok(result)) => ok_data(result),
        Ok(Err(e)) => err_msg(StatusCode::BAD_GATEWAY, &e),
        Err(e) => err_msg(StatusCode::INTERNAL_SERVER_ERROR, &format!("任务失败: {e}")),
    }
}

pub(crate) fn mcp_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/mcp/servers", post(add_server).get(list_servers))
        .route(
            "/api/mcp/servers/{id}",
            axum::routing::delete(remove_server),
        )
        .route("/api/mcp/servers/{id}/tools", post(tools))
        .route("/api/mcp/servers/{id}/call", post(call))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encode_request_is_single_line_jsonrpc() {
        let frame = encode_request(7, "tools/list", json!({}));
        assert!(frame.ends_with('\n'));
        assert!(!frame[..frame.len() - 1].contains('\n'), "one line only");
        let parsed: Value = serde_json::from_str(frame.trim()).unwrap();
        assert_eq!(parsed["jsonrpc"], "2.0");
        assert_eq!(parsed["id"], 7);
        assert_eq!(parsed["method"], "tools/list");
    }

    #[test]
    fn decode_response_maps_results_and_errors() {
        let ok = decode_response(r#"{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}"#).unwrap();
        assert_eq!(ok["tools"], json!([]));

        let err = decode_response(
            r#"{"jsonrpc":"2.0","id":1,"error":{"code":-32601,"message":"method not found"}}"#,
        )
        .unwrap_err();
        assert_eq!(err, "method not found");

        assert!(decode_response("not json").is_err());
    }

    /// End-to-end session test against a scripted mock MCP server (sh).
    #[test]
    fn session_handshake_list_and_call() {
        if !std::process::Command::new("sh")
            .arg("-c")
            .arg("true")
            .output()
            .is_ok()
        {
            return; // non-POSIX环境跳过
        }
        // The mock reads a line, replies by method name; two calls per
        // list_tools/call_tool plus the initialize handshake.
        let script = "read -r line\nprintf '{\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{\"protocolVersion\":\"2025-06-18\",\"capabilities\":{}}}\\n'\nprintf '{\"jsonrpc\":\"2.0\",\"id\":2,\"result\":{\"tools\":[{\"name\":\"echo\",\"description\":\"回声\"}]}}\\n'\nprintf '{\"jsonrpc\":\"2.0\",\"id\":3,\"result\":{\"content\":[{\"type\":\"text\",\"text\":\"工具结果\"}],\"isError\":false}}\\n'\n";
        let config = McpServerConfig {
            id: "test".into(),
            name: "mock".into(),
            command: "sh".into(),
            args: vec!["-c".into(), script.into()],
            env: Default::default(),
            created_at: String::new(),
        };
        let mut session = McpSession::connect(&config).expect("handshake");
        let tools = session.list_tools().expect("tools");
        assert_eq!(tools[0]["name"], "echo");
        let result = session
            .call_tool("echo", json!({"text": "hi"}))
            .expect("call");
        assert_eq!(result["content"][0]["text"], "工具结果");
        assert_eq!(result["isError"], false);
    }
}
