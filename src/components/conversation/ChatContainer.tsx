/**
 * Conversation content container component
 * Supports agent selection, file upload and context clearing
 */

import { useState, useRef, useEffect } from "react";
import {
  SendOutlined,
  StopOutlined,
  RobotOutlined,
  UserOutlined,
  LoadingOutlined,
  CopyOutlined,
  ReloadOutlined,
  DownOutlined,
  ClearOutlined,
  PaperClipOutlined,
  CloseOutlined,
  SettingOutlined,
  BulbOutlined,
  EditOutlined,
  ForkOutlined,
  GlobalOutlined,
  AppstoreOutlined,
  AudioOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import {
  Select,
  Modal,
  Button,
  Input,
  InputNumber,
  Switch,
  Upload,
  DatePicker,
  message,
  Popconfirm,
  Popover,
  Checkbox,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import dayjs from "dayjs";
import { MarkdownRenderer } from "../common";
import ModelPicker from "./ModelPicker";
import {
  fillTemplate,
  filterCommands,
  loadCommands,
  type SlashCommand,
} from "@/utils/slashCommands";
import {
  CAPABILITIES,
  defaultPreselect,
  type CapabilityId,
} from "@/utils/intentRouter";
import { audioService, recordingSupported } from "@/services/api/audio";
import { ragService, ragSupports } from "@/services/api/rag";
import type {
  Message,
  Conversation,
  Agent,
  AgentInputParameter,
  MessageAttachment,
} from "../../types";

const { TextArea } = Input;

interface ChatContainerProps {
  conversation: Conversation | null;
  onSendMessage: (
    content: string,
    attachments?: MessageAttachment[],
    params?: Record<string, unknown>,
  ) => void;
  onClearContext?: () => void;
  onSelectAgent?: (agentId: string) => void;
  agents?: Agent[];
  selectedAgentId?: string;
  isLoading?: boolean;
  /** Selected engine model id (empty/AUTO_MODEL = engine auto-route). */
  model?: string;
  onModelChange?: (model: string) => void;
  /** Abort an in-flight streaming generation (keeps partial content). */
  onStopGeneration?: () => void;
  /** Deep-thinking mode: ask reasoning-capable models for a thinking trace. */
  deepThinking?: boolean;
  onDeepThinkingChange?: (enabled: boolean) => void;
  /** CHAT-03: ground answers in web search with citations. */
  webSearch?: boolean;
  onWebSearchChange?: (enabled: boolean) => void;
  /** CHAT-08: auto-speak completed assistant replies. */
  ttsEnabled?: boolean;
  onTtsEnabledChange?: (enabled: boolean) => void;
  /** CHAT-10: regenerate one assistant reply in place. */
  onRegenerate?: (assistantMessageId: string) => void;
  /** CHAT-10: edit a user message and resend from that point. */
  onEditResend?: (userMessageId: string, newContent: string) => void;
  /** CHAT-10: branch a new conversation from a message. */
  onBranch?: (anchorMessageId: string, includeAnchor: boolean) => void;
}

export default function ChatContainer({
  conversation,
  onSendMessage,
  onClearContext,
  onSelectAgent,
  agents = [],
  selectedAgentId,
  isLoading = false,
  model,
  onModelChange,
  onStopGeneration,
  deepThinking = false,
  onDeepThinkingChange,
  webSearch = false,
  onWebSearchChange,
  ttsEnabled = false,
  onTtsEnabledChange,
  onRegenerate,
  onEditResend,
  onBranch,
}: ChatContainerProps) {
  const [input, setInput] = useState("");
  const [slashCommands, setSlashCommands] = useState<SlashCommand[]>([]);
  // CHAT-08: hold-to-talk recording state.
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const micSupported = recordingSupported();
  const [slotCommand, setSlotCommand] = useState<SlashCommand | null>(null);
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [showParamModal, setShowParamModal] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, unknown>>({});
  // TASK-06 能力面板: intent-route flags applied to the NEXT send only.
  const [routeCaps, setRouteCaps] = useState<Set<"image_gen" | "video_gen">>(
    new Set(),
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSlashCommands(loadCommands());
  }, []);

  // Get the currently selected agent
  const selectedAgent =
    agents.find((a) => a.id === selectedAgentId) ||
    (conversation ? agents.find((a) => a.id === conversation.agentId) : null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  // Auto-resize the input height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // CHAT-04: encode an image File into a data-URL attachment
  const addImageFiles = (files: File[] | FileList) => {
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    for (const file of images) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        const attachment: MessageAttachment = {
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          url,
        };
        setAttachments((prev) => [...prev, attachment]);
      };
      reader.readAsDataURL(file);
    }
  };

  // CHAT-04: paste images straight into the input
  const handlePaste = (e: React.ClipboardEvent) => {
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      const hasImage = Array.from(files).some((f) => f.type.startsWith("image/"));
      if (hasImage) {
        e.preventDefault();
        addImageFiles(files);
      }
    }
  };

  // CHAT-04: drop images onto the conversation area
  const handleDrop = (e: React.DragEvent) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const hasImage = Array.from(files).some((f) => f.type.startsWith("image/"));
      if (hasImage) {
        e.preventDefault();
        addImageFiles(files);
      }
    }
  };

  // CHAT-11: route uploads — images become vision attachments, documents
  // go through the RAG pipeline and attach as citation sources.
  const handleFilesRouted = async (files: File[]) => {
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        addImageFiles([file]);
        continue;
      }
      if (ragSupports(file.name)) {
        try {
          message.info(`正在解析「${file.name}」…`);
          const doc = await ragService.upload(file);
          setAttachments((prev) => [
            ...prev,
            {
              id: doc.doc_id,
              name: file.name,
              type: "rag/doc",
              size: file.size,
            },
          ]);
          message.success(`已索引「${file.name}」（${doc.chunks} 段）`);
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          message.error(`文档解析失败：${detail}`);
        }
      } else {
        message.warning("暂不支持该格式——建议先转换为 PDF 后再上传");
      }
    }
  };

  // Handle file upload
  const handleFileChange = (info: { fileList: UploadFile[] }) => {
    setFileList(info.fileList);
    const files = info.fileList
      .filter((file) => file.originFileObj)
      .map((file) => file.originFileObj as File);
    void handleFilesRouted(files);
  };

  // Remove attachment
  const handleRemoveFile = (file: UploadFile) => {
    setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
    setAttachments((prev) => prev.filter((a) => a.id !== file.uid));
  };

  // CHAT-08: hold-to-talk — press to record, release to transcribe.
  const startRecording = async () => {
    if (!micSupported || recording || transcribing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (error) {
      message.warning("无法访问麦克风，请检查系统权限");
      console.error(error);
    }
  };

  const stopRecording = async () => {
    const recorder = recorderRef.current;
    if (!recorder || !recording) return;
    setRecording(false);
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    recorderRef.current = null;
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    if (blob.size === 0) return;
    setTranscribing(true);
    try {
      const text = await audioService.transcribe(blob);
      if (text) {
        setInput((prev) => (prev ? `${prev} ${text}` : text));
      } else {
        message.info("没有识别到语音内容");
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(`语音识别失败：${detail}`);
    } finally {
      setTranscribing(false);
    }
  };

  // CHAT-09: slash palette appears when the input starts with "/"
  const slashActive = input.startsWith("/");
  const palette = slashActive ? filterCommands(slashCommands, input) : [];

  const applyCommand = (command: SlashCommand, values: Record<string, string>) => {
    const filled = fillTemplate(command.template, values);
    setInput(filled);
    setSlotCommand(null);
    setSlotValues({});
    textareaRef.current?.focus();
  };

  const pickCommand = (command: SlashCommand) => {
    if (command.slots.length === 0) {
      applyCommand(command, {});
      return;
    }
    setSlotCommand(command);
    setSlotValues({});
  };

  // TASK-06 能力面板: rule-based suggestions for the current input.
  const suggestions = defaultPreselect(input);
  const capabilityById = (id: CapabilityId) =>
    CAPABILITIES.find((c) => c.id === id);

  const applySuggestions = () => {
    for (const id of suggestions) {
      const action = capabilityById(id)?.action;
      if (!action) continue;
      if (action.kind === "toggle" && action.key === "web_search") {
        onWebSearchChange?.(true);
      } else if (action.kind === "toggle" && action.key === "deep_thinking") {
        onDeepThinkingChange?.(true);
      } else if (action.kind === "route") {
        setRouteCaps((prev) => new Set(prev).add(action.target === "image" ? "image_gen" : "video_gen"));
      } else if (action.kind === "slash") {
        const command = slashCommands.find((c) => c.name === action.command);
        if (command) pickCommand(command);
      }
    }
  };

  const toggleRouteCap = (id: "image_gen" | "video_gen", checked: boolean) => {
    setRouteCaps((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const capabilityPanel = (
    <div className="w-64 space-y-2" data-testid="capability-panel">
      {suggestions.length > 0 ? (
        <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-text-secondary)]">
          <span className="truncate">
            按输入建议：
            {suggestions.map((id) => capabilityById(id)?.label ?? id).join("、")}
          </span>
          <Button size="small" type="link" onClick={applySuggestions} aria-label="预选建议能力">
            预选
          </Button>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-tertiary)]">
          输入内容后按意图预选；也可手动勾选
        </p>
      )}
      <div className="flex flex-col gap-1">
        <Checkbox
          checked={webSearch}
          disabled={!onWebSearchChange}
          onChange={(e) => onWebSearchChange?.(e.target.checked)}
          aria-label="能力-联网搜索"
        >
          联网搜索
        </Checkbox>
        <Checkbox
          checked={deepThinking}
          disabled={!onDeepThinkingChange}
          onChange={(e) => onDeepThinkingChange?.(e.target.checked)}
          aria-label="能力-深度思考"
        >
          深度思考
        </Checkbox>
        <Checkbox
          checked={routeCaps.has("image_gen")}
          onChange={(e) => toggleRouteCap("image_gen", e.target.checked)}
          aria-label="能力-图像生成"
        >
          图像生成路由（本次发送）
        </Checkbox>
        <Checkbox
          checked={routeCaps.has("video_gen")}
          onChange={(e) => toggleRouteCap("video_gen", e.target.checked)}
          aria-label="能力-视频生成"
        >
          视频生成路由（本次发送）
        </Checkbox>
      </div>
      <div className="flex flex-wrap gap-1 pt-1 border-t border-(--color-border)">
        {CAPABILITIES.filter((c) => c.action.kind === "slash").map((c) => (
          <Button
            key={c.id}
            size="small"
            onClick={() => {
              const command = slashCommands.find(
                (cmd) => cmd.name === (c.action as { command: string }).command,
              );
              if (command) pickCommand(command);
            }}
            aria-label={`命令工具-${c.label}`}
          >
            {c.label}
          </Button>
        ))}
      </div>
    </div>
  );

  // Send message
  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    // Check whether parameters need to be filled in
    if (
      selectedAgent?.input_parameters &&
      selectedAgent.input_parameters.length > 0
    ) {
      const hasRequiredEmpty = selectedAgent.input_parameters
        .filter((p) => p.required)
        .some(
          (p) => paramValues[p.id] === undefined || paramValues[p.id] === "",
        );

      if (hasRequiredEmpty) {
        setShowParamModal(true);
        return;
      }
    }

    // TASK-06: apply the capability panel's selections for this send —
    // toggles flip the real composer state, routes ride along as params.
    const sendParams: Record<string, unknown> = { ...paramValues };
    if (routeCaps.size > 0) {
      sendParams.force_route = routeCaps.has("image_gen")
        ? "image"
        : routeCaps.has("video_gen")
          ? "video"
          : undefined;
      setRouteCaps(new Set());
    }

    onSendMessage(
      input.trim(),
      attachments.length > 0 ? attachments : undefined,
      sendParams,
    );
    setInput("");
    setFileList([]);
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // Key handling
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Clear context
  const handleClearContext = () => {
    if (onClearContext) {
      onClearContext();
      message.success("上下文已清空");
    }
  };

  // Render the parameter input form
  const renderParameterForm = (parameter: AgentInputParameter) => {
    switch (parameter.type) {
      case "text":
        return (
          <TextArea
            placeholder={parameter.placeholder}
            value={paramValues[parameter.id] as string}
            onChange={(e) =>
              setParamValues((prev) => ({
                ...prev,
                [parameter.id]: e.target.value,
              }))
            }
            rows={2}
          />
        );
      case "number":
        return (
          <InputNumber
            placeholder={parameter.placeholder}
            value={paramValues[parameter.id] as number}
            onChange={(value) =>
              setParamValues((prev) => ({ ...prev, [parameter.id]: value }))
            }
            min={parameter.validation?.min}
            max={parameter.validation?.max}
            style={{ width: "100%" }}
          />
        );
      case "boolean":
        return (
          <Switch
            checked={paramValues[parameter.id] as boolean}
            onChange={(checked) =>
              setParamValues((prev) => ({ ...prev, [parameter.id]: checked }))
            }
          />
        );
      case "file":
        return (
          <Upload
            maxCount={1}
            beforeUpload={() => false}
            fileList={fileList}
            onChange={handleFileChange}
            onRemove={handleRemoveFile}
          >
            <Button icon={<PaperClipOutlined />}>选择文件</Button>
          </Upload>
        );
      case "select":
        return (
          <Select
            placeholder={parameter.placeholder}
            value={paramValues[parameter.id] as string}
            onChange={(value) =>
              setParamValues((prev) => ({ ...prev, [parameter.id]: value }))
            }
            options={parameter.options}
            style={{ width: "100%" }}
          />
        );
      case "date":
        return (
          <DatePicker
            value={
              paramValues[parameter.id]
                ? dayjs(paramValues[parameter.id] as string)
                : null
            }
            onChange={(date) =>
              setParamValues((prev) => ({
                ...prev,
                [parameter.id]: date?.toISOString(),
              }))
            }
            style={{ width: "100%" }}
          />
        );
      default:
        return null;
    }
  };

  // Empty state
  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--color-bg-base)]">
        <div className="text-center">
          <RobotOutlined className="text-4xl text-[var(--color-text-tertiary)] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
            选择或创建一个会话
          </h2>
          <p className="text-[var(--color-text-secondary)]">
            从左侧列表选择会话，或点击"新建对话"开始
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full bg-[var(--color-bg-base)]"
      onDragOver={(e) => {
        if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
      }}
      onDrop={handleDrop}
    >
      {/* Header - conversation info */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-(--color-border)">
        <RobotOutlined className="text-xl text-[var(--color-primary)]" />
        <div className="flex-1">
          <h2 className="font-medium text-[var(--color-text-primary)]">
            {conversation.title}
          </h2>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            {conversation.messages.length} 条消息 · {conversation.totalTokens}{" "}
            tokens
          </p>
        </div>

        {/* Engine model picker (mofa-engine via llm-gateway) */}
        {onModelChange && (
          <ModelPicker value={model} onChange={onModelChange} />
        )}

        {/* Agent selector */}
        {onSelectAgent && agents.length > 0 && (
          <Select
            placeholder="选择智能体"
            value={selectedAgentId || conversation.agentId}
            onChange={onSelectAgent}
            style={{ width: 180 }}
            options={agents.map((a) => ({
              label: a.agent_name,
              value: a.id,
            }))}
          />
        )}

        {/* Parameter settings button */}
        {selectedAgent?.input_parameters &&
          selectedAgent.input_parameters.length > 0 && (
            <Button
              icon={<SettingOutlined />}
              onClick={() => setShowParamModal(true)}
              title="参数设置"
            />
          )}

        {/* Clear context button */}
        {onClearContext && (
          <Popconfirm
            title="确定要清空上下文吗？"
            description="清空后将无法恢复消息历史"
            onConfirm={handleClearContext}
            okText="确定"
            cancelText="取消"
          >
            <Button icon={<ClearOutlined />} danger title="清空上下文">
              清空
            </Button>
          </Popconfirm>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {conversation.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RobotOutlined className="text-3xl text-[var(--color-text-tertiary)] mx-auto mb-3" />
              <p className="text-[var(--color-text-secondary)]">开始新对话</p>
              <p className="text-sm text-[var(--color-text-tertiary)]">
                输入您的问题开始
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {conversation.messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                onRegenerate={onRegenerate}
                onEditResend={onEditResend}
                onBranch={onBranch}
                disabled={isLoading}
                onQuote={(text) => {
                  setInput((prev) => (prev ? `${prev}\n${text}\n` : `${text}\n`));
                  textareaRef.current?.focus();
                }}
              />
            ))}

            {/* Loading */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-(--color-bg-tertiary) flex items-center justify-center">
                  <LoadingOutlined
                    className="text-[var(--color-text-primary)]"
                    spin
                  />
                </div>
                <div className="px-4 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-(--color-border)">
                  <span className="text-[var(--color-text-tertiary)]">
                    思考中...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Attachment preview area */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-(--color-border) bg-[var(--color-bg-secondary)]">
          <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1 px-2 py-1 bg-(--color-bg-tertiary) rounded text-sm"
              >
                <PaperClipOutlined className="text-xs" />
                <span className="text-[var(--color-text-secondary)]">
                  {att.name}
                </span>
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  ({formatFileSize(att.size)})
                </span>
                <CloseOutlined
                  className="text-xs cursor-pointer hover:text-red-500"
                  onClick={() => {
                    setAttachments((prev) =>
                      prev.filter((a) => a.id !== att.id),
                    );
                    setFileList((prev) => prev.filter((f) => f.uid !== att.id));
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-(--color-border)">
        {/* CHAT-04: image thumbnails before send */}
        {attachments.filter((a) => a.url && a.type.startsWith("image/")).length > 0 && (
          <div className="max-w-3xl mx-auto mb-2 flex flex-wrap gap-2">
            {attachments
              .filter((a) => a.url && a.type.startsWith("image/"))
              .map((att) => (
                <div
                  key={att.id}
                  className="relative group rounded-lg overflow-hidden border border-(--color-border)"
                >
                  <img
                    src={att.url}
                    alt={att.name}
                    className="w-16 h-16 object-cover cursor-zoom-in"
                    onClick={() => window.open(att.url, "_blank")}
                  />
                  <button
                    onClick={() =>
                      setAttachments((prev) => prev.filter((a) => a.id !== att.id))
                    }
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`移除图片 ${att.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            <span className="self-center text-xs text-[var(--color-text-tertiary)]">
              将随消息一并发送给视觉模型
            </span>
          </div>
        )}
        <div className="max-w-3xl mx-auto flex gap-2">
          {/* File upload button */}
          <Upload
            multiple
            showUploadList={false}
            beforeUpload={() => false}
            onChange={handleFileChange}
          >
            <button
              className="px-3 py-2 bg-[var(--color-bg-secondary)] border border-(--color-border) rounded-lg hover:bg-(--color-bg-tertiary) transition-colors"
              title="添加附件"
            >
              <PaperClipOutlined />
            </button>
          </Upload>

          {slashActive && (
            <div
              className="absolute bottom-full left-0 right-0 mb-2 max-h-64 overflow-y-auto rounded-xl bg-[var(--color-bg-primary)] border border-(--color-border) shadow-xl z-30"
              role="listbox"
              aria-label="快捷指令"
            >
              {palette.length === 0 ? (
                <p className="px-3 py-2 text-xs text-[var(--color-text-tertiary)]">
                  没有匹配的指令，输入完整内容按 Enter 正常发送
                </p>
              ) : (
                palette.map((command) => (
                  <button
                    key={command.id}
                    onClick={() => pickCommand(command)}
                    className="w-full text-left px-3 py-2 hover:bg-(--color-bg-tertiary) transition-colors"
                    role="option"
                    aria-selected={false}
                  >
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      /{command.name}
                    </span>
                    <span className="ml-2 text-xs text-[var(--color-text-tertiary)] line-clamp-1">
                      {command.slots.length > 0
                        ? `参数：${command.slots.join("、")}`
                        : command.template.slice(0, 40)}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {micSupported && (
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={() => recording && void stopRecording()}
              onTouchStart={(e) => {
                e.preventDefault();
                void startRecording();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                void stopRecording();
              }}
              disabled={transcribing}
              className={`px-3 py-2 border rounded-lg transition-colors flex items-center gap-1 text-sm ${
                recording
                  ? "bg-red-500 text-white border-red-500 animate-pulse"
                  : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-(--color-border) hover:text-[var(--color-text-primary)]"
              } disabled:opacity-40`}
              title={recording ? "松开发送识别" : "按住说话（语音输入）"}
              aria-label={recording ? "正在录音" : "按住说话"}
            >
              <AudioOutlined />
              {recording && <span className="text-xs">松手识别</span>}
            </button>
          )}
          {onTtsEnabledChange && (
            <button
              onClick={() => onTtsEnabledChange(!ttsEnabled)}
              className={`px-3 py-2 border rounded-lg transition-colors flex items-center gap-1 text-sm ${
                ttsEnabled
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                  : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-(--color-border) hover:text-[var(--color-text-primary)]"
              }`}
              title="自动播报：回答完成后自动朗读"
              aria-pressed={ttsEnabled}
              aria-label="自动播报开关"
            >
              <SoundOutlined />
            </button>
          )}

          <Popover content={capabilityPanel} trigger="click" placement="topLeft">
            <button
              className={`px-3 py-2 border rounded-lg transition-colors flex items-center gap-1 text-sm ${
                routeCaps.size > 0
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                  : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-(--color-border) hover:text-[var(--color-text-primary)]"
              }`}
              title="能力面板：按意图预选本次可用的工具（TASK-06 路由 v1）"
              aria-label="能力面板"
            >
              <AppstoreOutlined />
              <span className="hidden md:inline">能力</span>
            </button>
          </Popover>

          {onWebSearchChange && (
            <button
              onClick={() => onWebSearchChange(!webSearch)}
              className={`px-3 py-2 border rounded-lg transition-colors flex items-center gap-1 text-sm ${
                webSearch
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                  : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-(--color-border) hover:text-[var(--color-text-primary)]"
              }`}
              title="联网搜索：先检索再作答，回答附带可点击引用"
              aria-pressed={webSearch}
            >
              <GlobalOutlined />
              <span className="hidden md:inline">联网</span>
            </button>
          )}

          {onDeepThinkingChange && (
            <button
              onClick={() => onDeepThinkingChange(!deepThinking)}
              className={`px-3 py-2 border rounded-lg transition-colors flex items-center gap-1 text-sm ${
                deepThinking
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                  : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-(--color-border) hover:text-[var(--color-text-primary)]"
              }`}
              title="深度思考：让推理模型先思考再作答，思考链单独折叠展示"
              aria-pressed={deepThinking}
            >
              <BulbOutlined />
              <span className="hidden md:inline">深度思考</span>
            </button>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="输入消息，按 Enter 发送，Shift+Enter 换行..."
            rows={1}
            className="flex-1 px-4 py-2 bg-[var(--color-bg-secondary)] border border-(--color-border) rounded-lg resize-none focus:outline-none focus:border-(--color-primary) text-[var(--color-text-primary)]"
            style={{ minHeight: "44px", maxHeight: "200px" }}
          />
          {isLoading && onStopGeneration ? (
            <button
              onClick={onStopGeneration}
              className="px-4 py-2 bg-[var(--color-bg-tertiary)] border border-(--color-border) rounded-lg hover:bg-(--color-border) transition-colors flex items-center gap-1"
              title="停止生成"
            >
              <StopOutlined aria-label="停止生成" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label="发送"
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SendOutlined />
            </button>
          )}
        </div>
      </div>

      {/* CHAT-09: slash command slot filling */}
      <Modal
        title={`填充指令参数：/${slotCommand?.name ?? ""}`}
        open={slotCommand !== null}
        onOk={() => slotCommand && applyCommand(slotCommand, slotValues)}
        onCancel={() => setSlotCommand(null)}
        okText="填入"
        cancelText="取消"
      >
        <div className="space-y-3">
          {slotCommand?.slots.map((slot) => (
            <div key={slot}>
              <label className="block text-sm font-medium mb-1">{slot}</label>
              <Input.TextArea
                value={slotValues[slot] ?? ""}
                onChange={(e) =>
                  setSlotValues((prev) => ({ ...prev, [slot]: e.target.value }))
                }
                rows={slot.includes("原文") || slot.includes("内容") ? 4 : 1}
                aria-label={`参数 ${slot}`}
              />
            </div>
          ))}
        </div>
      </Modal>

      {/* Parameter input modal */}
      <Modal
        title="智能体参数设置"
        open={showParamModal}
        onOk={() => {
          setShowParamModal(false);
          if (input.trim()) {
            onSendMessage(
              input.trim(),
              attachments.length > 0 ? attachments : undefined,
              paramValues,
            );
            setInput("");
            setFileList([]);
            setAttachments([]);
          }
        }}
        onCancel={() => setShowParamModal(false)}
        okText="确定"
        cancelText="取消"
        width={500}
      >
        <div className="space-y-4">
          {selectedAgent?.input_parameters?.map((param) => (
            <div key={param.id}>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-sm font-medium text-[var(--color-text-primary)]">
                  {param.label}
                </label>
                {param.required && <span className="text-red-500">*</span>}
              </div>
              {param.description && (
                <p className="text-xs text-[var(--color-text-tertiary)] mb-1">
                  {param.description}
                </p>
              )}
              {renderParameterForm(param)}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

// Message item component
interface MessageItemProps {
  message: Message;
  onRegenerate?: (assistantMessageId: string) => void;
  onEditResend?: (userMessageId: string, newContent: string) => void;
  onBranch?: (anchorMessageId: string, includeAnchor: boolean) => void;
  onQuote?: (text: string) => void;
  disabled?: boolean;
}

function MessageItem({
  message,
  onRegenerate,
  onEditResend,
  onBranch,
  onQuote,
  disabled = false,
}: MessageItemProps) {
  const isUser = message.role === "user";
  const streaming = message.status === "pending";
  // Auto-expand the thinking trace while it streams in; the user can fold it.
  const [showThinking, setShowThinking] = useState(streaming);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(message.content);
  const [confirmEdit, setConfirmEdit] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      console.warn("clipboard write failed");
    }
  };

  const submitEdit = () => {
    if (!editDraft.trim() || !onEditResend) return;
    onEditResend(message.id, editDraft.trim());
    setEditing(false);
    setConfirmEdit(false);
  };

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? "bg-[var(--color-primary)]" : "bg-(--color-bg-tertiary)"
        }`}
      >
        {isUser ? (
          <UserOutlined className="text-white" />
        ) : (
          <RobotOutlined className="text-[var(--color-text-primary)]" />
        )}
      </div>

      {/* Message content */}
      <div className={`flex-1 max-w-[80%] ${isUser ? "text-right" : ""}`}>
        {/* Thinking process */}
        {message.thinking && (
          <div className="mb-2">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            >
              <DownOutlined
                className={`text-xs transition-transform ${showThinking ? "rotate-180" : ""}`}
              />
              {streaming ? "思考中..." : "思考过程"}
            </button>
            {showThinking && (
              <div className="mt-1 p-3 bg-(--color-bg-tertiary) rounded-lg text-sm text-[var(--color-text-secondary)] italic">
                {message.thinking.content}
              </div>
            )}
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {message.attachments.map((att) =>
              att.url && att.type.startsWith("video/") ? (
                <figure
                  key={att.id}
                  className="rounded-xl overflow-hidden border border-(--color-border) max-w-[360px]"
                >
                  <video src={att.url} controls className="w-full block" aria-label={att.name} />
                  <figcaption className="flex items-center justify-between px-2 py-1 text-xs text-[var(--color-text-tertiary)]">
                    <span className="truncate">{att.name}</span>
                    <button
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = att.url!;
                        link.download = att.name;
                        link.click();
                      }}
                      className="text-[var(--color-primary)]"
                      aria-label={`下载视频 ${att.name}`}
                    >
                      下载
                    </button>
                  </figcaption>
                </figure>
              ) : att.url && att.type.startsWith("image/") ? (

                <figure
                  key={att.id}
                  className="relative group rounded-xl overflow-hidden border border-(--color-border) max-w-[320px]"
                >
                  <img
                    src={att.url}
                    alt={att.name}
                    className="w-full block"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 p-1.5 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
                    <button
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = att.url!;
                        link.download = att.name;
                        link.click();
                      }}
                      className="px-2 py-0.5 rounded text-xs text-white bg-white/20 hover:bg-white/30"
                      aria-label={`下载图片 ${att.name}`}
                    >
                      下载
                    </button>
                    <button
                      onClick={() => {
                        window.open(att.url, "_blank");
                      }}
                      className="px-2 py-0.5 rounded text-xs text-white bg-white/20 hover:bg-white/30"
                      aria-label={`放大查看 ${att.name}`}
                    >
                      放大
                    </button>
                  </figcaption>
                </figure>
              ) : (
                <div
                  key={att.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-(--color-bg-tertiary) rounded text-xs"
                >
                  <PaperClipOutlined />
                  <span>{att.name}</span>
                </div>
              ),
            )}
          </div>
        )}

        {/* Message body */}
        <div
          className={`inline-block px-4 py-2 rounded-lg ${
            isUser
              ? "bg-[var(--color-primary)] text-white"
              : "bg-[var(--color-bg-secondary)] border border-(--color-border) text-[var(--color-text-primary)]"
          }`}
        >
          {isUser && editing ? (
            <div className="text-left space-y-2 min-w-[260px]">
              <textarea
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-(--color-bg-tertiary) border border-(--color-border) rounded-lg resize-y focus:outline-none text-[var(--color-text-primary)]"
                aria-label="编辑消息"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditDraft(message.content);
                  }}
                  className="px-3 py-1 text-xs rounded-lg border border-(--color-border) hover:bg-(--color-bg-tertiary)"
                >
                  取消
                </button>
                <button
                  onClick={() => setConfirmEdit(true)}
                  disabled={!editDraft.trim()}
                  className="px-3 py-1 text-xs rounded-lg bg-[var(--color-primary)] text-white disabled:opacity-50"
                >
                  重发
                </button>
              </div>
              <Popconfirm
                title="编辑重发将丢弃这条消息之后的对话"
                description="后续消息会被截断，无法恢复"
                open={confirmEdit}
                onConfirm={submitEdit}
                onCancel={() => setConfirmEdit(false)}
                okText="确认重发"
                cancelText="取消"
              >
                <span />
              </Popconfirm>
            </div>
          ) : isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <MarkdownRenderer
              content={message.content}
              showCopyButton={false}
            />
          )}
        </div>

        {/* CHAT-03: citation list */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 p-2 rounded-lg bg-(--color-bg-tertiary) space-y-1">
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">
              参考来源（{message.sources.length}）
            </p>
            <ol className="space-y-0.5">
              {message.sources.map((source, index) => (
                <li key={`${source.url}-${index}`} className="text-xs">
                  <span className="text-[var(--color-text-tertiary)]">
                    [{source.index ?? index + 1}]
                  </span>{" "}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--color-primary)] hover:underline"
                    title={source.snippet}
                  >
                    {source.title || source.url}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Tool call */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.toolCalls.map((tool) => (
              <div
                key={tool.id}
                className="inline-flex items-center gap-2 px-2 py-1 bg-(--color-bg-tertiary) rounded text-xs"
              >
                <span className="text-[var(--color-text-secondary)]">
                  {tool.name}
                </span>
                <span
                  className={`${
                    tool.status === "completed"
                      ? "text-green-500"
                      : tool.status === "running"
                        ? "text-blue-500"
                        : "text-red-500"
                  }`}
                >
                  {tool.status === "completed"
                    ? "✓"
                    : tool.status === "running"
                      ? "⟳"
                      : "✗"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Bottom info */}
        <div
          className={`mt-1 flex items-center gap-2 text-xs text-[var(--color-text-tertiary)] ${isUser ? "justify-end" : ""}`}
        >
          <span>{formatTime(message.createdAt)}</span>
          {message.tokens && (
            <span>
              {message.tokens.input} / {message.tokens.output} tokens
            </span>
          )}
          {/* CHAT-10 hover action bar */}
          {!streaming && !editing && (
            <div
              className={`flex items-center gap-1 msg-actions ${
                isUser ? "justify-end" : ""
              }`}
            >
              <button
                onClick={handleCopy}
                className="p-0.5 hover:bg-(--color-bg-tertiary) rounded"
                title="复制"
                aria-label="复制消息"
              >
                {copied ? (
                  <span className="text-xs text-green-500">已复制</span>
                ) : (
                  <CopyOutlined className="text-xs" />
                )}
              </button>
              {onQuote && (
                <button
                  onClick={() => onQuote(message.content)}
                  className="p-0.5 hover:bg-(--color-bg-tertiary) rounded"
                  title="引用"
                  aria-label="引用消息"
                >
                  <DownOutlined className="text-xs rotate-180" />
                </button>
              )}
              {isUser && onEditResend && (
                <button
                  onClick={() => {
                    setEditDraft(message.content);
                    setEditing(true);
                  }}
                  disabled={disabled}
                  className="p-0.5 hover:bg-(--color-bg-tertiary) rounded disabled:opacity-40"
                  title="编辑重发"
                  aria-label="编辑重发"
                >
                  <EditOutlined className="text-xs" />
                </button>
              )}
              {!isUser && onRegenerate && (
                <button
                  onClick={() => onRegenerate(message.id)}
                  disabled={disabled}
                  className="p-0.5 hover:bg-(--color-bg-tertiary) rounded disabled:opacity-40"
                  title="重新生成"
                  aria-label="重新生成"
                >
                  <ReloadOutlined className="text-xs" />
                </button>
              )}
              {onBranch && (
                <button
                  onClick={() => onBranch(message.id, !isUser)}
                  disabled={disabled}
                  className="p-0.5 hover:bg-(--color-bg-tertiary) rounded disabled:opacity-40"
                  title="从此处分支新对话"
                  aria-label="分支对话"
                >
                  <ForkOutlined className="text-xs" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Format time
function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
