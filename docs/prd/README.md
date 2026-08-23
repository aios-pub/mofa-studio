# Mofa Studio — Product Requirements Documents (PRD)

<!-- lang-toggle -->
🇬🇧 English | [中文](./README.zh-CN.md)
<!-- /lang-toggle -->

> **Mofa Studio** — a local-first, all-in-one AI creation workstation for creators.
> Fusing three product paradigms: **Chat as Creation** (Doubao), **Task as Delivery** (WorkBuddy), **Workflow as Production Line** (ComfyUI).
>
> This suite is bilingual: **English is the source of truth** (`en/`), mirrored into Chinese (`zh/`). Content is kept consistent across both.

---

## Index

| # | Document | Scope | 中文 |
|---|----------|-------|------|
| 01 | [Product Overview](en/01-product-overview.md) | Positioning statement, personas, competitive matrix, global IA, maturity funnel, asset flywheel, onboarding | [产品总览](zh/01-product-overview.md) |
| 02 | [Assistant Chat](en/02-assistant-chat.md) | Streaming chat, deep thinking, web search, vision input, voice call, in-chat image/video generation | [对话助手底座](zh/02-assistant-chat.md) |
| 03 | [Creation Toolbox](en/03-creation-toolbox.md) | 16 tools: Doubao's 10 flagship features + media-processing trio and boundary items | [创作工具箱](zh/03-creation-toolbox.md) |
| 04 | [Task Workbench](en/04-task-workbench.md) | Five-concept system, three modes, routing engine, connectors/skills/experts/expert teams/review flow/SOP/inspiration | [任务工作台](zh/04-task-workbench.md) |
| 05 | [Creation Workflow](en/05-creation-workflow.md) | Node canvas, queue with incremental caching, model management center, App Mode, WASM SDK | [创作工作流](zh/05-creation-workflow.md) |
| 06 | [Platform Foundation](en/06-platform.md) | Embedded Axum backend, llm-gateway, BYOK vault, unified Asset model, tracing observability, expert mode | [平台底座](zh/06-platform.md) |
| 07 | [Non-Functional Requirements](en/07-non-functional.md) | Performance budget, privacy & security, compliance (AI labeling / anthropomorphic-agent rules), i18n, updates | [非功能需求](zh/07-non-functional.md) |
| 08 | [Roadmap](en/08-roadmap.md) | M1–M4 milestones, quantified acceptance metrics, risk register | [路线图](zh/08-roadmap.md) |
| 09 | [Tech Selection](en/09-tech-selection.md) | Isomorphic Rust full stack, crates layout, Univer/TipTap division, AgentScope evaluation record | [技术选型](zh/09-tech-selection.md) |

---

## Decision Register

| ID | Decision | Outcome |
|----|----------|---------|
| D1 | Target users | Creators first (social-media writers / designers / short-video), light-office users secondary |
| D2 | Business & tech route | Local-first BYOK (Bring Your Own Key); keys live in OS keychains; no paywall |
| D3 | Legacy B-side modules | Consolidated into "Expert Mode", hidden by default, code reused |
| D4 | Feature scope | Doubao's 10 flagship features + chat core; WorkBuddy full parity; ComfyUI full parity; podcast studio; media-processing trio; tracing observability |
| D5 | Backend form | Isomorphic Rust: Axum embedded in Tauri (same crate compiles standalone); web/mobile reserved |
| D6 | Office components | Univer suite (Sheets/Docs/Slides, Apache-2.0); long-form writing on TipTap; MIT export libraries as fallback |
| D7 | Information architecture | Global three-mode spine: Assistant / Projects / Automation + Create / Workflows / Assets / Expert Mode |
| D8 | Agent architecture | Four-layer routing engine (intent classification → Skill retrieval/dispatch → sub-routing → sandboxed execution); Skill = self-contained mini-agent |
| D9 | Multi-agent policy | Triad: single-agent creation / Expert Team collaboration / review-panel validation; orchestration self-built in Rust (borrowing AgentScope abstractions) |
| D10 | Concept system | Connector / Skill / Expert / Expert Team / Inspiration modeled in layers (NLP logical-level mapping) |
| D11 | Moat | Asset flywheel: Skills + SOP one-click deposit + connector configs + inspiration "make alike" UGC loop |
| D12 | Media tools | Video→GIF / image compression / video transcoding on the ffmpeg sidecar |
| D13 | Observability | Tracing: chat/task/workflow span instrumentation + usage-log panel + optional OTLP export |

---

## Glossary

### The five concepts (WorkBuddy product philosophy, NLP logical-level mapping)

| Level | Concept | Question it answers | Engineering essence |
|-------|---------|---------------------|---------------------|
| L1 | **Connector** | Which systems/data can be accessed? | API / OAuth / MCP |
| L2–3 | **Skill** | How exactly is this done? | Workflow / Prompt / Tool-calling packaging |
| L3–5 | **Expert** | As whom, in which paradigm? | System prompt / domain knowledge / methodology |
| L3–5 | **Expert Team** | How do multiple roles deliver together? | Multi-agent orchestration |
| All | **Inspiration** | What have others achieved? Can I replicate? | Distribution form of Prompt+Skill+Expert config bundles |

> L6 (values and final judgment) always belongs to humans and organizations.

### Other terms

- **BYOK**: Bring Your Own Key — users supply vendor API keys; the platform never holds or bills them
- **Three modes**: Assistant (one ask, one act) / Project (kickoff–plan–execute–review–deliver) / Automation (unattended pipelines)
- **Unified Asset model**: single-table model for every output and media file, classified by `{type} × {source}`
- **Expert mode**: hidden entrance consolidating legacy organization/audit/load-test/monitoring modules

---

## Requirement entry format

```
ID / user story / description / interaction notes / existing-code mapping / priority (P0-P2) / acceptance criteria
```

Priority definitions:
- **P0**: required for the product to stand; ships with its milestone
- **P1**: significant competitiveness/experience gains, iterates right after
- **P2**: ecosystem expansion and long-term capabilities, invested after validation
