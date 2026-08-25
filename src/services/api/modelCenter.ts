/**
 * Model center service (FLOW-05): engine model listing (cloud BYOK track)
 * and the local Ollama track — pulls with progress, disk accounting,
 * deletion.
 */

import { apiClient } from "../api/apiClient";

export interface LocalModel {
  name: string;
  size_bytes: number;
  modified_at?: string;
}

export interface LocalStorage {
  models: LocalModel[];
  total_bytes: number;
}

export interface PullTask {
  id: string;
  name: string;
  status: "pulling" | "done" | "error" | "cancelled";
  percent?: number | null;
  detail?: string | null;
}

export class ModelCenterService {
  async localStorage(): Promise<LocalStorage | null> {
    try {
      const data = await apiClient.get<{ data?: LocalStorage }>("/api/models/storage");
      return {
        models: data?.data?.models ?? [],
        total_bytes: data?.data?.total_bytes ?? 0,
      };
    } catch {
      // Ollama absent: the page shows the honest setup hint.
      return null;
    }
  }

  async pulls(): Promise<PullTask[]> {
    try {
      const data = await apiClient.get<{ data?: PullTask[] }>("/api/models/pulls");
      return data?.data ?? [];
    } catch {
      return [];
    }
  }

  /** Start a pull; returns the task id for progress polling. */
  async pull(name: string): Promise<string | null> {
    try {
      const data = await apiClient.post<{ data?: { id?: string } }>(
        "/api/models/pulls",
        { name },
      );
      return data?.data?.id ?? null;
    } catch {
      return null;
    }
  }

  async cancel(pullId: string): Promise<void> {
    try {
      await apiClient.post(`/api/models/pull/${pullId}/cancel`, {});
    } catch {
      // Cancelling a finished task is a no-op server-side; ignore.
    }
  }

  async delete(name: string): Promise<boolean> {
    try {
      await apiClient.post("/api/models/delete", { name });
      return true;
    } catch {
      return false;
    }
  }
}

export const modelCenterService = new ModelCenterService();

/** Human-readable byte size (二进制单位，中文语境常见). */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exp = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / 1024 ** exp;
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[exp]}`;
}
