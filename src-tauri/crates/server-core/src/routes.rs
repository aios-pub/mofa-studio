/**
 * Domain-specific routes that need computed or empty responses instead of
 * the generic document CRUD: dashboard analytics, agent monitoring, and the
 * OpenAI-compatible chat endpoint.
 */
use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::Response;
use axum::routing::get;
use axum::Router;
use serde_json::{json, Value};

use crate::{err_msg, ok_data, AppState};

// ==================== Handlers ====================

/// GET /api/analytics/overview — usage stats derived from local data.
/// Shape matches `UsageStats` in services/real/analytics.ts.
async fn analytics_overview(State(state): State<Arc<AppState>>) -> Response {
    ok_data(json!({
        "total_conversations": state.store.count("conversation"),
        "total_tokens": 0,
        "input_tokens": 0,
        "output_tokens": 0,
        "avg_response_time": 0.0,
        "success_rate": 100.0,
        "total_cost": 0.0,
    }))
}

/// Empty series for chart endpoints; pages render empty charts instead of errors.
async fn empty_array() -> Response {
    ok_data(Vec::<Value>::new())
}

/// GET /api/monitoring/agents — derive agent status from stored agent docs.
/// Shape matches `AgentStatus` in services/real/monitoring.ts.
async fn monitoring_agents(State(state): State<Arc<AppState>>) -> Response {
    let agents: Vec<Value> = state
        .store
        .list("agent")
        .into_iter()
        .map(|doc| {
            let id = doc
                .get("id")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string();
            let name = doc
                .get("name")
                .or_else(|| doc.get("agent_name"))
                .and_then(Value::as_str)
                .unwrap_or("unnamed")
                .to_string();
            let status = doc
                .get("status")
                .and_then(Value::as_str)
                .unwrap_or("online");
            let status = if status == "online" || status == "offline" || status == "busy" || status == "error" {
                status
            } else {
                "online"
            };
            json!({
                "agent_id": id,
                "agent_name": name,
                "status": status,
                "last_active": doc.get("updated_at").cloned().unwrap_or(Value::String(String::new())),
                "metrics": {
                    "conversations_today": 0,
                    "avg_response_time": 0.0,
                    "success_rate": 100.0,
                    "tokens_used": 0,
                },
            })
        })
        .collect();
    ok_data(agents)
}

/// GET /api/monitoring/agents/{agent_id}
async fn monitoring_agent(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(agent_id): axum::extract::Path<String>,
) -> Response {
    match state.store.get("agent", &agent_id) {
        Some(doc) => {
            let name = doc
                .get("name")
                .and_then(Value::as_str)
                .unwrap_or("unnamed")
                .to_string();
            ok_data(json!({
                "agent_id": agent_id,
                "agent_name": name,
                "status": "online",
                "last_active": doc.get("updated_at").cloned().unwrap_or(Value::String(String::new())),
                "metrics": {
                    "conversations_today": 0,
                    "avg_response_time": 0.0,
                    "success_rate": 100.0,
                    "tokens_used": 0,
                },
            }))
        }
        None => err_msg(StatusCode::NOT_FOUND, "Agent not found"),
    }
}

/// GET /api/monitoring/metrics — shape matches `SystemMetrics`.
async fn monitoring_metrics() -> Response {
    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();
    ok_data(json!({
        "cpu": 0.0,
        "memory": 0.0,
        "network": 0.0,
        "active_connections": 0,
        "queue_length": 0,
        "timestamp": now,
    }))
}

// ==================== Routes ====================

/// Analytics / monitoring routes with agentos-compatible paths.
/// Chat completions live in `llm_gateway` (OpenAI-compatible mofa-engine
/// proxy), merged into the router by `build_router`.
pub(crate) fn extras_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/analytics/overview", get(analytics_overview))
        .route("/api/analytics/daily", get(empty_array))
        .route("/api/analytics/hourly", get(empty_array))
        .route("/api/analytics/trend", get(empty_array))
        .route("/api/monitoring/agents", get(monitoring_agents))
        .route("/api/monitoring/agents/{agent_id}", get(monitoring_agent))
        .route("/api/monitoring/events", get(empty_array))
        .route("/api/monitoring/metrics", get(monitoring_metrics))
        .route("/api/monitoring/alerts", get(empty_array))
}
