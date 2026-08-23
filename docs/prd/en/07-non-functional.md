# 07 Non-Functional Requirements

## 1. Performance Budget

| Metric | Target |
|--------|--------|
| Cold app start | ≤3s (to interactive) |
| First chat token display | ≤2s (healthy network, excluding model first-token latency) |
| Workflow canvas | 60fps at 200 nodes |
| Memory baseline | ≤500MB steady state (excluding external local-inference processes) |
| Installer size | macOS universal ≤150MB / Windows ≤180MB (ffmpeg bundled counts in) |
| Batch jobs | 50-image compression ≤2min; never blocks the UI thread |

## 2. Privacy & Security

### 2.1 Key security
Keys live only in OS keychains; zero plaintext in the renderer (PLAT-04 hard constraint); all logging redacted.

### 2.2 Memory four rights
The memory system (TASK-19) must satisfy: **visible / editable / deletable / master switch**. Shipping without any one is prohibited — part of the local-first promise.

### 2.3 Prompt injection defense
- External content fetched by connectors (mail/web/docs) is flagged as untrusted context before LLM injection
- Tool calls triggered by external content follow a confirm-policy: read-class whitelist passes; write/outbound classes require user confirmation
- System instructions and user content are partitioned; external content can never override system role definitions

### 2.4 Telemetry, crashes & feedback
- Anonymous usage stats **off by default**; opt-in displays the exact collection list
- Crash reports on by default but contain stack traces and environment info only — never user data
- In-app feedback entry (annotated screenshots + optional log attachment)

## 3. Compliance

### 3.1 AI-generated content labeling
- Images: EXIF/XMP metadata carrying AI-generation declarations; preserved through platform-preset exports
- Video/audio: container-level labels; publishing guidance reminds users of per-platform declaration requirements

### 3.2 Anthropomorphic-agent compliance redlines (mirroring Doubao's July 2026 takedown)
Persona agents (CHAT-12) design constraints:
- No human-impersonation companionship positioning; persona cards carry a permanent "AI-generated" badge
- No default entry for minors; intervention prompts triggered by emotional-dependency patterns
- Must pass the internal compliance checklist before launch (legal sign-off gate)

### 3.3 Content-safety hooks
Generation pipelines reserve middleware mount points for sensitive-word filtering (app-layer backstop beyond vendor-side moderation); deep-synthesis features such as avatar video undergo dedicated compliance assessment before launch (TOOL-03 boundary).

## 4. Reliability
- SSE stream drops: one auto-reconnect + manual retry; failed generation tasks keep state for resume
- Automation pipeline breakpoint resume via SQLite WAL + event sourcing (TASK-05)
- Database corruption auto-detected with restore-from-backup prompt

## 5. Update strategy
tauri-plugin-updater; staged rollout (percentage-based); update signature verification; rollback-to-previous-version contingency.

## 6. Internationalization
Full zh-CN / en-US coverage (i18next infra exists); new UI strings commit bilingual copy together (per AGENTS.md); domestic market primary — region-sensitive components such as search APIs remain configurable/swappable.

## 7. Compatibility
macOS 13+ (Apple Silicon first, universal builds); Windows 10+ x64 (ARM64 compatibility as needed); usable on ≥8GB RAM devices (excluding local inference).

## 8. Accessibility & experience floor
Keyboard access across core flows; theme system inherits existing dark/light + 6 color presets + font scaling; animations respect reduced-motion settings.
