/**
 * 对话内容区容器组件
 * 支持智能体选择、文件上传、清空上下文
 */

import { useState, useRef, useEffect } from "react";
import {
  SendOutlined,
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
}

export default function ChatContainer({
  conversation,
  onSendMessage,
  onClearContext,
  onSelectAgent,
  agents = [],
  selectedAgentId,
  isLoading = false,
}: ChatContainerProps) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [showParamModal, setShowParamModal] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, unknown>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 获取当前选中的智能体
  const selectedAgent =
    agents.find((a) => a.id === selectedAgentId) ||
    (conversation ? agents.find((a) => a.id === conversation.agentId) : null);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  // 自动调整输入框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // 处理文件上传
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

  // 移除附件
  const handleRemoveFile = (file: UploadFile) => {
    setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
    setAttachments((prev) => prev.filter((a) => a.id !== file.uid));
  };

  // 发送消息
  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    // 检查是否需要填写参数
    if (
      selectedAgent?.inputParameters &&
      selectedAgent.inputParameters.length > 0
    ) {
      const hasRequiredEmpty = selectedAgent.inputParameters
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

  // 按键处理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 清空上下文
  const handleClearContext = () => {
    if (onClearContext) {
      onClearContext();
      message.success("上下文已清空");
    }
  };

  // 渲染参数输入表单
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

  // 空状态
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
      {/* 头部 - 会话信息 */}
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

        {/* 智能体选择器 */}
        {onSelectAgent && agents.length > 0 && (
          <Select
            placeholder="选择智能体"
            value={selectedAgentId || conversation.agentId}
            onChange={onSelectAgent}
            style={{ width: 180 }}
            options={agents.map((a) => ({
              label: a.name,
              value: a.id,
            }))}
          />
        )}

        {/* 参数设置按钮 */}
        {selectedAgent?.inputParameters &&
          selectedAgent.inputParameters.length > 0 && (
            <Button
              icon={<SettingOutlined />}
              onClick={() => setShowParamModal(true)}
              title="参数设置"
            />
          )}

        {/* 清空上下文按钮 */}
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

      {/* 消息区域 */}
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
              <MessageItem key={msg.id} title={msg} />
            ))}

            {/* 加载中 */}
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

      {/* 附件预览区 */}
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

      {/* 输入区域 */}
      <div className="p-4 border-t border-(--color-border)">
        <div className="max-w-3xl mx-auto flex gap-2">
          {/* 文件上传按钮 */}
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
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SendOutlined />
          </button>
        </div>
      </div>

      {/* 参数填写弹窗 */}
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
          {selectedAgent?.inputParameters?.map((param) => (
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

// 消息项组件
function MessageItem({ message }: { message: Message }) {
  const [showThinking, setShowThinking] = useState(false);
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* 头像 */}
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

      {/* 消息内容 */}
      <div className={`flex-1 max-w-[80%] ${isUser ? "text-right" : ""}`}>
        {/* 思考过程 */}
        {message.thinking && (
          <div className="mb-2">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            >
              <DownOutlined
                className={`text-xs transition-transform ${showThinking ? "rotate-180" : ""}`}
              />
              思考过程
            </button>
            {showThinking && (
              <div className="mt-1 p-3 bg-(--color-bg-tertiary) rounded-lg text-sm text-[var(--color-text-secondary)] italic">
                {message.thinking.content}
              </div>
            )}
          </div>
        )}

        {/* 附件 */}
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

        {/* 消息正文 */}
        <div
          className={`inline-block px-4 py-2 rounded-lg ${
            isUser
              ? "bg-[var(--color-primary)] text-white"
              : "bg-[var(--color-bg-secondary)] border border-(--color-border) text-[var(--color-text-primary)]"
          }`}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <MarkdownRenderer
              content={message.content}
              showCopyButton={false}
            />
          )}
        </div>

        {/* 工具调用 */}
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

        {/* 底部信息 */}
        <div
          className={`mt-1 flex items-center gap-2 text-xs text-[var(--color-text-tertiary)] ${isUser ? "justify-end" : ""}`}
        >
          <span>{formatTime(message.createdAt)}</span>
          {message.tokens && (
            <span>
              {message.tokens.input} / {message.tokens.output} tokens
            </span>
          )}
          {!isUser && (
            <div className="flex items-center gap-1">
              <button className="p-0.5 hover:bg-(--color-bg-tertiary) rounded">
                <CopyOutlined className="text-xs" />
              </button>
              <button className="p-0.5 hover:bg-(--color-bg-tertiary) rounded">
                <ReloadOutlined className="text-xs" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 格式化时间
function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
