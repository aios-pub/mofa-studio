/**
 * Tests for the image history store (TOOL-05): persistence round-trips,
 * caps, removal, restore targets, and the metadata-degrade check.
 */
import { beforeEach, describe, expect, it } from "vitest";
import type { ImageGenHistoryEntry } from "./image";
import {
  HISTORY_KEY,
  clearHistory,
  entryCompleteness,
  listHistory,
  prependEntry,
  removeEntry,
  restoreHref,
} from "./imageHistory";

function entry(id: string, overrides: Partial<ImageGenHistoryEntry> = {}): ImageGenHistoryEntry {
  return {
    id,
    prompt: `prompt-${id}`,
    model: "mock/mock-image",
    n: 1,
    size: "1024x1024",
    created_at: "2026-08-25T00:00:00Z",
    images: ["data:image/png;base64,QUJD"],
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("imageHistory store", () => {
  it("persists and reloads entries", () => {
    prependEntry(entry("a"));
    prependEntry(entry("b"));
    const history = listHistory();
    expect(history.map((e) => e.id)).toEqual(["b", "a"]);
    expect(localStorage.getItem(HISTORY_KEY)).toContain("prompt-b");
  });

  it("caps stored history at 50 entries", () => {
    for (let i = 0; i < 55; i += 1) {
      prependEntry(entry(`e${i}`));
    }
    expect(listHistory()).toHaveLength(50);
    expect(listHistory()[0].id).toBe("e54");
  });

  it("removes a single entry and clears all", () => {
    prependEntry(entry("a"));
    prependEntry(entry("b"));
    expect(removeEntry("a").map((e) => e.id)).toEqual(["b"]);
    clearHistory();
    expect(listHistory()).toEqual([]);
  });

  it("corrupt storage degrades to empty", () => {
    localStorage.setItem(HISTORY_KEY, "{not json");
    expect(listHistory()).toEqual([]);
  });
});

describe("restoreHref (恢复参数)", () => {
  it("encodes prompt/size/model with run=1", () => {
    const href = restoreHref(entry("x", { prompt: "橘猫", size: "768x1024" }));
    expect(href).toBe("/creation/image-gen?prompt=%E6%A9%98%E7%8C%AB&size=768x1024&run=1&model=mock%2Fmock-image");
  });

  it("omits model when the entry lacks it", () => {
    const href = restoreHref(entry("x", { model: "" }));
    expect(href).not.toContain("model=");
  });
});

describe("entryCompleteness (元数据降级)", () => {
  it("complete entries report no gaps", () => {
    expect(entryCompleteness(entry("x"))).toEqual({ complete: true, missing: [] });
  });

  it("missing fields are listed for the manual-params degrade path", () => {
    const result = entryCompleteness(entry("x", { prompt: "", model: "", images: [] }));
    expect(result.complete).toBe(false);
    expect(result.missing).toContain("提示词");
    expect(result.missing).toContain("模型");
    expect(result.missing).toContain("图片");
  });
});
