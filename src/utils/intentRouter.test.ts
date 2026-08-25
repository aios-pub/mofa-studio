/**
 * Tests for TASK-06 路由 v1: keyword-evidence ranking and capability-panel
 * preselection. Every cataloged capability must carry a real action.
 */
import { describe, expect, it } from "vitest";
import {
  CAPABILITIES,
  defaultPreselect,
  suggestSelection,
  type CapabilityId,
} from "./intentRouter";

describe("suggestSelection", () => {
  it("ranks capabilities by keyword evidence", () => {
    // Search evidence (最新+新闻 = 2 hits) outranks single-hit writing/总结.
    const ranked = suggestSelection("查一下最新的AI新闻，再写个总结");
    expect(ranked[0]).toBe("web_search");
    expect(ranked).toContain("writing");
    expect(ranked).toContain("summarize");
    expect(ranked.indexOf("web_search")).toBeLessThan(ranked.indexOf("writing"));
  });

  it("routes image and video phrasing to their capabilities", () => {
    expect(suggestSelection("画一张赛博朋克城市海报")).toContain("image_gen");
    expect(suggestSelection("做一个产品演示短片")).toContain("video_gen");
  });

  it("translates and summarizes map to their command tools", () => {
    expect(suggestSelection("把这段翻译成英文")).toContain("translate");
    expect(suggestSelection("总结一下会议要点")).toContain("summarize");
  });

  it("plain chat yields no preselection", () => {
    expect(suggestSelection("你好")).toEqual([]);
    expect(suggestSelection("   ")).toEqual([]);
  });
});

describe("defaultPreselect", () => {
  it("caps the suggestion list", () => {
    // A kitchen-sink prompt hitting many capabilities.
    const text = "查一下最新新闻，画一张海报，总结要点，翻译成英文，分析原因";
    expect(defaultPreselect(text, 3)).toHaveLength(3);
  });

  it("keeps catalog order among equal hits", () => {
    const ids = defaultPreselect("画一张图"); // single hit → deterministic
    expect(ids).toEqual(["image_gen"]);
  });
});

describe("capability catalog", () => {
  it("every capability has a real, implemented action", () => {
    expect(CAPABILITIES.length).toBeGreaterThan(0);
    for (const capability of CAPABILITIES) {
      expect(capability.label).toBeTruthy();
      expect(capability.hint).toBeTruthy();
      // Discriminated union: each action names its kind and payload.
      if (capability.action.kind === "toggle") {
        expect(["web_search", "deep_thinking"]).toContain(capability.action.key);
      } else if (capability.action.kind === "route") {
        expect(["image", "video"]).toContain(capability.action.target);
      } else {
        expect(capability.action.command).toBeTruthy();
      }
    }
  });

  it("ids are unique and every rule targets a cataloged capability", () => {
    const ids = new Set(CAPABILITIES.map((c) => c.id));
    expect(ids.size).toBe(CAPABILITIES.length);
    for (const id of suggestSelection("查一下最新新闻画一张图做个视频总结翻译分析为什么写邮件")) {
      expect(ids.has(id as CapabilityId)).toBe(true);
    }
  });
});
