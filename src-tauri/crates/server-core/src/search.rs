/**
 * Web search (CHAT-03): BYOK search providers (Tavily / 博查 / 智谱) with
 * keys persisted server-side in the meta store — never in the frontend.
 * Search results feed chat as grounding context and UI citations.
 */

use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::{json, Value};

use crate::{err_msg, ok_data, AppState};

const CONFIG_KEY: &str = "web_search_config";
const MASK: &str = "••••••••";

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
struct SearchConfig {
    provider: String,
    api_key: String,
}

fn load_config(state: &AppState) -> SearchConfig {
    state
        .store
        .get_meta(CONFIG_KEY)
        .and_then(|raw| serde_json::from_str::<SearchConfig>(&raw).ok())
        .unwrap_or_default()
}

fn mask(key: &str) -> String {
    if key.is_empty() {
        String::new()
    } else {
        format!("{}{}", &key[..key.len().min(4)], MASK)
    }
}

/// One search result, normalized across providers.
#[derive(Debug, Clone, serde::Serialize)]
pub(crate) struct SearchResult {
    pub title: String,
    pub url: String,
    pub snippet: String,
}

/// Run a search with the configured provider. Errors carry guidance for
/// the unconfigured case (CHAT-03 验收: 无 Key 提示配置入口).
pub(crate) async fn run_search(
    state: &AppState,
    query: &str,
    max_results: usize,
) -> Result<Vec<SearchResult>, String> {
    let config = load_config(state);
    if config.provider.is_empty() || config.api_key.is_empty() {
        return Err(
            "联网搜索未配置：请在设置中填写搜索 API Key（支持 Tavily / 博查 / 智谱）".to_string(),
        );
    }
    match config.provider.as_str() {
        "tavily" => tavily(&config.api_key, query, max_results).await,
        "bocha" => bocha(&config.api_key, query, max_results).await,
        "zhipu" => zhipu(&config.api_key, query, max_results).await,
        other => Err(format!("未知搜索 provider: {other}")),
    }
}

async fn tavily(api_key: &str, query: &str, max_results: usize) -> Result<Vec<SearchResult>, String> {
    let client = reqwest::Client::builder()
        .no_proxy()
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .post("https://api.tavily.com/search")
        .json(&json!({
            "api_key": api_key,
            "query": query,
            "max_results": max_results,
            "search_depth": "basic",
        }))
        .send()
        .await
        .map_err(|e| format!("Tavily 请求失败: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("Tavily HTTP {}: 请检查 Key 是否有效或欠费", resp.status()));
    }
    let payload: Value = resp.json().await.map_err(|e| format!("Tavily 响应解析失败: {e}"))?;
    let mut out = Vec::new();
    if let Some(items) = payload.get("results").and_then(Value::as_array) {
        for item in items.iter().take(max_results) {
            out.push(SearchResult {
                title: item.get("title").and_then(Value::as_str).unwrap_or("").into(),
                url: item.get("url").and_then(Value::as_str).unwrap_or("").into(),
                snippet: item.get("content").and_then(Value::as_str).unwrap_or("").into(),
            });
        }
    }
    Ok(out)
}

async fn bocha(api_key: &str, query: &str, max_results: usize) -> Result<Vec<SearchResult>, String> {
    let client = reqwest::Client::builder()
        .no_proxy()
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .post("https://api.bochaai.com/v1/web-search")
        .bearer_auth(api_key)
        .json(&json!({ "query": query, "summary": true, "count": max_results }))
        .send()
        .await
        .map_err(|e| format!("博查请求失败: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("博查 HTTP {}: 请检查 Key 是否有效或欠费", resp.status()));
    }
    let payload: Value = resp.json().await.map_err(|e| format!("博查响应解析失败: {e}"))?;
    // {"code":200,"data":{"webPages":{"value":[{"name","url","snippet","summary"}]}}}
    let mut out = Vec::new();
    if let Some(items) = payload
        .pointer("/data/webPages/value")
        .and_then(Value::as_array)
    {
        for item in items.iter().take(max_results) {
            out.push(SearchResult {
                title: item
                    .get("name")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .into(),
                url: item.get("url").and_then(Value::as_str).unwrap_or("").into(),
                snippet: item
                    .get("summary")
                    .or_else(|| item.get("snippet"))
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .into(),
            });
        }
    }
    Ok(out)
}

async fn zhipu(api_key: &str, query: &str, max_results: usize) -> Result<Vec<SearchResult>, String> {
    let client = reqwest::Client::builder()
        .no_proxy()
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .post("https://open.bigmodel.cn/api/paas/v4/web_search")
        .bearer_auth(api_key)
        .json(&json!({
            "search_engine": "search_std",
            "search_query": query,
            "count": max_results,
        }))
        .send()
        .await
        .map_err(|e| format!("智谱请求失败: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("智谱 HTTP {}: 请检查 Key 是否有效或欠费", resp.status()));
    }
    let payload: Value = resp.json().await.map_err(|e| format!("智谱响应解析失败: {e}"))?;
    // {"search_result":[{"title","link","content"}]}
    let mut out = Vec::new();
    if let Some(items) = payload.get("search_result").and_then(Value::as_array) {
        for item in items.iter().take(max_results) {
            out.push(SearchResult {
                title: item.get("title").and_then(Value::as_str).unwrap_or("").into(),
                url: item
                    .get("link")
                    .or_else(|| item.get("url"))
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .into(),
                snippet: item.get("content").and_then(Value::as_str).unwrap_or("").into(),
            });
        }
    }
    Ok(out)
}

// ==================== Handlers ====================

async fn get_config(State(state): State<Arc<AppState>>) -> Response {
    let config = load_config(&state);
    ok_data(json!({
        "provider": if config.provider.is_empty() { "none" } else { &config.provider },
        "api_key_masked": mask(&config.api_key),
        "configured": !config.api_key.is_empty(),
    }))
}

async fn set_config(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let provider = body.get("provider").and_then(Value::as_str).unwrap_or("");
    if !["tavily", "bocha", "zhipu"].contains(&provider) {
        return err_msg(StatusCode::BAD_REQUEST, "provider 必须是 tavily / bocha / zhipu");
    }
    let api_key = body.get("api_key").and_then(Value::as_str).unwrap_or("").trim().to_string();
    if api_key.len() < 8 {
        return err_msg(StatusCode::BAD_REQUEST, "api_key 看起来太短");
    }
    let config = SearchConfig {
        provider: provider.to_string(),
        api_key,
    };
    if let Ok(raw) = serde_json::to_string(&config) {
        state.store.set_meta(CONFIG_KEY, &raw);
    }
    ok_data(json!({ "provider": provider, "configured": true }))
}

async fn search_handler(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let query = body.get("query").and_then(Value::as_str).unwrap_or("").trim();
    if query.is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "query 不能为空");
    }
    let max = body.get("max_results").and_then(Value::as_u64).unwrap_or(5).min(10) as usize;
    match run_search(&state, query, max).await {
        Ok(results) => ok_data(json!({ "query": query, "results": results })),
        Err(msg) => err_msg(StatusCode::SERVICE_UNAVAILABLE, &msg),
    }
}

pub(crate) fn search_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/search/config", get(get_config).post(set_config))
        .route("/api/search", post(search_handler))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mask_keeps_prefix_only() {
        assert_eq!(mask(""), "");
        assert_eq!(mask("sk-abcdef123456"), format!("sk-a{}", MASK));
    }
}
