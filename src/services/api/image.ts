/**
 * Image generation service over the llm-gateway's OpenAI images endpoint
 * (backed by mofa-engine's image_gen capability). TOOL-01 / TOOL-04.
 */

import { apiClient } from "../api/apiClient";

/** Platform size presets (TOOL-04 批量多尺寸适配). */
export const SIZE_PRESETS: Array<{ value: string; label: string }> = [
  { value: "1024x1024", label: "方形 1:1 · 1024×1024" },
  { value: "768x1024", label: "小红书 3:4 · 768×1024" },
  { value: "720x1280", label: "抖音 9:16 · 720×1280" },
  { value: "1280x720", label: "B站 16:9 · 1280×720" },
  { value: "1440x720", label: "公众号横幅 2:1 · 1440×720" },
];

export interface ImageGenRequest {
  prompt: string;
  model?: string;
  n?: number;
  size?: string;
}

export interface ImageGenResult {
  b64_json: string;
}

export interface ImageGenResponse {
  created: number;
  data: ImageGenResult[];
  model_used?: string;
  provider?: string;
}

/** One generation record with its full parameter snapshot (TOOL-05). */
export interface ImageGenHistoryEntry {
  id: string;
  prompt: string;
  model?: string;
  n: number;
  size: string;
  created_at: string;
  images: string[]; // data URLs
  /** Which of the three TOOL-01 modes produced this entry. */
  mode?: ImageMode;
  /** Reference image data URLs (垫图/局部重绘 keep the inputs for re-runs). */
  refs?: string[];
  /** 局部重绘 only: the base image the mask was painted on. */
  baseImage?: string;
}

/** TOOL-01's three modes. */
export type ImageMode = "t2i" | "i2i" | "inpaint";

export interface ImageEditRequest {
  prompt: string;
  /** First entry is the edited base; extras are consistency anchors. */
  images: Blob[];
  /** Mask PNG blob — transparent areas mark the repaint region. */
  mask?: Blob;
  model?: string;
  size?: string;
  n?: number;
}

export interface ImageEditResponse extends ImageGenResponse {
  /** Gateway signal: a mask was supplied (局部重绘) vs whole-image (垫图). */
  masked?: boolean;
}

class ImageService {
  /** Generate images; returns data-URLs ready for <img src>. */
  async generate(request: ImageGenRequest): Promise<ImageGenResponse & { images: string[] }> {
    const body: Record<string, unknown> = { prompt: request.prompt };
    if (request.model) body.model = request.model;
    if (request.n !== undefined) body.n = request.n;
    if (request.size) body.size = request.size;

    const data = await apiClient.post<ImageGenResponse>(
      "/v1/images/generations",
      body,
    );
    const images = (data.data ?? []).map((item) => `data:image/png;base64,${item.b64_json}`);
    return { ...data, images };
  }

  /**
   * Edit images (TOOL-01 垫图/局部重绘) over /v1/images/edits: multipart
   * with every reference plus an optional mask, returning data-URLs the
   * same shape as generate().
   */
  async edit(
    request: ImageEditRequest,
  ): Promise<ImageEditResponse & { images: string[] }> {
    const form = new FormData();
    request.images.forEach((blob, index) => {
      form.append("image", blob, index === 0 ? "input.png" : `reference-${index}.png`);
    });
    if (request.mask) form.append("mask", request.mask, "mask.png");
    form.append("prompt", request.prompt);
    if (request.model) form.append("model", request.model);
    if (request.size) form.append("size", request.size);
    if (request.n !== undefined) form.append("n", String(request.n));

    const data = await apiClient.post<ImageEditResponse>("/v1/images/edits", form);
    const images = (data.data ?? []).map((item) => `data:image/png;base64,${item.b64_json}`);
    return { ...data, images };
  }
}

export const imageService = new ImageService();

/** Export naming rule from TOOL-04: {prompt_slug}_{size}_{seq}. */
export function exportFilename(prompt: string, size: string, seq: number): string {
  const slug = prompt
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${slug || "image"}_${size}_${seq}.png`;
}
