/**
 * Tests for CHAT-13 helpers: pin ordering, archive/search filtering, and
 * the Markdown/JSON export shapes.
 */
import { describe, expect, it } from "vitest";
import type { Conversation, Message } from "@/types";
import {
  conversationToExportJson,
  conversationToMarkdown,
  exportFilename,
  sortAndFilterConversations,
} from "./conversationManage";

function msg(id: string, role: "user" | "assistant", content: string): Message {
  return {
    id,
    conversationId: "c1",
    role,
    content,
    status: "completed",
    createdAt: new Date("2026-08-25T10:00:00Z"),
  };
}

function conv(
  id: string,
  overrides: Partial<Conversation> = {},
): Conversation {
  return {
    id,
    agentId: "a1",
    title: `对话-${id}`,
    messages: [],
    totalTokens: 0,
    createdAt: new Date("2026-08-20T00:00:00Z"),
    updatedAt: new Date("2026-08-25T00:00:00Z"),
    ...overrides,
  };
}

const LIST = [
  conv("a"),
  conv("b", { pinned: true, updatedAt: new Date("2026-08-21T00:00:00Z") }),
  conv("c", { archived: true }),
  conv("d", { title: "橘猫研究", updatedAt: new Date("2026-08-26T00:00:00Z") }),
];

describe("sortAndFilterConversations", () => {
  it("pins float to the top even when older", () => {
    const view = sortAndFilterConversations(LIST, { query: "", showArchived: false });
    expect(view[0].id).toBe("b");
  });

  it("archives hidden by default, shown on demand", () => {
    const hidden = sortAndFilterConversations(LIST, { query: "", showArchived: false });
    expect(hidden.map((c) => c.id)).toEqual(["b", "d", "a"]);
    const shown = sortAndFilterConversations(LIST, { query: "", showArchived: true });
    expect(shown.some((c) => c.id === "c")).toBe(true);
  });

  it("search matches title case-insensitively", () => {
    const view = sortAndFilterConversations(LIST, { query: "橘猫", showArchived: false });
    expect(view.map((c) => c.id)).toEqual(["d"]);
  });

  it("non-pinned items order by recency", () => {
    const view = sortAndFilterConversations(
      [
        conv("old", { updatedAt: new Date("2026-08-01T00:00:00Z") }),
        conv("new", { updatedAt: new Date("2026-08-25T00:00:00Z") }),
      ],
      { query: "", showArchived: false },
    );
    expect(view.map((c) => c.id)).toEqual(["new", "old"]);
  });
});

describe("conversationToMarkdown", () => {
  it("renders roles, thinking, sources, and attachments", () => {
    const conversation = conv("x", {
      title: "橘猫研究",
      messages: [
        msg("u1", "user", "画一只橘猫"),
        {
          ...msg("a1", "assistant", "这是橘猫"),
          thinking: { content: "先想想猫" },
          sources: [{ index: 1, title: "猫百科", url: "https://cat.example", snippet: "猫" }],
          attachments: [{ id: "f1", name: "cat.png", type: "image/png", size: 3, url: "data:..." }],
        },
      ],
    });
    const md = conversationToMarkdown(conversation);
    expect(md).toContain("# 橘猫研究");
    expect(md).toContain("## 🧑 用户");
    expect(md).toContain("画一只橘猫");
    expect(md).toContain("## 🤖 助手");
    expect(md).toContain("<details><summary>思考过程</summary>");
    expect(md).toContain("[猫百科](https://cat.example)");
    expect(md).toContain("*附件：cat.png*");
  });
});

describe("conversationToExportJson", () => {
  it("wraps the conversation in a versioned envelope", () => {
    const conversation = conv("x", {
      messages: [msg("u1", "user", "hi")],
    });
    const parsed = JSON.parse(conversationToExportJson(conversation));
    expect(parsed.format).toBe("mofa-conversation");
    expect(parsed.version).toBe(1);
    expect(parsed.conversation.messages[0]).toMatchObject({
      role: "user",
      content: "hi",
    });
    // No data URLs / file handles leak into exports.
    expect(JSON.stringify(parsed)).not.toContain("data:");
  });
});

describe("exportFilename", () => {
  it("sanitizes filesystem-hostile titles", () => {
    expect(exportFilename('橘猫/研究: "最终"版?', "md")).toBe("橘猫研究-最终版.md");
    expect(exportFilename("   ", "json")).toBe("conversation.json");
  });
});
