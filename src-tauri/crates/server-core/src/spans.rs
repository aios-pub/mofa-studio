/**
 * Span data layer (PLAT-15, M1 slice): every gateway-mediated AI call
 * records a metadata-only span into the `span` collection (PLAT-07 SQLite
 * backing). No prompts or generated text are ever stored — privacy level
 * "metadata only" is the fixed default.
 *
 * Retention: spans older than the configured window (default 90 days,
 * `MOFA_SPAN_RETENTION_DAYS`) are pruned at startup.
 */
use serde_json::{json, Value};

use crate::store::Store;

/// Default span retention in days (PRD: 90, configurable).
const DEFAULT_RETENTION_DAYS: i64 = 90;

/// What kind of gateway call produced this span.
pub(crate) const KIND_LLM: &str = "llm_call";
pub(crate) const KIND_IMAGE_GEN: &str = "image_gen_call";
pub(crate) const KIND_IMAGE_EDIT: &str = "image_edit_call";

/// Which surface triggered the call (chat / creation studio).
pub(crate) const SOURCE_CHAT: &str = "chat";
pub(crate) const SOURCE_STUDIO: &str = "studio";

/// Insert one span row. Never fails the caller: tracing complaints only.
#[allow(clippy::too_many_arguments)]
pub(crate) fn record_span(
    store: &Store,
    kind: &str,
    source: &str,
    model: &str,
    provider: Option<&str>,
    tokens_in: Option<u64>,
    tokens_out: Option<u64>,
    duration_ms: u64,
    status: &str,
    detail: Option<&str>,
    cost_usd: Option<f64>,
) {
    let id = format!("span-{}", uuid::Uuid::new_v4());
    let created_at = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();
    let doc = json!({
        "id": id,
        "trace_kind": kind,
        "source": source,
        "model": model,
        "provider": provider,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "duration_ms": duration_ms,
        "status": status,
        // Error reason for failed calls (PLAT-15 失败请求详情); metadata only.
        "detail": detail,
        // Engine-reported spend for this call (PLAT-05 budget accounting);
        // None when the provider has no price configured.
        "cost_usd": cost_usd,
        "created_at": created_at,
    });
    if let Err(e) = store.insert("span", &id, doc) {
        eprintln!("[spans] failed to record span: {e}");
    }
}

/// Delete spans older than the retention window. Called at startup.
pub(crate) fn prune_spans(store: &Store) {
    let days = std::env::var("MOFA_SPAN_RETENTION_DAYS")
        .ok()
        .and_then(|d| d.parse::<i64>().ok())
        .unwrap_or(DEFAULT_RETENTION_DAYS);
    let cutoff = (chrono::Utc::now() - chrono::Duration::days(days))
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();
    let stale: Vec<String> = store
        .list("span")
        .into_iter()
        .filter(|doc| {
            doc.get("created_at")
                .and_then(Value::as_str)
                .map(|at| at < cutoff.as_str())
                .unwrap_or(false)
        })
        .filter_map(|doc| doc.get("id").and_then(Value::as_str).map(str::to_string))
        .collect();
    for id in stale {
        store.delete("span", &id);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_store(tag: &str) -> Store {
        let dir = std::env::temp_dir().join(format!("mofa-span-test-{tag}"));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("mkdir");
        Store::open(&dir.join("t.db")).expect("open store")
    }

    #[test]
    fn records_metadata_only_spans() {
        let store = test_store("record");
        record_span(
            &store,
            KIND_LLM,
            SOURCE_CHAT,
            "mock/mock-chat",
            Some("mock"),
            Some(12),
            Some(34),
            1200,
            "ok",
            None,
            Some(0.0123),
        );
        let spans = store.list("span");
        assert_eq!(spans.len(), 1);
        let span = &spans[0];
        assert_eq!(span["trace_kind"], "llm_call");
        assert_eq!(span["source"], "chat");
        assert_eq!(span["model"], "mock/mock-chat");
        assert_eq!(span["tokens_out"], 34);
        assert_eq!(span["status"], "ok");
        assert_eq!(span["cost_usd"], 0.0123);
        // Privacy: no prompt/content fields exist on the span shape.
        for forbidden in ["prompt", "content", "messages", "text"] {
            assert!(
                span.get(forbidden).is_none(),
                "span must not carry {forbidden}"
            );
        }
    }

    #[test]
    fn prunes_spans_past_retention() {
        let store = test_store("prune");
        // Fresh span stays; a 100-day-old span goes.
        record_span(
            &store,
            KIND_LLM,
            SOURCE_CHAT,
            "m",
            None,
            None,
            None,
            1,
            "ok",
            None,
            None,
        );
        let old_id = "span-old";
        let old_created = (chrono::Utc::now() - chrono::Duration::days(100))
            .format("%Y-%m-%dT%H:%M:%S%.3fZ")
            .to_string();
        store
            .insert(
                "span",
                old_id,
                json!({"id": old_id, "trace_kind": "llm_call"}),
            )
            .expect("insert old span");
        // insert() stamps created_at with now; backdate it via update so the
        // retention filter can see it as expired.
        store
            .update("span", old_id, &json!({"created_at": old_created}))
            .expect("backdate old span");

        prune_spans(&store);
        let spans = store.list("span");
        assert_eq!(spans.len(), 1);
        assert_ne!(spans[0]["id"].as_str(), Some(old_id));
    }
}
