/**
 * Native WebSocket endpoint.
 *
 * The frontend WebSocket manager connects to the raw server URL (no path),
 * so the root handler upgrades WebSocket requests and answers everything
 * else with server info. Heartbeat messages ("ping"/"pong") keep the
 * connection alive; server-sent events can later be broadcast through the
 * shared channel.
 */

use std::sync::Arc;

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{FromRequestParts, State};
use axum::response::Response;
use axum::routing::get;
use axum::Router;
use serde_json::json;

use crate::{ok_data, AppState, VERSION};

/// Rejection of the WebSocketUpgrade extractor; the enum itself is private
/// in axum 0.8, so it is named through the associated type.
type WsUpgradeRejection =
    <WebSocketUpgrade as FromRequestParts<Arc<AppState>>>::Rejection;

/// Root route: WebSocket upgrade when requested, otherwise server info.
/// `Result` is the optional-extractor form (axum-core 0.5 `Option<T>` needs
/// `OptionalFromRequestParts`, which `WebSocketUpgrade` does not implement).
pub(crate) async fn root_handler(
    State(state): State<Arc<AppState>>,
    ws: Result<WebSocketUpgrade, WsUpgradeRejection>,
) -> Response {
    match ws {
        Ok(upgrade) => upgrade.on_upgrade(move |socket| handle_socket(socket, state)),
        Err(_) => ok_data(json!({ "name": "mofa-studio server-core", "version": VERSION })),
    }
}

/// Mount the root route.
pub(crate) fn ws_routes() -> Router<Arc<AppState>> {
    Router::new().route("/", get(root_handler))
}

async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>) {
    let mut events = state.events.subscribe();
    loop {
        tokio::select! {
            maybe_message = socket.recv() => {
                match maybe_message {
                    Some(Ok(Message::Text(text))) if text.as_str() == "ping" => {
                        if socket.send(Message::Text("pong".into())).await.is_err() {
                            break;
                        }
                    }
                    // Ignore other client frames; nothing subscribes to them yet
                    Some(Ok(_)) => {}
                    Some(Err(_)) | None => break,
                }
            }
            event = events.recv() => {
                match event {
                    // Lagged just means missed events; keep the connection
                    Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(_) => break,
                    Ok(event) => {
                        if socket.send(Message::Text(event.into())).await.is_err() {
                            break;
                        }
                    }
                }
            }
        }
    }
}
