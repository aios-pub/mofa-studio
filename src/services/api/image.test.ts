/**
 * Tests for the image generation service: request mapping, data-URL
 * conversion, and the TOOL-04 export naming rule.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import { exportFilename, imageService } from "./image";

vi.mock("../api/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const mockedPost = vi.mocked(apiClient.post);

beforeEach(() => {
  mockedPost.mockReset();
});

describe("imageService.generate", () => {
  it("maps the request onto the OpenAI images body and returns data URLs", async () => {
    mockedPost.mockResolvedValueOnce({
      created: 1,
      data: [{ b64_json: "QUJD" }, { b64_json: "REVG" }],
      model_used: "mock/mock-image",
      provider: "mock",
    });

    const result = await imageService.generate({
      prompt: "一只橘猫",
      model: "mock/mock-image",
      n: 2,
      size: "1024x1024",
    });

    expect(mockedPost).toHaveBeenCalledWith("/v1/images/generations", {
      prompt: "一只橘猫",
      model: "mock/mock-image",
      n: 2,
      size: "1024x1024",
    });
    expect(result.images).toEqual([
      "data:image/png;base64,QUJD",
      "data:image/png;base64,REVG",
    ]);
    expect(result.model_used).toBe("mock/mock-image");
  });

  it("tolerates an empty data array", async () => {
    mockedPost.mockResolvedValueOnce({ created: 1, data: [] });
    const result = await imageService.generate({ prompt: "x" });
    expect(result.images).toEqual([]);
  });
});

describe("exportFilename (TOOL-04 naming rule)", () => {
  it("builds {prompt_slug}_{size}_{seq}.png", () => {
    expect(exportFilename("橘猫 坐在窗台上", "768x1024", 1)).toBe(
      "橘猫-坐在窗台上_768x1024_1.png",
    );
    expect(exportFilename("Hello, World!!", "1024x1024", 3)).toBe(
      "hello-world_1024x1024_3.png",
    );
  });

  it("falls back to a generic slug for prompt-only punctuation", () => {
    expect(exportFilename("!!!", "720x1280", 1)).toBe("image_720x1280_1.png");
  });

  it("caps the slug length", () => {
    const name = exportFilename("a".repeat(100), "1024x1024", 1);
    expect(name.length).toBeLessThan(60);
  });
});
