/**
 * Embedding client over the engine's `embedding` capability (PLAT-07 vector
 * retrieval). One batched call per request; `None` on any failure so
 * callers degrade honestly to keyword retrieval — never a fake vector.
 */
use std::sync::Arc;

use serde_json::{json, Value};

use crate::AppState;

/// Embed `texts` in one batched engine call. `None` when the engine is
/// unreachable, no embedding model is configured, or the payload is shaped
/// unexpectedly (all treated as "vectors unavailable").
pub(crate) async fn embed(state: &Arc<AppState>, texts: &[String]) -> Option<Vec<Vec<f32>>> {
    if texts.is_empty() {
        return Some(Vec::new());
    }
    let url = format!("{}/v1/invoke", state.engine_base_url);
    let body = json!({
        "capability": "embedding",
        "messages": [{ "role": "user", "content": texts.join("\n") }],
        "params": { "input": texts },
    });
    let response = state.http.post(&url).json(&body).send().await.ok()?;
    if !response.status().is_success() {
        return None;
    }
    let payload: Value = response.json().await.ok()?;
    let rows = payload.get("embedding")?.as_array()?;
    if rows.len() != texts.len() {
        return None;
    }
    Some(
        rows.iter()
            .map(|row| {
                row.as_array()?
                    .iter()
                    .map(|v| v.as_f64().map(|f| f as f32))
                    .collect::<Option<Vec<f32>>>()
            })
            .collect::<Option<Vec<Vec<f32>>>>()?,
    )
}
