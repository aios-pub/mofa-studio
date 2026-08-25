/**
 * Recording transcription service (TOOL-11): record or upload audio →
 * transcript via the ASR pipeline; speaker turns heuristically separated;
 * minutes (summary/todos/timestamps) derived by the LLM.
 */

import { apiClient } from "../api/apiClient";
import { chatService } from "./chat";
import { audioService } from "./audio";

// ==================== Speaker diarization (heuristic) ====================

export interface SpeakerTurn {
  speaker: "A" | "B";
  text: string;
  /** Second offset within the recording (estimated). */
  startSec: number;
}

/** Markers that typically open a speaker turn in CN meeting talk. */
const TURN_MARKERS = [
  "我认为", "我觉得", "我补充", "我来说", "我想说", "那我问", "我反对",
  "换个话题", "总结一下", "接下来", "首先", "然后我", "我这边",
];

/**
 * Heuristic two-speaker separation: alternating turns at marker hits.
 * Honest about being a heuristic — vendor diarization is the upgrade path
 * (PRD ≥90% acceptance needs FunASR-class models upstream).
 */
export function separateSpeakers(transcript: string): SpeakerTurn[] {
  const sentences = transcript
    .split(/(?<=[。！？!?；;])\s*/)
    .map((s) => s.trim())
    .filter((s) => /[\u4e00-\u9fff\w]/.test(s));
  if (sentences.length === 0) return [];

  // Split into turns: a marker starts a new turn if the current one is
  // long enough, else it belongs to the same speaker.
  const turns: Array<{ text: string[]; markerStart: boolean }> = [];
  for (const sentence of sentences) {
    const startsMarker = TURN_MARKERS.some((m) => sentence.startsWith(m));
    const last = turns[turns.length - 1];
    if (!last || (startsMarker && last.text.join("").length >= 20)) {
      turns.push({ text: [sentence], markerStart: true });
    } else {
      last.text.push(sentence);
    }
  }

  // Alternate speakers A/B across turns.
  const avgCharsPerSec = 4; // spoken CN ≈ 4 chars/sec
  let cursorSec = 0;
  return turns.map((turn, index) => {
    const text = turn.text.join("");
    const startSec = cursorSec;
    cursorSec += Math.round(text.length / avgCharsPerSec);
    return { speaker: index % 2 === 0 ? "A" : "B", text, startSec };
  });
}

export function formatTimestamp(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// ==================== Minutes ====================

export interface Minutes {
  summary: string;
  todos: string[];
}

/** Parse the LLM minutes reply: summary line(s) then 「待办」 bullets. */
export function parseMinutes(reply: string): Minutes {
  const lines = reply
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const todos: string[] = [];
  const summaryLines: string[] = [];
  let inTodos = false;
  for (const line of lines) {
    const bullet = line.match(/^(?:[-*·]|\d+[.、)])\s*(.+)$/);
    const content = bullet?.[1] ?? line;
    // A「待办：」marker (bare or in a bullet) opens the todo section.
    if (line.replace(/^[-*·\d.、)\s]+/, "").startsWith("待办") || /^待办/.test(line)) {
      inTodos = true;
      continue;
    }
    if (inTodos) {
      todos.push(content);
      continue;
    }
    summaryLines.push(content);
  }
  return {
    summary: summaryLines.join(" ") || "（模型未返回概要）",
    todos,
  };
}

export function buildMinutesMessages(turns: SpeakerTurn[]): Array<{
  role: "system" | "user";
  content: string;
}> {
  const transcript = turns
    .map((t) => `[${formatTimestamp(t.startSec)}] 说话人${t.speaker}: ${t.text}`)
    .join("\n");
  return [
    {
      role: "system",
      content:
        "你是会议纪要助手。基于转写内容输出：先一段概要（不超过 120 字）；然后一行「待办：」；随后每行一条待办（- 开头，含负责人如有）。只基于给定内容。",
    },
    { role: "user", content: transcript },
  ];
}

// ==================== Service ====================

export interface TranscriptResult {
  raw: string;
  turns: SpeakerTurn[];
}

class TranscriptionService {
  /** Transcribe an audio blob and separate speakers. */
  async transcribe(blob: Blob): Promise<TranscriptResult> {
    const raw = await audioService.transcribe(blob);
    return { raw, turns: separateSpeakers(raw) };
  }

  /** Derive meeting minutes from the separated turns. */
  async minutes(turns: SpeakerTurn[], model?: string): Promise<Minutes> {
    const reply = await chatService.chat({
      messages: buildMinutesMessages(turns),
      model,
      temperature: 0.3,
    });
    return parseMinutes(reply.content);
  }
}

export const transcriptionService = new TranscriptionService();

// ==================== Downstream handoff (下游闭环) ====================

/** Todos → AI-sheets CSV ready for import (待办清单). */
export function todosToCsv(todos: string[]): string {
  const escape = (cell: string) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);
  return ["事项,状态", ...todos.map((todo) => `${escape(todo)},未开始`)].join("\n");
}

/** Minutes → a single PPT outline slide payload. */
export function minutesToSlide(minutes: Minutes, title: string) {
  return {
    title,
    points: [minutes.summary.slice(0, 60), ...minutes.todos.slice(0, 4)],
  };
}
