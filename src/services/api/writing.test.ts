/**
 * Tests for the AI writing service: genre templates, prompt construction
 * for drafts and transforms, and the CJK-aware word counter.
 */
import { describe, expect, it } from "vitest";
import {
  GENRE_TEMPLATES,
  buildDraftMessages,
  buildTransformMessages,
  countWords,
  genreById,
} from "./writing";

describe("genre templates", () => {
  it("ships the four M1 genres with prompts and limits", () => {
    expect(GENRE_TEMPLATES.map((g) => g.id)).toEqual([
      "xiaohongshu",
      "wechat",
      "review",
      "script",
    ]);
    for (const genre of GENRE_TEMPLATES) {
      expect(genre.systemPrompt.length).toBeGreaterThan(20);
      expect(genre.limitHint).toContain("字");
      expect(genre.targetLength).toBeGreaterThan(0);
    }
  });

  it("resolves genres by id", () => {
    expect(genreById("wechat")?.label).toBe("公众号文章");
    expect(genreById("nope")).toBeUndefined();
  });
});

describe("buildDraftMessages", () => {
  it("combines the genre system prompt with topic and length target", () => {
    const messages = buildDraftMessages("xiaohongshu", "露营装备", "加一点幽默");
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("小红书");
    expect(messages[1].content).toContain("主题：露营装备");
    expect(messages[1].content).toContain("约 300 字");
    expect(messages[1].content).toContain("补充要求：加一点幽默");
  });

  it("falls back to the first genre for unknown ids", () => {
    const messages = buildDraftMessages("nope", "主题");
    expect(messages[0].content).toBe(GENRE_TEMPLATES[0].systemPrompt);
  });

  it("omits the requirements line when empty", () => {
    const messages = buildDraftMessages("script", "主题", "  ");
    expect(messages[1].content).not.toContain("补充要求");
  });
});

describe("buildTransformMessages", () => {
  it("carries the full document as context plus the selection", () => {
    const messages = buildTransformMessages("continue", "选中段落", "全文内容");
    expect(messages[1].content).toContain("【完整文档");
    expect(messages[1].content).toContain("全文内容");
    expect(messages[1].content).toContain("【需要处理的选中段落】");
    expect(messages[1].content).toContain("选中段落");
    expect(messages[1].content).toContain("顺着上文续写");
  });

  it("each op maps to its instruction", () => {
    for (const op of ["rewrite", "expand", "shrink"] as const) {
      const messages = buildTransformMessages(op, "s", "d");
      const expected = { rewrite: "改写", expand: "扩写", shrink: "缩写" }[op];
      expect(messages[1].content).toContain(expected);
    }
  });

  it("truncates oversized context to bound token spend", () => {
    const huge = "字".repeat(20000);
    const messages = buildTransformMessages("rewrite", "s", huge);
    expect(messages[1].content.length).toBeLessThan(20000);
  });
});

describe("countWords", () => {
  it("counts CJK characters individually", () => {
    expect(countWords("你好世界")).toBe(4);
  });

  it("counts latin words as words", () => {
    expect(countWords("hello world foo")).toBe(3);
  });

  it("mixes both", () => {
    expect(countWords("你好 hello")).toBe(3);
  });

  it("empty text is zero", () => {
    expect(countWords("")).toBe(0);
  });
});
