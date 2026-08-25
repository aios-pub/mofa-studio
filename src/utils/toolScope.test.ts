/**
 * Tests for TASK-10 (tool scope) and TASK-11 (conflict disambiguation):
 * palette gating, scope preselect defaults, and the preference > ask >
 * default-and-record ladder.
 */
import { beforeEach, describe, expect, it } from "vitest";
import type { SlashCommand } from "./slashCommands";
import {
  capabilitiesInScope,
  defaultScope,
  disambiguateTools,
  filterCommandsByScope,
  loadPreferences,
  recordPreference,
  savePreferences,
  type ToolCandidate,
} from "./toolScope";

const command = (name: string): SlashCommand => ({
  id: `cmd-${name}`,
  name,
  template: name,
  slots: [],
  builtin: true,
});

const COMMANDS = [command("翻译"), command("总结"), command("润色"), command("小红书")];

describe("TASK-10 tool scope", () => {
  it("null scope keeps every command", () => {
    expect(filterCommandsByScope(COMMANDS, null)).toHaveLength(4);
  });

  it("a pinned scope hides out-of-scope commands from the palette", () => {
    const scoped = filterCommandsByScope(COMMANDS, ["translate"]);
    expect(scoped.map((c) => c.name)).toEqual(["翻译"]);
    // Scoping to writing keeps both writing commands.
    const writing = filterCommandsByScope(COMMANDS, ["writing"]);
    expect(writing.map((c) => c.name).sort()).toEqual(["小红书", "润色"]);
  });

  it("the capability panel mirrors the scope", () => {
    expect(capabilitiesInScope(null).length).toBeGreaterThan(4);
    expect(capabilitiesInScope(["web_search", "image_gen"])).toEqual([
      "web_search",
      "image_gen",
    ]);
  });

  it("defaultScope preselects from the first message, capped at two", () => {
    expect(defaultScope("")).toBeNull();
    expect(defaultScope("你好")).toBeNull();
    expect(defaultScope("画一张海报")).toEqual(["image_gen"]);
    const busy = defaultScope("查一下最新新闻，画一张图，总结要点，翻译成英文");
    expect(busy!.length).toBeLessThanOrEqual(2);
    expect(busy![0]).toBe("web_search");
  });
});

const twoSearch: ToolCandidate[] = [
  { id: "connector:brave", name: "Brave 搜索", capability: "web_search" },
  { id: "builtin:tavily", name: "内置联网搜索", capability: "web_search" },
];

describe("TASK-11 disambiguation", () => {
  it("single candidate resolves without asking", () => {
    const result = disambiguateTools([twoSearch[0]], {});
    expect(result).toEqual({ action: "use", toolId: "connector:brave", reason: "only" });
  });

  it("recorded preference wins over candidate order", () => {
    const prefs = recordPreference({}, "web_search", "builtin:tavily");
    const result = disambiguateTools(twoSearch, prefs);
    expect(result).toEqual({ action: "use", toolId: "builtin:tavily", reason: "preference" });
  });

  it("without preference it asks instead of silently guessing", () => {
    const result = disambiguateTools(twoSearch, {});
    expect(result.action).toBe("ask");
    if (result.action === "ask") {
      expect(result.candidates).toHaveLength(2);
      expect(result.candidates.map((c) => c.id)).toContain("connector:brave");
    }
  });

  it("no conflicting capability → default to first and record", () => {
    const mixed: ToolCandidate[] = [
      { id: "a", name: "A", capability: "image" },
      { id: "b", name: "B", capability: "video" },
    ];
    expect(disambiguateTools(mixed, {})).toEqual({
      action: "use",
      toolId: "a",
      reason: "default",
    });
  });

  it("stale preference ids fall back to asking", () => {
    const result = disambiguateTools(twoSearch, { web_search: "gone" });
    expect(result.action).toBe("ask");
  });
});

describe("preferences persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("records, persists, and degrades safely", () => {
    expect(loadPreferences()).toEqual({});
    const prefs = recordPreference({ tts: "x" }, "web_search", "builtin:tavily");
    savePreferences(prefs);
    expect(loadPreferences()).toEqual({ tts: "x", web_search: "builtin:tavily" });
    localStorage.setItem("mofa-studio-tool-preferences", "{broken");
    expect(loadPreferences()).toEqual({});
  });
});
