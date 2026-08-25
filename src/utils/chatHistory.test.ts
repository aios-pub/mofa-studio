/**
 * Tests for CHAT-10 pure helpers: regeneration history, edit-resend
 * truncation, branch snapshots.
 */
import { describe, expect, it } from "vitest";
import type { Message } from "@/types";
import type { ContentPart } from "@/services/api/chat";
import {
  applyEditResend,
  conversationToProjectFields,
  branchSnapshot,
  historyForRegeneration,
  toRequestContent,
  toRequestMessages,
} from "./chatHistory";

function msg(id: string, role: "user" | "assistant", content: string): Message {
  return {
    id,
    conversationId: "c1",
    role,
    content,
    status: "completed",
    createdAt: new Date(),
  };
}

const THREAD = [
  msg("u1", "user", "第一问"),
  msg("a1", "assistant", "第一答"),
  msg("u2", "user", "第二问"),
  msg("a2", "assistant", "第二答"),
];

describe("historyForRegeneration", () => {
  it("returns everything before the target assistant message", () => {
    const history = historyForRegeneration(THREAD, "a2");
    expect(history?.map((m) => m.id)).toEqual(["u1", "a1", "u2"]);
  });

  it("rejects user message ids and unknown ids", () => {
    expect(historyForRegeneration(THREAD, "u2")).toBeNull();
    expect(historyForRegeneration(THREAD, "missing")).toBeNull();
  });
});

describe("applyEditResend", () => {
  it("replaces the content and truncates the tail", () => {
    const result = applyEditResend(THREAD, "u2", "改后的第二问");
    expect(result?.messages.map((m) => m.id)).toEqual(["u1", "a1", "u2"]);
    expect(result?.edited.content).toBe("改后的第二问");
    // a2 (the old answer chain) is gone
    expect(result?.messages.some((m) => m.id === "a2")).toBe(false);
  });

  it("rejects assistant message ids and unknown ids", () => {
    expect(applyEditResend(THREAD, "a2", "x")).toBeNull();
    expect(applyEditResend(THREAD, "missing", "x")).toBeNull();
  });
});

describe("branchSnapshot", () => {
  it("includes the anchor when asked (branch from an exchange)", () => {
    const snap = branchSnapshot(THREAD, "a2", true);
    expect(snap?.map((m) => m.content)).toEqual(["第一问", "第一答", "第二问", "第二答"]);
  });

  it("excludes the anchor when branching from a user message", () => {
    const snap = branchSnapshot(THREAD, "u2", false);
    expect(snap?.map((m) => m.content)).toEqual(["第一问", "第一答"]);
  });

  it("gives the copy fresh message identities", () => {
    const snap = branchSnapshot(THREAD, "a1", true)!;
    snap.forEach((m, i) => {
      expect(m.id).not.toBe(THREAD[i].id);
      expect(m.content).toBe(THREAD[i].content);
    });
  });

  it("returns null for unknown anchors", () => {
    expect(branchSnapshot(THREAD, "nope", true)).toBeNull();
  });
});

describe("toRequestMessages", () => {
  it("maps roles and content", () => {
    const req = toRequestMessages(THREAD);
    expect(req).toHaveLength(4);
    expect(req[0]).toEqual({ role: "user", content: "第一问" });
    expect(req[1]).toEqual({ role: "assistant", content: "第一答" });
  });
});

describe("toRequestContent (CHAT-04 vision input)", () => {
  const imageAttachment = (id: string) => ({
    id,
    name: `${id}.png`,
    type: "image/png",
    size: 3,
    url: `data:image/png;base64,${id}`,
  });

  it("returns the plain string when no image attachments", () => {
    expect(toRequestContent(msg("u1", "user", "纯文本"))).toBe("纯文本");
  });

  it("builds multipart content with text first, then image parts", () => {
    const m: Message = {
      ...msg("u1", "user", "图里是什么？"),
      attachments: [imageAttachment("A"), imageAttachment("B")],
    };
    const content = toRequestContent(m);
    expect(Array.isArray(content)).toBe(true);
    const parts = content as ContentPart[];
    expect(parts[0]).toEqual({ type: "text", text: "图里是什么？" });
    expect(parts[1]).toEqual({
      type: "image_url",
      image_url: { url: "data:image/png;base64,A" },
    });
    expect(parts[2]).toEqual({
      type: "image_url",
      image_url: { url: "data:image/png;base64,B" },
    });
  });

  it("skips non-image attachments", () => {
    const m: Message = {
      ...msg("u1", "user", "看这个"),
      attachments: [
        { id: "f1", name: "doc.pdf", type: "application/pdf", size: 5 },
        imageAttachment("C"),
      ],
    };
    const parts = toRequestContent(m) as ContentPart[];
    expect(parts).toHaveLength(2); // text + one image
  });

  it("empty text with images yields image parts only", () => {
    const m: Message = {
      ...msg("u1", "user", ""),
      attachments: [imageAttachment("D")],
    };
    const parts = toRequestContent(m) as ContentPart[];
    expect(parts).toHaveLength(1);
    expect(parts[0].type).toBe("image_url");
  });
});

describe("conversationToProjectFields (TASK-03)", () => {
  it("seeds title and goal from the first user message", () => {
    const fields = conversationToProjectFields({
      title: "营销讨论",
      messages: [
        { role: "assistant", content: "你好" },
        { role: "user", content: "帮我策划一场新品发布会" },
        { role: "assistant", content: "好的" },
      ],
    });
    expect(fields.title).toBe("营销讨论");
    expect(fields.goal).toBe("帮我策划一场新品发布会");
  });

  it("falls back to the first request when the title is empty", () => {
    const fields = conversationToProjectFields({
      title: "  ",
      messages: [{ role: "user", content: "整理季度销售数据并出报告" }],
    });
    expect(fields.title).toBe("整理季度销售数据并出报告");
  });

  it("caps lengths and degrades honestly with no user content", () => {
    const long = conversationToProjectFields({
      messages: [{ role: "user", content: "长".repeat(300) }],
    });
    expect(long.goal.length).toBe(200);
    const empty = conversationToProjectFields({ title: "", messages: [] });
    expect(empty.title).toBe("来自对话的项目");
    expect(empty.goal).toContain("待补充");
  });
});
