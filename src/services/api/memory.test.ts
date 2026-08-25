/**
 * Tests for the memory service (TASK-19): endpoint mapping, fail-soft,
 * and the chat injection builder.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import type { MemoryEntry } from "./memory";
import { KIND_LABELS, memoryService } from "./memory";

vi.mock("../api/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);
const mockedPut = vi.mocked(apiClient.put);
const mockedDelete = vi.mocked(apiClient.delete);

function entry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: "mem-1",
    content: "偏好简洁回复",
    kind: "preference",
    created_at: "2026-08-25T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
  mockedPut.mockReset();
  mockedDelete.mockReset();
});

describe("memoryService", () => {
  it("list/status read fail-soft", async () => {
    mockedGet.mockResolvedValueOnce([entry()]);
    expect(await memoryService.list()).toHaveLength(1);
    mockedGet.mockRejectedValueOnce(new Error("x"));
    expect(await memoryService.list()).toEqual([]);

    mockedGet.mockResolvedValueOnce({ enabled: false, count: 3 });
    expect(await memoryService.status()).toEqual({ enabled: false, count: 3 });
  });

  it("create/update/remove/toggle map their endpoints", async () => {
    mockedPost.mockResolvedValueOnce(entry());
    await memoryService.create("偏好", "preference");
    expect(mockedPost).toHaveBeenCalledWith("/api/memory/create", {
      content: "偏好",
      kind: "preference",
    });

    mockedPut.mockResolvedValueOnce(entry({ content: "新内容" }));
    await memoryService.update("mem-1", "新内容");
    expect(mockedPut).toHaveBeenCalledWith("/api/memory/mem-1", { content: "新内容" });

    mockedDelete.mockResolvedValueOnce(undefined);
    expect(await memoryService.remove("mem-1")).toBe(true);

    mockedPost.mockResolvedValueOnce({ enabled: false });
    expect(await memoryService.toggle(false)).toBe(true);
    expect(mockedPost).toHaveBeenCalledWith("/api/memory/toggle", { enabled: false });
  });

  it("retrieve maps and fails soft", async () => {
    mockedPost.mockResolvedValueOnce({ disabled: false, hits: [entry()] });
    expect(await memoryService.retrieve("偏好", 3)).toHaveLength(1);
    expect(mockedPost).toHaveBeenCalledWith("/api/memory/retrieve", {
      query: "偏好",
      top_k: 3,
    });
    mockedPost.mockRejectedValueOnce(new Error("x"));
    expect(await memoryService.retrieve("x")).toEqual([]);
  });
});

describe("buildInjection", () => {
  it("formats entries with kind labels", () => {
    const injection = memoryService.buildInjection([
      entry(),
      entry({ id: "mem-2", content: "项目背景：周报", kind: "context" }),
    ])!;
    expect(injection).toContain("（偏好）偏好简洁回复");
    expect(injection).toContain("（上下文）项目背景：周报");
    expect(injection).toContain("长期记忆");
  });

  it("empty entries yield null (no injection)", () => {
    expect(memoryService.buildInjection([])).toBeNull();
  });

  it("kind labels cover the three categories", () => {
    expect(KIND_LABELS.decision).toBe("决策");
  });
});
