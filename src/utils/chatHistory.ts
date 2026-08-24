/**
 * Pure helpers for message-level operations (CHAT-10): regeneration
 * history, edit-resend truncation, and branch snapshots. Kept free of React
 * so the truncation semantics are unit-testable.
 */

import type { Message } from "@/types";

/**
 * Context for regenerating an assistant reply: every message before the
 * target assistant message (which itself is dropped). Returns null when the
 * id does not resolve to an assistant message.
 */
export function historyForRegeneration(
  messages: Message[],
  assistantMessageId: string,
): Message[] | null {
  const idx = messages.findIndex(
    (m) => m.id === assistantMessageId && m.role === "assistant",
  );
  if (idx === -1) return null;
  return messages.slice(0, idx);
}

/**
 * Edit-resend: replace the user message content and truncate everything
 * after it (the old reply chain is discarded; the caller confirms first).
 * Returns null when the id does not resolve to a user message.
 */
export function applyEditResend(
  messages: Message[],
  userMessageId: string,
  newContent: string,
): { messages: Message[]; edited: Message } | null {
  const idx = messages.findIndex(
    (m) => m.id === userMessageId && m.role === "user",
  );
  if (idx === -1) return null;
  const edited: Message = {
    ...messages[idx],
    content: newContent,
    createdAt: new Date(),
  };
  return { messages: [...messages.slice(0, idx), edited], edited };
}

/**
 * Branch snapshot: the parent context copied into the new conversation.
 * `includeAnchor` controls whether the anchor message itself carries over
 * (branching from a user message keeps it as the branch seed; branching
 * after an assistant reply keeps the full exchange).
 */
export function branchSnapshot(
  messages: Message[],
  anchorId: string,
  includeAnchor: boolean,
): Message[] | null {
  const idx = messages.findIndex((m) => m.id === anchorId);
  if (idx === -1) return null;
  const end = includeAnchor ? idx + 1 : idx;
  return messages.slice(0, end).map((m) => ({
    ...m,
    // Fresh ids so the branch owns its own message identity.
    id: `${m.id}-branch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  }));
}

/** Wire messages into the chat request shape. */
export function toRequestMessages(messages: Message[]): Array<{
  role: "system" | "user" | "assistant";
  content: string;
}> {
  return messages.map((m) => ({
    role: m.role as "system" | "user" | "assistant",
    content: m.content,
  }));
}
