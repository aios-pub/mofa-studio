# 09 Tech Selection

> Frontend/backend separation contract unchanged; in single-machine scenarios the backend exists as an "embedded Axum" service, with the same codebase compiling to a standalone server.

## 1. Overall architecture: isomorphic Rust full stack

```
┌─ Tauri 2 desktop shell ──────────────────────────────────┐
│  React 19 frontend (WebView)                              │
│      │ REST / SSE / WebSocket (OpenAPI contract)          │
│      ▼                                                    │
│  Embedded server-core (Axum, 127.0.0.1:<dynamic port>)    │
│  ┌──────────────────────────────────────────────┐        │
│  │ llm-gateway · agent-runtime · flow-engine     │        │
│  │ media-adapters · rag-pipeline · mcp-host      │        │
│  └──────────────────────────────────────────────┘        │
│  SQLite(+FTS5/sqlite-vec) · Keyring · ffmpeg sidecar      │
│  Floating window/tray/hotkeys/screenshot (Tauri commands, │
│  desktop-only isolation)                                  │
└───────────────┬───────────────────────────────────────────┘
                │ BYOK direct (credentials injected at Rust layer)
   LLM/image/video/music/TTS/ASR vendor APIs ＋ local Ollama / ComfyUI
```

**Isomorphic strategy**: `server-core` compiles into a standalone `mofa-server` binary for future web/mobile; one codebase, two forms. The frontend never calls vendor APIs directly.

## 2. Rust workspace layout

```
crates/
├── server-core      # Axum routes & domain services (compilable standalone)
├── llm-gateway      # vendor normalization, SSE relay, metering, tiered routing
├── agent-runtime    # task state machine: event sourcing + breakpoint resume + strategy triad
├── flow-engine      # graph execution: topological scheduling + signature-cache increments + queue
├── media-adapters   # Seedream/Seedance/Kling/music/TTS/ASR vendor adapters
├── rag-pipeline     # pdf-extract/calamine parsing → chunk → embedding → retrieval
├── mcp-host         # official rmcp SDK; MCP client + connector management
└── storage          # rusqlite + FTS5 + sqlite-vec (vector-backend trait abstraction)
```

## 3. Type-safety pipeline

utoipa generates OpenAPI → `openapi-typescript` generates TS types → consumed by frontend services layer; bidirectional contract tests. Replaces type drift in hand-written mock/real dual tracks.

## 4. Frontend component selection matrix

| Area | Choice | Alternatives & rationale |
|------|--------|--------------------------|
| Node canvas | @xyflow/react (in use) | 10-node foundation exists |
| AI spreadsheet | Univer Sheets (Apache-2.0) | Luckysheet unmaintained; Handsontable commercial license |
| Word deliverable rendering | **Univer Docs** | TASK-17 preview/editing |
| PPT render & export | **Univer Slides** + pptxgenjs(MIT) export | Plan B per 08-R2; avoids PPTist's AGPL (this project ships a commercial source license — AGPL components are not permissible) |
| Long-form writing editor | **TipTap 3** (MIT) | Division of labor with Univer Docs: writing = creation experience (Markdown-first/AI continuation); Docs = office deliverable rendering; interop via Markdown/docx |
| Charts | ECharts | spreadsheet charts / research reports |
| Audio waveform/recording | wavesurfer.js + AudioWorklet | podcast studio/transcription |
| Inpaint masking | react-konva | TOOL-01 inpainting |
| Document export fallbacks | docx / exceljs / pptxgenjs (all MIT) | lightweight client-side exports |
| Report PDF typesetting | Typst (Rust server-side) | high-quality deep-research reports |

> Writing vs office boundary: TOOL-06 AI writing uses TipTap; TASK-17 Word deliverables use Univer Docs — interoperating via format conversion, never substituting each other.

## 5. Key selection evaluation records

### 5.1 LLM gateway: self-built vs LiteLLM / One-API
**Decision: self-built Rust adapter layer.** Rationale: LiteLLM drags in a Python runtime and One-API is a Go stack — both break the zero-external-dependency single-binary goal; BYOK direct-connect needs no complex billing routing; the 130+ vendor catalog migrates directly.

### 5.2 Agent orchestration: self-built vs LangGraph / AgentScope
**Decision: self-built in Rust (borrowing AgentScope message-passing/pipeline/msghub abstractions).**
- LangGraph(Python) and AgentScope(Python) both require sidecars: packaging bloat, process management, dual-stack maintenance — conflicts with decision D5
- Self-built core = event-sourced state machine (SQLite WAL), natively supporting breakpoint resume/tracing instrumentation/review replay
- Expert Team orchestration (leader decompose→parallel→integrate) lands M3–M4 on tokio parallel tasks
- Risk hedge: the triad default strategy is single-agent direct — orchestration delays never block the mainline (08-R6)

### 5.3 Vector search: sqlite-vec vs standalone vector DB
Embedded sqlite-vec locally; storage crate defines a trait so cloud deployments swap pgvector/Qdrant without touching upper layers.

### 5.4 Search aggregation (web search / deep research)
BYOK-configurable: Bocha / Zhipu search APIs (domestic first) / Tavily / SearXNG; content extraction via readability + scraper crates.

## 6. Media-processing encoder selection

| Capability | Approach | Rationale |
|------------|----------|-----------|
| Video→GIF / transcoding / BGM mixing | **ffmpeg sidecar** (unified runtime) | palettegen/paletteuse for quality GIFs; profile library covers platform presets; already introduced via podcast chain — zero new dependencies |
| Image compression | **Native Rust mozjpeg(JPEG) + ravif(AVIF) + libwebp**, ffmpeg fallback for exotic formats | Native encoders offer finer quality tuning than ffmpeg's generic wrapping; batch memory controllable; target-size mode runs binary-search over quality |

## 7. Real-time voice call route

| Stage | Route | Notes |
|-------|-------|-------|
| MVP (CHAT-07) | **ASR→LLM→TTS pipeline chaining** | BYOK-friendly (each stage picks its vendor); ≤3s latency acceptable; VAD barge-in |
| Later | Full-duplex RTC (e.g., Volcano realtime voice) | Natural interruption/expressive tone; re-evaluate upon vendor SDK licensing |

## 8. Engineering

- Frontend: Vitest + Testing Library; Playwright E2E (web mode covers core journeys); ESLint9 + Prettier; `deno task` orchestration
- Backend: cargo test + clippy; integration tests anchored to the OpenAPI contract
- CI/CD: GitHub Actions + tauri-action builds (macOS universal / Windows NSIS); updater staged rollout
- Tech debt: remove @tanstack/react-router; socket.io-client → native WS (dual adapters exist)

## 9. Security architecture essentials

Keys live only in keychains, credentials injected at the Rust layer; authorized-directory whitelist sandbox (per-task explicit grants); WASM plugins least-privilege (FLOW-11); external-content prompt-injection isolation (07 §2.3); AI-content metadata labeling.
