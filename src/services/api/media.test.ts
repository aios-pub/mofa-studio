/**
 * Tests for the media toolbox service: request mapping and presentation
 * helpers.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import {
  TRANSCODE_PROFILES,
  formatSize,
  mediaService,
  resultKind,
} from "./media";

vi.mock("../api/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const mockedPost = vi.mocked(apiClient.post);

beforeEach(() => {
  mockedPost.mockReset();
});

describe("mediaService", () => {
  it("uploads via multipart form", async () => {
    mockedPost.mockResolvedValueOnce({ path: "/tmp/x.png", size: 10 });
    const file = new File(["x"], "x.png", { type: "image/png" });
    const result = await mediaService.upload(file);
    expect(result.path).toBe("/tmp/x.png");
    const [, body] = mockedPost.mock.calls[0];
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("file")).toBe(file);
  });

  it("maps gif/transcode/compress requests", async () => {
    mockedPost.mockResolvedValue({ mime: "image/gif", data_url: "d", size: 1 });
    await mediaService.toGif("/v.mp4", 15, 640);
    expect(mockedPost).toHaveBeenLastCalledWith("/api/media/gif", {
      path: "/v.mp4",
      fps: 15,
      width: 640,
    });

    await mediaService.transcode("/v.mp4", "social_vertical");
    expect(mockedPost).toHaveBeenLastCalledWith("/api/media/transcode", {
      path: "/v.mp4",
      profile: "social_vertical",
    });

    await mediaService.compressImage("/i.png", 100, 5000);
    expect(mockedPost).toHaveBeenLastCalledWith("/api/media/compress-image", {
      path: "/i.png",
      target_kb: 100,
      original_size: 5000,
    });
  });
});

describe("presentation helpers", () => {
  it("TRANSCODE_PROFILES covers the four presets", () => {
    expect(TRANSCODE_PROFILES.map((p) => p.value)).toEqual([
      "web_1080",
      "web_720",
      "social_vertical",
      "gif_friendly",
    ]);
  });

  it("resultKind classifies by mime", () => {
    expect(resultKind("image/gif")).toBe("image");
    expect(resultKind("video/mp4")).toBe("video");
    expect(resultKind("application/octet-stream")).toBe("other");
  });

  it("formatSize renders human units", () => {
    expect(formatSize(512)).toBe("512 B");
    expect(formatSize(2048)).toBe("2.0 KB");
    expect(formatSize(3 * 1024 * 1024)).toBe("3.00 MB");
  });
});
