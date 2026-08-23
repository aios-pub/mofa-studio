# 08 Roadmap

> Full scope delivered across four milestones, each with quantified acceptance metrics. Routing engine is versioned: M1 ships v1 (intent classification + capability preselection); M3 ships the full four-layer v2.

## M1 · Conversational creation loop (~6 weeks)

**Theme**: works on launch — BYOK foundation + assistant mode + first creation tools.

| Scope | Requirement IDs |
|-------|-----------------|
| Platform foundation | PLAT-01~08 (embedded backend/gateway/vault/quota/Asset model/SQLite/account decision), PLAT-13 navigation, PLAT-14 expert mode |
| Onboarding | ONBOARD-01~03 |
| Chat core | CHAT-01/02/04/05/09/10 |
| Creation tools | TOOL-01 image generation, TOOL-04 batch & sizes, TOOL-06 AI writing |
| Observability | PLAT-15 span data layer |

**Quantified acceptance**
- New user install → configure key → first successful image **≤10 minutes**
- Cold start ≤3s; first token ≤2s
- With expert mode enabled, 100% of legacy B-side features reachable
- Embedded backend passes all OpenAPI contract tests

## M2 · Full creation suite + workflow MVP (~8 weeks)

| Scope | Requirement IDs |
|-------|-----------------|
| Chat enhancements | CHAT-03/06/08/11/13 |
| Creation tools | TOOL-02/05/07/08/09/10/11/12 + media trio TOOL-13/14/15 |
| Workflow MVP | FLOW-01~07 (canvas/node library/queue incremental cache/model center/JSON/templates) |
| Asset flywheel ignition | TASK-21 inspiration plaza (make-alike + missing-dep detection) |
| Observability | PLAT-15 "Usage & Logs" user panel |
| Others | PLAT-03 tiered routing, PLAT-09 storage management, ONBOARD-04 progressive disclosure |

**Quantified acceptance**
- Inspiration make-alike → first output ≤5min; missing-dep guided install success ≥80%
- Incremental execution: tail-only change reruns <5% of full-run time
- Podcast studio: 10-min two-host episode ≤30min end-to-end

## M3 · Task workbench (~8 weeks)

| Scope | Requirement IDs |
|-------|-----------------|
| Three modes complete | TASK-01~05 (assistant/project/automation) |
| Engine upgrades | TASK-07 routing v2 four layers, TASK-08 execution-strategy triad |
| Five concepts completed | TASK-09~14 connectors/Skill spec & market/expert system |
| Project loop | TASK-16 review workflow, TASK-17 deliverables center, TASK-18 file ops, TASK-20 SOP deposit |
| Support | TASK-19 memory system, TASK-22 MCP host, FLOW-08 App Mode, FLOW-10 HTTP node SDK, PLAT-10 backup |

**Quantified acceptance**
- PRD-type projects complete plan→create→review→delivery without manual intervention
- Interrupted-task breakpoint-resume success ≥95%
- Manifest-imported skills routable with zero code changes

## M4+ · Ecosystem deepening

Expert Team full orchestration (TASK-15) / WASM plugin sandbox (FLOW-11) / IM push (TASK-23) / ComfyUI bridge enhancements (FLOW-09) / project spaces (TASK-24) / cloud-sync evaluation.

---

## Risk Register

| ID | Risk | Impact | Mitigation |
|----|------|--------|------------|
| R1 | WASM node SDK cost high | FLOW-11 delay | Pushed to M4; stage-1 external HTTP services as fallback |
| R2 | Univer Slides immaturity | Constrained PPT editing UX | Plan B: pptxgenjs direct generation + read-only rendering downgrade (Sheets/Docs unaffected) |
| R3 | ffmpeg bundle ~70MB | Installer over budget | Bundled in macOS/Windows primary channels; low-footprint channel downloads on demand |
| R4 | Univer learning curve | Spreadsheet/doc dev pace | Wrap as standalone components, Sheets first then Docs/Slides |
| R5 | Anthropomorphic-agent regulation shifts | Persona-agent takedown risk | Compliance-first design (07 §3.2), P2 low scheduling allows freezing anytime |
| R6 | Self-built agent-runtime complexity | M3 schedule risk | Borrow AgentScope abstractions; single-agent-first guarantee (triad default strategy never depends on Expert Team) |
| R7 | Legacy mock→real migration volume | Drags mainline | API domain disposition list (06 appendix) batch-switched; expert-mode domains frozen |

---

## Tech-debt cleanup (piggybacked on milestones)

- Remove unused `@tanstack/react-router` (M1)
- Remove `socket.io-client` → native WS (dual adapters exist, M2)
- Clean Chinese comments per AGENTS.md (ongoing)
- Confirm disposition of stray `agent-platform-application` file (M1)
