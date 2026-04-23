/**
 * 对话页面
 * 支持智能体选择、文件上传、清空上下文
 */

import { useState, useEffect, useCallback } from "react";
import { Modal, Input, message } from "antd";
import { conversationApi, agentApi } from "@/services";
import { ConversationList } from "../../components/common";
import { ChatContainer } from "../../components/conversation";
import type { Conversation, Agent, MessageAttachment } from "../../types";

export default function ConversationPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState("");
  const [selectedAgentForNew, setSelectedAgentForNew] = useState<
    string | undefined
  >();

  // 加载智能体列表
  useEffect(() => {
    loadAgents();
  }, []);

  // 加载会话列表
  useEffect(() => {
    loadConversations();
  }, []);

  const loadAgents = async () => {
    try {
      const data = await agentApi.getAll();
      setAgents(data);
      if (data.length > 0 && !selectedAgentForNew) {
        setSelectedAgentForNew(data[0].id);
      }
    } catch (error) {
      console.error("Failed to load agents:", error);
    }
  };

  const loadConversations = async () => {
    try {
      const data = await conversationApi.getAll();
      setConversations(data);
      // 默认选中第一个会话
      if (data.length > 0 && !selectedConversation) {
        setSelectedConversation(data[0]);
        setSelectedAgentId(data[0].agentId);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  // 选择会话
  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
    setSelectedAgentId(conversation.agentId);
  }, []);

  // 选择智能体
  const handleSelectAgent = useCallback(
    (agentId: string) => {
      setSelectedAgentId(agentId);
      // 如果当前会话存在，更新会话的agentId
      if (selectedConversation) {
        setSelectedConversation((prev) => (prev ? { ...prev, agentId } : null));
      }
    },
    [selectedConversation],
  );

  // 创建新会话
  const handleCreateConversation = useCallback(() => {
    setCreateModalOpen(true);
    setNewConversationTitle("");
    if (agents.length > 0) {
      setSelectedAgentForNew(agents[0].id);
    }
  }, [agents]);

  const handleConfirmCreate = async () => {
    if (!selectedAgentForNew) {
      message.warning("请选择一个智能体");
      return;
    }

    try {
      const newConversation = await conversationApi.create({
        agentId: selectedAgentForNew,
        title: newConversationTitle || "新对话",
      });
      setConversations((prev) => [newConversation, ...prev]);
      setSelectedConversation(newConversation);
      setSelectedAgentId(newConversation.agentId);
      setCreateModalOpen(false);
      setNewConversationTitle("");
    } catch (error) {
      console.error("Failed to create conversation:", error);
      message.error("创建会话失败");
    }
  };

  // 清空上下文
  const handleClearContext = useCallback(() => {
    if (selectedConversation) {
      setSelectedConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: [],
              totalTokens: 0,
            }
          : null,
      );
    }
  }, [selectedConversation]);

  // 发送消息
  const handleSendMessage = useCallback(
    async (
      content: string,
      _attachments?: MessageAttachment[],
      _params?: Record<string, unknown>,
    ) => {
      if (!selectedConversation) return;

      setIsLoading(true);

      try {
        const { userMessage, assistantMessage } =
          await conversationApi.sendMessage(selectedConversation.id, content);

        // 更新当前会话
        setSelectedConversation((prev) => {
          if (!prev) return null;
          const newMessages = [...prev.messages, userMessage, assistantMessage];
          return {
            ...prev,
            messages: newMessages,
            totalTokens: newMessages.reduce(
              (sum, m) =>
                sum + (m.tokens?.input || 0) + (m.tokens?.output || 0),
              0,
            ),
            updatedAt: new Date(),
          };
        });

        // 更新会话列表
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id
              ? {
                  ...c,
                  messages: [...c.messages, userMessage, assistantMessage],
                  updatedAt: new Date(),
                }
              : c,
          ),
        );
      } catch (error) {
        console.error("Failed to send message:", error);
        message.error("发送消息失败");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedConversation],
  );

  return (
    <div className="flex h-full">
      {/* 左侧会话列表 */}
      <div className="w-72 flex-shrink-0 border-r border-(--color-border)">
        <ConversationList
          onSelectConversation={handleSelectConversation}
          selectedId={selectedConversation?.id}
          onCreateConversation={handleCreateConversation}
        />
      </div>

      {/* 右侧对话区域 */}
      <div className="flex-1">
        <ChatContainer
          conversation={selectedConversation}
          onSendMessage={handleSendMessage}
          onClearContext={handleClearContext}
          onSelectAgent={handleSelectAgent}
          agents={agents}
          selectedAgentId={selectedAgentId}
          isLoading={isLoading}
        />
      </div>

      {/* 创建新会话弹窗 */}
      <Modal
        title="新建对话"
        open={createModalOpen}
        onOk={handleConfirmCreate}
        onCancel={() => setCreateModalOpen(false)}
        okText="创建"
        cancelText="取消"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">选择智能体</label>
            <select
              value={selectedAgentForNew}
              onChange={(e) => setSelectedAgentForNew(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-(--color-border) rounded-lg focus:outline-none focus:border-(--color-primary)"
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              对话标题（可选）
            </label>
            <Input
              placeholder="输入对话标题..."
              value={newConversationTitle}
              onChange={(e) => setNewConversationTitle(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
