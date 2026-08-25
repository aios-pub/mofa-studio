/**
 * Tests for the image service edit path (TOOL-01 垫图/局部重绘): multipart
 * field mapping over /v1/images/edits — one image part per reference, mask
 * only when painted, and the data-URL mapping shared with generate().
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import { imageService } from "./image";

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
