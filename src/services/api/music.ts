/**
 * Music generation service (TOOL-10) over the gateway's task API —
 * backed by mofa-engine's music_gen capability (suno-api compatible
 * gateways). 风格/情绪 presets assemble into the style/prompt fields.
 */

import { apiClient } from "../api/apiClient";
import { assetService } from "./assets";

export type MusicTaskStatus = "running" | "succeeded" | "failed";

export interface MusicTask {
  task_id: string;
  status: MusicTaskStatus;
  prompt?: string;
  model?: string | null;
  /** Clip label (title · tags). */
  label?: string | null;
  /** data:audio/mpeg;base64,… when succeeded. */
  audio?: string | null;
  error?: string | null;
  created_at?: string;
}

export interface MusicSubmitRequest {
  prompt: string;
  lyrics?: string;
  style?: string;
  title?: string;
  instrumental?: boolean;
  model?: string;
}

/** 风格 presets (TOOL-10 交互: 风格参数). */
export const STYLE_PRESETS: Array<{ value: string; label: string }> = [
  { value: "pop, upbeat", label: "流行 · 欢快" },
  { value: "folk, acoustic", label: "民谣 · 木吉他" },
  { value: "electronic, dance", label: "电子 · 舞曲" },
  { value: "chinese traditional, guzheng", label: "国风 · 古筝" },
  { value: "jazz, lofi", label: "爵士 · lofi" },
  { value: "rock, energetic", label: "摇滚 · 燃" },
  { value: "orchestral, epic", label: "管弦 · 史诗" },
  { value: "ambient, calm", label: "氛围 · 舒缓" },
];

/** 情绪 presets folded into the prompt. */
export const MOOD_PRESETS: Array<{ value: string; label: string }> = [
  { value: "", label: "不限" },
  { value: "欢快的", label: "欢快" },
  { value: "舒缓的", label: "舒缓" },
  { value: "深情的", label: "深情" },
  { value: "热血的", label: "热血" },
  { value: "伤感的", label: "伤感" },
];

export class MusicService {
  async submit(request: MusicSubmitRequest): Promise<string | null> {
    try {
      const data = await apiClient.post<{ task_id?: string }>(
        "/v1/music/generations",
        request,
      );
      return data?.task_id ?? null;
    } catch {
      return null;
    }
  }

  async poll(taskId: string): Promise<MusicTask | null> {
    try {
      return await apiClient.get<MusicTask>(`/v1/music/generations/${taskId}`);
    } catch {
      return null;
    }
  }
}

export const musicService = new MusicService();

/** Record a finished clip into the unified asset model (成品入画廊). */
export async function recordMusicAsset(
  prompt: string,
  audioDataUrl: string,
  label: string | null,
): Promise<void> {
  await assetService.create({
    type: "audio",
    source: "studio",
    title: label?.trim() || prompt.slice(0, 30),
    meta_json: { prompt, label },
    ref_path: audioDataUrl,
    tags: ["音乐", "生成"],
  });
}

/** The bridge key the podcast page reads a pending BGM from. */
export const PODCAST_BGM_BRIDGE_KEY = "mofa-studio-pending-bgm";

/** Queue a finished clip as the podcast BGM (播客 BGM 联动). */
export function setPendingPodcastBgm(audioDataUrl: string) {
  try {
    localStorage.setItem(PODCAST_BGM_BRIDGE_KEY, audioDataUrl);
  } catch {
    // quota: large audio may not fit; the user can still download + upload.
  }
}

export function takePendingPodcastBgm(): string | null {
  try {
    const value = localStorage.getItem(PODCAST_BGM_BRIDGE_KEY);
    if (value) localStorage.removeItem(PODCAST_BGM_BRIDGE_KEY);
    return value;
  } catch {
    return null;
  }
}
