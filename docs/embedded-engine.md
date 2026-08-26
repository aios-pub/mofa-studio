# Embedded Inference Engine

## What changed

mofa-studio no longer requires a separately started `mofa-engine` daemon.
The engine's library crates (`mofa-kernel` traits, `mofa-engine-core`
`Engine` facade) are linked directly into the Tauri process and invoked
in-process. This fulfills the PRD's "zero-external-dependency single-binary"
goal (`docs/prd/en/09-tech-selection.md`).

```
Before:  webview → server-core (in-process) ──HTTP──▶ mofa-engine daemon (127.0.0.1:8420)
After:   webview → server-core (in-process) ──call──▶ mofa_engine_core::Engine (same process)
```

The webview never saw the old daemon, so the frontend is untouched apart
from setup-hint copy.

## How it works

- `src-tauri/crates/server-core/src/engine_bridge.rs` is the single seam:
  - `LlmEngine` — trait abstraction (invoke / stream / capabilities /
    health / provider config) so tests inject a stub via
    `build_router_with_engine`.
  - `CoreLlmEngine` — wraps `mofa_engine_core::Engine`; wire-shaped JSON in,
    kernel serde types out.
  - `CoreFlowClient` — implements `flow_engine::EngineClient` for workflow
    generation nodes (replaces the deleted HTTP client).
- Bootstrapping lives in `CoreLlmEngine::boot(data_dir)`:
  - `<data_dir>/engine/config.toml` — optional provider config; created on
    the first BYOK registration. Absent file ⇒ built-in defaults
    (zero-config first run).
  - `<data_dir>/engine/artifacts/` — generated files; artifact responses are
    absolute paths read back by the same host.
  - `security.input_roots` pins local-file reads to the app data dir.

## BYOK provider setup

`POST /v1/config/providers` registers a provider at runtime through the
upstream library API (`Engine::add_provider_config`) and appends a
`[[providers]]` entry to `config.toml` — mirroring the stock daemon's
behavior. API keys are deliberately not written to the config file (they
resolve from the OS keychain/env per upstream's keychain support). The same
endpoint previously proxied to a route the daemon never implemented, so BYOK
setup now actually works end-to-end for the first time.

## Upstream dependency

Cargo pins a specific rev of our fork integration branch aggregating open
upstream PRs:

| Upstream PR | Content |
|---|---|
| #12 | Runtime provider-config API (library-level `add_provider_config`) |
| #14 | Music generation capability |
| #15 | Image editing (I2I + inpainting) |
| #16 | OS-keychain secret storage |
| local commit | `reasoning` field surfaced on blocking `InferenceResponse` |

When those merge into `mofa-org/mofa-engine`, re-point the git deps and bump
the rev — the lockfile diff is the whole upgrade. See
`src-tauri/Cargo.toml [workspace.dependencies]`.

## Debugging tips

- Engine logs go through `tracing`; set e.g. `MOFA_ENGINE_LOG`-style
  filtering via your tracing subscriber env as usual.
- A "0 providers" health response means BYOK setup is pending, not that
  something crashed: check `/v1/engine/health` → `providers_configured`.
- Tests use `tests/common/mod.rs::StubEngine` instead of any socket mock;
  see `llm_gateway_tests.rs` for reference usage.
