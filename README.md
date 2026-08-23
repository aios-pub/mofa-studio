# mofa-studio

<!-- lang-toggle -->
🇬🇧 English | [中文](./README.zh-CN.md)
<!-- /lang-toggle -->

mofa-studio is a **local-first, all-in-one AI creation workstation for creators**, built with Tauri and an isomorphic Rust backend. It fuses three product paradigms into one desktop app:

- **Chat as Creation** — multimodal conversational entry for Q&A, vision, image/video generation and writing
- **Task as Delivery** — one-sentence tasks autonomously planned, executed, reviewed and delivered as documents/decks/media
- **Workflow as Production Line** — node-based visual pipelines for batch content production

All model access is **BYOK (Bring Your Own Key)**: keys live in OS keychains, data stays on-device, and there is no subscription paywall.

> 📋 Product requirements documents (bilingual): [`docs/prd/`](docs/prd/README.md)

## Features

### Three-Mode Workbench
- **Assistant** — default home: streaming multi-model chat with deep-thinking mode, web search with citations, image understanding, in-chat image/video generation, voice input & TTS readout
- **Projects** — kickoff → autonomous planning → single-agent execution → multi-expert review panel → acceptance & delivery, with breakpoint resume
- **Automation** — unattended scheduled pipelines (cron triggers) that keep running in the tray after the window closes

### Creation Toolbox (16 tools)
- **Image generation** — text-to-image / image-to-image / masked inpainting, multi-reference consistency, batch production with per-platform size presets (Xiaohongshu 3:4, Douyin 9:16, Bilibili 16:9)
- **Video generation & media processing** — text/image-to-video; video→GIF, batch image compression, transcoding with platform presets (ffmpeg)
- **Documents** — AI writing with personal style library (TipTap), PPT generation, AI spreadsheet, deep research with cost estimates and cited reports
- **Audio** — music generation, meeting transcription with speaker diarization, full podcast studio (script → multi-voice TTS → waveform editing → MP3 export)

### Task Workbench
- Five-concept system: **Connectors** (OAuth/MCP), **Skills** (self-contained mini-agent packs), **Experts**, **Expert Teams**, **Inspiration marketplace** ("make alike" one-click replication)
- Deliverables center with unified preview (Word/Excel/PPT via Univer), file tree and change diffs
- Authorized-directory local file operations, long-term memory system, SOP one-click deposit

### Creation Workflow (ComfyUI-parity, lowered barrier)
- Node canvas with generation node library, execution queue with signature-cache incremental execution
- Model management center (cloud API + local Ollama dual track), template market with missing-dependency detection
- App Mode: experts compose workflows, everyone else fills a simple form

### Platform Foundation
- Embedded Axum backend (same codebase compiles to a standalone server for future web/mobile)
- llm-gateway normalizing 130+ model vendors with usage metering, quota alerts and key failover
- Tracing observability: chat/task/workflow span instrumentation with a usage & cost dashboard

### Desktop Companion
- Draggable floating ball, screenshot-to-ask, text-selection Q&A, global hotkeys, tray residency
- Legacy B-side admin modules (organization, audit, load testing, monitoring) tucked behind an opt-in **Expert Mode**

## Tech Stack

| Category | Technology |
|------|------|
| Framework | Tauri 2.x + React 19 |
| Language | TypeScript 5.8 / Rust |
| Build Tool | Vite 8 |
| UI Components | Ant Design 6 |
| Styling | Tailwind CSS 4 |
| State Management | Zustand 5 |
| Routing | React Router 7 |
| Workflow Graph | XYFlow |
| Office Suite | Univer (Sheets/Docs/Slides) |
| Backend (embedded) | Axum · SQLite (+FTS5/sqlite-vec) · ffmpeg sidecar · OS keychain |
| Internationalization | i18next |

## Project Structure

```
mofa-studio/
├── src/                    # Frontend source code
│   ├── components/         # Reusable components
│   ├── pages/              # Page components
│   ├── hooks/              # Custom hooks
│   ├── stores/             # Zustand state management
│   ├── services/           # API services (mock/real dual-track)
│   ├── types/              # TypeScript type definitions
│   ├── theme/              # Theme configuration
│   ├── i18n/               # Internationalization config
│   ├── floating/           # Floating window components
│   └── tracing/            # Conversation span tracing
├── src-tauri/              # Tauri shell (tray, floating ball, window mgmt)
├── docs/
│   └── prd/                # Product requirements documents (en/zh)
└── public/                 # Static assets
```

> The embedded Axum backend (`server-core`) described in the [PRD](docs/prd/README.md) is planned work; today's shell is thin while all business logic runs through the service layer.

## Getting Started

### Prerequisites

- Node.js 18+
- Deno (recommended) or pnpm/npm
- Rust 1.90+
- System dependencies see [Tauri official docs](https://tauri.app/start/prerequisites/)

### Install Dependencies

```bash
deno install
```

### Development Mode

```bash
# Start frontend dev server
deno task dev

# Start Tauri dev mode (includes frontend)
deno task tauri-dev
```

### Build & Release

```bash
# Build frontend
deno task build

# Build Tauri application
deno task tauri-build
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key configuration items:
- `VITE_APP_SERVER_URL` - API base URL of your backend instance
- `VITE_APP_ENABLE_MOCK` - toggle mock data layer
- `VITE_APP_FLOATING_MODE` - `floating` or `window` launch mode
- `VITE_APP_TITLE` - Application title

## License

This project uses a commercial source code license agreement. See the [LICENSE](LICENSE) file for details.

**Important Notice:**
- This software is licensed for source code viewing only, for personal learning or research purposes
- Copying, modification, distribution, or commercial use is prohibited
- For commercial licensing, please contact the copyright holder

## Acknowledgements

We would like to express our sincere gratitude to:

- **Dr. Wu** - For invaluable guidance, support, and inspiration throughout the development of this project.
- **The mofa-org team** - For their dedication, collaboration, and contributions that made this project possible.
