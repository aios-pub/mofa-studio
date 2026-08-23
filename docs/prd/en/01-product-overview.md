# 01 Product Overview

> Mofa Studio — a local-first, all-in-one AI creation workstation for creators.
> Fusing three product paradigms: **Chat as Creation** (Doubao), **Task as Delivery** (WorkBuddy), **Workflow as Production Line** (ComfyUI).

---

## 1. Positioning Statement

**Use agents; don't build them.**

Mofa Studio targets end-user creators, not developer POC tooling. In one sentence:

> Give creators a desktop AI creation hub that works out of the box, supports deep orchestration, and keeps data on-device.

### Three-in-One Value Proposition

| Paradigm | Benchmark | One-liner |
|----------|-----------|-----------|
| Chat as Creation | Doubao | Ask, see images, generate images/videos, write — all from the conversation entry |
| Task as Delivery | WorkBuddy | One-sentence task → autonomous planning & execution → deliverables with a review stage |
| Workflow as Production Line | ComfyUI | Node-based visual pipelines for batch content production |

### Differentiation Moats

1. **Local-first BYOK**: user-held API keys, data stays on-device, no subscription paywall
2. **Three-layer workbench depth**: Assistant → Project → Automation maturity path; the deeper you go, the harder to leave
3. **Asset flywheel**: Skills, SOPs, connector configs, and inspiration cases accumulate — switching costs grow with usage

### Answers to the Three Strategic Questions

| Question | Answer |
|----------|--------|
| What can users not take away after 100 days? | Polished Skills, proven SOP templates, configured connectors, published inspiration cases |
| Is there a path to deeper usage? | Assistant trial → Project dependency → Automation delegation; each layer embeds deeper and accumulates more |
| Tool or way of working? | A way of working: AI capabilities are orchestrated into the creator's content pipeline, not isolated tool calls |

> Commercialization note: no paywall or credit system in this phase; pricing-related interfaces stay out of UI contracts. Optional cloud value-added services reserved for later.

---

## 2. Target User Personas

Primary: **creators**; secondary: light office users.

### P1 Social Media Writer (core)
- Platforms: Xiaohongshu / WeChat Official Accounts / Zhihu
- Pain: slow cover production, topic droughts, resizing per platform for one story
- Key features: image generation + multi-size adaptation, AI writing, deep research, inspiration "make alike"

### P2 Short-video Creator (core)
- Platforms: Douyin / Bilibili / Channels
- Pain: script→storyboard→asset chain fragmented; transcoding chores
- Key features: in-chat video generation, podcast studio, video→GIF/transcode, workflow batch rendering

### P3 Designer / Illustrator (core)
- Pain: needs fine-grained control (LoRA, inpaint, upscale), endless client revisions
- Key features: workflow node canvas, masked inpainting, parameter rollback & reproduction

### P4 Light Office User (secondary)
- Scenarios: weekly reports, meeting minutes, slide decks
- Key features: audio transcription, PPT/spreadsheet generation, automated daily digest pipeline

---

## 3. Competitive Matrix

| Dimension | Doubao | WorkBuddy | ComfyUI | Cherry Studio | **This Product** |
|-----------|--------|-----------|---------|---------------|------------------|
| Form | Cloud app | Cloud+local desktop | Local OSS engine | BYOK desktop chat | **Local BYOK creation workstation** |
| Conversational creation | ★★★ | ★★ | ✗ | ★★ (no creation) | ★★★ |
| Task delivery | ★ (light) | ★★★ | ✗ | ✗ | ★★★ |
| Visual workflows | ✗ | ✗ | ★★★ (expert-only) | ✗ | ★★ (lowered barrier) |
| Data sovereignty | Weak | Medium (dual-mode) | Strong | Strong | **Strong** |
| Onboarding cost | Very low | Low | High | Medium | **Low (start from "make alike")** |
| Business model | Subscription | Credits | Free OSS | Free | Free + BYOK |

Open-source references: Cherry Studio (BYOK desktop architecture), LobeChat (plugin marketplace), Dify/Coze (agent orchestration), ComfyUI (workflow engine semantics), AgentScope (multi-agent abstractions).

---

## 4. Global Information Architecture (IA)

Three modes as the primary spine; capability surfaces hang off it:

```
Primary navigation
├── Assistant    ← Default home: multimodal chat + capability panel (13 tools) + inspiration feed
│                  One-click "convert to project" from any conversation
├── Projects     ← Kickoff → auto-plan → single-agent execution → expert review panel → delivery
├── Automation   ← Pipeline orchestration + schedules/triggers + result push (reuses Scheduler)
├── Create       ← Toolbox direct access: 16 tools + gallery
├── Workflows    ← FLOW node canvas (reachable from Assistant/Projects)
├── Assets       ← Skill market / SOP library / Inspiration plaza / Knowledge base / Connectors / Memory / Media index
└── Expert Mode  ← Legacy B-side modules tucked away (toggle, hidden by default)
```

Principle: **dual entry, single instance** — every tool is invokable as an assistant panel AND reachable from Create, sharing routes and state.

---

## 5. Three Modes & User Maturity Funnel

```
        ┌───────────┐      ┌───────────┐      ┌────────────┐
Trust → │ Assistant │ ───▶ │ Project   │ ───▶ │ Automation │
        │ Trial     │      │ Dependency│      │ Delegation │
        └───────────┘      └───────────┘      └────────────┘
        one ask one act    kickoff-to-delivery unattended pipelines
        instant feedback   staged outputs+review scheduled result push
              ▲                 ▲                    ▲
              └─ each layer deposits more assets: Skills/SOP/Connectors/Inspiration ─┘
```

Design constraints:
- Navigation and onboarding follow the funnel order without forcing upgrades
- "Convert to project" / "Save as SOP" prompts appear at natural moments, never interrupting flow

---

## 6. Asset Flywheel (Moat)

```
Usage ──▶ Asset deposits ──▶ Better product ──▶ More usage
             │
             ├─ Skills: refined skill packs reused via market
             ├─ SOPs: successful projects saved as process templates in one click
             ├─ Connector configs: OAuth credentials & tool bindings persisted
             └─ Inspiration cases: Prompt+Skill+Expert bundles published & shared
```

Loop: project success → SOP deposit → one-click convert to automation pipeline → publish as inspiration case → others "make alike" → UGC ecosystem starts.

---

## 7. Engineering Concept → User Concept Translation Table

Product philosophy: wrap runtime jargon into layperson-manageable features.

| Engineering concept | User-facing concept |
|---------------------|---------------------|
| API / OAuth / MCP | Connector |
| Workflow / Prompt / Tool Calling | Skill |
| System Prompt / domain knowledge / methodology | Expert |
| Multi-Agent / Orchestration / task execution | Expert Team |
| Prompt Template / Skill Config / Demo Case | Inspiration ("Make alike") |

---

## 8. Progressive Disclosure Onboarding

The user growth path doubles as feature unlock order (see ONBOARD group):

```
Copy an inspiration → tweak its Skill → connect data via Connector → hire an Expert → scale up to Expert Team
```

- Empty states, guidance copy, and recommendation feeds all follow this sequence
- Users never need to learn concepts upfront; first output comes from "make alike"

---

## 9. Scenario Stories

### Story A · A Xiaohongshu blogger's day
Morning: open Assistant, "make alike" an inspiration template for product-review posts, swap in her product shots, get 4 covers at different ratios in 10 minutes (TOOL-04). Afternoon: distill her viral copy structure into a personal style library (TOOL-06). Weekend: set up an automation pipeline that pushes an industry digest to WeChat at 8am daily (TASK-05).

### Story B · A short-video team's project
The director sketches a concept in Assistant and clicks "convert to project". The system kicks off and plans five steps: script→storyboard→clips→voiceover→assembly. A single agent keeps context-consistent through scripting and storyboards; the workflow canvas batch-renders boards; at review, compliance/engineering/narrative experts work in parallel raising 12 issues; after fixing blockers the project is accepted, and the whole run deposits as a team SOP.

### Story C · An illustrator's refinement pipeline
An artist generates base art in Create, masks hands with Konva brush and inpaints three variants side by side (parameter snapshots allow rollback); she then composes the whole "base→inpaint→upscale→background swap" into a workflow template. When the client changes requirements, only the input node changes — incremental execution hits cache and results return in seconds.

---

## 10. Onboarding Requirements (ONBOARD)

### ONBOARD-01 First-launch welcome
- **Story**: As a new user, I immediately understand what this is and why I care.
- **Description**: Three screens max conveying the tri-bridge value (chat/task/workflow), skippable.
- **Interaction**: Motion demos over text walls; persistent "Skip".
- **Priority**: P0
- **Acceptance**: New users reach key config or inspiration plaza within 30 seconds.

### ONBOARD-02 Key configuration wizard
- **Story**: As a user without an API key, I'm guided through applying and configuring my first key.
- **Description**: Pick provider (domestic-reachable first) → deep link to official console → paste key → connectivity test → success animation. Skippable (guest browsing of inspirations).
- **Interaction**: validate on paste; failures state exact cause (invalid/arrears/network); key lands in keychain instantly, never echoed in plaintext.
- **Code mapping**: `src/services/provider/providerConfigs.ts` (130+ vendor catalog reused).
- **Priority**: P0
- **Acceptance**: Users holding a key complete config + test within 3 minutes.

### ONBOARD-03 First-task guidance
- **Story**: As a configured new user, I want my first output within 5 minutes.
- **Description**: Inspiration plaza "make alike" recommendations front and center (3–5 lightweight cases: write a post / generate avatars / compress images).
- **Interaction**: instant visible output; completion offers "save as template / keep exploring".
- **Priority**: P0
- **Acceptance**: see M1 metric — install to first successful output ≤10 minutes.

### ONBOARD-04 Progressive disclosure mechanism
- **Story**: As a growing user, higher-order concepts appear exactly when I need them.
- **Description**: Following "Inspiration→Skill→Connector→Expert→Expert Team", contextual guides fire at boundary moments (e.g., export failure nudges connector setup).
- **Interaction**: guide cards permanently dismissible; never modal interruptions.
- **Priority**: P1
- **Acceptance**: ≥1 Skill-or-connector guide reached in first week with <40% dismissal rate.
