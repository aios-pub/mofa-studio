/**
 * Tests for CHAT-10 pure helpers: regeneration history, edit-resend
 * truncation, branch snapshots.
 */
import { describe, expect, it } from "vitest";
import type { Message } from "@/types";
import {
  applyEditResend,
  branchSnapshot,
  historyForRegeneration,
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
