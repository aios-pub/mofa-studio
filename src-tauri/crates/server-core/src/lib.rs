/**
 * server-core — embedded local-first backend for mofa-studio.
 *
 * Evolved from the standalone AgentOS API server (agentos-api). The API
 * conventions are kept identical so the existing frontend service layer works
 * unchanged: `{ code, msg, data }` response envelope, `/api/<domain>/...`
 * action-style routes, and JWT bearer tokens.
 *
 * Desktop adaptations:
 * - SQLite database file inside the app data directory (no external Postgres)
 * - Binds to 127.0.0.1 with an OS-assigned dynamic port
 * - Local session: login always succeeds with the on-device user, so the
 *   app opens straight to the workbench without a login screen
 */
pub mod audio_routes;
pub mod auth;
pub mod collections;
pub mod flow_routes;
pub mod search;
pub mod llm_gateway;
pub mod routes;
pub mod media;
pub mod podcast;
pub mod rag;
pub mod research;
pub mod spans;
pub mod storage;
pub mod store;
pub mod video_routes;
pub mod ws;

use std::io;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::path::PathBuf;
use std::sync::Arc;

use tokio::net::TcpListener;

use axum::extract::DefaultBodyLimit;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde_json::json;
use tower_http::cors::CorsLayer;

/// Crate version reported by `/health` and `get_server_info`.
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

// ==================== Configuration ====================

/// Server startup configuration.
#[derive(Debug, Clone)]
pub struct ServerConfig {
    /// Bind address; the embedded server always stays on the loopback interface.
    pub host: IpAddr,
    /// Bind port; `0` lets the OS assign a free dynamic port.
    pub port: u16,
    /// Directory holding the SQLite database and generated secrets.
    pub data_dir: PathBuf,
    /// Base URL of the mofa-engine inference server. `None` falls back to
    /// the `MOFA_ENGINE_URL` env var, then the default loopback address.
    pub engine_base_url: Option<String>,
}

impl ServerConfig {
    /// Build a loopback configuration for the given data directory.
    pub fn for_data_dir(data_dir: PathBuf) -> Self {
        Self {
            host: IpAddr::V4(Ipv4Addr::LOCALHOST),
            port: 0,
            data_dir,
            engine_base_url: None,
        }
    }
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self::for_data_dir(PathBuf::from("server-data"))
    }
}

// ==================== Application state ====================

/// Shared application state passed to every handler.
pub(crate) struct AppState {
    pub store: store::Store,
    pub jwt_secret: String,
    pub events: tokio::sync::broadcast::Sender<String>,
    /// Shared HTTP client for outbound calls to mofa-engine.
    pub http: reqwest::Client,
    /// Resolved mofa-engine base URL (config → env → default).
    pub engine_base_url: String,
    /// Workflow runner (FLOW-04) with its signature cache.
    pub flow_runner: std::sync::Arc<flow_engine::FlowRunner<flow_engine::HttpEngineClient>>,
    /// Async video generation tasks (TOOL-02).
    pub video_tasks: video_routes::VideoTaskRegistry,
    /// App data directory (media artifacts live under data/media).
    pub data_dir: std::path::PathBuf,
    /// Deep-research runs (TOOL-09).
    pub research: research::ResearchRegistry,
}

// ==================== Response helpers ====================

/// Success envelope: `{"code": 0, "msg": "success", "data": ...}`.
pub(crate) fn ok_data<T: serde::Serialize>(data: T) -> Response {
    (
        StatusCode::OK,
        Json(json!({ "code": 0, "msg": "success", "data": data })),
    )
        .into_response()
}

/// Error envelope with an explicit HTTP status.
pub(crate) fn err_msg(status: StatusCode, msg: &str) -> Response {
    (status, Json(json!({ "code": 1, "msg": msg }))).into_response()
}

// ==================== Router ====================

/// Build the complete application router. Opens (and migrates) the SQLite
/// database under `config.data_dir`.
pub fn build_router(config: &ServerConfig) -> io::Result<Router> {
    std::fs::create_dir_all(&config.data_dir)?;
    let db_path = config.data_dir.join("mofa-studio.db");
    let store = store::Store::open(&db_path)?;
    let jwt_secret = store.get_or_create_secret();

    // PLAT-15: prune expired spans at startup (default 90-day retention).
    spans::prune_spans(&store);

    let engine_base_url = llm_gateway::resolve_engine_url(config.engine_base_url.clone());
    let state = Arc::new(AppState {
        store,
        jwt_secret,
        events: tokio::sync::broadcast::channel(64).0,
        // The engine is always a local/direct service; never route these
        // hops through a system HTTP proxy (reqwest would otherwise pick up
        // e.g. a Clash-style system proxy and break loopback calls).
        http: reqwest::Client::builder()
            .no_proxy()
            .build()
            .expect("reqwest client"),
        engine_base_url: engine_base_url.clone(),
        flow_runner: std::sync::Arc::new(flow_engine::FlowRunner::new(
            flow_engine::HttpEngineClient::new(engine_base_url),
        )),
        video_tasks: video_routes::VideoTaskRegistry::default(),
        data_dir: config.data_dir.clone(),
        research: research::ResearchRegistry::default(),
    });

    let app = Router::new()
        .route("/health", get(health))
        .merge(ws::ws_routes())
        .merge(routes::extras_routes())
        .merge(llm_gateway::llm_routes())
        .merge(flow_routes::flow_routes())
        .merge(search::search_routes())
        .merge(video_routes::video_routes())
        .merge(media::media_routes())
        .merge(audio_routes::audio_routes())
        .merge(rag::rag_routes())
        .merge(research::research_routes())
        .merge(podcast::podcast_routes())
        .merge(storage::storage_routes())
        .merge(auth::auth_routes())
        .merge(collections::collection_routes())
        .fallback(not_implemented)
        .layer(CorsLayer::permissive())
        // Parity with agentos-api: allow large payloads (file uploads)
        .layer(DefaultBodyLimit::max(200 * 1024 * 1024))
        .with_state(state);

    Ok(app)
}

/// Bind the configured address and spawn the Axum serve task onto the
/// current tokio runtime. Returns the actually-bound address (useful when
/// `port` was 0). Must be called from an async context on a tokio runtime —
/// inside Tauri use `tauri::async_runtime::block_on(start(..))`.
pub async fn start(config: ServerConfig) -> io::Result<SocketAddr> {
    let app = build_router(&config)?;
    let listener = TcpListener::bind((config.host, config.port)).await?;
    let addr = listener.local_addr()?;
    println!("[server-core] listening on http://{addr}");
    tokio::spawn(async move {
        if let Err(e) = axum::serve(listener, app).await {
            eprintln!("[server-core] serve error: {e}");
        }
    });
    Ok(addr)
}

async fn health() -> &'static str {
    "OK"
}

/// Honest 404 for endpoints the local backend does not implement (yet).
async fn not_implemented() -> Response {
    err_msg(
        StatusCode::NOT_FOUND,
        "Endpoint not implemented in local mode",
    )
}
