/**
 * Long-term memory service (TASK-19): the four privacy powers over the
 * backend memory collection, plus retrieval for chat/task injection.
 */

import { apiClient } from "../api/apiClient";

export type MemoryKind = "preference" | "context" | "decision";

export interface MemoryEntry {
  id: string;
  content: string;
  kind: MemoryKind;
  created_at: string;
}

export const KIND_LABELS: Record<MemoryKind, string> = {
  preference: "偏好",
  context: "上下文",
  decision: "决策",
};

export const KIND_COLORS: Record<MemoryKind, string> = {
  preference: "blue",
  context: "green",
  decision: "purple",
};

class MemoryService {
  async list(): Promise<MemoryEntry[]> {
    try {
      const data = await apiClient.get<MemoryEntry[]>("/api/memory/list");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async status(): Promise<{ enabled: boolean; count: number }> {
    try {
      return await apiClient.get("/api/memory/status");
    } catch {
      return { enabled: true, count: 0 };
    }
  }

  async create(content: string, kind: MemoryKind): Promise<MemoryEntry | null> {
    try {
      return await apiClient.post<MemoryEntry>("/api/memory/create", { content, kind });
    } catch {
      return null;
    }
  }

  async update(id: string, content: string): Promise<MemoryEntry | null> {
    try {
      return await apiClient.put<MemoryEntry>(`/api/memory/${id}`, { content });
    } catch {
      return null;
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/api/memory/${id}`);
      return true;
    } catch {
      return false;
    }
  }

  async toggle(enabled: boolean): Promise<boolean> {
    try {
      await apiClient.post("/api/memory/toggle", { enabled });
      return true;
    } catch {
      return false;
    }
  }

  async retrieve(query: string, topK = 3): Promise<MemoryEntry[]> {
    try {
      const data = await apiClient.post<{ disabled: boolean; hits: MemoryEntry[] }>(
        "/api/memory/retrieve",
        { query, top_k: topK },
      );
      return data?.hits ?? [];
    } catch {
      return [];
    }
  }

  /** Build the memory injection system message for chat (null when empty). */
  buildInjection(entries: MemoryEntry[]): string | null {
    if (entries.length === 0) return null;
    const lines = entries.map((entry) => `-（${KIND_LABELS[entry.kind]}）${entry.content}`);
    return `以下是关于该用户的长期记忆，回答时自然参考但不要逐条复述：\n${lines.join("\n")}`;
  }
}

export const memoryService = new MemoryService();
