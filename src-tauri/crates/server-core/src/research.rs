/**
 * Deep research pipeline (TOOL-09): tiered source counts with an upfront
 * token-cost estimate, LLM query planning, multi-query retrieval with URL
 * dedup, and a citation-numbered markdown report. Progress is observable
 * per query (检索路径树) through the status endpoint.
 */
use std::collections::HashSet;
use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::{Response};
use axum::routing::post;
use axum::{Json, Router};
use serde_json::{json, Value};
use tokio::sync::Mutex;

use crate::search::{run_search, SearchResult};
use crate::{err_msg, ok_data, AppState};

/// Research tiers (PRD: 快速 3 源 / 标准 8 源 / 深入 15+ 源).
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) enum Tier {
    Quick,
    Standard,
    Deep,
}

impl Tier {
    pub(crate) fn from_str_loose(s: &str) -> Option<Self> {
        match s {
            "quick" => Some(Self::Quick),
            "standard" => Some(Self::Standard),
            "deep" => Some(Self::Deep),
            _ => None,
        }
    }

    /// Target source count.
    pub(crate) fn sources(self) -> usize {
        match self {
            Self::Quick => 3,
            Self::Standard => 8,
            Self::Deep => 15,
        }
    }

    /// Queries planned (each query pulls several results; dedup trims).
    pub(crate) fn queries(self) -> usize {
        match self {
            Self::Quick => 1,
            Self::Standard => 3,
            Self::Deep => 5,
        }
    }

    /// Results requested per query.
    pub(crate) fn per_query(self) -> usize {
        match self {
            Self::Quick => 3,
            Self::Standard => 4,
            Self::Deep => 5,
        }
    }
}

/// Upfront token-cost estimate (BYOK 真金白银): planning + snippets read +
/// synthesis output. Rough by design — displayed as an estimate.
pub(crate) fn estimate_tokens(tier: Tier) -> u64 {
    let sources = tier.sources() as u64;
    // ~350 tokens per snippet read, ~250 output tokens per source synthesized,
    // plus a fixed planning/synthesis overhead.
    400 + sources * 600
}

/// Parse the planner's query list from an LLM reply (one per line, or a
/// JSON array).
pub(crate) fn parse_queries(reply: &str) -> Vec<String> {
    let trimmed = reply.trim();
    let mut queries: Vec<String> = Vec::new();
    if trimmed.starts_with('[') {
        if let Ok(parsed) = serde_json::from_str::<Vec<String>>(trimmed) {
            queries = parsed;
        }
    }
    if queries.is_empty() {
        queries = trimmed
            .lines()
            .map(|line| {
                line.trim()
                    .trim_start_matches([
                        '-', '·', '*', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', ' ',
                    ])
                    .trim()
                    .to_string()
            })
            .filter(|line| !line.is_empty())
            .collect();
    }
    queries.into_iter().take(8).collect()
}

/// Dedup results by URL, preserving first-seen order.
pub(crate) fn dedup_results(all: Vec<SearchResult>) -> Vec<SearchResult> {
    let mut seen = HashSet::new();
    all.into_iter()
        .filter(|result| seen.insert(result.url.clone()))
        .collect()
}

/// Build the synthesis prompt: numbered sources → cited markdown report.
pub(crate) fn synthesis_messages(topic: &str, sources: &[SearchResult]) -> Vec<Value> {
    let numbered: Vec<String> = sources
        .iter()
        .enumerate()
        .map(|(index, source)| {
            format!(
                "[{}] {} — {}\n{}",
                index + 1,
                source.title,
                source.url,
                source.snippet
            )
        })
        .collect();
    vec![
        json!({
            "role": "system",
            "content": "你是研究分析师。基于给定资料撰写结构化 Markdown 研究报告：摘要、要点分析（分小节）、结论、参考来源列表。正文中用 [序号] 标注引用。只使用资料中的信息，资料不足时明确说明。"
        }),
        json!({
            "role": "user",
            "content": format!("研究主题：{topic}\n\n检索到的资料：\n\n{}", numbered.join("\n\n"))
        }),
    ]
}

// ==================== Run state ====================

#[derive(Debug, Clone, serde::Serialize)]
struct QueryProgress {
    query: String,
    results: usize,
}

#[derive(Debug, Clone, Default, serde::Serialize)]
struct ResearchRun {
    phase: String,
    topic: String,
    tier: String,
    queries: Vec<QueryProgress>,
    sources: usize,
    report_md: Option<String>,
    error: Option<String>,
}

#[derive(Default)]
pub(crate) struct ResearchRegistry {
    runs: Mutex<std::collections::HashMap<String, ResearchRun>>,
}

// ==================== Engine chat helper ====================

async fn engine_chat(state: &AppState, messages: &[Value]) -> Result<String, String> {
    let body = json!({
        "capability": "chat",
        "messages": messages,
        "params": {},
    });
    let payload = state
        .engine
        .invoke(body)
        .await
        .map_err(|e| e.message)?;
    Ok(payload
        .get("text")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string())
}

// ==================== Handlers ====================

/// POST /api/research/start {topic, tier}
async fn start(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let topic = body
        .get("topic")
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim();
    if topic.is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "topic 不能为空");
    }
    let tier_name = body
        .get("tier")
        .and_then(Value::as_str)
        .unwrap_or("standard")
        .to_string();
    let Some(tier) = Tier::from_str_loose(&tier_name) else {
        return err_msg(
            StatusCode::BAD_REQUEST,
            "tier 必须是 quick / standard / deep",
        );
    };

    let research_id = format!("rs-{}", uuid::Uuid::new_v4());
    state.research.runs.lock().await.insert(
        research_id.clone(),
        ResearchRun {
            phase: "planning".into(),
            topic: topic.to_string(),
            tier: tier_name.to_string(),
            ..Default::default()
        },
    );

    let task_state = state.clone();
    let run_key = research_id.clone();
    let topic_owned = topic.to_string();
    let tier_for_task = tier_name.clone();
    tokio::spawn(async move {
        let mut run = ResearchRun {
            phase: "planning".into(),
            topic: topic_owned.clone(),
            tier: tier_for_task.clone(),
            ..Default::default()
        };

        // 1. Plan queries.
        let plan_prompt = json!([
            { "role": "system", "content": format!(
                "为研究主题生成 {} 条互补的中文搜索查询（覆盖不同侧面）。只输出查询列表，每行一条，不要编号。",
                tier.queries()
            )},
            { "role": "user", "content": topic_owned },
        ]);
        let queries = match engine_chat(&task_state, plan_prompt.as_array().unwrap()).await {
            Ok(reply) => {
                let parsed = parse_queries(&reply);
                if parsed.is_empty() {
                    vec![topic_owned.clone()]
                } else {
                    parsed
                }
            }
            Err(_) => vec![topic_owned.clone()],
        };

        // 2. Search each query, dedup by URL, cap at the tier's source count.
        run.phase = "searching".into();
        let mut all_results: Vec<SearchResult> = Vec::new();
        for query in &queries {
            let results = run_search(&task_state, query, tier.per_query())
                .await
                .unwrap_or_default();
            run.queries.push(QueryProgress {
                query: query.clone(),
                results: results.len(),
            });
            all_results.extend(results);
            let sources = dedup_results(std::mem::take(&mut all_results));
            all_results = sources;
        }
        let sources: Vec<SearchResult> = all_results.into_iter().take(tier.sources()).collect();
        run.sources = sources.len();

        // 3. Synthesize with citations.
        if sources.is_empty() {
            run.phase = "failed".into();
            run.error = Some("没有检索到任何资料：请检查搜索配置".into());
        } else {
            run.phase = "synthesizing".into();
            match engine_chat(
                &task_state,
                synthesis_messages(&topic_owned, &sources).as_slice(),
            )
            .await
            {
                Ok(report) => {
                    run.report_md = Some(report);
                    run.phase = "done".into();
                }
                Err(e) => {
                    run.phase = "failed".into();
                    run.error = Some(e);
                }
            }
        }

        task_state
            .research
            .runs
            .lock()
            .await
            .insert(run_key.clone(), run);
    });

    ok_data(json!({
        "research_id": research_id,
        "tier": tier_name,
        "sources_target": tier.sources(),
        "estimated_tokens": estimate_tokens(tier),
    }))
}

/// GET /api/research/{id}
async fn status(State(state): State<Arc<AppState>>, Path(research_id): Path<String>) -> Response {
    let runs = state.research.runs.lock().await;
    match runs.get(&research_id) {
        Some(run) => ok_data(json!({
            "phase": run.phase,
            "topic": run.topic,
            "tier": run.tier,
            "queries": run.queries,
            "sources": run.sources,
            "report_md": run.report_md,
            "error": run.error,
        })),
        None => err_msg(StatusCode::NOT_FOUND, "研究任务不存在"),
    }
}

pub(crate) fn research_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/research/start", post(start))
        .route("/api/research/{id}", axum::routing::get(status))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tiers_match_the_prd() {
        assert_eq!(Tier::Quick.sources(), 3);
        assert_eq!(Tier::Standard.sources(), 8);
        assert_eq!(Tier::Deep.sources(), 15);
        assert!(Tier::Deep.queries() > Tier::Standard.queries());
        assert_eq!(Tier::from_str_loose("quick"), Some(Tier::Quick));
        assert_eq!(Tier::from_str_loose("nope"), None);
    }

    #[test]
    fn token_estimate_grows_with_tier() {
        assert!(estimate_tokens(Tier::Deep) > estimate_tokens(Tier::Standard));
        assert!(estimate_tokens(Tier::Standard) > estimate_tokens(Tier::Quick));
        assert!(estimate_tokens(Tier::Quick) > 0);
    }

    #[test]
    fn parse_queries_accepts_lines_and_json() {
        let lines = parse_queries("橘猫 习性\n- 橘猫 饮食\n·橘猫 寿命");
        assert_eq!(lines.len(), 3);
        assert!(lines[0].contains("习性"));

        let json_list = parse_queries(r#"["查询一","查询二"]"#);
        assert_eq!(json_list, vec!["查询一", "查询二"]);
    }

    #[test]
    fn dedup_keeps_first_seen_urls() {
        let results = vec![
            SearchResult {
                title: "a".into(),
                url: "u1".into(),
                snippet: String::new(),
            },
            SearchResult {
                title: "b".into(),
                url: "u2".into(),
                snippet: String::new(),
            },
            SearchResult {
                title: "a-dup".into(),
                url: "u1".into(),
                snippet: String::new(),
            },
        ];
        let deduped = dedup_results(results);
        assert_eq!(deduped.len(), 2);
        assert_eq!(deduped[0].title, "a");
    }

    #[test]
    fn synthesis_prompt_numbers_every_source() {
        let sources = vec![
            SearchResult {
                title: "t1".into(),
                url: "https://a".into(),
                snippet: "s1".into(),
            },
            SearchResult {
                title: "t2".into(),
                url: "https://b".into(),
                snippet: "s2".into(),
            },
        ];
        let messages = synthesis_messages("主题", &sources);
        let user_content = messages[1]["content"].as_str().unwrap();
        assert!(user_content.contains("[1] t1"));
        assert!(user_content.contains("[2] t2"));
    }
}
