/**
 * Conversation list组件
 */

import { useState, useEffect } from "react";
import {
  PlusOutlined,
  SearchOutlined,
  MoreOutlined,
  MessageOutlined,
  DeleteOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { conversationApi, agentApi } from "@/services";
import type { Conversation, Agent } from "../../types";

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

  // 加载Conversation list
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

  // 创建新会话
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

  // 过滤会话
  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // 按 Agent 分组
  const groupedConversations = agents.map((agent) => ({
    agent,
    conversations: filteredConversations.filter((c) => c.agentId === agent.id),
  }));

  // 重命名会话
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

  // 右键菜单
  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({ id, x: e.clientX, y: e.clientY });
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [contextMenu]);

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-secondary)]">
      {/* 头部 - 新建按钮和搜索 */}
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
            className="w-full pl-9 pr-3 py-2 bg-(--color-bg-tertiary) border border-(--color-border) rounded-lg text-sm focus:outline-none focus:border-(--color-primary) text-[var(--color-text-primary)]"
          />
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
                    {/* Agent 分组Title */}
                    <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-[var(--color-text-tertiary)]">
                      <span>{agent.avatar || "🤖"}</span>
                      <span>{agent.agent_name}</span>
                      <span className="text-[var(--color-text-tertiary)]">
                        ({groupConvs.length})
                      </span>
                    </div>

                    {/* 会话项 */}
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
                            <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                              {conversation.title}
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

      {/* 右键菜单 */}
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

// 格式化相对时间
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
