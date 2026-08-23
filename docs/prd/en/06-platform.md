# 06 Platform Foundation (PLAT Domain)

> Infrastructure supporting all business domains: isomorphic Rust backend, model gateway, data engine, desktop shell, observability.

## Domain Overview

| ID | Requirement | Priority | Milestone |
|----|-------------|----------|-----------|
| PLAT-01 | Embedded Axum backend (isomorphic) | P0 | M1 |
| PLAT-02 | llm-gateway model gateway | P0 | M1 |
| PLAT-03 | Tiered model routing policy | P1 | M2 |
| PLAT-04 | BYOK key vault | P0 | M1 |
| PLAT-05 | Quota & balance management | P0 | M1 |
| PLAT-06 | Unified Asset data model | P0 | M1 |
| PLAT-07 | SQLite data engine | P0 | M1 |
| PLAT-08 | Account system decision | P0 | M1 |
| PLAT-09 | Storage space management | P1 | M2 |
| PLAT-10 | Backup import/export | P1 | M3 |
| PLAT-11 | Desktop shell experience | P1 | M1–M2 |
| PLAT-12 | ffmpeg sidecar integration | P1 | M2 |
| PLAT-13 | Global navigation IA spec | P0 | M1 |
| PLAT-14 | Expert mode consolidation | P0 | M1 |
| PLAT-15 | Tracing & usage observability | P1 | M1–M2 |
| PLAT-16 | Multi-client reservation | P2 | Ongoing |

---

## PLAT-01 Embedded Axum backend (isomorphic)
- **Story**: As a user, I install nothing external — every feature works on launch.
- **Description**: the `server-core` crate implements the full REST/SSE/WS API in Axum; in desktop mode Tauri spawns it listening on `127.0.0.1:<dynamic port>`; the same workspace compiles a standalone `mofa-server` binary (future self-hosting / web).
- **Constraint**: the frontend never calls vendor APIs directly — everything proxies through the gateway (key security + CORS + metering).
- **Acceptance**: offline, all local features (workflow editing/gallery/settings) fully usable; standalone binary passes the same OpenAPI contract tests.

## PLAT-02 llm-gateway
- **Description**:
  - Unified adaptation: OpenAI-compatible normalization; 130+ vendor configs migrated from frontend `providerConfigs.ts` into backend config tables
  - SSE streaming relay (chat/generation); non-streaming proxy (image/video etc.)
  - Usage metering: every call records model / tokens_in / tokens_out / cost / duration / status
- **Selection note**: self-built rather than integrating LiteLLM(Python)/One-API(Go) — avoids external runtime deps; BYOK direct-connect needs no complex billing routing. Rationale in 09 §5.
- **Acceptance**: adding an OpenAI-compatible vendor takes one config record; streaming relay buffers nothing perceptibly.

## PLAT-03 Tiered model routing policy
Default strategy: strong models plan, fast models execute (WorkBuddy's pragmatic pattern); user-overridable.
**Per-task manual switching**: sessions/tasks/projects can each pin a model via dropdown; unset inherits from parent defaults. P1.

## PLAT-04 BYOK key vault
Keys stored in OS keychains (keyring crate: macOS Keychain / Windows Credential Manager).
**Hard constraint**: the renderer never sees plaintext keys; Rust injects credentials on all requests; logs fully redacted.
Acceptance: memory dumps and frontend storage contain zero plaintext keys.

## PLAT-05 Quota & balance management
- **Story**: When my key runs low or gets rate-limited, I want warning before tasks die mid-flight.
- **Description**: balance display for vendors that expose it; usage alert threshold (default 80%); exponential backoff auto-retry on 429; multi-key failover within a vendor; failed tasks tagged with shortfall reasons.
- **Acceptance**: simulated 429 doesn't kill tasks and backoff is visible; primary-key failure switches to backup ≤5s.

## PLAT-06 Unified Asset data model
- **Background**: gallery/uploaded media/task deliverables/skills/SOPs/cases were previously defined in four places — guaranteed rework.
- **Spec**:

```sql
Asset {
  id, type,        -- image|video|audio|doc|sheet|slide|skill|sop|case|file
  source,          -- chat|studio|task|flow|tool|import
  title, meta_json, ref_path, created_at, tags[]
}
```

- Single indexed table + type extension tables; domain-wide hooks: gallery filtering (type×source two-dimensional), context-menu actions (compress/transcode/to-GIF/send-to-chat), inspiration publishing (case type binding config bundles).
- **Acceptance**: any artifact retrievable by combined source+type filters; cross-domain moves (task output → chat) are zero-copy references.

## PLAT-07 SQLite data engine
rusqlite direct access; WAL mode; FTS5 full-text search (sessions/docs); sqlite-vec vector search (memory/RAG); vector-backend trait abstraction (cloud deployments can swap pgvector/Qdrant without touching upper layers). Large binaries live in the assets directory + DB index.

## PLAT-08 Account system decision
- **Decision**: M1 runs fully login-free local; no guest/formal distinction; existing Auth pages and RouteGuard fold into Expert Mode.
- **Data ownership**: local single-machine data is the user's asset, migrating with backup packs.
- **Cloud account reservation**: introduced only if cloud sync/team features launch later; auth contracts designed as Bearer Token/PAT (see PLAT-16), no login UI this phase.
- **Code disposition**: `src/pages/auth/` frozen but retained; `useUserStore` simplified to a local profile.

## PLAT-09 Storage space management
Capacity dashboard (breakdown: media/model cache/database/logs); one-click cleanup (caches/trash); custom storage location (external-drive scenarios common among creators); deletes go to recoverable trash. P1.

## PLAT-10 Backup import/export
Config + indexes export as backup bundles (keys excluded by default, separately opt-in); import restores. Sync principle preview (future cloud sync): only configs and indexes go to cloud — large media never syncs; conflict policy = last-write-wins with local version snapshots.

## PLAT-11 Desktop shell experience
- **Floating assistant upgrades**: screenshot-to-ask (screenshots crate region capture → auto-attached to chat vision input); selection-invoked Q&A via global hotkey.
- **Tray residency**: show main window / floating ball / automation status / quit; closing minimizes to tray while automation keeps running.
- **Global shortcuts**: toggle main window, screenshot-to-ask, quick capture (upgrades existing floating.html ball system).
- **Code mapping**: `src-tauri/src/tray.rs` tray menus exist; `src/floating/FloatingApp.tsx` (944-line floating ball).

## PLAT-12 ffmpeg sidecar integration
Shared by podcast rendering/video-to-GIF/transcoding; bundled in macOS universal & Windows NSIS installers (size-controlled), low-footprint channel falls back to on-demand download (08 risk R3). Version pinned with integrity verification.

## PLAT-13 Global navigation IA spec
Seven-entry structure per 01 §4; implementation constraints:
- dual entry, single instance (routes reused; page state not duplicated)
- three-mode nav badges guide the maturity funnel (unread inspirations on Assistant; project upgrade affordances in chat)
- expert-mode toggle persisted in settings store

## PLAT-14 Expert mode consolidation
- **Scope**: legacy B-side pages (organization, roles, audit logs, channels admin, load testing, monitoring alerts, system settings) mount wholesale under the `/expert/*` route group; entrance controlled by a settings toggle.
- **Disposition principle**: feature-frozen, availability-only maintenance; Providers admin reworks into consumer "Model Services" settings (the BYOK home screen).
- **Acceptance**: default view exposes zero B-side entries; toggled on, every legacy feature reachable.

### Appendix · API domain disposition list
~30 mock/real dual-track domains under `src/services/`:

| Disposition | Domains | Notes |
|-------------|---------|-------|
| Retain & rework | conversations, chat, providers, knowledge, prompts, skills, workflows, scheduler | C-side mainline; progressively switch to real embedded API |
| Fold into expert mode | agents(admin), skillHub(admin), testsets, load-test, channels, octos, organization, system, audit, monitoring, evaluation | frozen iterations |
| Deprecate | remaining pure-admin mock domains | cleanup after expert-mode boundary confirmed |

## PLAT-15 Tracing & usage observability
- **Story**: As a BYOK user, I see the full chain of every AI call — which session/task triggered which model, latency, cost, outcome — to debug issues and account spend.
- **Span model**:

```
trace(root: one user action)
 ├─ span: llm_call      {model, tokens_in/out, cost, duration, status}
 ├─ span: tool_call     {connector, action, args_summary, result_status}
 ├─ span: node_exec     {flow_id, node_id, cache_hit, duration}
 └─ span: retrieval     {source_count, top_k, latency}   # RAG/search
```

- **Three-domain instrumentation**: CHAT conversation turns / TASK task steps (agent-runtime event sourcing yields these naturally) / FLOW node executions. trace_id threads across session→task→workflow cross-domain calls.
- **"Usage & Logs" panel**: filter by time/source/model; cost dashboards (day/week/month + per-model breakdown); failed-request details (error cause/retry advice); click spans for request summaries.
- **Privacy tiering**: metadata only by default (no prompt or generation content); full-content recording requires explicit opt-in with double confirmation in settings.
- **Retention**: local SQLite storage, default 90 days configurable; automatic expiry cleanup.
- **Export**: optional OpenTelemetry OTLP export (off by default, for advanced users wiring their own observability stack); manual JSON/CSV export.
- **Code mapping**: upgrade the `src/tracing/` session-level prototype and `/tracing` page into the complete form above; backend instrumentation injected uniformly in llm-gateway and flow-engine.
- **Priority**: P1; M1 delivers the span data layer, M2 delivers the user panel.
- **Acceptance**: one project run reconstructs a full call tree in the panel; cost rollups within ±5% of vendor bills.

## PLAT-16 Multi-client reservation
All APIs REST/SSE/WS without cookie dependence → Bearer Token/PAT auth contract; CORS whitelist; idempotency and cursor pagination codified in the OpenAPI contract.
**Desktop-only capability list** (unavailable on web, isolated behind Tauri commands): floating window/screenshot/text-selection/global shortcuts/tray/whitelisted file writes/keychain.
