# 04 Task Workbench (TASK Domain)

> Full-parity with WorkBuddy. This chapter establishes the concept system first, then details the three modes and the underlying engines.

## 1. Five-Concept System (design baseline)

NLP logical-level mapping; five concepts with crisp boundaries:

| Level | Concept | Question it answers | Implementation here | Engineering essence |
|-------|---------|---------------------|---------------------|---------------------|
| L1 | **Connector** | Which systems/data can be accessed? | MCP Host + native connectors | API / OAuth / MCP |
| L2–3 | **Skill** | How exactly is this done? | Self-contained mini-agent pack | Workflow / Prompt / Tool Calling |
| L3–5 | **Expert** | As whom, in which paradigm? | Persona+methodology+toolchain role card | SystemPrompt / domain knowledge / methodology |
| L3–5 | **Expert Team** | How do roles collaborate on delivery? | Leader decomposes→parallel→integrate orchestration | Multi-agent orchestration |
| All | **Inspiration** | What have others achieved? Can I replicate? | Finished-case market + "make alike" | Distribution form of config bundles |

> L6 (values & final judgment) belongs to humans and organizations. A Skill describes "how"; an Expert answers "who am I" — they do not substitute each other. Inspiration is not a capability but the distribution form of asset bundles.

## 2. Three Modes

### TASK-01 Task creation & context
- **Story**: Issue a one-sentence task; enrich context via @file references, pasted screenshots, dragged uploads.
- **Description**: structured task card: goal / inputs (referenced context) / expected output format (Word/Excel/PPT/PDF/Markdown).
- **Interaction**: `@` summons file & library pickers; Cmd+V pastes clipboard images directly.
- **Acceptance**: all three context types replayable in execution logs.

### TASK-02 Task list management
Grouping (by project space) / search / filters / parallel task instances (independent tasks, never intra-task splits); running-task progress docked in sidebar. P1.

### TASK-03 Assistant mode
- **Positioning**: one ask, one act — low barrier, fast response. Maturity layer 1 (trial).
- **Description**: the CHAT-domain home + capability panel; can operate whitelisted local files and enabled connectors.
- **Key action**: "convert to project" button on conversation cards for seamless escalation.
- **Acceptance**: simple tasks (write email / look up data / summarize doc) complete in ≤1min average.

### TASK-04 Project mode
- **Positioning**: full kickoff-to-delivery loop. Layer 2 (dependency).
- **Flow spec**:
```
Kickoff(goal+inputs+output format) → auto-plan steps(editable plan)
  → single-agent progressive execution
  → [optional] Expert Team collaboration (TASK-15)
  → Review stage (auto-summoned review panel TASK-16)
  → blocker fix loop → acceptance & delivery → outputs to Deliverables Center
  → SOP deposit prompt
```
- **Interaction**: progress board shows stages and artifacts; plan steps editable by hand; per-step artifacts previewable immediately.
- **Acceptance**: a PRD-type project completes plan→create→review without manual intervention; interrupted runs resume from breakpoints.

### TASK-05 Automation mode
- **Positioning**: fixed pipelines, unattended. Layer 3 (delegation).
- **Description**: triggers = cron schedules / manual; pipeline = SOP bound to parameterized inputs; result push (desktop notifications v1, IM connectors at M4); failure alerts and retry policies.
- **Code mapping**: reuses `src/pages/scheduler/` (cron editor / run records / worker model).
- **Background support**: tray-resident process + SQLite queue breakpoint resume (local equivalent of WorkBuddy's "cloud 7×24 hosting").
- **Acceptance**: pipelines keep running after window close; autostart restores queue after reboot.

## 3. Routing Engine (versioned delivery)

### TASK-06 Routing v1 (M1)
Intent classification (rules + small model) → capability-panel preselection (defaults the per-session tool scope). Serves assistant-mode basics. P0.

### TASK-07 Routing v2 full four layers (M3)
```
① Intent classification ─▶ ② Skill retrieval/dispatch ─▶ ③ In-skill sub-routing ─▶ ④ Sandboxed execution
   rules+LLM composite     description vector+keyword       skill's own            tool calls within
                           hybrid TopK matching             execution logic        whitelist sandbox
```
- Core mechanism: new Skills onboard with **zero router code changes** — manifest.description registers intents declaratively ("SEO-style" matching).
- Execution-strategy decision flow (pseudocode):

```
route(task):
  intent = classify(task)                    # LLM classification
  complexity = estimate(intent, context_size, deliverables)
  strategy = if project_mode:      SINGLE_AGENT_CREATION
             elif intent.multi_domain and complexity.high:
                                      EXPERT_TEAM
             else:                    SINGLE_AGENT_CREATION
  plan = planner(strategy, task)             # strong-model planning
  for step in plan:                          # fast-model execution
     skill = skill_router(step)              # vector+keyword hybrid retrieval
     result = skill.execute(step, sandbox)   # whitelisted sandbox
  if project_mode: review = review_panel(result)   # review hook
  return deliver(review or result)
```

### TASK-08 Execution strategy triad
| Strategy | Applies to | Decider |
|----------|-----------|---------|
| Single-agent direct | Creative tasks preserving context consistency | Default |
| Expert Team collaboration | Naturally multi-domain deliverables (business+tech+rollout) | Router or user |
| Review panel validation | Project-mode acceptance stage | Auto-triggered |

> Constraint: creation never splices content across mid-task personas; multi-agent value lies in cross-validation, not collaborative writing.

## 4. Connectors

### TASK-09 Connector installation & management
- **Install in three steps** (presented as "one-click add + QR authorize"): ① load interface deps/plugins ② OAuth authorization popup ③ register tool descriptions into gateway.
- **Description**: official connector catalog v1 (drive/mail/calendar/doc services reachable BYOK) + custom connectors (MCP server configs); credentials persisted into keychain; scope visualization and revocation.
- **Acceptance**: install to first successful call ≤2min; revocation takes effect immediately.

### TASK-10 Per-task tool scope (attention-dilution guard)
Checkboxes select this session's usable tool set; routing v1 preselects defaults by intent.
Rationale: tool descriptions are concatenated into system prompts — injecting everything causes wrong-tool picks and attention dilution.
Also: checkbox list refreshes as MCP tools go up/down dynamically.

### TASK-11 Homogeneous-tool disambiguation
When multiple tools claim the same capability (e.g., two meeting creators): user preference history > explicit ask > default-with-flag and log. P2.

## 5. Skills

### TASK-12 Skill spec & manifest
- **Positioning**: a Skill = reusable task-capability pack; a self-contained mini-agent with its own routing rules, tool list, and execution logic.
- **Manifest structure**:
```yaml
name: meeting-review
description: "Organize meeting recordings into minutes and action items"  # declarative intent registration (routing match basis)
connector_deps: [calendar, docs]                # connector dependency declaration
tools: [asr, file_write]
steps:                                          # SOP steps or script refs
  - find_this_week_meetings
  - create_summary_doc
input_schema: { audio_dir: dir, output: doc }
```
- **Compatibility**: import/conversion for OpenClaw community skill packs.
- **Acceptance**: manifest-imported skills become routable by v2 with zero core-code changes.

### TASK-13 Skill market
Search & install / upload local packs / natural-language custom-skill creation (describe the need, auto-draft manifest) / enable-disable & search.
Code mapping: reuses `src/pages/management/skills/` and SkillHub infrastructure (publish/review/namespaces/tags/ratings). P1.

## 6. Experts & Expert Team

### TASK-14 Expert system
- **Positioning**: Expert = role card (persona + methodology + toolchain binding), answering "as whom, in which perspective".
- **Description**: browsable expert cards by industry; summon into conversations; create my experts; share/export.
- Code mapping: consumerization of `src/pages/management/agents/`. P1.

### TASK-15 Expert Team orchestration (Rust, self-built)
- **Positioning**: multi-role collaboration for genuinely multi-domain deliverables — leader understands the goal → decomposes → dispatches in parallel → integrates delivery.
- **Implementation constraints**: borrow AgentScope message-passing/pipeline abstractions; tokio implementation; SQLite event sourcing; no Python sidecar (evaluation record in 09 §5).
- **Acceptance**: three-expert parallel runs aggregate without message loss; single-expert failure retries without affecting others.
- Schedule M3–M4, P2.

### TASK-16 Review workflow (project mode)
- **Story**: After project completion, domain experts review the output from different perspectives and produce an issue list.
- **Description**: review-dimension configuration (compliance/engineering/UX/factual…); reviewer role-card templates; parallel review→aggregated issue report (blocker/suggestion grading); fix-loop tracking (re-review after fixes).
- **Design basis**: field-tested WorkBuddy reality — creation runs on a single agent; multi-agent only assembles at review. Multi-agent value = cross-validating blind spots.
- **Acceptance**: 54-issue-scale reports render smoothly; all blockers must close before delivery can be marked complete.

## 7. Deliverables, files & memory

### TASK-17 Deliverables Center
- **Story**: All task outputs viewable, previewable, shareable in one place.
- **Description**: artifact types: docs(MD/Word)/sheets(xlsx/csv)/PPT/PDF/media; right-hand result area with four views: deliverables list / full file tree / **change diff** / preview (Word·Excel·PPT rendered via Univer, directly editable).
- **Acceptance**: click-to-preview without downloads; diff view locates differences between runs.

### TASK-18 Local file operations
Authorized-directory whitelist: tasks explicitly pick accessible directories at kickoff; batch organize/rename/convert; every write leaves an audit trail (visible in Expert Mode). Local-mode equivalent of WorkBuddy's dual permission model. P1.

### TASK-19 Memory system
- **Description**: sqlite-vec vectorized long-term memory — user preferences, project context, past decisions; retrieved and injected in chats/tasks automatically.
- **Privacy four rights (hard requirement)**: visible (entry list) / editable / deletable / master switch. Shipping without any one is prohibited (see 07 privacy). P1.

## 8. SOP & Inspiration (asset flywheel)

### TASK-20 SOP one-click deposit
On project success, prompt "Save as SOP": step sequence + used Skills + expert configs packaged as a template; templates convert directly to automation pipelines (bind a trigger to become TASK-05 jobs). The hinge closing the three-mode loop. P1.

### TASK-21 Inspiration plaza
- **Positioning**: finished-case market — not capability, but "what others already achieved"; the zero-learning-cost entry for new users.
- **Description**:
  - Case card = outcome showcase + full config bundle behind it (Prompt+Skill+Expert bindings)
  - **Make alike**: load entire config → swap in own assets → produce your version
  - **Missing-dependency detection**: if a case's Connector/Skill is absent, prompt with one-click install (mirrors ComfyUI missing-model detection)
  - Favorite / share / UGC publishing (via SkillHub review flow)
- **IA placement**: inspiration feed on Assistant home (discovery) + standalone plaza under Assets nav.
- **Acceptance**: make-alike to first output ≤5min; missing-dep guided install success ≥80%.

## 9. Others

### TASK-22 MCP Host
Official rmcp SDK client; MCP server configs managed within the connector system; tools invoked via sandboxed proxy. P1.

### TASK-23 IM connectors
WeCom/Feishu official APIs first; personal-WeChat protocol marked as compliance-risky, technical reserve only, unscheduled. Automation result push depends on this. P2 / M4.

### TASK-24 Project spaces
Task grouping containers; experts/Skills/connector configs deposited in a space reusable across new tasks in one click. P2.

---

## Appendix A · WorkBuddy Full-Parity Acceptance Checklist

| # | WorkBuddy capability | Requirement IDs here | Reuse status |
|---|---------------------|----------------------|--------------|
| 1 | One-sentence task + context (@file/paste screenshot/drag upload) | TASK-01 | ChatContainer input-layer rework |
| 2 | Structured goal/input/output format | TASK-01 | New |
| 3 | Task list grouping/search/filter + parallel tasks | TASK-02 | New |
| 4 | Assistant mode | TASK-03 | Conversation center upgrade |
| 5 | Project mode (plan/run/**review**) | TASK-04/16 | agent-runtime new |
| 6 | Automation mode (scheduled unattended pipelines) | TASK-05 | **Scheduler direct reuse** |
| 7 | Background-resident continuation (local equivalent of cloud hosting) | TASK-05 | Tray + SQLite queue |
| 8 | Connectors (three-step OAuth install) | TASK-09 | mcp-host new |
| 9 | Per-task tool checkboxes | TASK-10 | New |
| 10 | Skill market (install/local upload/NL-create/OpenClaw compatible) | TASK-12/13 | SkillHub reuse |
| 11 | Experts (persona+methodology+toolchain) | TASK-14 | Agents rework |
| 12 | Expert Team (decompose/parallel/integrate) | TASK-15 | Rust self-built orchestration |
| 13 | Deliverables center (four views incl. diff) | TASK-17 | Univer render + new |
| 14 | Local file ops (authorized scope) | TASK-18 | tauri fs whitelist |
| 15 | Memory system | TASK-19 | sqlite-vec new |
| 16 | Inspiration (finished cases/make alike) | TASK-21 | SkillHub review flow reuse |
| 17 | Project spaces | TASK-24 | New |
| 18 | Dual permission mode | local=TASK-18; cloud sandbox later | — |
| 19 | IM integration (WeCom/QQ) | TASK-23 | Official APIs first |
| 20 | Model config (per-task selection) | PLAT-03 | llm-gateway |
| 21 | Scenario templates beyond inspiration | TASK-21 case subset | Prompts rework |

## Appendix B · Execution-engine event sourcing

All agent-runtime state changes persist as events (task.created / plan.generated / step.started / skill.invoked / review.raised …), powering three capabilities: breakpoint resume, PLAT-15 tracing instrumentation for free, and review replay.
