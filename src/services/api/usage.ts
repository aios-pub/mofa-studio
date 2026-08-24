/**
 * Usage & logs service (PLAT-15 用户面板「用量与日志」): reads span
 * metadata from the embedded backend and derives filters/summaries.
 * Spans are metadata-only by construction — no prompts or content.
 */

import { apiClient } from "../api/apiClient";

export interface UsageSpan {
  id: string;
  trace_kind: string;
  source: string;
  model: string;
  provider?: string | null;
  tokens_in?: number | null;
  tokens_out?: number | null;
  duration_ms: number;
  status: string;
  detail?: string | null;
  created_at: string;
}

export type SpanFilter = {
  source: string | "all";
  model: string | "all";
  status: string | "all";
  /** Inclusive, ISO date (YYYY-MM-DD); empty = no bound. */
  from: string;
  to: string;
};

export const DEFAULT_FILTER: SpanFilter = {
  source: "all",
  model: "all",
  status: "all",
  from: "",
  to: "",
};

export function filterSpans(spans: UsageSpan[], filter: SpanFilter): UsageSpan[] {
  return spans.filter((span) => {
    if (filter.source !== "all" && span.source !== filter.source) return false;
    if (filter.model !== "all" && span.model !== filter.model) return false;
    if (filter.status !== "all" && span.status !== filter.status) return false;
    // created_at is ISO-with-Z; compare on the date part lexicographically.
    const day = span.created_at.slice(0, 10);
    if (filter.from && day < filter.from) return false;
    if (filter.to && day > filter.to) return false;
    return true;
  });
}

export interface UsageSummary {
  calls: number;
  failures: number;
  tokensIn: number;
  tokensOut: number;
  avgDurationMs: number;
}

export function summarize(spans: UsageSpan[]): UsageSummary {
  const calls = spans.length;
  if (calls === 0) {
    return { calls: 0, failures: 0, tokensIn: 0, tokensOut: 0, avgDurationMs: 0 };
  }
  let failures = 0;
  let tokensIn = 0;
  let tokensOut = 0;
  let duration = 0;
  for (const span of spans) {
    if (span.status === "error") failures += 1;
    tokensIn += span.tokens_in ?? 0;
    tokensOut += span.tokens_out ?? 0;
    duration += span.duration_ms ?? 0;
  }
  return {
    calls,
    failures,
    tokensIn,
    tokensOut,
    avgDurationMs: Math.round(duration / calls),
  };
}

export interface ModelUsage {
  model: string;
  calls: number;
  tokens: number;
  failures: number;
}

export function byModel(spans: UsageSpan[]): ModelUsage[] {
  const map = new Map<string, ModelUsage>();
  for (const span of spans) {
    const entry = map.get(span.model) ?? {
      model: span.model,
      calls: 0,
      tokens: 0,
      failures: 0,
    };
    entry.calls += 1;
    entry.tokens += (span.tokens_in ?? 0) + (span.tokens_out ?? 0);
    if (span.status === "error") entry.failures += 1;
    map.set(span.model, entry);
  }
  return [...map.values()].sort((a, b) => b.calls - a.calls);
}

/** Distinct filter options derived from the data. */
export function distinctModels(spans: UsageSpan[]): string[] {
  return [...new Set(spans.map((s) => s.model))].sort();
}

class UsageService {
  async listSpans(): Promise<UsageSpan[]> {
    try {
      const data = await apiClient.get<UsageSpan[]>("/api/span/list");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
}

export const usageService = new UsageService();
