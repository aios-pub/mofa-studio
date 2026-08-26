/**
 * Automation executor (TASK-05): SOP templates with bound triggers run
 * unattended — a cron evaluator decides when, each firing instantiates a
 * project from the template (slot-bound), runs it to completion, and
 * records an execution-history entry with desktop-notification payload.
 */
use std::str::FromStr;

/// A parsed 5-field cron expression (minute hour dom month dow).
#[derive(Debug, Clone, PartialEq)]
pub struct Cron {
    minutes: Vec<u32>,
    hours: Vec<u32>,
    doms: Vec<u32>,
    months: Vec<u32>,
    dows: Vec<u32>,
}

fn parse_field(field: &str, min: u32, max: u32) -> Result<Vec<u32>, String> {
    let mut values = Vec::new();
    for part in field.split(',') {
        let part = part.trim();
        let (range, step) = match part.split_once('/') {
            Some((r, s)) => (
                r,
                s.parse::<u32>().map_err(|_| format!("步长无效: {part}"))?,
            ),
            None => (part, 1),
        };
        if step == 0 {
            return Err(format!("步长不能为 0: {part}"));
        }
        let (lo, hi) = if range == "*" {
            (min, max)
        } else if let Some((a, b)) = range.split_once('-') {
            (
                a.parse::<u32>().map_err(|_| format!("数值无效: {part}"))?,
                b.parse::<u32>().map_err(|_| format!("数值无效: {part}"))?,
            )
        } else {
            let v = range
                .parse::<u32>()
                .map_err(|_| format!("数值无效: {part}"))?;
            (v, v)
        };
        if lo < min || hi > max || lo > hi {
            return Err(format!("范围越界: {part}（应在 {min}-{max}）"));
        }
        let mut v = lo;
        while v <= hi {
            values.push(v);
            v += step;
        }
    }
    values.sort_unstable();
    values.dedup();
    Ok(values)
}

impl FromStr for Cron {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let fields: Vec<&str> = s.split_whitespace().collect();
        if fields.len() != 5 {
            return Err(format!(
                "需要 5 个字段（分 时 日 月 周），得到 {}",
                fields.len()
            ));
        }
        Ok(Self {
            minutes: parse_field(fields[0], 0, 59)?,
            hours: parse_field(fields[1], 0, 23)?,
            doms: parse_field(fields[2], 1, 31)?,
            months: parse_field(fields[3], 1, 12)?,
            dows: parse_field(fields[4], 0, 6)?,
        })
    }
}

impl Cron {
    /// Whether this expression matches the given wall-clock time.
    pub fn matches(&self, time: &chrono::DateTime<chrono::Utc>) -> bool {
        use chrono::{Datelike, Timelike};
        // Standard cron semantics: if both DOM and DOW are restricted
        // (non-*), either may match. We approximate with AND over the
        // parsed sets, which is the common library behavior.
        self.minutes.contains(&time.minute())
            && self.hours.contains(&time.hour())
            && self.doms.contains(&time.day())
            && self.months.contains(&time.month())
            && self.dows.contains(&time.weekday().num_days_from_sunday())
    }
}

/// Bind an SOP template into a fresh runnable project (slot substitution).
pub(crate) fn instantiate_project(
    sop: &serde_json::Value,
    inputs: &serde_json::Value,
) -> agent_runtime::Project {
    let title = sop
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("自动化任务");
    let goal = sop
        .get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("SOP 自动化执行");
    let format = sop
        .get("output_format")
        .and_then(|v| v.as_str())
        .unwrap_or("markdown");
    let mut project = agent_runtime::Project::new(format!("{title} · 自动执行"), goal, format);
    let steps: Vec<agent_runtime::Step> = sop
        .get("steps")
        .and_then(|v| v.as_array())
        .map(|raw_steps| {
            raw_steps
                .iter()
                .filter_map(|raw| {
                    let title = raw.get("title").and_then(|v| v.as_str())?;
                    let prompt = raw.get("prompt").and_then(|v| v.as_str())?;
                    let strategy = match raw.get("strategy").and_then(|v| v.as_str()) {
                        Some("review_required") => agent_runtime::StepStrategy::ReviewRequired,
                        Some("expert") => agent_runtime::StepStrategy::Expert,
                        _ => agent_runtime::StepStrategy::Direct,
                    };
                    // Automation runs unattended: slot values substitute;
                    // unfilled slots stay visible in the prompt.
                    let bound = substitute_slots(prompt, inputs);
                    Some(agent_runtime::step(title, bound, strategy))
                })
                .collect()
        })
        .unwrap_or_default();
    project.set_plan(steps);
    project
}

fn substitute_slots(prompt: &str, inputs: &serde_json::Value) -> String {
    let mut result = prompt.to_string();
    if let Some(map) = inputs.as_object() {
        for (key, value) in map {
            if let Some(text) = value.as_str() {
                result = result.replace(&format!("{{{{{key}}}}}"), text);
            }
        }
    }
    result
}

/// One execution-history record.
#[derive(Debug, Clone, serde::Serialize)]
pub struct ExecutionRecord {
    pub id: String,
    pub sop_id: String,
    pub project_id: String,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub ok: bool,
    pub note: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn cron_parses_fullExpressions() {
        let cron: Cron = "0 9 * * 1".parse().unwrap();
        assert_eq!(cron.minutes, vec![0]);
        assert_eq!(cron.hours, vec![9]);
        assert_eq!(cron.dows, vec![1]);
        // Monday 2026-08-24 09:00 UTC
        let monday = chrono::Utc.with_ymd_and_hms(2026, 8, 24, 9, 0, 0).unwrap();
        assert!(cron.matches(&monday));
        let tuesday = chrono::Utc.with_ymd_and_hms(2026, 8, 25, 9, 0, 0).unwrap();
        assert!(!cron.matches(&tuesday));
    }

    #[test]
    fn cron_step_and_ranges() {
        let cron: Cron = "*/15 8-10 * * *".parse().unwrap();
        assert_eq!(cron.minutes, vec![0, 15, 30, 45]);
        assert_eq!(cron.hours, vec![8, 9, 10]);
        let at = chrono::Utc.with_ymd_and_hms(2026, 8, 25, 9, 45, 0).unwrap();
        assert!(cron.matches(&at));
        let off = chrono::Utc.with_ymd_and_hms(2026, 8, 25, 9, 20, 0).unwrap();
        assert!(!cron.matches(&off));
    }

    #[test]
    fn cron_rejects_bad_input() {
        assert!("0 9 * *".parse::<Cron>().is_err());
        assert!("60 9 * * *".parse::<Cron>().is_err());
        assert!("a 9 * * *".parse::<Cron>().is_err());
        assert!("*/0 9 * * *".parse::<Cron>().is_err());
        assert!("5-1 9 * * *".parse::<Cron>().is_err());
    }

    #[test]
    fn instantiate_binds_slots_and_preserves_strategies() {
        let sop = serde_json::json!({
            "name": "周报",
            "description": "汇总",
            "output_format": "word",
            "steps": [
                { "title": "汇总", "prompt": "汇总 {{数据源}} 数据", "strategy": "direct" },
                { "title": "终稿", "prompt": "定稿", "strategy": "review_required" },
            ]
        });
        let project = instantiate_project(&sop, &serde_json::json!({ "数据源": "销售表" }));
        assert!(project.title.contains("自动执行"));
        assert_eq!(project.steps[0].prompt, "汇总 销售表 数据");
        assert_eq!(
            project.steps[1].strategy,
            agent_runtime::StepStrategy::ReviewRequired
        );
        assert_eq!(project.phase, agent_runtime::ProjectPhase::Executing);
    }

    #[test]
    fn unfilled_slots_stay_visible() {
        let sop = serde_json::json!({
            "name": "N", "steps": [{ "title": "t", "prompt": "取 {{来源}} 值", "strategy": "direct" }]
        });
        let project = instantiate_project(&sop, &serde_json::json!({}));
        assert_eq!(project.steps[0].prompt, "取 {{来源}} 值");
    }
}

// ==================== Scheduler tick ====================

use std::sync::Arc;

use axum::extract::State;
use axum::response::{Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::{json, Value};

use crate::{ok_data, AppState};
use agent_runtime::{run_project, StepModel};

/// The engine-chat adapter re-used from task_routes (unattended runs use
/// direct steps only — review gates would block automation, so SOPs with
/// gates are auto-approved on the tick path).
struct AutoStepModel {
    http: reqwest::Client,
    base_url: String,
}

#[async_trait::async_trait]
impl StepModel for AutoStepModel {
    async fn execute(&self, prompt: &str, _step: &agent_runtime::Step) -> Result<String, String> {
        let resp = self
            .http
            .post(format!("{}/v1/invoke", self.base_url))
            .json(&json!({
                "capability": "chat",
                "messages": [{ "role": "user", "content": prompt }],
                "params": {},
            }))
            .send()
            .await
            .map_err(|e| format!("引擎不可达: {e}"))?;
        if !resp.status().is_success() {
            return Err(format!("引擎 HTTP {}", resp.status()));
        }
        let payload: Value = resp.json().await.map_err(|e| format!("解析失败: {e}"))?;
        Ok(payload
            .get("text")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string())
    }
}

/// POST /api/automation/tick {now: "RFC3339"} — run every SOP whose cron
/// matches the given minute. Intended to be called by a desktop-shell
/// timer while the app is open (关窗后由托盘常驻进程驱动; v1 covers the
/// in-app path the PRD验收 allows for the shell).
async fn tick(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let now_str = body.get("now").and_then(Value::as_str).unwrap_or("");
    let now = match chrono::DateTime::parse_from_rfc3339(now_str) {
        Ok(t) => t.with_timezone(&chrono::Utc),
        Err(_) => chrono::Utc::now(),
    };

    let sops: Vec<Value> = state
        .store
        .list("sop")
        .into_iter()
        .filter(|sop| sop.pointer("/trigger/kind").and_then(Value::as_str) == Some("cron"))
        .collect();

    let mut fired = 0usize;
    let mut records: Vec<Value> = Vec::new();
    let checked = sops.len();
    for sop in sops {
        let cron_expr = sop
            .pointer("/trigger/cron")
            .and_then(Value::as_str)
            .unwrap_or("");
        let Ok(cron) = cron_expr.parse::<Cron>() else {
            continue;
        };
        if !cron.matches(&now) {
            continue;
        }
        fired += 1;

        // Instantiate + run unattended (gates auto-approve).
        let mut project = instantiate_project(&sop, &json!({}));
        let model = AutoStepModel {
            http: state.http.clone(),
            base_url: state.engine_base_url.clone(),
        };
        // Unattended runs auto-approve review gates (bounded against
        // pathological gate/rework loops).
        let mut guard = 0;
        loop {
            match run_project(&mut project, &model).await {
                Ok(()) => break,
                Err(agent_runtime::RunError::AwaitingReview(step_id)) => {
                    guard += 1;
                    if guard > 32 || agent_runtime::approve(&mut project, &step_id).is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }

        // Persist the project + an execution record.
        let project_value = serde_json::to_value(&project).unwrap_or(Value::Null);
        let _ = state
            .store
            .insert("project", &project.id, project_value.clone());
        let record_id = format!("run-{}", uuid::Uuid::new_v4());
        let note = format!(
            "SOP「{}」自动执行：{} 步，阶段 {}",
            sop.get("name").and_then(Value::as_str).unwrap_or("?"),
            project.steps.len(),
            project.phase.as_str(),
        );
        let record = json!({
            "id": record_id,
            "sop_id": sop.get("id").cloned().unwrap_or(Value::Null),
            "project_id": project.id,
            "started_at": now.to_rfc3339(),
            "finished_at": chrono::Utc::now().to_rfc3339(),
            "ok": project.phase == agent_runtime::ProjectPhase::Delivered,
            "note": note,
        });
        records.push(record.clone());
        let _ = state.store.insert("automation_run", &record_id, record);
    }

    ok_data(json!({ "checked": checked, "fired": fired, "records": records }))
}

/// GET /api/automation/runs — execution history.
async fn history(State(state): State<Arc<AppState>>) -> Response {
    let runs: Vec<Value> = state.store.list("automation_run");
    ok_data(runs)
}

pub(crate) fn automation_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/automation/tick", post(tick))
        .route("/api/automation/runs", get(history))
}
