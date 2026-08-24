/**
 * Tests for the video task service: submit/status mapping, terminal
 * detection, polling behavior, and asset recording.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import type { VideoTask } from "./video";
import { isTerminal, videoService } from "./video";

vi.mock("../api/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);

function task(status: VideoTask["status"], overrides: Partial<VideoTask> = {}): VideoTask {
  return {
    task_id: "vt-1",
    status,
    prompt: "橘猫追激光笔",
    model: "mock/seedance",
    video: status === "succeeded" ? "data:video/mp4;base64,QUJD" : null,
    error: status === "failed" ? "vendor quota" : null,
    created_at: "2026-08-25T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
});

describe("isTerminal", () => {
  it("only succeeded/failed are terminal", () => {
    expect(isTerminal("queued")).toBe(false);
    expect(isTerminal("running")).toBe(false);
    expect(isTerminal("succeeded")).toBe(true);
    expect(isTerminal("failed")).toBe(true);
  });
});

describe("videoService", () => {
  it("submits with the task body", async () => {
    mockedPost.mockResolvedValueOnce({ task_id: "vt-9", status: "running" });
    await videoService.submit({ prompt: "x", size: "1280x720", duration: 5 });
    expect(mockedPost).toHaveBeenCalledWith(
      "/v1/videos/generations",
      expect.objectContaining({ prompt: "x", size: "1280x720", duration: 5 }),
    );
  });

  it("polls until terminal and reports every update", async () => {
    mockedGet
      .mockResolvedValueOnce(task("running"))
      .mockResolvedValueOnce(task("running"))
      .mockResolvedValueOnce(task("succeeded"));
    const updates: VideoTask["status"][] = [];
    const final = await videoService.pollUntilTerminal(
      "vt-1",
      (t) => updates.push(t.status),
      0,
      10,
    );
    expect(updates).toEqual(["running", "running", "succeeded"]);
    expect(final.status).toBe("succeeded");
    expect(mockedGet).toHaveBeenCalledTimes(3);
  });

  it("records succeeded clips as video assets", async () => {
    mockedPost.mockResolvedValueOnce({});
    await videoService.recordAsset(task("succeeded"));
    expect(mockedPost).toHaveBeenCalledWith(
      "/api/asset/create",
      expect.objectContaining({ type: "video", source: "studio", ref_path: expect.stringContaining("data:video/mp4") }),
    );
  });

  it("does not record failed or running tasks", async () => {
    await videoService.recordAsset(task("failed"));
    await videoService.recordAsset(task("running"));
    expect(mockedPost).not.toHaveBeenCalled();
  });
});
