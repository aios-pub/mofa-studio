/**
 * Tests for the slash command registry (CHAT-09): slot extraction, palette
 * filtering, template filling, and persistence round-trips.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  SEED_COMMANDS,
  extractSlots,
  fillTemplate,
  filterCommands,
  loadCommands,
  makeCommand,
  saveCommands,
} from "./slashCommands";

describe("extractSlots", () => {
  it("collects unique placeholder names in order", () => {
    expect(extractSlots("把{{原文}}翻译成{{目标语言}}，风格{{风格}}/{{原文}}")).toEqual([
      "原文",
      "目标语言",
      "风格",
    ]);
  });

  it("tolerates whitespace inside placeholders", () => {
    expect(extractSlots("{{ 主题 }}")).toEqual(["主题"]);
  });

  it("no placeholders yields an empty list", () => {
    expect(extractSlots("普通文本")).toEqual([]);
  });
});

describe("makeCommand", () => {
  it("derives slots from the template", () => {
    const cmd = makeCommand("c1", "周报", "为{{项目}}生成本周进展，重点{{重点}}");
    expect(cmd.slots).toEqual(["项目", "重点"]);
  });
});

describe("filterCommands", () => {
  const commands = SEED_COMMANDS;

  it("empty query lists everything", () => {
    expect(filterCommands(commands, "/")).toHaveLength(commands.length);
    expect(filterCommands(commands, "")).toHaveLength(commands.length);
  });

  it("matches by name (case-insensitive)", () => {
    expect(filterCommands(commands, "/翻译")).toHaveLength(1);
    expect(filterCommands(commands, "/xiao")).toHaveLength(1);
  });

  it("no match yields empty", () => {
    expect(filterCommands(commands, "/不存在的指令")).toHaveLength(0);
  });
});

describe("fillTemplate", () => {
  it("replaces provided slots and keeps unfilled placeholders visible", () => {
    const filled = fillTemplate("把{{原文}}翻译成{{目标语言}}", {
      原文: "你好",
    });
    expect(filled).toBe("把你好翻译成{{目标语言}}");
  });

  it("empty values count as unfilled", () => {
    expect(fillTemplate("{{主题}}", { 主题: "" })).toBe("{{主题}}");
  });
});

describe("persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("seeds on first load", () => {
    const commands = loadCommands();
    expect(commands.length).toBeGreaterThanOrEqual(4);
    expect(commands.some((c) => c.name === "翻译")).toBe(true);
  });

  it("round-trips custom commands", () => {
    const custom = makeCommand("c-custom", "会议纪要", "整理{{会议内容}}为纪要");
    saveCommands([...loadCommands(), custom]);
    const reloaded = loadCommands();
    const found = reloaded.find((c) => c.id === "c-custom");
    expect(found?.slots).toEqual(["会议内容"]);
  });
});
