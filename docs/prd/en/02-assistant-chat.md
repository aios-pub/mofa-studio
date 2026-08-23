# 02 Assistant Chat (CHAT Domain)

> The assistant-mode home and the shared entry of all three benchmark products. Built upon the existing `ChatContainer.tsx` (621 lines) and the `useChat.ts` streaming pipeline.

## Domain Overview

| ID | Requirement | Priority | Milestone |
|----|-------------|----------|-----------|
| CHAT-01 | Multi-session multi-model streaming chat | P0 | M1 |
| CHAT-02 | Deep-thinking mode | P1 | M1 |
| CHAT-03 | Web search with citation tracing | P1 | M2 |
| CHAT-04 | Image understanding input | P1 | M1 |
| CHAT-05 | In-chat image generation | P0 | M1 |
| CHAT-06 | In-chat video generation | P2 | M2 |
| CHAT-07 | Real-time voice call | P2 | M3+ |
| CHAT-08 | Voice input & TTS readout | P1 | M2 |
| CHAT-09 | Prompt quick commands | P1 | M1 |
| CHAT-10 | Message-level actions | P0 | M1 |
| CHAT-11 | File upload capability matrix | P1 | M2 |
| CHAT-12 | Persona agents (compliance-first) | P2 | M3 |
| CHAT-13 | Session management enhancements | P1 | M2 |

---

## CHAT-01 Multi-session multi-model streaming chat
- **Story**: As a creator, I switch between sessions and models freely, watching replies stream in token by token.
- **Description**: SSE streaming; per-session model switching; collapsible thinking process; interrupt/resume.
- **Interaction**: typewriter effect toggleable; one auto-reconnect on stream drop; failed retries keep partial content.
- **Code mapping**: `src/hooks/useChat.ts`, `src/services/api/chat.ts`, `ChatContainer.tsx`.
- **Acceptance**: first token ≤2s (healthy network); no content loss across reconnects.

## CHAT-02 Deep-thinking mode
- **Story**: For hard questions I want reasoning-first answers with a visible chain of thought.
- **Description**: toggle thinking-capable models/params; dedicated collapsible CoT section.
- **Interaction**: "Deep think" button in composer toolbar; live summary while thinking, not full-text spam.
- **Code mapping**: `Message.thinking` already reserved in `src/types/conversation.ts`.
- **Acceptance**: smooth CoT rendering; toggling off behaves identically to normal mode.

## CHAT-03 Web search with citation tracing
- **Story**: For time-sensitive questions the AI searches along the way and cites clickable sources.
- **Description**: search toggle; retrieve→aggregate→generate stage indicator; superscript citations with hover previews.
- **Interaction**: source list appended after answers; links open originals.
- **Dependencies**: BYOK search APIs (Bocha/Zhipu/Tavily configurable) + backend readability extraction.
- **Acceptance**: time-sensitive answers carry ≥2 valid citations; missing key prompts config entry.

## CHAT-04 Image understanding input
- **Story**: Paste or drop an image; AI recognizes content and answers.
- **Description**: paste/drag/pick entrances; multi-image mixed with text; automatic vision-model routing.
- **Interaction**: thumbnail bubbles zoomable/removable; prompt to switch when a non-vision model is selected.
- **Acceptance**: jpg/png/webp/heic recognized; ≤10MB images encoded for upload within 5s.

## CHAT-05 In-chat image generation
- **Story**: Say "draw an orange cat" in chat — images appear inline and can be iterated.
- **Description**: intent classification hits image-gen → routes to capability; rich-media messages; follow-ups like "make it night" trigger I2I.
- **Interaction**: image action bar (zoom/edit/download/save-to-gallery); skeleton placeholders while generating.
- **Data loop**: outputs written to unified Asset model with `source=chat`, auto-entering the gallery (PLAT-06).
- **Acceptance**: image-intent recall ≥90% in sampling; subject consistency holds for "another take".

## CHAT-06 In-chat video generation
Same routing as CHAT-05 to video adapters. Long-running jobs render as async task cards (progress + inline playback). P2 / M2.

## CHAT-07 Real-time voice call
- **Story**: Talk to AI like a phone call; dialects recognized.
- **Description**: MVP uses ASR→LLM→TTS pipeline chaining (BYOK-friendly); full-duplex RTC deferred.
- **Interaction**: fullscreen call UI; speaking interrupts playback (VAD); dialect support follows vendor matrix.
- **Acceptance**: end-to-end latency ≤3s on pipeline architecture; barge-in response ≤800ms. Route details: 09 §7.

## CHAT-08 Voice input & TTS readout
Push-to-talk transcription (BYOK ASR); optional auto-readout of replies (multi-voice). P1 / M2.

## CHAT-09 Prompt quick commands
- **Story**: Reuse favorite prompts without rewriting.
- **Description**: "/" summons command palette; command = name + template + parameter slots; importable from existing Prompts module.
- **Code mapping**: `src/pages/management/prompts/` slimmed into a lightweight command library.
- **Acceptance**: create-to-use ≤30 seconds; variable placeholders supported.

## CHAT-10 Message-level actions
- **Story**: Regenerate disappointing replies, edit-and-resend my question, or branch from any message.
- **Description**: hover toolbar: copy / regenerate / edit-resend / quote / branch new session; branches snapshot parent context.
- **Interaction**: edit-resend truncates subsequent messages with confirmation; branches tagged "from session X".
- **Acceptance**: regeneration doesn't rebuild the whole list; branch context intact.

## CHAT-11 File upload capability matrix
- **Story**: Throw PDF/Word/PPT into chat for summarization and Q&A.
- **Description**: whitelist v1: pdf/docx/xlsx/pptx/csv/md/txt/images/audio; ≤50MB per file; parsed via RAG pipeline with chunk indexing.
- **Interaction**: upload cards show parsing progress and page counts; citations note "from doc X, page N".
- **Acceptance**: accurate grounding on 200-page PDFs; unsupported formats suggest PDF conversion.

## CHAT-12 Persona agents (compliance-first)
- **Story**: Create a fixed-persona assistant I reuse.
- **Description**: persona card = system prompt + opener + suggested commands + knowledge binding.
- **Compliance redlines** (mirroring Doubao's July 2026 takedown under anthropomorphic-agent rules): no human-impersonation companionship positioning; permanent "AI-generated" badge; no default minor entry; intervention prompts for emotional-dependency patterns. See 07 §3.
- **Acceptance**: ships only after passing internal compliance checklist.

## CHAT-13 Session management enhancements
Search / pin / archive / bulk delete / export Markdown & JSON. P1 / M2.

---

## Domain Dependencies
All model calls go through PLAT-02 llm-gateway; generated media lands in unified Asset model (PLAT-06); every request emits traces (PLAT-15).
