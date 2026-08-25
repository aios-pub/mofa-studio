/**
 * Tests for the task workbench service (M3): label maps, progress math,
 * and endpoint mapping.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import type { Project } from "./task";
import {
  PHASE_LABELS,
  STEP_STATUS_LABELS,
  STRATEGY_LABELS,
  projectProgress,
  taskService,
} from "./task";

vi.mock("../api/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    title: "周报",
    goal: "汇总",
    output_format: "markdown",
    phase: "executing",
    steps: [
      { id: "s1", title: "a", prompt: "p", strategy: "direct", status: "done" },
      { id: "s2", title: "b", prompt: "p", strategy: "direct", status: "pending" },
    ],
    created_at: "2026-08-25T00:00:00Z",
    updated_at: "2026-08-25T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
});

describe("label maps", () => {
  it("phases and statuses carry Chinese labels", () => {
    expect(PHASE_LABELS.delivered).toBe("已交付");
    expect(PHASE_LABELS.review).toBe("评审中");
    expect(STEP_STATUS_LABELS.awaiting_review).toBe("待评审");
    expect(STEP_STATUS_LABELS.rework).toBe("返工");
    expect(STRATEGY_LABELS.review_required).toBe("需评审");
  });
});

describe("projectProgress", () => {
  it("counts settled steps over total", () => {
    expect(projectProgress(project())).toBeCloseTo(0.5);
    expect(projectProgress(project({ steps: [] }))).toBe(0);
  });

  it("review and failed count as settled", () => {
    const p = project({
      steps: [
        { id: "s1", title: "a", prompt: "p", strategy: "review_required", status: "awaiting_review" },
        { id: "s2", title: "b", prompt: "p", strategy: "direct", status: "failed" },
        { id: "s3", title: "c", prompt: "p", strategy: "direct", status: "pending" },
      ],
    });
    expect(projectProgress(p)).toBeCloseTo(2 / 3);
  });
});

describe("taskService", () => {
  it("create posts the 立项三要素", async () => {
    mockedPost.mockResolvedValueOnce(project());
    await taskService.create({ title: "T", goal: "G", output_format: "word" });
    expect(mockedPost).toHaveBeenCalledWith("/api/task/project/create", {
      title: "T",
      goal: "G",
      output_format: "word",
    });
  });

  it("list reads fail-soft", async () => {
    mockedGet.mockResolvedValueOnce([{ id: "p1" }]);
    expect(await taskService.list()).toHaveLength(1);
    mockedGet.mockRejectedValueOnce(new Error("down"));
    expect(await taskService.list()).toEqual([]);
  });

  it("detail/review/retry map their endpoints", async () => {
    mockedGet.mockResolvedValueOnce(project());
    expect(await taskService.detail("p1")).toMatchObject({ id: "p1" });

    mockedPost.mockResolvedValueOnce(project());
    await taskService.review("p1", "s1", false);
    expect(mockedPost).toHaveBeenCalledWith("/api/task/project/p1/review/s1", {
      approve: false,
    });

    mockedPost.mockResolvedValueOnce(project());
    await taskService.retry("p1", "s1");
    expect(mockedPost).toHaveBeenCalledWith("/api/task/project/p1/retry/s1");
  });

  it("run posts with a nullable model", async () => {
    mockedPost.mockResolvedValueOnce({
      status: "awaiting_review",
      project: project(),
    });
    await taskService.run("p1");
    expect(mockedPost).toHaveBeenCalledWith("/api/task/project/p1/run", {
      model: null,
    });
  });

  it("setPlan posts the strategy-mapped steps", async () => {
    mockedPost.mockResolvedValueOnce(project());
    await taskService.setPlan("p1", [
      { title: "t", prompt: "p", strategy: "review_required" },
    ]);
    expect(mockedPost).toHaveBeenCalledWith("/api/task/project/p1/plan", {
      steps: [{ title: "t", prompt: "p", strategy: "review_required" }],
    });
  });
});
