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
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import dayjs from "dayjs";
import { MarkdownRenderer } from "../common";
import ModelPicker from "./ModelPicker";
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
  onRegenerate,
  onEditResend,
  onBranch,
}: ChatContainerProps) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [showParamModal, setShowParamModal] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, unknown>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Handle file upload
  const handleFileChange = (info: { fileList: UploadFile[] }) => {
    setFileList(info.fileList);
    const newAttachments: MessageAttachment[] = info.fileList
      .filter((file) => file.originFileObj)
      .map((file) => ({
        id: file.uid,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size || 0,
        file: file.originFileObj,
      }));
    setAttachments(newAttachments);
  };

  // Remove attachment
  const handleRemoveFile = (file: UploadFile) => {
    setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
    setAttachments((prev) => prev.filter((a) => a.id !== file.uid));
  };

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

    onSendMessage(
      input.trim(),
      attachments.length > 0 ? attachments : undefined,
      paramValues,
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
    <div className="flex flex-col h-full bg-[var(--color-bg-base)]">
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
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SendOutlined />
            </button>
          )}
        </div>
      </div>

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
      message.warning("复制失败");
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
          <div className="mb-2 flex flex-wrap gap-1">
            {message.attachments.map((att) => (
              <div
                key={att.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-(--color-bg-tertiary) rounded text-xs"
              >
                <PaperClipOutlined />
                <span>{att.name}</span>
              </div>
            ))}
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
