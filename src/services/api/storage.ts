/**
 * Storage management service (PLAT-09): category usage, cache cleanup,
 * recycle-bin operations.
 */

import { apiClient } from "../api/apiClient";

export interface StorageCategory {
  key: string;
  label: string;
  bytes: number;
  files: number;
}

export interface TrashItem {
  id: string;
  size: number;
  trashed_at: string;
}

export interface StorageUsage {
  total_bytes: number;
  categories: StorageCategory[];
  trash: TrashItem[];
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Categories the UI may clean (database excluded server-side too). */
export const CLEANABLE = ["media", "podcast", "audio", "uploads"];

class StorageService {
  async usage(): Promise<StorageUsage | null> {
    try {
      return await apiClient.get<StorageUsage>("/api/storage/usage");
    } catch {
      return null;
    }
  }

  async clean(category: string): Promise<number> {
    const data = await apiClient.post<{ freed_bytes: number }>(
      "/api/storage/clean",
      { category },
    );
    return data?.freed_bytes ?? 0;
  }

  async trashFile(path: string): Promise<string | null> {
    try {
      const data = await apiClient.post<{ trash_id: string }>(
        "/api/storage/trash",
        { path },
      );
      return data?.trash_id ?? null;
    } catch {
      return null;
    }
  }

  async restore(trashId: string): Promise<string | null> {
    try {
      const data = await apiClient.post<{ restored_path: string }>(
        `/api/storage/trash/${trashId}/restore`,
      );
      return data?.restored_path ?? null;
    } catch {
      return null;
    }
  }

  async emptyTrash(): Promise<number> {
    const data = await apiClient.post<{ freed_bytes: number }>(
      "/api/storage/trash/empty",
    );
    return data?.freed_bytes ?? 0;
  }
}

export const storageService = new StorageService();
