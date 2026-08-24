/**
 * Tests for the PPT service (TOOL-07): JSON extraction from LLM output,
 * outline normalization, theme packs, and the pptxgenjs slide mapping.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import {
  PPT_THEMES,
  extractJson,
  normalizeOutline,
  schemaToPptxSlides,
  themeById,
} from "./ppt";

vi.mock("../api/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const mockedPost = vi.mocked(apiClient.post);

beforeEach(() => {
  mockedPost.mockReset();
});

describe("extractJson", () => {
  it("parses fenced JSON", () => {
    const text = '好的，以下是结果：\n```json\n{"slides":[{"title":"封面"}]}\n```\n希望有帮助';
    expect(extractJson(text)).toEqual({ slides: [{ title: "封面" }] });
  });

  it("parses bare JSON embedded in prose", () => {
    const text = '结果是 {"title":"x"} 请查收';
    expect(extractJson<{ title: string }>(text).title).toBe("x");
  });

  it("throws a specific error when nothing parses", () => {
    expect(() => extractJson("完全没有 JSON")).toThrow("JSON");
  });
});

describe("normalizeOutline", () => {
  it("normalizes the slides envelope and caps pages", () => {
    const raw = {
      slides: Array.from({ length: 12 }, (_, i) => ({
        title: `页${i + 1}`,
        points: ["a", "b", "", 3 as unknown as string],
      })),
    };
    const outline = normalizeOutline(raw, 10);
    expect(outline).toHaveLength(10);
    expect(outline[0].points).toEqual(["a", "b", "3"]);
  });

  it("accepts a bare array and caps bullets at 6", () => {
    const outline = normalizeOutline(
      [{ title: "t", points: ["1", "2", "3", "4", "5", "6", "7", "8"] }],
      10,
    );
    expect(outline[0].points).toHaveLength(6);
  });

  it("rejects outlines with no usable slides", () => {
    expect(() => normalizeOutline([{ title: "", points: [] }], 10)).toThrow("大纲为空");
    expect(() => normalizeOutline({ slides: [] }, 10)).toThrow("大纲为空");
    // Mixed input keeps only titled slides.
    expect(normalizeOutline([{ title: "ok" }, { title: "" }], 10)).toEqual([
      { title: "ok", points: [] },
    ]);
  });
});

describe("theme packs (模板主题包 v1 ≥5)", () => {
  it("ships five distinct themes with valid hex colors", () => {
    expect(PPT_THEMES.length).toBeGreaterThanOrEqual(5);
    expect(new Set(PPT_THEMES.map((t) => t.id)).size).toBe(PPT_THEMES.length);
    for (const theme of PPT_THEMES) {
      expect(theme.primary).toMatch(/^[0-9A-F]{6}$/i);
      expect(theme.background).toMatch(/^[0-9A-F]{6}$/i);
      expect(theme.label.length).toBeGreaterThan(1);
    }
  });

  it("themeById falls back to the first theme", () => {
    expect(themeById("midnight").id).toBe("midnight");
    expect(themeById("nope").id).toBe(PPT_THEMES[0].id);
  });
});

describe("schemaToPptxSlides", () => {
  const schema = {
    title: "橘猫产品发布",
    slides: [
      { title: "封面", points: ["副标题", "关键结论"] },
      { title: "市场", points: ["a", "b"] },
      { title: "路线图", points: ["c"] },
    ],
  };

  it("first slide is a TITLE_SLIDE cover using the deck title", () => {
    const theme = themeById("clean-white");
    const defs = schemaToPptxSlides(schema, theme);
    expect(defs).toHaveLength(3);
    expect(defs[0].layout).toBe("TITLE_SLIDE");
    expect(defs[0].title).toBe("橘猫产品发布");
    expect(defs.slice(1).every((d) => d.layout === "TITLE_AND_CONTENT")).toBe(true);
    expect(defs[1].title).toBe("市场");
  });

  it("carries the theme colors and font", () => {
    const theme = themeById("midnight");
    const defs = schemaToPptxSlides(schema, theme);
    expect(defs[1].background).toBe("0F1B3D");
    expect(defs[1].bulletColor).toBe("EAF0FF");
    expect(defs[1].fontFace).toBe(theme.fontFace);
  });
});
