/**
 * Workflow execution routes (FLOW-04): run a canvas graph on the embedded
 * runner. `POST /api/flow/execute` returns the aggregate result;
 * `POST /api/flow/execute/stream` streams node-status events as SSE for
 * live canvas coloring, ending with the ExecutionFinished event.
 */
use std::sync::Arc;

use crate::{err_msg, ok_data, AppState};
use axum::body::Body;
use axum::extract::State;
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use flow_engine::{FlowEvent, FlowGraph};
use serde_json::{json, Value};
use tokio::sync::mpsc;

pub(crate) fn flow_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/flow/execute", post(execute))
        .route("/api/flow/execute/stream", post(execute_stream))
        .route("/api/flow/docs", post(save_doc).get(list_docs))
        .route("/api/flow/docs/{id}/versions", get(list_versions))
        .route("/api/flow/docs/{id}/versions/{index}", get(get_version))
}

/// POST /api/flow/execute { graph } → ExecutionResult JSON.
async fn execute(State(state): State<Arc<AppState>>, Json(graph): Json<FlowGraph>) -> Response {
    let result = state.flow_runner.execute(&graph, |_| {}).await;
    let payload = serde_json::to_value(result).unwrap_or(Value::Null);
    Json(embed_workflow_snapshots(payload, &graph)).into_response()
}

/// FLOW-06: splice the executed graph into every output PNG (tEXt chunk)
/// so any result image can restore the workflow that produced it. Non-PNG
/// payloads (and non-image outputs) pass through untouched.
fn embed_workflow_snapshots(mut value: Value, graph: &FlowGraph) -> Value {
    let snapshot = match serde_json::to_string(graph) {
        Ok(s) => s,
        Err(_) => return value,
    };
    use base64::Engine as _;
    let engine = base64::engine::general_purpose::STANDARD;
    let outputs = match value
        .get_mut("node_outputs")
        .and_then(|v| v.as_object_mut())
    {
        Some(o) => o,
        None => return value,
    };
    for output in outputs.values_mut() {
        let images = match output.get_mut("images").and_then(|v| v.as_array_mut()) {
            Some(i) => i,
            None => continue,
        };
        for image in images.iter_mut() {
            let Some(b64) = image.as_str() else { continue };
            let Ok(bytes) = engine.decode(b64) else {
                continue;
            };
            if let Ok(embedded) = crate::png_meta::embed_workflow(&bytes, &snapshot) {
                *image = Value::String(engine.encode(embedded));
            }
        }
    }
    value
}

/// POST /api/flow/execute/stream { graph } → SSE of FlowEvents. Events
/// flow as the run progresses; the terminal `execution_finished` event
/// carries the executed/cached counters, then the stream closes.
async fn execute_stream(
    State(state): State<Arc<AppState>>,
    Json(graph): Json<FlowGraph>,
) -> Response {
    let (tx, rx) = mpsc::channel::<Result<Vec<u8>, std::io::Error>>(64);

    tokio::spawn(async move {
        let runner = state.flow_runner.clone();
        let emitter = tx.clone();
        // The runner invokes this sync callback from its async loop, so the
        // send must be non-blocking; a full buffer drops the event (capacity
        // 64 covers realistic graphs, and the final frame repeats the result).
        let result = runner
            .execute(&graph, |event: FlowEvent| {
                if let Ok(data) = serde_json::to_string(&event) {
                    let _ = emitter.try_send(Ok(format!("data: {data}\n\n").into_bytes()));
                }
            })
            .await;
        // Final data frame carries the aggregate result for convenience
        // (with the workflow snapshot embedded into every output PNG).
        let payload =
            embed_workflow_snapshots(serde_json::to_value(&result).unwrap_or(Value::Null), &graph);
        if let Ok(data) = serde_json::to_string(&payload) {
            let _ = emitter.try_send(Ok(format!("data: {data}\n\n").into_bytes()));
        }
    });

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "text/event-stream")
        .header(header::CACHE_CONTROL, "no-cache")
        .body(Body::from_stream(
            tokio_stream::wrappers::ReceiverStream::new(rx),
        ))
        .unwrap()
}

// ==================== FLOW-06 文档与版本历史 ====================

const FLOW_DOC_COLLECTION: &str = "flow_doc";
const FLOW_VERSION_COLLECTION: &str = "flow_version";
const MAX_VERSIONS_PER_DOC: usize = 20;

/// POST /api/flow/docs { id?, name, graph } → save (upsert), appending a
/// version snapshot (capped — oldest beyond the cap are pruned).
async fn save_doc(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let name = body
        .get("name")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or("");
    let graph = body.get("graph");
    if name.is_empty() || graph.is_none() {
        return err_msg(StatusCode::BAD_REQUEST, "name 与 graph 必填");
    }
    let id = body
        .get("id")
        .and_then(Value::as_str)
        .filter(|s| !s.trim().is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| format!("flowdoc-{}", uuid::Uuid::new_v4()));

    let next_index = state
        .store
        .filter_eq(FLOW_VERSION_COLLECTION, "doc_id", &id)
        .into_iter()
        .filter_map(|v| v.get("version_index").and_then(Value::as_u64))
        .max()
        .map(|i| i + 1)
        .unwrap_or(1);

    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();
    let doc = json!({
        "id": id,
        "name": name,
        "latest_version": next_index,
        "updated_at": now,
    });
    if state
        .store
        .insert(FLOW_DOC_COLLECTION, &id, doc.clone())
        .is_err()
    {
        let _ = state.store.update(FLOW_DOC_COLLECTION, &id, &doc);
    }
    let version_id = format!("{id}-v{next_index}");
    let version = json!({
        "id": version_id,
        "doc_id": id,
        "version_index": next_index,
        "graph": graph,
        "created_at": now,
    });
    if state
        .store
        .insert(FLOW_VERSION_COLLECTION, &version_id, version.clone())
        .is_err()
    {
        let _ = state
            .store
            .update(FLOW_VERSION_COLLECTION, &version_id, &version);
    }

    // Prune oldest versions beyond the cap.
    let mut all: Vec<(u64, String)> = state
        .store
        .filter_eq(FLOW_VERSION_COLLECTION, "doc_id", &id)
        .into_iter()
        .filter_map(|v| {
            let index = v.get("version_index").and_then(Value::as_u64)?;
            let vid = v.get("id").and_then(Value::as_str)?.to_string();
            Some((index, vid))
        })
        .collect();
    if all.len() > MAX_VERSIONS_PER_DOC {
        all.sort_by_key(|(index, _)| *index);
        for (_, vid) in &all[..all.len() - MAX_VERSIONS_PER_DOC] {
            let _ = state.store.delete(FLOW_VERSION_COLLECTION, vid);
        }
    }

    ok_data(json!({ "id": id, "version": next_index })).into_response()
}

/// GET /api/flow/docs → every saved doc with its latest version pointer.
async fn list_docs(State(state): State<Arc<AppState>>) -> Response {
    ok_data(json!(state.store.list(FLOW_DOC_COLLECTION))).into_response()
}

/// GET /api/flow/docs/{id}/versions → version index (newest first).
async fn list_versions(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Response {
    let mut versions: Vec<Value> = state
        .store
        .filter_eq(FLOW_VERSION_COLLECTION, "doc_id", &id)
        .into_iter()
        .map(|mut v| {
            if let Some(obj) = v.as_object_mut() {
                obj.remove("graph"); // index only — payloads fetched per version
            }
            v
        })
        .collect();
    versions.sort_by_key(|v| {
        std::cmp::Reverse(v.get("version_index").and_then(Value::as_u64).unwrap_or(0))
    });
    if versions.is_empty() && state.store.get(FLOW_DOC_COLLECTION, &id).is_none() {
        return err_msg(StatusCode::NOT_FOUND, "unknown flow doc");
    }
    ok_data(json!(versions)).into_response()
}

/// GET /api/flow/docs/{id}/versions/{index} → the graph snapshot.
async fn get_version(
    State(state): State<Arc<AppState>>,
    axum::extract::Path((id, index)): axum::extract::Path<(String, u64)>,
) -> Response {
    let version_id = format!("{id}-v{index}");
    match state.store.get(FLOW_VERSION_COLLECTION, &version_id) {
        Some(version) => {
            ok_data(version.get("graph").cloned().unwrap_or(Value::Null)).into_response()
        }
        None => err_msg(StatusCode::NOT_FOUND, "unknown flow version"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_types_round_trip() {
        let graph: FlowGraph = serde_json::from_str(
            r#"{"nodes":[{"id":"p","type":"prompt_text","params":{"text":"橘猫"}}],"edges":[]}"#,
        )
        .expect("parse graph");
        assert_eq!(graph.nodes.len(), 1);
        let event: FlowEvent =
            serde_json::from_str(r#"{"type":"node_status","node_id":"p","status":"cached"}"#)
                .expect("parse event");
        assert!(matches!(
            event,
            FlowEvent::NodeStatus {
                status: flow_engine::NodeStatus::Cached,
                ..
            }
        ));
    }
}
