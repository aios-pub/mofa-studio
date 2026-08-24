/**
 * Unified Asset model service (PLAT-06): every produced artifact — chat
 * images, tool outputs, task deliverables — lands in one collection and
 * is retrievable by type × source from the gallery. Snake_case fields.
 */

import { apiClient } from "../api/apiClient";

export type AssetType =
  | "image"
  | "video"
  | "audio"
  | "doc"
  | "sheet"
  | "slide"
  | "skill"
  | "sop"
  | "case"
  | "file";

export type AssetSource = "chat" | "studio" | "task" | "flow" | "tool" | "import";

export interface Asset {
  id: string;
  type: AssetType;
  source: AssetSource;
  title: string;
  /** Extra context: prompt, size, model, tokens… (metadata only). */
  meta_json: Record<string, unknown>;
  /** Zero-copy reference to the payload (data URL or file path). */
  ref_path: string;
  created_at: string;
  tags: string[];
}

export const ASSET_TYPES: Array<{ value: AssetType | "all"; label: string }> = [
  { value: "all", label: "全部类型" },
  { value: "image", label: "图片" },
  { value: "video", label: "视频" },
  { value: "audio", label: "音频" },
  { value: "doc", label: "文档" },
  { value: "file", label: "文件" },
];

export const ASSET_SOURCES: Array<{ value: AssetSource | "all"; label: string }> = [
  { value: "all", label: "全部来源" },
  { value: "chat", label: "对话" },
  { value: "studio", label: "创作" },
  { value: "task", label: "任务" },
  { value: "flow", label: "工作流" },
  { value: "import", label: "导入" },
];

/** Client-side type × source filter (the backend list is unfiltered). */
export function filterAssets(
  assets: Asset[],
  type: AssetType | "all",
  source: AssetSource | "all",
): Asset[] {
  return assets.filter(
    (a) =>
      (type === "all" || a.type === type) &&
      (source === "all" || a.source === source),
  );
}

export interface CreateAssetInput {
  type: AssetType;
  source: AssetSource;
  title: string;
  meta_json?: Record<string, unknown>;
  ref_path: string;
  tags?: string[];
}

class AssetService {
  async list(): Promise<Asset[]> {
    try {
      const data = await apiClient.get<Asset[]>("/api/asset/list");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async create(input: CreateAssetInput): Promise<Asset | null> {
    try {
      return await apiClient.post<Asset>("/api/asset/create", {
        type: input.type,
        source: input.source,
        title: input.title,
        meta_json: input.meta_json ?? {},
        ref_path: input.ref_path,
        tags: input.tags ?? [],
      });
    } catch {
      return null; // gallery recording is best-effort; creation flows on
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/api/asset/delete/${id}`);
      return true;
    } catch {
      return false;
    }
  }

  async get(id: string): Promise<Asset | null> {
    try {
      return await apiClient.get<Asset>(`/api/asset/${id}`);
    } catch {
      return null;
    }
  }
}

export const assetService = new AssetService();

/** Record generated images (TOOL-01 / CHAT-05) into the asset model. */
export async function recordImageAssets(
  source: AssetSource,
  prompt: string,
  images: string[],
  meta: Record<string, unknown>,
): Promise<void> {
  await Promise.all(
    images.map((dataUrl, index) =>
      assetService.create({
        type: "image",
        source,
        title: images.length > 1 ? `${prompt}（${index + 1}）` : prompt,
        meta_json: { prompt, ...meta },
        ref_path: dataUrl,
        tags: ["生成"],
      }),
    ),
  );
}
