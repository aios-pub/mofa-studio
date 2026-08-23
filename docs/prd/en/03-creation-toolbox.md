# 03 Creation Toolbox (TOOL Domain)

> Full coverage of Doubao's 10 flagship features + a media-processing trio + boundary items — 16 requirements. Every tool follows "dual entry, single instance": invokable from the assistant panel and reachable from Create, sharing one implementation.

## Domain Overview

| Group | ID | Tool | Priority | Milestone |
|-------|----|------|----------|-----------|
| A Image/Video | TOOL-01 | Image generation | P0 | M1 |
| | TOOL-02 | Video generation | P1 | M2 |
| | TOOL-03 | Avatar video (boundary) | P2 | Later |
| | TOOL-04 | Batch production & multi-size adaptation | P0 | M1 |
| | TOOL-05 | Generation history & parameter rollback | P1 | M2 |
| B Documents | TOOL-06 | AI writing | P0 | M1 |
| | TOOL-07 | PPT generation | P1 | M2 |
| | TOOL-08 | AI spreadsheet | P1 | M2 |
| | TOOL-09 | Deep research | P1 | M2 |
| C Audio | TOOL-10 | Music generation | P2 | M2 |
| | TOOL-11 | Audio transcription | P1 | M2 |
| | TOOL-12 | Podcast studio | P1 | M2 |
| D Media processing | TOOL-13 | Video to GIF | P1 | M2 |
| | TOOL-14 | Image compression | P1 | M2 |
| | TOOL-15 | Video transcoding | P1 | M2 |
| E Education | TOOL-16 | Photo problem solving | P2 | M3 |

Common specs: outputs written to unified Asset model with `source=studio`; all calls traced (PLAT-15); parameter panels support "save as preset".

---

## A · Image & Video

### TOOL-01 Image generation
- **Story**: Describe to generate, brush-mask regions to inpaint, reference images for subject consistency.
- **Description**: T2I/I2I/masked-inpaint modes; multi-reference consistency; adapters for Seedream, Tongyi Wanxiang, Flux, SD-family APIs.
- **Interaction**: Konva mask brush (feather/size); prompt history dropdown; 4-grid candidates with zoom.
- **Code mapping**: new pages; masks via `react-konva`.
- **Acceptance**: 1024×1024 output ≤15s at vendor-normal latency; mask edges clean.

### TOOL-02 Video generation
T2V/I2V; Seedance/Kling/Jimeng adapters; async task cards with queue progress; clips ≤10s. P1.

### TOOL-03 Avatar video【boundary】
Real-person avatars require consent verification and deep-synthesis compliance review — deferred as P2 pending legal checklist (07 §3).

### TOOL-04 Batch production & multi-size adaptation
- **Story**: One prompt yields N candidates; one click adapts sizes per platform.
- **Description**: batch count 1–8; size presets: Xiaohongshu 3:4 / Douyin 9:16 / Bilibili 16:9 / WeChat 900px; export naming `{prompt_slug}_{size}_{seq}`.
- **Acceptance**: cancel single item in an 8-batch; zip structure matches naming rules.

### TOOL-05 Generation history & parameter rollback
- **Story**: That image from three days ago was great — rerun same params with tweaked wording.
- **Description**: full parameter snapshots per generation; history grid view; "restore parameters from image" (reads embedded metadata); version comparison slider.
- **Acceptance**: any history entry reproduces identical output (same seed); graceful fallback when metadata absent.

## B · Documents

### TOOL-06 AI writing
- **Story**: Given a topic and outline, the AI writes long-form in my style.
- **Description**: genre templates (Xiaohongshu copy / official-account / reviews / scripts); continue/rewrite/expand/shrink; **personal style library** learned from past works (asset-flywheel entry).
- **Interaction**: TipTap rich editor with Markdown source; floating AI menu on selection; word counts with platform limits.
- **Selection note**: writing editor = TipTap; Word deliverable rendering = Univer Docs (TASK-17), interoperating via Markdown/docx. See 09 §4.
- **Acceptance**: 5000-word continuation without context loss; style-library output distinguishable in blind tests.

### TOOL-07 PPT generation
- **Story**: One topic sentence becomes an editable deck.
- **Description**: LLM→structured slide schema→Univer Slides render→pptxgenjs .pptx export; v1 ships 5 theme packs.
- **Interaction**: outline confirmation first, then per-page generation (token-frugal & controllable); regenerate single slides.
- **Risk**: if Univer Slides underdelivers, degrade to pptxgenjs direct generation + read-only preview (08 R2).
- **Acceptance**: 10-slide deck end-to-end ≤3min; exports open in PowerPoint/WPS.

### TOOL-08 AI spreadsheet
- **Story**: Upload Excel, say one sentence, get analysis and charts.
- **Description**: Univer Sheets rendering/editing; natural language → formulas/pivots/charts; import xlsx/csv; export xlsx/csv/chart PNGs.
- **Boundary**: MVP is file import + conversational generation only — no direct DB connections or web scraping.
- **Acceptance**: smooth on 100k-row sheets; formula results match Excel ≥99% sampled.

### TOOL-09 Deep research
- **Story**: Hand over a research question; get path decomposition, cross-validated findings, and a cited structured report.
- **Description**: depth tiers: quick(3 sources)/standard(8)/deep(15+); each tier shows **estimated token cost** upfront (BYOK is real money); retrieve→extract→dedupe→cross-validate→report (Markdown / Typset PDF via Typst); citation list.
- **Interaction**: live retrieval-path tree while running; outline adjustable mid-run.
- **Dependencies**: search connectors (same stack as CHAT-03) + rag-pipeline extraction.
- **Acceptance**: standard tier ≤5min; every conclusion links back to source text.

## C · Audio

### TOOL-10 Music generation
Text-to-music: style/duration/mood params; Suno-like vendor APIs; outputs enter gallery and can serve as podcast BGM. P2.

### TOOL-11 Audio transcription
- **Story**: Turn a one-hour meeting recording into speaker-separated minutes.
- **Description**: file or microphone input; BYOK ASR (Whisper API/FunASR etc.); speaker diarization; minutes output (summary/todos/timestamps).
- **Downstream loop**: one-click flow of todos into AI spreadsheet or summary into PPT.
- **Acceptance**: 60-minute audio transcribed ≤10min at normal latency; two-speaker separation accuracy ≥90% sampled.

### TOOL-12 Podcast studio
- **Story**: Give a topic; get a finished two-host podcast MP3.
- **Description**: full chain = topic outline(LLM)→dialogue script(hosts A/B)→multi-voice TTS (CosyVoice/ElevenLabs/MiniMax BYOK)→waveform editing (wavesurfer.js: trim/splice/BGM mixing)→ffmpeg render to MP3→metadata/RSS output.
- **Interaction**: per-line script rewrite with localized re-voicing; segment markers on waveform.
- **Upstream tie-in**: transcripts from TOOL-11 injectable into script generation.
- **Acceptance**: 10-min two-host episode ≤30min including manual tweaks; BGM never drowns voices.

## D · Media processing (ffmpeg sidecar)

### TOOL-13 Video to GIF
fps/resolution/loop params; palette algorithm for quality; clip trimming; output-size estimation. Acceptance: 10s 720p→GIF ≤30s; size estimate within ±20%.

### TOOL-14 Image compression
Batch; WebP/AVIF/JPEG conversion; quality slider with before/after preview; target-size mode ("fit within 2MB"). Encoder rationale in 09 §6. Acceptance: 50 images ≤2min; target-size success ≥95%.

### TOOL-15 Video transcoding
Container conversion MOV→MP4; H.264/H.265/AV1 selectable; **one-click platform presets** (Xiaohongshu/Douyin/Bilibili: resolution+bitrate+muxing profiles); audio extraction. Acceptance: mainstream phone footage uploads to each platform without warnings.

> All three share the SQLite job queue and WS progress push; outputs land in gallery with `source=tool`; asset context-menu shortcuts provided (PLAT-06).

## E · Education

### TOOL-16 Photo problem solving
Snap a problem → OCR → step-by-step explanation (KaTeX already present); math/physics/chemistry first.
**Boundary**: photo solving + explanation only — no mistake notebooks or learning analytics loops. P2 / M3.
