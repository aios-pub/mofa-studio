/**
 * Tests for usage analytics over span metadata (PLAT-15): filtering,
 * summaries, model breakdowns, and fail-soft listing.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import type { UsageSpan } from "./usage";
import {
  DEFAULT_FILTER,
  byModel,
  distinctModels,
  filterSpans,
  summarize,
  usageService,
} from "./usage";

vi.mock("../api/apiClient", () => ({
  apiClient: { get: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);

function span(partial: Partial<UsageSpan>): UsageSpan {
  return {
    id: `span-${Math.random().toString(36).slice(2)}`,
    trace_kind: "llm_call",
    source: "chat",
    model: "mock/mock-chat",
    tokens_in: 10,
    tokens_out: 20,
    duration_ms: 100,
    status: "ok",
    created_at: "2026-08-25T10:00:00.000Z",
    ...partial,
  };
}

beforeEach(() => {
  mockedGet.mockReset();
});

describe("filterSpans", () => {
  const spans = [
    span({ source: "chat", model: "a/m", status: "ok", created_at: "2026-08-24T08:00:00Z" }),
    span({ source: "studio", model: "b/m", status: "error", created_at: "2026-08-25T09:00:00Z" }),
    span({ source: "chat", model: "b/m", status: "ok", created_at: "2026-08-26T12:00:00Z" }),
  ];

  it("all-filter returns everything", () => {
    expect(filterSpans(spans, DEFAULT_FILTER)).toHaveLength(3);
  });

  it("filters by source, model, and status", () => {
    expect(filterSpans(spans, { ...DEFAULT_FILTER, source: "chat" })).toHaveLength(2);
    expect(filterSpans(spans, { ...DEFAULT_FILTER, model: "b/m" })).toHaveLength(2);
    expect(filterSpans(spans, { ...DEFAULT_FILTER, status: "error" })).toHaveLength(1);
    expect(
      filterSpans(spans, { ...DEFAULT_FILTER, source: "studio", status: "error" }),
    ).toHaveLength(1);
  });

  it("date bounds are inclusive on both ends", () => {
    expect(filterSpans(spans, { ...DEFAULT_FILTER, from: "2026-08-25" })).toHaveLength(2);
    expect(
      filterSpans(spans, { ...DEFAULT_FILTER, from: "2026-08-25", to: "2026-08-25" }),
    ).toHaveLength(1);
    expect(filterSpans(spans, { ...DEFAULT_FILTER, to: "2026-08-24" })).toHaveLength(1);
  });
});

describe("summarize", () => {
  it("aggregates calls, failures, tokens, and average duration", () => {
    const summary = summarize([
      span({ tokens_in: 10, tokens_out: 20, duration_ms: 100 }),
      span({ tokens_in: 1, tokens_out: 2, duration_ms: 300, status: "error" }),
      span({ tokens_in: 0, tokens_out: 0, duration_ms: 200 }),
    ]);
    expect(summary).toEqual({
      calls: 3,
      failures: 1,
      tokensIn: 11,
      tokensOut: 22,
      avgDurationMs: 200,
    });
  });

  it("empty input yields zeros", () => {
    expect(summarize([])).toEqual({
      calls: 0,
      failures: 0,
      tokensIn: 0,
      tokensOut: 0,
      avgDurationMs: 0,
    });
  });
});

describe("byModel", () => {
  it("groups and sorts by call count", () => {
    const rows = byModel([
      span({ model: "a/m" }),
      span({ model: "b/m" }),
      span({ model: "b/m", status: "error" }),
    ]);
    expect(rows[0]).toEqual({ model: "b/m", calls: 2, tokens: 60, failures: 1 });
    expect(rows[1].model).toBe("a/m");
  });

  it("distinctModels lists unique sorted models", () => {
    expect(distinctModels([span({ model: "b/m" }), span({ model: "a/m" })])).toEqual([
      "a/m",
      "b/m",
    ]);
  });
});

describe("usageService.listSpans", () => {
  it("lists and fails soft", async () => {
    mockedGet.mockResolvedValueOnce([span({})]);
    expect(await usageService.listSpans()).toHaveLength(1);
    mockedGet.mockRejectedValueOnce(new Error("down"));
    expect(await usageService.listSpans()).toEqual([]);
  });
});
