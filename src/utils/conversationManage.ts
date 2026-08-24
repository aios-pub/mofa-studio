/**
 * Conversation-management helpers (CHAT-13): pin-first ordering, archive
 * filtering, title search, and Markdown/JSON export. Pure so the
 * semantics are unit-testable.
 */

import type { Conversation } from "@/types";

export interface ConversationViewOptions {
  query: string;
  showArchived: boolean;
}

/** Pinned first, then most recently updated; archived hidden unless asked. */
export function sortAndFilterConversations(
  conversations: Conversation[],
  options: ConversationViewOptions,
): Conversation[] {
  const query = options.query.trim().toLowerCase();
  return conversations
    .filter((c) => (options.showArchived ? true : !c.archived))
    .filter((c) => (query ? c.title.toLowerCase().includes(query) : true))
    .sort((a, b) => {
      if (Boolean(b.pinned) !== Boolean(a.pinned)) return b.pinned ? 1 : -1;
      const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      return bTime - aTime;
    });
}

/** Render a conversation as Markdown (导出 Markdown). */
export function conversationToMarkdown(conversation: Conversation): string {
  const lines: string[] = [
    `# ${conversation.title}`,
    "",
    `> 导出自 mofa-studio · ${new Date().toISOString().slice(0, 10)} · ${conversation.messages.length} 条消息`,
    "",
  ];
  for (const message of conversation.messages) {
    if (message.role === "user") {
      lines.push(`## 🧑 用户`, "", message.content, "");
    } else {
      lines.push(`## 🤖 助手`, "");
      if (message.thinking?.content) {
        lines.push("<details><summary>思考过程</summary>", "", message.thinking.content, "", "</details>", "");
      }
      lines.push(message.content || "（无内容）", "");
      if (message.sources && message.sources.length > 0) {
        lines.push(
          "**参考来源**",
          ...message.sources.map(
            (source, index) => `${source.index ?? index + 1}. [${source.title || source.url}](${source.url})`,
          ),
          "",
        );
      }
    }
    if (message.attachments && message.attachments.length > 0) {
      lines.push(
        `*附件：${message.attachments.map((a) => a.name).join("、")}*`,
        "",
      );
    }
  }
  return lines.join("\n");
}

/** Export envelope for JSON (导出 JSON). */
export function conversationToExportJson(conversation: Conversation): string {
  return JSON.stringify(
    {
      format: "mofa-conversation",
      version: 1,
      exported_at: new Date().toISOString(),
      conversation: {
        id: conversation.id,
        title: conversation.title,
        created_at: conversation.createdAt,
        updated_at: conversation.updatedAt,
        messages: conversation.messages.map((m) => ({
          role: m.role,
          content: m.content,
          thinking: m.thinking?.content ?? null,
          sources: m.sources ?? [],
          attachments: (m.attachments ?? []).map((a) => ({
            name: a.name,
            type: a.type,
          })),
          created_at: m.createdAt,
        })),
      },
    },
    null,
    2,
  );
}

/** Trigger a browser download for text content. */
export function downloadText(
  content: string,
  filename: string,
  mime = "text/plain;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Safe filename from a conversation title. */
export function exportFilename(title: string, ext: string): string {
  const slug = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
  return `${slug || "conversation"}.${ext}`;
}
