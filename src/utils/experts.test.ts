/**
 * Tests for the expert card model (TASK-14): persona prompt building, card
 * export/import round trip, validation, and collection persistence.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  BUILTIN_EXPERTS,
  EXPERT_STORAGE_KEY,
  exportExpertJson,
  expertSystemPrompt,
  loadMyExperts,
  parseExpertJson,
  saveMyExperts,
  type Expert,
} from "./experts";

const card: Expert = {
  id: "expert-x",
  name: "测试专家",
  industry: "测试",
  persona: "你是测试专家，说话简短。",
  methodology: "先复述问题，再给答案。",
  tools: ["web_search"],
  avatar: "🧪",
  builtin: false,
};

beforeEach(() => {
  localStorage.clear();
});

describe("expertSystemPrompt", () => {
  it("composes persona and methodology into a leading system message", () => {
    const prompt = expertSystemPrompt(card);
    expect(prompt).toContain("「测试专家」");
    expect(prompt).toContain("你是测试专家");
    expect(prompt).toContain("先复述问题");
    expect(prompt).toContain("超出专业范围");
  });
});

describe("card share round trip", () => {
  it("exports and re-imports a card with a fresh id", () => {
    const json = exportExpertJson(card);
    const parsed = parseExpertJson(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.expert.name).toBe("测试专家");
    expect(parsed.expert.persona).toBe(card.persona);
    expect(parsed.expert.id).not.toBe(card.id);
    expect(parsed.expert.builtin).toBe(false);
  });

  it("rejects non-cards and cards without a persona", () => {
    expect(parseExpertJson("not json").ok).toBe(false);
    expect(parseExpertJson('{"foo":1}').ok).toBe(false);
    expect(
      parseExpertJson('{"mofa_expert":1,"expert":{"name":"无人设"}}').ok,
    ).toBe(false);
  });

  it("caps imported fields and sanitizes tools", () => {
    const exported = exportExpertJson({
      ...card,
      name: "长".repeat(50),
      tools: ["ok", 42 as unknown as string, "fine"],
    });
    const parsed = parseExpertJson(exported);
    expect(parsed.ok && parsed.expert.name.length).toBe(30);
    expect(parsed.ok && parsed.expert.tools).toEqual(["ok", "fine"]);
  });
});

describe("collection persistence", () => {
  it("saves and loads my experts; missing storage degrades to empty", () => {
    expect(loadMyExperts()).toEqual([]);
    saveMyExperts([card, { ...card, id: "expert-y" }]);
    expect(loadMyExperts()).toHaveLength(2);
    localStorage.removeItem(EXPERT_STORAGE_KEY);
    expect(loadMyExperts()).toEqual([]);
    localStorage.setItem(EXPERT_STORAGE_KEY, "{broken json");
    expect(loadMyExperts()).toEqual([]);
  });
});

describe("builtin catalog", () => {
  it("covers several industries with complete cards", () => {
    expect(BUILTIN_EXPERTS.length).toBeGreaterThanOrEqual(8);
    const industries = new Set(BUILTIN_EXPERTS.map((e) => e.industry));
    expect(industries.size).toBeGreaterThanOrEqual(6);
    for (const expert of BUILTIN_EXPERTS) {
      expect(expert.persona).toBeTruthy();
      expect(expert.methodology).toBeTruthy();
      expect(expert.builtin).toBe(true);
      expect(expert.avatar).toBeTruthy();
    }
  });
});
