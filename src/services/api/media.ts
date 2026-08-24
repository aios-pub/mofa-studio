/**
 * Media toolbox service (TOOL-13/14/15): upload a file, convert video→GIF,
 * transcode with platform profiles, and compress images to a target size.
 */

import { apiClient } from "../api/apiClient";

export interface UploadResult {
  path: string;
  size: number;
}

export interface MediaResult {
  path?: string;
  mime: string;
  data_url: string;
  size: number;
  quality?: number;
}

export const TRANSCODE_PROFILES = [
  { value: "web_1080", label: "1080p Web（H.264/AAC）" },
  { value: "web_720", label: "720p Web（H.264/AAC）" },
  { value: "social_vertical", label: "竖屏 9:16（抖音/视频号）" },
  { value: "gif_friendly", label: "GIF 友好（480p 15fps 源）" },
] as const;

class MediaService {
  async upload(file: File): Promise<UploadResult> {
    const form = new FormData();
    form.append("file", file);
    const data = await apiClient.post<UploadResult>("/api/media/upload", form, {
      headers: { "Content-Type": undefined },
    });
    return data;
  }

  async toGif(path: string, fps = 12, width = 480): Promise<MediaResult> {
    return apiClient.post<MediaResult>("/api/media/gif", { path, fps, width });
  }

  async transcode(path: string, profile: string): Promise<MediaResult> {
    return apiClient.post<MediaResult>("/api/media/transcode", { path, profile });
  }

  async compressImage(path: string, targetKb = 200, originalSize?: number): Promise<MediaResult> {
    return apiClient.post<MediaResult>("/api/media/compress-image", {
      path,
      target_kb: targetKb,
      original_size: originalSize,
    });
  }

  download(result: MediaResult, filename: string): void {
    const link = document.createElement("a");
    link.href = result.data_url;
    link.download = filename;
    link.click();
  }
}

export const mediaService = new MediaService();

/** Result presentation metadata per operation. */
export function resultKind(mime: string): "image" | "video" | "other" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "other";
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
