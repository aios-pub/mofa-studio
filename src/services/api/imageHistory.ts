/**
 * Image generation history (TOOL-05): every run persists a full parameter
 * snapshot; entries restore into the generator, and any two can be
 * compared side-by-side. localStorage-backed and shared between the
 * generator page and the history page.
 */

import type { ImageGenHistoryEntry } from "./image";

export const HISTORY_KEY = "mofa-studio-image-history";
const HISTORY_LIMIT = 50;

export function listHistory(): ImageGenHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as ImageGenHistoryEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(entries: ImageGenHistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
  } catch {
    // Storage full/unavailable: history stays in-memory for this session.
  }
}

export function prependEntry(entry: ImageGenHistoryEntry): ImageGenHistoryEntry[] {
  const next = [entry, ...listHistory()];
  saveHistory(next);
  return next;
}

export function removeEntry(id: string): ImageGenHistoryEntry[] {
  const next = listHistory().filter((e) => e.id !== id);
  saveHistory(next);
  return next;
}

export function clearHistory(): void {
  saveHistory([]);
}

/**
 * 恢复参数 target: query params the generator consumes to prefill.
 * Same-seed reproduction needs provider seed support (degrade honestly:
 * this is parameter-level reproduction).
 */
export function restoreHref(entry: ImageGenHistoryEntry): string {
  const params = new URLSearchParams({
    prompt: entry.prompt,
    size: entry.size,
    run: "1",
  });
  if (entry.model) params.set("model", entry.model);
  return `/creation/image-gen?${params.toString()}`;
}

/** Entry completeness for the degrade path (元数据丢失时降级为手动参数). */
export function entryCompleteness(entry: ImageGenHistoryEntry): {
  complete: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!entry.prompt) missing.push("提示词");
  if (!entry.size) missing.push("尺寸");
  if (!entry.model) missing.push("模型");
  if (!entry.images?.length) missing.push("图片");
  return { complete: missing.length === 0, missing };
}
