/**
 * Tests for the storage service (PLAT-09): formatting and request mapping.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import { CLEANABLE, formatBytes, storageService } from "./storage";

vi.mock("../api/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
});

describe("formatBytes", () => {
  it("renders human units across the scale", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
    expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe("2.50 GB");
  });
});

describe("CLEANABLE", () => {
  it("excludes the database category", () => {
    expect(CLEANABLE).toEqual(["media", "podcast", "audio", "uploads"]);
    expect(CLEANABLE).not.toContain("database");
  });
});

describe("storageService", () => {
  it("usage reads fail-soft to null", async () => {
    mockedGet.mockResolvedValueOnce({
      total_bytes: 100,
      categories: [],
      trash: [],
    });
    expect(await storageService.usage()).toMatchObject({ total_bytes: 100 });
    mockedGet.mockRejectedValueOnce(new Error("down"));
    expect(await storageService.usage()).toBeNull();
  });

  it("clean posts the category and returns freed bytes", async () => {
    mockedPost.mockResolvedValueOnce({ freed_bytes: 4096 });
    expect(await storageService.clean("media")).toBe(4096);
    expect(mockedPost).toHaveBeenCalledWith("/api/storage/clean", {
      category: "media",
    });
  });

  it("trash/restore/empty map their endpoints", async () => {
    mockedPost.mockResolvedValueOnce({ trash_id: "trash-1" });
    expect(await storageService.trashFile("/x.mp3")).toBe("trash-1");
    expect(mockedPost).toHaveBeenCalledWith("/api/storage/trash", {
      path: "/x.mp3",
    });

    mockedPost.mockResolvedValueOnce({ restored_path: "/restored" });
    expect(await storageService.restore("trash-1")).toBe("/restored");
    expect(mockedPost).toHaveBeenCalledWith("/api/storage/trash/trash-1/restore");

    mockedPost.mockResolvedValueOnce({ freed_bytes: 100 });
    expect(await storageService.emptyTrash()).toBe(100);
    expect(mockedPost).toHaveBeenCalledWith("/api/storage/trash/empty");
  });

  it("trash failures resolve null", async () => {
    mockedPost.mockRejectedValueOnce(new Error("nope"));
    expect(await storageService.trashFile("/x")).toBeNull();
    expect(await storageService.restore("trash-x")).toBeNull();
  });
});
