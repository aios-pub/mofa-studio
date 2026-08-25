/**
 * Podcast workshop service (TOOL-12): topic → outline → A/B dialogue
 * script (LLM) → per-turn multi-voice TTS → concat/BGM render → MP3 +
 * RSS feed output. Script turns are individually editable and
 * re-voiceable (局部重配音色).
 */

import { apiClient } from "../api/apiClient";
import { chatService } from "./chat";

export type PodcastSpeaker = "A" | "B";

export interface ScriptTurn {
  speaker: PodcastSpeaker;
  text: string;
}

export interface PodcastEpisode {
  title: string;
  description: string;
  script: ScriptTurn[];
}

/** Voice catalog for multi-voice synthesis (BYOK provider dependent). */
export const VOICES: Array<{ value: string; label: string; speaker: PodcastSpeaker }> = [
  { value: "alloy", label: "主持 A · alloy", speaker: "A" },
  { value: "echo", label: "主持 B · echo", speaker: "B" },
  { value: "nova", label: "旁白 · nova", speaker: "A" },
  { value: "shimmer", label: "嘉宾 · shimmer", speaker: "B" },
];

export function defaultVoiceFor(speaker: PodcastSpeaker): string {
  return speaker === "A" ? "alloy" : "echo";
}

/** Parse the LLM script reply into an episode. */
export function parseEpisode(reply: string, topic: string): PodcastEpisode {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("模型未返回有效的播客脚本 JSON");
  }
  const parsed = JSON.parse(reply.slice(start, end + 1)) as {
    title?: string;
    description?: string;
    script?: Array<{ speaker?: string; text?: string }>;
  };
  const script = (parsed.script ?? [])
    .map((turn) => ({
      speaker: (turn.speaker === "B" ? "B" : "A") as PodcastSpeaker,
      text: String(turn.text ?? "").trim(),
    }))
    .filter((turn) => turn.text.length > 0);
  if (script.length === 0) {
    throw new Error("脚本为空：请重试或调整选题");
  }
  return {
    title: String(parsed.title ?? topic).trim(),
    description: String(parsed.description ?? "").trim(),
    script,
  };
}

export function buildScriptMessages(topic: string, minutes: number) {
  return [
    {
      role: "system" as const,
      content:
        "你是播客编剧。只输出 JSON，不要解释。格式：" +
        '{"title":"节目标题","description":"一句话简介","script":[{"speaker":"A","text":"…"},{"speaker":"B","text":"…"}]}。' +
        `双人对谈（A 提问/推进，B 回答/展开），口语化、有来有回，共约 ${minutes} 分钟（每分钟约 4 轮对话）。`,
    },
    { role: "user" as const, content: `选题：${topic}` },
  ];
}

// ==================== RSS feed (元信息/RSS 输出) ====================

export interface FeedEpisode {
  title: string;
  description: string;
  pubDate: Date;
  durationSec: number;
  audioUrl: string;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildRssFeed(
  channelTitle: string,
  channelLink: string,
  episodes: FeedEpisode[],
): string {
  const items = episodes
    .map(
      (episode) => `    <item>
      <title>${escapeXml(episode.title)}</title>
      <description>${escapeXml(episode.description)}</description>
      <pubDate>${episode.pubDate.toUTCString()}</pubDate>
      <itunes:duration>${Math.round(episode.durationSec)}</itunes:duration>
      <enclosure url="${escapeXml(episode.audioUrl)}" type="audio/mpeg" />
    </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>由 mofa-studio 播客工坊生成</description>
    <language>zh-cn</language>
${items}
  </channel>
</rss>`;
}

// ==================== Service ====================

class PodcastService {
  async generateScript(topic: string, minutes: number, model?: string): Promise<PodcastEpisode> {
    const reply = await chatService.chat({
      messages: buildScriptMessages(topic, minutes),
      model,
      temperature: 0.8,
    });
    return parseEpisode(reply.content, topic);
  }

  /** Synthesize one turn's audio; returns a data URL. */
  async synthesizeTurn(text: string, voice: string): Promise<string> {
    const baseURL = apiClient.getBaseUrl?.() ?? "";
    const response = await fetch(`${baseURL}/v1/audio/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: text, voice }),
    });
    if (!response.ok) {
      throw new Error(`配音失败（HTTP ${response.status}）`);
    }
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("音频读取失败"));
      reader.readAsDataURL(blob);
    });
  }

  /** Render the episode: concat turns, optional BGM bed. */
  async render(
    turns: string[],
    bgm?: string,
    bgmVolume = 0.25,
  ): Promise<{ data_url: string; size: number }> {
    return apiClient.post("/api/podcast/render", {
      turns,
      bgm: bgm ?? null,
      bgm_volume: bgmVolume,
    });
  }
}

export const podcastService = new PodcastService();
