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
import { loadPolicy, resolveModel } from "@/services/api/modelPolicy";
import GuidanceCard from "@/components/common/GuidanceCard";
import { fireGuidance, GUIDANCES, type GuidanceId } from "@/utils/progressiveDisclosure";
import {
  applyEditResend,
  branchSnapshot,
  historyForRegeneration,
  toRequestContent,
  toRequestMessages,
} from "@/utils/chatHistory";
import { detectImageIntent, detectVideoIntent, refineImagePrompt } from "@/utils/imageIntent";
import { exportFilename, imageService } from "@/services/api/image";
import { audioService } from "@/services/api/audio";
import { videoService } from "@/services/api/video";
import { buildRagContext, ragService, type RagHit } from "@/services/api/rag";
import { assetService, recordImageAssets } from "@/services/api/assets";
import type { Conversation, Agent, Message, MessageAttachment } from "../../types";
import {
  BUILTIN_EXPERTS,
  expertSystemPrompt,
  loadMyExperts,
  type Expert,
} from "@/utils/experts";
import type { ToolScope } from "@/utils/toolScope";

export default function ConversationPage() {
  const [, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [model, setModel] = useState<string>(AUTO_MODEL);
  const [deepThinking, setDeepThinking] = useState(false);
  // CHAT-03: ground answers in web search results.
  const [webSearch, setWebSearch] = useState(false);
  // ONBOARD-04: contextual guidance fired at capability boundaries.
  const [guidance, setGuidance] = useState<GuidanceId | null>(null);
  const regenerateCountRef = useRef(0);
  const branchCountRef = useRef(0);
  // CHAT-08: auto-speak completed replies.
  const [ttsEnabled, setTtsEnabled] = useState(false);
  // CHAT-05: prompt of the last in-chat image, for follow-up edits.
  const lastImagePromptRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [newConversationTitle, setNewConversationTitle] = useState("");
  // TASK-14: summoned expert (persona injected as leading system message).
  const [expert, setExpert] = useState<Expert | null>(null);
  // TASK-10: pinned tool scope for the active conversation.
  const [toolScope, setToolScope] = useState<ToolScope>(null);
  const [selectedAgentForNew, setSelectedAgentForNew] = useState<
    string | undefined
  >();

  // TASK-14: summon via /?expert=<id> (from the experts page).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("expert");
    if (!id) return;
    const found = [...loadMyExperts(), ...BUILTIN_EXPERTS].find((e) => e.id === id);
    if (found) setExpert(found);
  }, []);

  // Load agent list
  useEffect(() => {
    loadAgents();
  }, []);

  // Load conversation list
  useEffect(() => {
    loadConversations();
  }, []);

  // PLAT-06 cross-domain: 「发送到对话」from the gallery attaches the asset
  // (zero-copy: the existing ref_path becomes the attachment payload).
  const [pendingAttachment, setPendingAttachment] = useState<MessageAttachment | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const attachId = params.get("attach");
    if (!attachId) return;
    void assetService.get(attachId).then((asset) => {
      if (!asset) return;
      setPendingAttachment({
        id: asset.id,
        name: `${asset.title}.png`,
        type: `image/${asset.type === "image" ? "png" : "octet-stream"}`,
        size: 0,
        url: asset.ref_path,
      });
      message.info("已从画廊附加作品，发送时将作为图片理解输入");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Shared streaming core: appends/reuses an assistant placeholder on
  // `conversationId` and streams one completion over `history` + `content`.
  const runGeneration = useCallback(
    async (
      conversationId: string,
      history: Message[],
      content: string,
      attachments?: MessageAttachment[],
      ragContext?: string,
    ) => {
      setIsLoading(true);
      abortRef.current = new AbortController();

      const assistantId = `msg-a-${Date.now() + 1}`;
      const assistantMessage: Message = {
        id: assistantId,
        conversationId,
        role: "assistant",
        content: "",
        status: "pending",
        createdAt: new Date(),
      };
      const appendAssistant = () => {
        setSelectedConversation((prev) => {
          if (!prev || prev.id !== conversationId) return prev;
          return { ...prev, messages: [...prev.messages, assistantMessage] };
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

      appendAssistant();

      try {
        const completion = await chatService.chatStream(
          {
            messages: [
              ...(expert
                ? [{ role: "system" as const, content: expertSystemPrompt(expert) }]
                : []),
              ...(ragContext
                ? [{ role: "system" as const, content: ragContext }]
                : []),
              ...toRequestMessages(history),
              {
                role: "user" as const,
                content: toRequestContent({ content, attachments }),
              },
            ],
            model: resolveModel("executor", model, loadPolicy()),
            temperature: 0.7,
            stream: true,
            params: deepThinking ? { enable_thinking: true } : undefined,
            webSearch,
          },
          (chunk, done) => {
            if (done) return;
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
          (sources) => {
            patchAssistant({ sources });
          },
        );

        if (ttsEnabled && completion.content) {
          // CHAT-08: fire-and-forget playback; failures surface as a toast.
          void audioService.speak(completion.content).catch((e) => {
            message.warning(`自动播报失败：${e instanceof Error ? e.message : e}`);
          });
        }
        patchAssistant({
          content: completion.content,
          status: "completed",
          tokens: completion.tokens,
          // ONBOARD-04: first successful output → Skill guidance.
          ...(fireGuidance("first-output-skill")
            ? (setGuidance("first-output-skill"), {})
            : {}),
          ...(completion.thinking !== undefined
            ? { thinking: { content: completion.thinking } }
            : {}),
        });
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
        console.error("Generation failed:", error);
        const detail = error instanceof Error ? error.message : String(error);
        if (webSearch && detail.includes("联网搜索未配置")) {
          const fired = fireGuidance("search-unconfigured-connector");
          if (fired) setGuidance("search-unconfigured-connector");
        }
        patchAssistant({ status: "error", content: `生成失败：${detail}` });
        message.error("生成失败");
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [model, deepThinking, webSearch, ttsEnabled, expert],
  );

  // Send message (streaming through the llm-gateway / mofa-engine)
  const handleSendMessage = useCallback(
    async (
      content: string,
      attachments?: MessageAttachment[],
      params?: Record<string, unknown>,
    ) => {
      if (!selectedConversation || isLoading) return;

      const conversationId = selectedConversation.id;
      const history = selectedConversation.messages;
      const mergedAttachments =
        attachments && attachments.length > 0
          ? attachments
          : pendingAttachment
            ? [pendingAttachment]
            : undefined;
      if (pendingAttachment && (!attachments || attachments.length === 0)) {
        setPendingAttachment(null);
      }
      const userMessage: Message = {
        id: `msg-u-${Date.now()}`,
        conversationId,
        role: "user",
        content,
        attachments: mergedAttachments,
        status: "completed",
        createdAt: new Date(),
      };
      setSelectedConversation((prev) => {
        if (!prev || prev.id !== conversationId) return prev;
        return { ...prev, messages: [...prev.messages, userMessage] };
      });

      // TASK-06: an explicit capability-panel route wins over heuristic
      // detection (the user preselected the tool for this send).
      const forcedRoute = params?.force_route;

      // CHAT-06: video intent routes to the async video task pipeline.
      if (forcedRoute === "video" || detectVideoIntent(content)) {
        await runVideoGeneration(conversationId, content);
        return;
      }

      // CHAT-05: image intent routes to the image gateway instead of chat.
      const intent =
        forcedRoute === "image"
          ? ({ kind: "image", edit: false } as const)
          : detectImageIntent(content, lastImagePromptRef.current !== null);
      if (intent.kind === "image") {
        const prompt = intent.edit && lastImagePromptRef.current
          ? refineImagePrompt(lastImagePromptRef.current, content)
          : content;
        await runImageGeneration(conversationId, prompt);
        return;
      }
      lastImagePromptRef.current = null;
      // CHAT-11: retrieve cited chunks from attached documents.
      const ragDocIds = (mergedAttachments ?? [])
        .filter((a) => a.type === "rag/doc")
        .map((a) => a.id);
      let ragContext: string | undefined;
      if (ragDocIds.length > 0) {
        try {
          const allHits: RagHit[] = [];
          for (const docId of ragDocIds) {
            const { hits } = await ragService.query(docId, content, 4);
            allHits.push(...hits);
          }
          ragContext = buildRagContext(allHits) ?? undefined;
        } catch (error) {
          console.error("RAG retrieval failed:", error);
        }
      }
      await runGeneration(
        conversationId,
        history,
        content,
        mergedAttachments,
        ragContext,
      );
    },
    [selectedConversation, isLoading, runGeneration, pendingAttachment, expert],
  );

  // CHAT-05: generate an image in-conversation; the assistant message
  // carries the artifact as an image attachment.
  const runImageGeneration = useCallback(
    async (conversationId: string, prompt: string) => {
      setIsLoading(true);
      const assistantId = `msg-a-img-${Date.now()}`;
      const placeholder: Message = {
        id: assistantId,
        conversationId,
        role: "assistant",
        content: "",
        status: "pending",
        createdAt: new Date(),
      };
      setSelectedConversation((prev) => {
        if (!prev || prev.id !== conversationId) return prev;
        return { ...prev, messages: [...prev.messages, placeholder] };
      });
      try {
        const response = await imageService.generate({
          prompt,
          n: 1,
          size: "1024x1024",
        });
        if (response.images.length === 0) {
          throw new Error("引擎没有返回图片，请检查 image_gen 模型配置");
        }
        lastImagePromptRef.current = prompt;
        // PLAT-06: chat-generated images flow into the asset model too.
        void recordImageAssets("chat", prompt, response.images, {
          model: response.model_used,
        });
        setSelectedConversation((prev) => {
          if (!prev || prev.id !== conversationId) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    status: "completed",
                    content: prompt,
                    attachments: [
                      {
                        id: `${assistantId}-img`,
                        name: exportFilename(prompt, "1024x1024", 1),
                        type: "image/png",
                        size: 0,
                        url: response.images[0],
                      },
                    ],
                  }
                : m,
            ),
          };
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        setSelectedConversation((prev) => {
          if (!prev || prev.id !== conversationId) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === assistantId
                ? { ...m, status: "error", content: `生图失败：${detail}` }
                : m,
            ),
          };
        });
        message.error("生图失败");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // CHAT-06: in-chat video — async task card as a message that fills in
  // with the finished clip (attachment type video/mp4).
  const runVideoGeneration = useCallback(
    async (conversationId: string, prompt: string) => {
      setIsLoading(true);
      const assistantId = `msg-a-video-${Date.now()}`;
      const placeholder: Message = {
        id: assistantId,
        conversationId,
        role: "assistant",
        content: prompt,
        status: "pending",
        createdAt: new Date(),
      };
      setSelectedConversation((prev) => {
        if (!prev || prev.id !== conversationId) return prev;
        return { ...prev, messages: [...prev.messages, placeholder] };
      });
      const patch = (patchFields: Partial<Message>) => {
        setSelectedConversation((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === assistantId ? { ...m, ...patchFields } : m,
            ),
          };
        });
      };
      try {
        const submitted = await videoService.submit({ prompt });
        patch({ content: `视频生成中…（任务 ${submitted.task_id.slice(0, 10)}）` });
        setIsLoading(false);
        const final = await videoService.pollUntilTerminal(
          submitted.task_id,
          () => {},
          3000,
          200,
        );
        if (final.status === "succeeded" && final.video) {
          patch({
            status: "completed",
            content: prompt,
            attachments: [
              {
                id: `${assistantId}-video`,
                name: `${prompt.slice(0, 20)}.mp4`,
                type: "video/mp4",
                size: 0,
                url: final.video,
              },
            ],
          });
          message.success("视频已生成");
        } else {
          patch({
            status: "error",
            content: `视频生成失败：${final.error ?? "未知错误"}`,
          });
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        patch({ status: "error", content: `视频生成失败：${detail}` });
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // CHAT-10: regenerate an assistant reply in place (list is patched, not rebuilt)
  const handleRegenerate = useCallback(
    async (assistantMessageId: string) => {
      if (!selectedConversation || isLoading) return;
      regenerateCountRef.current += 1;
      if (regenerateCountRef.current === 3) {
        const fired = fireGuidance("rerun-often-expert");
        if (fired) setGuidance("rerun-often-expert");
      }
      const history = historyForRegeneration(
        selectedConversation.messages,
        assistantMessageId,
      );
      if (!history) return;
      const lastUser = [...history].reverse().find((m) => m.role === "user");
      if (!lastUser) return;

      const conversationId = selectedConversation.id;
      // Drop this assistant message (and anything after it), keep the rest.
      setSelectedConversation((prev) => {
        if (!prev || prev.id !== conversationId) return prev;
        const idx = prev.messages.findIndex((m) => m.id === assistantMessageId);
        if (idx === -1) return prev;
        return { ...prev, messages: prev.messages.slice(0, idx) };
      });
      await runGeneration(conversationId, history, lastUser.content);
    },
    [selectedConversation, isLoading, runGeneration],
  );

  // CHAT-10: edit a user message and resend from that point
  const handleEditResend = useCallback(
    async (userMessageId: string, newContent: string) => {
      if (!selectedConversation || isLoading) return;
      const result = applyEditResend(
        selectedConversation.messages,
        userMessageId,
        newContent,
      );
      if (!result) return;

      const conversationId = selectedConversation.id;
      setSelectedConversation((prev) => {
        if (!prev || prev.id !== conversationId) return prev;
        return { ...prev, messages: result.messages };
      });
      await runGeneration(
        conversationId,
        result.messages.slice(0, -1),
        newContent,
      );
    },
    [selectedConversation, isLoading, runGeneration],
  );

  // CHAT-10: branch a new conversation from a message, carrying the parent
  // context snapshot and a "源自 xx" marker in the title.
  const handleBranch = useCallback(
    async (anchorMessageId: string, includeAnchor: boolean) => {
      if (!selectedConversation) return;
      branchCountRef.current += 1;
      if (branchCountRef.current === 3) {
        const fired = fireGuidance("branch-many-experts");
        if (fired) setGuidance("branch-many-experts");
      }
      const snapshot = branchSnapshot(
        selectedConversation.messages,
        anchorMessageId,
        includeAnchor,
      );
      if (!snapshot || snapshot.length === 0) return;
      try {
        const branchTitle = `源自「${selectedConversation.title}」`;
        const branch = await conversationApi.create({
          agentId: selectedConversation.agentId,
          title: branchTitle,
        });
        const seeded: Conversation = {
          ...branch,
          title: branchTitle,
          messages: snapshot.map((m) => ({
            ...m,
            conversationId: branch.id,
          })),
        };
        setConversations((prev) => [seeded, ...prev]);
        setSelectedConversation(seeded);
        setSelectedAgentId(seeded.agentId);
        message.success("已创建分支对话");
      } catch (error) {
        console.error("Failed to branch conversation:", error);
        message.error("创建分支失败");
      }
    },
    [selectedConversation],
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
      <div className="flex-1 flex flex-col">
        {guidance && <GuidanceCard guidance={GUIDANCES[guidance]} />}
        <div className="flex-1 min-h-0">
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
          webSearch={webSearch}
          onWebSearchChange={setWebSearch}
          expertName={expert?.name}
          onExpertDismiss={() => setExpert(null)}
          toolScope={toolScope}
          onToolScopeChange={setToolScope}
          ttsEnabled={ttsEnabled}
          onTtsEnabledChange={setTtsEnabled}
          onRegenerate={handleRegenerate}
          onEditResend={handleEditResend}
          onBranch={handleBranch}
        />
        </div>
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
                  {agent.agent_name}
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
