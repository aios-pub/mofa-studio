/**
 * Conversation list component
 */

import { useState, useEffect } from "react";
import {
  PlusOutlined,
  SearchOutlined,
  MoreOutlined,
  MessageOutlined,
  DeleteOutlined,
  EditOutlined,
  PushpinOutlined,
  InboxOutlined,
  DownloadOutlined,
  CheckSquareOutlined,
} from "@ant-design/icons";
import { conversationApi, agentApi } from "@/services";
import type { Conversation, Agent } from "../../types";
import {
  conversationToExportJson,
  conversationToMarkdown,
  downloadText,
  exportFilename,
  sortAndFilterConversations,
} from "@/utils/conversationManage";

interface ConversationListProps {
  onSelectConversation?: (conversation: Conversation) => void;
  selectedId?: string;
  onCreateConversation?: () => void;
}

export default function ConversationList({
  onSelectConversation,
  selectedId,
  onCreateConversation,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  // Load conversation list
  useEffect(() => {
    loadConversations();
    agentApi.getAll().then(setAgents).catch(console.error);
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await conversationApi.getAll();
      setConversations(data);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Create new conversation
  const handleCreateConversation = async () => {
    if (onCreateConversation) {
      onCreateConversation();
    } else {
      try {
        const newConversation = await conversationApi.create({
          agentId: "agent-1",
          title: "新对话",
        });
        setConversations((prev) => [newConversation, ...prev]);
        onSelectConversation?.(newConversation);
      } catch (error) {
        console.error("Failed to create conversation:", error);
      }
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string) => {
    try {
      await conversationApi.delete(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setContextMenu(null);
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  // CHAT-13: pinned-first ordering + archive/search filtering
  const filteredConversations = sortAndFilterConversations(conversations, {
    query: searchQuery,
    showArchived,
  });

  // Group by agent
  const groupedConversations = agents.map((agent) => ({
    agent,
    conversations: filteredConversations.filter((c) => c.agentId === agent.id),
  }));

  // Rename conversation
  const handleRenameConversation = async (id: string) => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      const updated = await conversationApi.update(id, {
        title: renameValue.trim(),
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: updated.title } : c)),
      );
      setRenamingId(null);
    } catch (error) {
      console.error("Failed to rename conversation:", error);
    }
  };

  // CHAT-13: persist pin/archive flags on the conversation doc
  const patchConversation = async (
    id: string,
    patch: { pinned?: boolean; archived?: boolean },
  ) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
    try {
      await conversationApi.update(id, patch);
    } catch (error) {
      console.error("Failed to persist conversation flags:", error);
    }
  };

  const handleExport = (id: string, format: "md" | "json") => {
    const conversation = conversations.find((c) => c.id === id);
    if (!conversation) return;
    if (format === "md") {
      downloadText(
        conversationToMarkdown(conversation),
        exportFilename(conversation.title, "md"),
        "text/markdown;charset=utf-8",
      );
    } else {
      downloadText(
        conversationToExportJson(conversation),
        exportFilename(conversation.title, "json"),
        "application/json",
      );
    }
    setContextMenu(null);
  };

  const handleBatchDelete = async () => {
    if (checked.size === 0) return;
    const ids = [...checked];
    for (const id of ids) {
      try {
        await conversationApi.delete(id);
      } catch (error) {
        console.error("Failed to delete conversation:", error);
      }
    }
    setConversations((prev) => prev.filter((c) => !checked.has(c.id)));
    setChecked(new Set());
    setBatchMode(false);
  };

  const toggleChecked = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Context menu
  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({ id, x: e.clientX, y: e.clientY });
  };

  // Close the menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [contextMenu]);

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-secondary)]">
      {/* Header - new button and search */}
      <div className="p-3 space-y-2">
        <button
          onClick={handleCreateConversation}
          className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          <PlusOutlined />
          新建对话
        </button>

        <div className="relative">
          <SearchOutlined className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            placeholder="搜索会话..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="搜索会话"
            className="w-full pl-9 pr-3 py-2 bg-(--color-bg-tertiary) border border-(--color-border) rounded-lg text-sm focus:outline-none focus:border-(--color-primary) text-[var(--color-text-primary)]"
          />
        </div>

        {/* CHAT-13 view controls */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-colors ${
              showArchived
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-(--color-border) text-[var(--color-text-tertiary)]"
            }`}
            aria-pressed={showArchived}
            aria-label="显示归档会话"
          >
            <InboxOutlined /> 归档
          </button>
          <button
            onClick={() => {
              setBatchMode((v) => !v);
              setChecked(new Set());
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-colors ${
              batchMode
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-(--color-border) text-[var(--color-text-tertiary)]"
            }`}
            aria-pressed={batchMode}
            aria-label="批量管理"
          >
            <CheckSquareOutlined /> 批量
          </button>
          {batchMode && (
            <button
              onClick={handleBatchDelete}
              disabled={checked.size === 0}
              className="ml-auto px-2 py-1 rounded-lg text-red-500 border border-red-300 disabled:opacity-40"
              aria-label="删除所选"
            >
              删除({checked.size})
            </button>
          )}
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-[var(--color-text-tertiary)]">加载中...</div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageOutlined className="text-3xl text-[var(--color-text-tertiary)] mb-2" />
            <p className="text-[var(--color-text-secondary)]">暂无会话</p>
            <p className="text-sm text-[var(--color-text-tertiary)]">
              点击上方按钮开始新对话
            </p>
          </div>
        ) : (
          <div className="px-2">
            {groupedConversations.map(
              ({ agent, conversations: groupConvs }) =>
                groupConvs.length > 0 && (
                  <div key={agent.id} className="mb-4">
                    {/* Agent group title */}
                    <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-[var(--color-text-tertiary)]">
                      <span>{agent.avatar || "🤖"}</span>
                      <span>{agent.agent_name}</span>
                      <span className="text-[var(--color-text-tertiary)]">
                        ({groupConvs.length})
                      </span>
                    </div>

                    {/* Conversation item */}
                    {groupConvs.map((conversation) => (
                      <div
                        key={conversation.id}
                        onClick={() => onSelectConversation?.(conversation)}
                        onContextMenu={(e) =>
                          handleContextMenu(e, conversation.id)
                        }
                        className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          selectedId === conversation.id
                            ? "bg-[var(--color-primary)]/10 border border-(--color-primary)/30"
                            : "hover:bg-(--color-bg-tertiary)"
                        }`}
                      >
                        {batchMode && (
                          <input
                            type="checkbox"
                            checked={checked.has(conversation.id)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleChecked(conversation.id)}
                            aria-label={`选择会话 ${conversation.title}`}
                            className="flex-shrink-0"
                          />
                        )}
                        <MessageOutlined className="flex-shrink-0 text-[var(--color-text-tertiary)]" />
                        <div className="flex-1 min-w-0">
                          {renamingId === conversation.id ? (
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={() =>
                                handleRenameConversation(conversation.id)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleRenameConversation(conversation.id);
                                if (e.key === "Escape") setRenamingId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full px-1 py-0.5 text-sm bg-[var(--color-bg-base)] border border-(--color-primary) rounded text-[var(--color-text-primary)] focus:outline-none"
                            />
                          ) : (
                            <div className="text-sm font-medium text-[var(--color-text-primary)] truncate flex items-center gap-1">
                              {conversation.pinned && (
                                <PushpinOutlined
                                  className="text-[var(--color-primary)] text-xs"
                                  aria-label="已置顶"
                                />
                              )}
                              {conversation.archived && (
                                <InboxOutlined
                                  className="text-[var(--color-text-tertiary)] text-xs"
                                  aria-label="已归档"
                                />
                              )}
                              <span className="truncate">{conversation.title}</span>
                            </div>
                          )}
                          <div className="text-xs text-[var(--color-text-tertiary)]">
                            {conversation.messages.length} 条消息 ·{" "}
                            {formatRelativeTime(conversation.updatedAt)}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContextMenu(e, conversation.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--color-bg-base)] rounded transition-opacity"
                        >
                          <MoreOutlined className="text-[var(--color-text-tertiary)]" />
                        </button>
                      </div>
                    ))}
                  </div>
                ),
            )}
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 py-1 bg-[var(--color-bg-base)] border border-(--color-border) rounded-lg shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const conv = conversations.find((c) => c.id === contextMenu.id);
              if (conv) {
                setRenameValue(conv.title);
                setRenamingId(contextMenu.id);
              }
              setContextMenu(null);
            }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-(--color-bg-tertiary)"
          >
            <EditOutlined />
            重命名
          </button>
          {(() => {
            const conv = conversations.find((c) => c.id === contextMenu.id);
            if (!conv) return null;
            return (
              <>
                <button
                  onClick={() => {
                    void patchConversation(conv.id, { pinned: !conv.pinned });
                    setContextMenu(null);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-(--color-bg-tertiary)"
                >
                  <PushpinOutlined />
                  {conv.pinned ? "取消置顶" : "置顶"}
                </button>
                <button
                  onClick={() => {
                    void patchConversation(conv.id, { archived: !conv.archived });
                    setContextMenu(null);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-(--color-bg-tertiary)"
                >
                  <InboxOutlined />
                  {conv.archived ? "取消归档" : "归档"}
                </button>
                <button
                  onClick={() => handleExport(conv.id, "md")}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-(--color-bg-tertiary)"
                >
                  <DownloadOutlined />
                  导出 Markdown
                </button>
                <button
                  onClick={() => handleExport(conv.id, "json")}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-(--color-bg-tertiary)"
                >
                  <DownloadOutlined />
                  导出 JSON
                </button>
              </>
            );
          })()}
          <button
            onClick={() => handleDeleteConversation(contextMenu.id)}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <DeleteOutlined />
            删除
          </button>
        </div>
      )}
    </div>
  );
}

// Format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return new Date(date).toLocaleDateString();
}
