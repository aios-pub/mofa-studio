/**
 * Video generation service (TOOL-02 studio side): async task cards —
 * submit returns immediately, polling walks queued/running → terminal,
 * and the finished clip arrives as a data URL.
 */

import { apiClient } from "../api/apiClient";
import { assetService } from "./assets";

export type VideoTaskStatus = "queued" | "running" | "succeeded" | "failed";

export interface VideoTask {
  task_id: string;
  status: VideoTaskStatus;
  prompt: string;
  model?: string | null;
  video?: string | null;
  error?: string | null;
  created_at: string;
}

export interface VideoSubmitInput {
  prompt: string;
  model?: string;
  size?: string;
  duration?: number;
}

export const VIDEO_SIZES = [
  { value: "1280x720", label: "横屏 16:9 · 1280×720" },
  { value: "720x1280", label: "竖屏 9:16 · 720×1280" },
  { value: "960x960", label: "方形 1:1 · 960×960" },
];

export function isTerminal(status: VideoTaskStatus): boolean {
  return status === "succeeded" || status === "failed";
}

class VideoService {
  async submit(input: VideoSubmitInput): Promise<{ task_id: string; status: VideoTaskStatus }> {
    return apiClient.post("/v1/videos/generations", input);
  }

  async status(taskId: string): Promise<VideoTask> {
    return apiClient.get(`/v1/videos/generations/${taskId}`);
  }

  /** Poll until terminal (or timeout); invokes onUpdate per poll. */
  async pollUntilTerminal(
    taskId: string,
    onUpdate: (task: VideoTask) => void,
    intervalMs = 3000,
    maxPolls = 200,
  ): Promise<VideoTask> {
    for (let i = 0; i < maxPolls; i += 1) {
      const task = await this.status(taskId);
      onUpdate(task);
      if (isTerminal(task.status)) return task;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return this.status(taskId);
  }

  /** Record a finished clip into the unified Asset model (PLAT-06). */
  async recordAsset(task: VideoTask): Promise<void> {
    if (task.status !== "succeeded" || !task.video) return;
    await assetService.create({
      type: "video",
      source: "studio",
      title: task.prompt,
      meta_json: { prompt: task.prompt, model: task.model, task_id: task.task_id },
      ref_path: task.video,
      tags: ["生成", "视频"],
    });
  }
}

export const videoService = new VideoService();
