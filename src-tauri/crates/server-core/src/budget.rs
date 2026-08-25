/**
 * PLAT-05 配额与余额管理: a monthly USD spend ceiling enforced at the
 * gateway. Spend comes from the engine-reported `cost_usd` on each span
 * (providers without configured prices report None and contribute $0 — the
 * counter is honest about what it knows, never fabricates estimates).
 */
use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde_json::{json, Value};

use crate::store::Store;
use crate::{err_msg, ok_data, AppState};

/// Store id of the single budget config document.
const CONFIG_ID: &str = "budget-config";

#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct BudgetConfig {
    pub enabled: bool,
    pub monthly_limit_usd: f64,
}

impl BudgetConfig {
    fn from_json(doc: &Value) -> Self {
        Self {
            enabled: doc.get("enabled").and_then(Value::as_bool).unwrap_or(false),
            monthly_limit_usd: doc
                .get("monthly_limit_usd")
                .and_then(Value::as_f64)
                .unwrap_or(0.0),
        }
    }

    fn to_json(self) -> Value {
        json!({ "enabled": self.enabled, "monthly_limit_usd": self.monthly_limit_usd })
    }
}

/// Load the budget config; absent → disabled (spend uncapped, default).
pub(crate) fn load_config(store: &Store) -> BudgetConfig {
    store
        .get("budget", CONFIG_ID)
        .map(|doc| BudgetConfig::from_json(&doc))
        .unwrap_or(BudgetConfig {
            enabled: false,
            monthly_limit_usd: 0.0,
        })
}

/// Sum the engine-reported spend of spans recorded in the current calendar
/// month (UTC). Spans without cost_usd contribute nothing.
pub(crate) fn month_spend_usd(store: &Store) -> f64 {
    let month_prefix = chrono::Utc::now().format("%Y-%m").to_string();
    store
        .list("span")
        .into_iter()
        .filter(|span| {
            span.get("created_at")
                .and_then(Value::as_str)
                .map(|at| at.starts_with(month_prefix.as_str()))
                .unwrap_or(false)
        })
        .filter_map(|span| span.get("cost_usd").and_then(Value::as_f64))
        .sum()
}

/// The gateway's gate: `Err` carries a ready-to-serve 429 when the ceiling is
/// hit. Disabled budgets and zero-priced months always pass.
pub(crate) fn enforce(store: &Store) -> Result<(), Response> {
    let config = load_config(store);
    if !config.enabled || config.monthly_limit_usd <= 0.0 {
        return Ok(());
    }
    let spent = month_spend_usd(store);
    if spent >= config.monthly_limit_usd {
        return Err(err_msg(
            StatusCode::TOO_MANY_REQUESTS,
            &format!(
                "本月配额已用尽：${spent:.4} / ${:.2}（按引擎上报的实际调用成本累计）。\
                 可在 密钥与模型 页调高预算或关闭限额。",
                config.monthly_limit_usd
            ),
        ));
    }
    Ok(())
}

pub(crate) fn budget_routes() -> Router<Arc<AppState>> {
    Router::new().route("/api/budget", get(get_budget).post(set_budget))
}

/// GET /api/budget → { enabled, monthly_limit_usd, spent_usd, month }
async fn get_budget(State(state): State<Arc<AppState>>) -> Response {
    let config = load_config(&state.store);
    ok_data(json!({
        "enabled": config.enabled,
        "monthly_limit_usd": config.monthly_limit_usd,
        "spent_usd": month_spend_usd(&state.store),
        "month": chrono::Utc::now().format("%Y-%m").to_string(),
    }))
    .into_response()
}

/// POST /api/budget { enabled, monthly_limit_usd } → persisted config.
async fn set_budget(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let enabled = body
        .get("enabled")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let limit = body
        .get("monthly_limit_usd")
        .and_then(Value::as_f64)
        .unwrap_or(0.0);
    if limit.is_nan() || limit.is_sign_negative() || limit > 1_000_000.0 {
        return err_msg(
            StatusCode::BAD_REQUEST,
            "月度预算需为 0 ~ 1,000,000 之间的数值",
        );
    }
    let config = BudgetConfig {
        enabled,
        monthly_limit_usd: limit,
    };
    // insert() conflicts on an existing id; fall back to update.
    let saved: Result<(), ()> = match state.store.insert("budget", CONFIG_ID, config.to_json()) {
        Ok(_) => Ok(()),
        Err(_) => state
            .store
            .update("budget", CONFIG_ID, &config.to_json())
            .map(|_| ())
            .ok_or(()),
    };
    if saved.is_err() {
        return err_msg(StatusCode::INTERNAL_SERVER_ERROR, "保存预算失败");
    }
    ok_data(config.to_json()).into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_store(tag: &str) -> Store {
        let dir = std::env::temp_dir().join(format!("mofa-budget-test-{tag}"));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("mkdir");
        Store::open(&dir.join("t.db")).expect("open store")
    }

    fn span_with_cost(cost: Option<f64>, created_at: &str) -> Value {
        let mut doc = json!({ "id": format!("s-{cost:?}-{created_at}"), "created_at": created_at });
        if let Some(c) = cost {
            doc["cost_usd"] = json!(c);
        }
        doc
    }

    #[test]
    fn month_spend_only_counts_current_month_and_real_costs() {
        let store = test_store("spend");
        let now = chrono::Utc::now();
        let month = now.format("%Y-%m").to_string();
        use chrono::Datelike;
        // Any prior month string that differs from the current one.
        let last_month = if now.month() == 1 {
            format!("{}-12", now.year() - 1)
        } else {
            "2000-01".to_string()
        };
        for (i, (doc, created_at)) in [
            (
                span_with_cost(Some(0.5), &format!("{month}-05T00:00:00.000Z")),
                format!("{month}-05T00:00:00.000Z"),
            ),
            (
                span_with_cost(Some(1.25), &format!("{month}-20T10:00:00.000Z")),
                format!("{month}-20T10:00:00.000Z"),
            ),
            // Old month excluded; cost-less span contributes nothing.
            (
                span_with_cost(Some(9.0), &format!("{last_month}-01T00:00:00.000Z")),
                format!("{last_month}-01T00:00:00.000Z"),
            ),
            (
                span_with_cost(None, &format!("{month}-06T00:00:00.000Z")),
                format!("{month}-06T00:00:00.000Z"),
            ),
        ]
        .into_iter()
        .enumerate()
        {
            let id = format!("span-{i}");
            store.insert("span", &id, doc).expect("insert");
            // insert() stamps created_at with now; backdate to control the test.
            store
                .update("span", &id, &json!({ "created_at": created_at }))
                .expect("backdate");
        }
        assert!((month_spend_usd(&store) - 1.75).abs() < 1e-9);
    }

    #[test]
    fn enforce_blocks_only_when_enabled_and_exhausted() {
        let store = test_store("enforce");
        // Default: disabled → passes.
        assert!(enforce(&store).is_ok());

        // Enabled with headroom → passes.
        store
            .insert(
                "budget",
                CONFIG_ID,
                json!({ "enabled": true, "monthly_limit_usd": 5.0 }),
            )
            .expect("set");
        assert!(enforce(&store).is_ok());

        // Spend past the ceiling → blocked.
        let month = chrono::Utc::now().format("%Y-%m").to_string();
        let created = format!("{month}-01T00:00:00.000Z");
        store
            .insert("span", "span-big", span_with_cost(Some(5.0), &created))
            .expect("insert");
        store
            .update("span", "span-big", &json!({ "created_at": created }))
            .expect("backdate");
        let blocked = enforce(&store);
        assert!(blocked.is_err());

        // Zero limit while enabled → treated as uncapped (guard against a
        // misconfigured 0 ceiling bricking the gateway).
        store
            .update(
                "budget",
                CONFIG_ID,
                &json!({ "enabled": true, "monthly_limit_usd": 0.0 }),
            )
            .expect("reset");
        assert!(enforce(&store).is_ok());
    }
}
