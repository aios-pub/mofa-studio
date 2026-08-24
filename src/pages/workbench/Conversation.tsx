/**
 * Conversation page
 * Supports agent selection, file upload and context clearing
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Modal, Input, message } from "antd";
import { conversationApi, agentApi } from "@/services";
import { ConversationList } from "../../components/common";
import { ChatContainer } from "../../components/conversation";
import ResizableSidebar from "@/components/layout/ResizableSidebar";
import { chatService } from "@/services/api/chat";
import { AUTO_MODEL } from "@/services/api/engine";
import type { Conversation, Agent, Message, MessageAttachment } from "../../types";

export default function ConversationPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [model, setModel] = useState<string>(AUTO_MODEL);
  const [deepThinking, setDeepThinking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [newConversationTitle, setNewConversationTitle] = useState("");
  const [selectedAgentForNew, setSelectedAgentForNew] = useState<
    string | undefined
  >();

  // Load agent list
  useEffect(() => {
    loadAgents();
  }, []);

  // Load conversation list
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
      // Select the first conversation by default
      if (data.length > 0 && !selectedConversation) {
        setSelectedConversation(data[0]);
        setSelectedAgentId(data[0].agentId);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  // Select conversation
  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
    setSelectedAgentId(conversation.agentId);
  }, []);

  // Select agent
  const handleSelectAgent = useCallback(
    (agentId: string) => {
      setSelectedAgentId(agentId);
      // If the conversation exists, update its agentId
      if (selectedConversation) {
        setSelectedConversation((prev) => (prev ? { ...prev, agentId } : null));
      }
    },
    [selectedConversation],
  );

  // Create new conversation
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

  // Clear context
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

  // Send message (streaming through the llm-gateway / mofa-engine)
  const handleSendMessage = useCallback(
    async (
      content: string,
      _attachments?: MessageAttachment[],
      _params?: Record<string, unknown>,
    ) => {
      if (!selectedConversation || isLoading) return;

      const conversationId = selectedConversation.id;
      const history = selectedConversation.messages;
      setIsLoading(true);
      abortRef.current = new AbortController();

      // User message appears immediately.
      const userMessage: Message = {
        id: `msg-u-${Date.now()}`,
        conversationId,
        role: "user",
        content,
        status: "completed",
        createdAt: new Date(),
      };
      // Assistant placeholder streams token-by-token.
      const assistantId = `msg-a-${Date.now() + 1}`;
      const assistantMessage: Message = {
        id: assistantId,
        conversationId,
        role: "assistant",
        content: "",
        status: "pending",
        createdAt: new Date(),
      };

      const appendMessages = (msgs: Message[]) => {
        setSelectedConversation((prev) => {
          if (!prev || prev.id !== conversationId) return prev;
          return { ...prev, messages: [...prev.messages, ...msgs] };
        });
      };
      const patchAssistant = (patch: Partial<Message>) => {
        setSelectedConversation((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === assistantId ? { ...m, ...patch } : m,
            ),
          };
        });
      };

      appendMessages([userMessage, assistantMessage]);

      try {
        const completion = await chatService.chatStream(
          {
            messages: [
              ...history.map((m) => ({
                role: m.role as "system" | "user" | "assistant",
                content: m.content,
              })),
              { role: "user", content },
            ],
            model: model === AUTO_MODEL ? undefined : model,
            temperature: 0.7,
            stream: true,
            params: deepThinking ? { enable_thinking: true } : undefined,
          },
          (chunk, done) => {
            if (done) return;
            // Incremental append: read current content through the setter.
            setSelectedConversation((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + chunk }
                    : m,
                ),
              };
            });
          },
          abortRef.current?.signal,
          (thinkingChunk) => {
            setSelectedConversation((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        thinking: {
                          content: (m.thinking?.content ?? "") + thinkingChunk,
                        },
                      }
                    : m,
                ),
              };
            });
          },
        );

        patchAssistant({
          content: completion.content,
          status: "completed",
          tokens: completion.tokens,
          ...(completion.thinking !== undefined
            ? { thinking: { content: completion.thinking } }
            : {}),
        });

        // Persist token totals on the conversation object.
        setSelectedConversation((prev) => {
          if (!prev || prev.id !== conversationId) return prev;
          return {
            ...prev,
            totalTokens:
              prev.totalTokens +
              (completion.tokens?.input ?? 0) +
              (completion.tokens?.output ?? 0),
            updatedAt: new Date(),
          };
        });
      } catch (error) {
        console.error("Failed to send message:", error);
        const detail = error instanceof Error ? error.message : String(error);
        patchAssistant({ status: "error", content: `生成失败：${detail}` });
        message.error("发送消息失败");
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [selectedConversation, isLoading, model, deepThinking],
  );

  // Abort an in-flight generation; the partial answer stays in the transcript
  const handleStopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return (
    <div className="flex h-full">
      {/* Left conversation list */}
      <ResizableSidebar
        defaultWidth={288}
        className="border-r border-(--color-border)"
        storageKey="sidebar:conversation"
      >
        <ConversationList
          onSelectConversation={handleSelectConversation}
          selectedId={selectedConversation?.id}
          onCreateConversation={handleCreateConversation}
        />
      </ResizableSidebar>

      {/* Right conversation area */}
      <div className="flex-1">
        <ChatContainer
          conversation={selectedConversation}
          onSendMessage={handleSendMessage}
          onClearContext={handleClearContext}
          onSelectAgent={handleSelectAgent}
          agents={agents}
          selectedAgentId={selectedAgentId}
          isLoading={isLoading}
          model={model}
          onModelChange={setModel}
          onStopGeneration={handleStopGeneration}
          deepThinking={deepThinking}
          onDeepThinkingChange={setDeepThinking}
        />
      </div>

      {/* Create conversation modal */}
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
