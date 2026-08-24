/**
 * Workflow execution routes (FLOW-04): run a canvas graph on the embedded
 * runner. `POST /api/flow/execute` returns the aggregate result;
 * `POST /api/flow/execute/stream` streams node-status events as SSE for
 * live canvas coloring, ending with the ExecutionFinished event.
 */
use std::sync::Arc;

use axum::body::Body;
use axum::extract::State;
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{Json, Router};
use flow_engine::{FlowEvent, FlowGraph};
use serde_json::Value;
use tokio::sync::mpsc;

use crate::AppState;

pub(crate) fn flow_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/flow/execute", post(execute))
        .route("/api/flow/execute/stream", post(execute_stream))
}

/// POST /api/flow/execute { graph } → ExecutionResult JSON.
async fn execute(State(state): State<Arc<AppState>>, Json(graph): Json<FlowGraph>) -> Response {
    let result = state.flow_runner.execute(&graph, |_| {}).await;
    Json(serde_json::to_value(result).unwrap_or(Value::Null)).into_response()
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
        // Final data frame carries the aggregate result for convenience.
        if let Ok(payload) = serde_json::to_string(&result) {
            let _ = emitter.try_send(Ok(format!("data: {payload}\n\n").into_bytes()));
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
