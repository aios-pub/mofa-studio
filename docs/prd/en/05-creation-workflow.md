# 05 Creation Workflow (FLOW Domain)

> Full-parity with ComfyUI, built on the existing @xyflow/react editor (10 logic nodes) extended into an AI generation production line. Positioning difference: ComfyUI targets experts; this product lowers the barrier — experts compose workflows, everyone else uses App Mode with a few inputs.

## Domain Overview

| ID | Requirement | Priority | Milestone |
|----|-------------|----------|-----------|
| FLOW-01 | Node canvas extension | P1 | M2 |
| FLOW-02 | Generation node library | P1 | M2 |
| FLOW-03 | Local inference node access | P2 | M3 |
| FLOW-04 | Execution queue & incremental caching | P1 | M2 |
| FLOW-05 | Model management center | P1 | M2 |
| FLOW-06 | Workflow JSON & metadata restore | P1 | M2 |
| FLOW-07 | Template market | P1 | M2 |
| FLOW-08 | App Mode simplified UI | P2 | M3 |
| FLOW-09 | ComfyUI bridge mode | P2 | M4 |
| FLOW-10 | Custom node SDK · external HTTP services | P2 | M3 |
| FLOW-11 | WASM plugin sandbox | P2 | M4 |

---

## FLOW-01 Node canvas extension
- **Story**: I drag nodes and wire them into a "base→inpaint→upscale→background-swap" pipeline.
- **Description**: extend the existing xyflow editor: grouped node palette / marquee batch ops / minimap / typed-edge validation; live execution coloring (queued/running/cache-hit/done/failed).
- **Code mapping**: `src/pages/workflow/nodes/` (existing 10 logic nodes retained; generation nodes added).
- **Performance budget**: 60fps interaction at 200 nodes (07 NFR).
- **Acceptance**: 50-node workflow authoring without jank; invalid edges flagged red instantly.

## FLOW-02 Generation node library
| Category | Nodes |
|----------|-------|
| Input | text prompt / image upload / reference image / parameter constant |
| Model | API model loader (image/video/audio vendors + model pick) / local Ollama model |
| Generation | image gen / image edit (I2I) / video gen / TTS / LLM text |
| Post-process | upscale / background removal (BiRefNet-class) / format convert / crop |
| Control | conditional branch / batch expand (N param sets) / loop / variable pass-through |
| Output | preview / save to gallery (source=flow) |

Acceptance: the core 5 nodes alone compose a complete txt2img chain (mirroring ComfyUI's core-five mental model).

## FLOW-03 Local inference node access
Ollama/LM Studio liveness detection (PLAT desktop-shell probing already specced); local models as backends for LLM text nodes; VRAM detection with downgrade hints.

## FLOW-04 Execution queue & incremental caching (engine core)
- **Story**: When only the last node's params change, don't rerun the expensive upstream.
- **Description**: topological execution; **signature-cache incremental execution** — rerun only changed nodes and their descendants (ComfyUI-style cache strategy); multi-job queue management (queue/pause/cancel/priority); run history with artifact review.
- **Implementation**: Rust flow-engine crate (09 §3).
- **Acceptance**: on a 20-node chain with only the tail changed, re-execution <5% of full-run time.

## FLOW-05 Model management center
- **Story**: When a template lacks a model, one click puts it in place.
- **Description**: dual track of cloud API models (BYOK-configured, instantly usable) and local models; local imports from HuggingFace/ModelScope with resumable downloads; disk usage stats and cleanup.
- **Boundary**: this phase ships no local GPU inference runtime — local inference proxies through external services like Ollama.

## FLOW-06 Workflow JSON & metadata restore
Import/export JSON (shareable & reproducible); **restore workflow from output-image metadata** (workflow snapshot embedded at generation time); version history.

## FLOW-07 Template market
Official built-in templates v1 ≥10 (txt2img / inpaint+upscale / batch production / txt2video etc.); loading auto-detects missing dependencies and guides downloads (with FLOW-05); UGC templates publish via inspiration plaza flow.

## FLOW-08 App Mode
- **Story**: Publish a tuned workflow as a simple tool with 3 input boxes for teammates.
- **Description**: any subgraph packaged as an App form (selected inputs/params exposed); generated Apps appear in the Create tool list; integrated with the "dual entry" system.
- **Value**: experts compose workflows, ordinary users fill forms — the core barrier-lowering rework of ComfyUI. P2 / M3.

## FLOW-09 ComfyUI bridge mode【boundary】
- **Story**: My machine already runs ComfyUI; reuse it for local SD workflows.
- **Spec**: detect local ComfyUI service (PLAT probing); bridging = **whole-graph delegation** — export canvas to compatible JSON, submit to its `/prompt` API, recover progress/artifacts via WebSocket into the gallery.
- **Hard boundary (conflict ruling)**: MVP forbids cross-engine mixing of self-built API nodes with ComfyUI latent nodes — two type systems stay unconnected; a unified adapter layer is a long-term evolution item.

## FLOW-10 Custom node SDK · stage 1 external HTTP service
Third parties ship nodes as standalone processes (HTTP protocol: schema declaration + execution endpoint); the canvas dynamically registers them; out-of-sandbox execution requires explicit user trust on install. P2 / M3.

## FLOW-11 WASM plugin sandbox (stage 2)
extism (wasmtime) hosts user plugin nodes: security isolation, multi-language authoring, least-privilege capabilities (file/network whitelists). The endgame of ecosystem extensibility. P2 / M4.

---

## Domain dependencies
All execution events write to PLAT-15 tracing (node_exec spans); outputs enter the unified Asset model; UGC templates reuse TASK-21 inspiration plaza review flow.
