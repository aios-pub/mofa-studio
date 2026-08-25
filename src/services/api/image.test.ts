/**
 * Tests for the image service: generate() request mapping and the TOOL-04
 * export naming rule, plus the edit path (TOOL-01 垫图/局部重绘) — multipart
 * field mapping over /v1/images/edits with one image part per reference and
 * a mask only when painted.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import { exportFilename, imageService } from "./image";

vi.mock("../api/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedPost = vi.mocked(apiClient.post);

afterEach(() => {
  vi.clearAllMocks();
});

describe("imageService.edit", () => {
  it("posts one image part per reference with ordered filenames", async () => {
    mockedPost.mockResolvedValueOnce({
      created: 1,
      data: [{ b64_json: "QUJD" }],
      model_used: "mock/mock-edit",
      masked: false,
    });
    const blob = () => new Blob(["x"], { type: "image/png" });

    const result = await imageService.edit({
      prompt: "整体改成水彩风格",
      images: [blob(), blob(), blob()],
      model: "mock/mock-edit",
      size: "1024x1024",
      n: 2,
    });

    const [url, body] = mockedPost.mock.calls[0];
    expect(url).toBe("/v1/images/edits");
    expect(body).toBeInstanceOf(FormData);
    const form = body as FormData;
    const images = form.getAll("image") as File[];
    expect(images).toHaveLength(3);
    // First is the edited base, the rest are consistency anchors.
    expect(images.map((f) => f.name)).toEqual([
      "input.png",
      "reference-1.png",
      "reference-2.png",
    ]);
    expect(form.get("prompt")).toBe("整体改成水彩风格");
    expect(form.get("model")).toBe("mock/mock-edit");
    expect(form.get("size")).toBe("1024x1024");
    expect(form.get("n")).toBe("2");
    expect(form.get("mask")).toBeNull();
    expect(result.images).toEqual(["data:image/png;base64,QUJD"]);
    expect(result.masked).toBe(false);
  });

  it("appends the mask blob when painting a region", async () => {
    mockedPost.mockResolvedValueOnce({
      created: 1,
      data: [{ b64_json: "RElO" }],
      masked: true,
    });
    const mask = new Blob(["mask"], { type: "image/png" });

    await imageService.edit({
      prompt: "把天空换成夜景",
      images: [new Blob(["base"], { type: "image/png" })],
      mask,
    });

    const form = mockedPost.mock.calls[0][1] as FormData;
    expect(form.getAll("image")).toHaveLength(1);
    const maskFile = form.get("mask") as File;
    expect(maskFile.name).toBe("mask.png");
  });

  it("omits optional fields entirely (no empty strings)", async () => {
    mockedPost.mockResolvedValueOnce({ created: 1, data: [{ b64_json: "QQ==" }] });
    await imageService.edit({
      prompt: "p",
      images: [new Blob(["b"], { type: "image/png" })],
    });
    const form = mockedPost.mock.calls[0][1] as FormData;
    expect(form.has("model")).toBe(false);
    expect(form.has("size")).toBe(false);
    expect(form.has("n")).toBe(false);
    expect(form.has("mask")).toBe(false);
  });
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
