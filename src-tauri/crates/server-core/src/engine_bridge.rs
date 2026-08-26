/**
 * In-process bridge to the embedded mofa-engine.
 *
 * The engine's library crates (`mofa-kernel` traits, `mofa-engine-core`
 * `Engine` facade) are linked directly into this process — there is no
 * separate daemon, port, or `MOFA_ENGINE_URL` hop anymore. This module is
 * the single seam between server-core and the engine:
 *
 * - [`LlmEngine`] abstracts capability invocation so tests can inject a
 *   stub instead of the real engine.
 * - [`CoreLlmEngine`] wraps `mofa_engine_core::Engine`, translating between
 *   this crate's wire-shaped JSON and the kernel's serde types.
 * - [`CoreFlowClient`] adapts the engine to `flow_engine::EngineClient` for
 *   workflow generation nodes.
 *
 * All request/response payloads stay as `serde_json::Value` on purpose: the
 * kernel types deserialize exactly from/to the wire contract the gateway
 * handlers already speak (capability string, messages with images,
 * `input_file` / `input_mask`, `params`), so no handler-side re-shaping is
 * needed.
 */
use std::path::{Path, PathBuf};
use std::sync::Arc;

use async_trait::async_trait;
use serde_json::{json, Value};

/// Error surfaced by an engine call.
#[derive(Debug, Clone)]
pub struct EngineCallError {
    /// Suggested HTTP status for the failure, mapped from the kernel error
    /// code (`InvalidRequest` → 400, `Timeout` → 504, …).
    pub status: u16,
    pub message: String,
}

impl EngineCallError {
    /// Per-request rejection with an explicit status hint.
    pub fn rejected(status: u16, message: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(),
        }
    }

    /// Map a kernel engine error into the bridge error.
    pub fn from_engine(err: mofa_kernel::EngineError) -> Self {
        use mofa_kernel::ErrorCode as Code;
        let info = err.info();
        let status = match info.code {
            Code::InvalidRequest => 400,
            Code::NoCapableModel | Code::CircuitOpen | Code::MemoryPressure => 503,
            Code::UnsupportedOperation => 501,
            Code::Timeout => 504,
            Code::ProviderError | Code::Config | Code::Internal => 502,
        };
        Self {
            status,
            message: info.message,
        }
    }
}

/// The seam between server-core and the inference engine.
///
/// Requests/responses travel as wire-shaped JSON values matching the
/// documented engine contract; see module docs for why.
#[async_trait]
pub trait LlmEngine: Send + Sync {
    /// One capability invocation (`/v1/invoke` semantics).
    async fn invoke(&self, req: Value) -> Result<Value, EngineCallError>;

    /// Streamed invocation yielding serialized kernel `StreamChunk` JSON
    /// values (`started` / `text` / `reasoning` / `completed` / `error`).
    fn invoke_stream(
        &self,
        req: Value,
    ) -> Result<tokio::sync::mpsc::Receiver<Value>, EngineCallError>;

    /// Live model cards (`provider/model` ids, capabilities, status).
    async fn capabilities(&self) -> Vec<Value>;

    /// Liveness summary. An in-process engine cannot be "unreachable", but it
    /// can still be unconfigured (zero providers).
    async fn health(&self) -> Value;

    /// Register a provider at runtime, persisting it into the engine config
    /// file so it survives restarts (BYOK setup).
    async fn add_provider_config(&self, provider: &Value) -> Result<Value, EngineCallError>;

    /// Masked provider listing derived from live capability cards — keys
    /// never leave the engine.
    async fn list_providers(&self) -> Value;
}

// ==================== Embedded engine ====================

/// The real engine: `mofa_engine_core::Engine` running inside this process.
pub struct CoreLlmEngine {
    inner: Arc<mofa_engine_core::Engine>,
    /// Engine config file backing BYOK persistence; created on first write.
    config_path: PathBuf,
}

impl CoreLlmEngine {
    /// Boot an embedded engine rooted under the app data directory.
    ///
    /// Layout: `<data_dir>/engine/config.toml` (optional user/BYOK config)
    /// and `<data_dir>/engine/artifacts/` for generated files. When no config
    /// file exists the engine starts with its built-in defaults — zero-config
    /// first run; adding the first provider via the setup flow creates the
    /// file. `security.input_roots` pins local-file reads to the app data dir
    /// so ASR uploads and image-edit inputs pass the allowlist while nothing
    /// wider is reachable.
    pub async fn boot(data_dir: &Path) -> std::io::Result<Self> {
        let engine_dir = data_dir.join("engine");
        let artifacts_dir = engine_dir.join("artifacts");
        std::fs::create_dir_all(&artifacts_dir)?;
        let config_path = engine_dir.join("config.toml");

        let mut config = if config_path.exists() {
            // Deterministic behavior: an unreadable/partial config must not
            // silently fall back to environment auto-detection like
            // `EngineConfig::load` would.
            mofa_engine_core::EngineConfig::load_checked(Some(&config_path)).map_err(|e| {
                std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    format!("engine config {}: {e}", config_path.display()),
                )
            })?
        } else {
            mofa_engine_core::EngineConfig::default()
        };
        config.artifacts.dir = Some(artifacts_dir.to_string_lossy().to_string());
        config.security.input_roots = vec![data_dir.to_string_lossy().to_string()];

        let inner = mofa_engine_core::Engine::try_new(config).await.map_err(|e| {
            std::io::Error::new(std::io::ErrorKind::Other, format!("engine boot: {e}"))
        })?;
        Ok(Self {
            inner,
            config_path,
        })
    }

    /// Parse a wire-shaped request into the kernel type.
    fn parse_request(req: &Value) -> Result<mofa_kernel::InferenceRequest, EngineCallError> {
        serde_json::from_value(req.clone()).map_err(|e| {
            EngineCallError::rejected(400, format!("invalid inference request: {e}"))
        })
    }

    /// Append one `[[providers]]` entry to the engine config file, mirroring
    /// what the stock engine daemon does so both setups stay compatible.
    /// `pc.api_key` may carry a `keychain:` reference (never a plaintext
    /// secret) — references are safe to persist because they only resolve via
    /// the OS keychain at load time.
    fn persist_provider(&self, pc: &mofa_engine_core::config::ProviderConfig) -> Result<(), EngineCallError> {
        use std::io::Write;
        let api_key_line = match &pc.api_key {
            // Persist the indirect reference so the next boot re-resolves it.
            Some(key) if key.starts_with("keychain:") => format!("api_key = {key:?}\n"),
            _ => String::new(),
        };
        let entry = format!(
            "\n[[providers]]\nname = {:?}\nkind = {:?}\nbase_url = {:?}\n{api_key_line}priority = {}\ncost_tier = {:?}\n",
            pc.name, pc.kind, pc.base_url, pc.priority, pc.cost_tier,
        );
        std::fs::OpenOptions::new()
            .append(true)
            .create(true)
            .open(&self.config_path)
            .and_then(|mut file| file.write_all(entry.as_bytes()))
            .map_err(|e| {
                EngineCallError::rejected(
                    500,
                    format!(
                        "failed to persist provider config {}: {e}",
                        self.config_path.display()
                    ),
                )
            })
    }
}

#[async_trait]
impl LlmEngine for CoreLlmEngine {
    async fn invoke(&self, req: Value) -> Result<Value, EngineCallError> {
        let parsed = Self::parse_request(&req)?;
        let response = self
            .inner
            .invoke(parsed)
            .await
            .map_err(EngineCallError::from_engine)?;
        serde_json::to_value(response)
            .map_err(|e| EngineCallError::rejected(500, format!("serialize response: {e}")))
    }

    fn invoke_stream(
        &self,
        req: Value,
    ) -> Result<tokio::sync::mpsc::Receiver<Value>, EngineCallError> {
        let parsed = Self::parse_request(&req)?;
        let mut upstream = self.inner.invoke_stream(parsed);
        let (tx, rx) = tokio::sync::mpsc::channel(64);
        tokio::spawn(async move {
            while let Some(chunk) = upstream.recv().await {
                match serde_json::to_value(chunk) {
                    // Client dropped: stop draining the engine stream.
                    Ok(value) => {
                        if tx.send(value).await.is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        });
        Ok(rx)
    }

    async fn capabilities(&self) -> Vec<Value> {
        self.inner
            .capabilities()
            .await
            .iter()
            .filter_map(|card| serde_json::to_value(card).ok())
            .collect()
    }

    async fn health(&self) -> Value {
        let status = self.inner.status().await;
        json!({
            // An embedded engine is always reachable; zero providers just
            // means the user has not finished BYOK setup yet.
            "status": "ok",
            "embedded": true,
            "uptime_secs": status.uptime_secs,
            "total_models": status.total_models,
            "providers": status.providers,
        })
    }

    async fn add_provider_config(&self, provider: &Value) -> Result<Value, EngineCallError> {
        let mut pc: mofa_engine_core::config::ProviderConfig =
            serde_json::from_value(provider.clone())
                .map_err(|e| EngineCallError::rejected(400, format!("invalid provider config: {e}")))?;
        if pc.name.trim().is_empty() {
            return Err(EngineCallError::rejected(400, "provider name must not be empty"));
        }
        if let Err(e) = pc.provider_kind() {
            return Err(EngineCallError::rejected(400, format!("{e}")));
        }
        let real_key = pc.api_key.clone().filter(|k| !k.trim().is_empty());
        if pc.kind == "openai_compatible" && real_key.is_none() {
            return Err(EngineCallError::rejected(
                400,
                "openai_compatible providers require an api_key",
            ));
        }

        // BYOK durability: park the secret in the OS keychain and persist
        // only a `keychain:` reference in the config file. The runtime
        // registration below still uses the real key (the engine resolves
        // indirections at config-load time only), so this session works
        // immediately and the next boot re-resolves from the keychain.
        // Re-registering the same provider name overwrites its entry.
        if let Some(key) = &real_key {
            if !key.starts_with("keychain:") {
                let account = keychain_account(&pc.name);
                mofa_engine_core::secrets::store(&account, key).map_err(|e| {
                    EngineCallError::rejected(
                        500,
                        format!("could not store the API key in the OS keychain: {e}"),
                    )
                })?;
                pc.api_key = Some(format!("keychain:{account}"));
            }
        }

        // Persist before registering so runtime/config never diverge.
        self.persist_provider(&pc)?;
        pc.api_key = real_key;
        if let Err(e) = self.inner.add_provider_config(&pc) {
            return Err(EngineCallError::from_engine(e));
        }
        self.inner.refresh_resources().await;
        Ok(json!({ "name": pc.name, "persisted": true }))
    }

    async fn list_providers(&self) -> Value {
        // Same derivation as the stock daemon: group live model cards by
        // their `provider/model` id prefix; keys are never included.
        let mut by_provider = std::collections::BTreeMap::<String, Vec<String>>::new();
        for card in self.capabilities().await.iter() {
            let id = card.get("id").and_then(Value::as_str).unwrap_or_default();
            let provider = card
                .get("provider")
                .and_then(Value::as_str)
                .unwrap_or_default();
            let name = id.split_once('/').map(|(p, _)| p).unwrap_or(provider);
            if !name.is_empty() {
                by_provider.entry(name.to_string()).or_default().push(id.to_string());
            }
        }
        let providers: Vec<Value> = by_provider
            .into_iter()
            .map(|(name, models)| json!({ "name": name, "models": models }))
            .collect();
        json!({ "providers": providers })
    }
}

// ==================== Secrets ====================

/// Deterministic keychain account for a provider's secret, namespaced so
/// entries stay recognizable to other tools and re-registering the same
/// provider overwrites its entry in place.
fn keychain_account(provider_name: &str) -> String {
    let slug: String = provider_name
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_') {
                c
            } else {
                '-'
            }
        })
        .collect();
    let slug = slug.trim_matches('-');
    if slug.is_empty() {
        "mofa-studio/provider".to_string()
    } else {
        format!("mofa-studio/{slug}")
    }
}

// ==================== Flow workflow adapter ====================

/// `flow_engine::EngineClient` backed by the in-process engine, replacing the
/// old HTTP client that dialed the gateway's OpenAI surface over loopback.
pub struct CoreFlowClient {
    engine: Arc<dyn LlmEngine>,
}

impl CoreFlowClient {
    pub fn new(engine: Arc<dyn LlmEngine>) -> Self {
        Self { engine }
    }
}

#[async_trait]
impl flow_engine::EngineClient for CoreFlowClient {
    async fn chat(
        &self,
        prompt: &str,
        params: &Value,
    ) -> Result<String, flow_engine::ExecError> {
        let mut req = json!({
            "capability": "chat",
            "messages": [{ "role": "user", "content": prompt }],
            "params": {},
        });
        if let Some(model) = params.get("model").and_then(Value::as_str) {
            req["model"] = json!(model);
        }
        let payload = self
            .engine
            .invoke(req)
            .await
            .map_err(|e| flow_engine::ExecError::Failed(e.message))?;
        Ok(payload
            .get("text")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string())
    }

    async fn image_gen(
        &self,
        prompt: &str,
        params: &Value,
    ) -> Result<Vec<String>, flow_engine::ExecError> {
        let mut req = json!({
            "capability": "image_gen",
            "messages": [{ "role": "user", "content": prompt }],
            "params": {},
        });
        if let Some(size) = params.get("size").and_then(Value::as_str) {
            req["params"]["size"] = json!(size);
        }
        // One artifact per invoke; fan out like the images route does.
        let n = params.get("n").and_then(Value::as_u64).unwrap_or(1).clamp(1, 4) as usize;
        let mut images = Vec::with_capacity(n);
        for _ in 0..n {
            let payload = self
                .engine
                .invoke(req.clone())
                .await
                .map_err(|e| flow_engine::ExecError::Failed(e.message))?;
            let Some(path) = payload
                .get("file")
                .and_then(Value::as_str)
                .filter(|f| !f.is_empty())
            else {
                return Err(flow_engine::ExecError::Failed(
                    "image gen produced no artifact".into(),
                ));
            };
            let bytes = tokio::fs::read(path).await.map_err(|e| {
                flow_engine::ExecError::Failed(format!("artifact unreadable ({path}): {e}"))
            })?;
            use base64::Engine as _;
            images.push(base64::engine::general_purpose::STANDARD.encode(&bytes));
        }
        Ok(images)
    }
}
