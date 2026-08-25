/**
 * Tests for the research service (TOOL-09): tier table, polling, and
 * report download naming.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import type { ResearchStatus } from "./research";
import {
  PHASE_LABELS,
  RESEARCH_TIERS,
  researchService,
  tierInfo,
} from "./research";

vi.mock("../api/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);

function status(phase: ResearchStatus["phase"]): ResearchStatus {
  return {
    phase,
    topic: "橘猫",
    tier: "quick",
    queries: [{ query: "橘猫 习性", results: 3 }],
    sources: 3,
    report_md: phase === "done" ? "# 报告 [1]" : null,
  };
}

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
});

describe("RESEARCH_TIERS (档位与成本预估)", () => {
  it("matches the PRD tiers: 3 / 8 / 15 sources", () => {
    expect(RESEARCH_TIERS.map((t) => t.sources)).toEqual([3, 8, 15]);
    for (const tier of RESEARCH_TIERS) {
      expect(tier.estimatedTokens).toBeGreaterThan(0);
      expect(tier.label).toContain(String(tier.sources));
    }
  });

  it("estimates grow with tier depth", () => {
    expect(RESEARCH_TIERS[2].estimatedTokens).toBeGreaterThan(
      RESEARCH_TIERS[1].estimatedTokens,
    );
    expect(tierInfo("quick").sources).toBe(3);
  });

  it("tierInfo falls back to standard", () => {
    expect(tierInfo("nope" as never).value).toBe("standard");
  });
});

describe("PHASE_LABELS", () => {
  it("labels every phase in Chinese", () => {
    expect(PHASE_LABELS.planning).toContain("规划");
    expect(PHASE_LABELS.searching).toContain("检索");
    expect(PHASE_LABELS.synthesizing).toContain("报告");
    expect(PHASE_LABELS.failed).toBe("失败");
  });
});

describe("researchService", () => {
  it("starts with topic+tier and receives the estimate", async () => {
    mockedPost.mockResolvedValueOnce({
      research_id: "rs-1",
      tier: "deep",
      sources_target: 15,
      estimated_tokens: 9400,
    });
    const result = await researchService.start("量子计算", "deep");
    expect(mockedPost).toHaveBeenCalledWith("/api/research/start", {
      topic: "量子计算",
      tier: "deep",
    });
    expect(result.estimated_tokens).toBe(9400);
  });

  it("polls until terminal with per-poll updates", async () => {
    mockedGet
      .mockResolvedValueOnce(status("planning"))
      .mockResolvedValueOnce(status("searching"))
      .mockResolvedValueOnce(status("done"));
    const phases: string[] = [];
    const final = await researchService.pollUntilTerminal("rs-1", (s) => phases.push(s.phase), 0, 10);
    expect(phases).toEqual(["planning", "searching", "done"]);
    expect(final.report_md).toContain("[1]");
  });

  it("report download uses the topic as the filename", () => {
    const link = { click: vi.fn(), href: "", download: "" };
    const creator = vi.fn().mockReturnValue(link);
    vi.stubGlobal("document", {
      createElement: () => link,
    });
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn().mockReturnValue("blob:x"),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal("Blob", class {
      size = 0;
      type = "";
      arrayBuffer = async () => new ArrayBuffer(0);
    });
    researchService.downloadReport("# x", "量子计算综述");
    expect(link.download).toBe("量子计算综述.md");
    expect(link.click).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
