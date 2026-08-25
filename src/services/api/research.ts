/**
 * Deep research service (TOOL-09): tiers with token estimates, run
 * polling with the query progress tree, and report download.
 */

import { apiClient } from "../api/apiClient";

export type ResearchTier = "quick" | "standard" | "deep";

export interface TierInfo {
  value: ResearchTier;
  label: string;
  sources: number;
  /** Upfront token estimate for the tier (BYOK). */
  estimatedTokens: number;
}

/** Client-side mirror of the backend tier table. */
export const RESEARCH_TIERS: TierInfo[] = [
  { value: "quick", label: "快速 · 3 源", sources: 3, estimatedTokens: 2200 },
  { value: "standard", label: "标准 · 8 源", sources: 8, estimatedTokens: 5200 },
  { value: "deep", label: "深入 · 15 源", sources: 15, estimatedTokens: 9400 },
];

export function tierInfo(tier: ResearchTier): TierInfo {
  return RESEARCH_TIERS.find((t) => t.value === tier) ?? RESEARCH_TIERS[1];
}

export interface ResearchQueryProgress {
  query: string;
  results: number;
}

export type ResearchPhase =
  | "planning"
  | "searching"
  | "synthesizing"
  | "done"
  | "failed";

export const PHASE_LABELS: Record<ResearchPhase, string> = {
  planning: "规划检索路径…",
  searching: "检索中…",
  synthesizing: "综合撰写报告…",
  done: "已完成",
  failed: "失败",
};

export interface ResearchStatus {
  phase: ResearchPhase;
  topic: string;
  tier: string;
  queries: ResearchQueryProgress[];
  sources: number;
  report_md?: string | null;
  error?: string | null;
}

export interface ResearchStartResult {
  research_id: string;
  tier: string;
  sources_target: number;
  estimated_tokens: number;
}

class ResearchService {
  async start(topic: string, tier: ResearchTier): Promise<ResearchStartResult> {
    return apiClient.post<ResearchStartResult>("/api/research/start", {
      topic,
      tier,
    });
  }

  async status(researchId: string): Promise<ResearchStatus> {
    return apiClient.get<ResearchStatus>(`/api/research/${researchId}`);
  }

  /** Poll until a terminal phase; onUpdate fires per poll. */
  async pollUntilTerminal(
    researchId: string,
    onUpdate: (status: ResearchStatus) => void,
    intervalMs = 2000,
    maxPolls = 300,
  ): Promise<ResearchStatus> {
    for (let i = 0; i < maxPolls; i += 1) {
      const status = await this.status(researchId);
      onUpdate(status);
      if (status.phase === "done" || status.phase === "failed") return status;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return this.status(researchId);
  }

  downloadReport(markdown: string, topic: string): void {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${topic.slice(0, 30) || "research"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

export const researchService = new ResearchService();
