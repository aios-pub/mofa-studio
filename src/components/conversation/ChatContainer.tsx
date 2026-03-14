/**
 * 对话内容区容器组件
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Copy, RotateCcw, ChevronDown } from 'lucide-react';
import { MarkdownRenderer } from '../common';
import type { Message, Conversation } from '../../types';

interface ChatContainerProps {
  conversation: Conversation | null;
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
}

export default function ChatContainer({
  conversation,
  onSendMessage,
  isLoading = false,
}: ChatContainerProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  // 自动调整输入框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // 发送消息
  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // 按键处理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 空状态
  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--color-bg-base)]">
        <div className="text-center">
          <Bot className="w-16 h-16 text-[var(--color-text-tertiary)] mx-auto mb-4" />
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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
        <Bot className="w-6 h-6 text-[var(--color-primary)]" />
        <div className="flex-1">
          <h2 className="font-medium text-[var(--color-text-primary)]">{conversation.title}</h2>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            {conversation.messages.length} 条消息 · {conversation.totalTokens} tokens
          </p>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {conversation.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Bot className="w-12 h-12 text-[var(--color-text-tertiary)] mx-auto mb-3" />
              <p className="text-[var(--color-text-secondary)]">开始新对话</p>
              <p className="text-sm text-[var(--color-text-tertiary)]">输入您的问题开始</p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {conversation.messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}

            {/* 加载中 */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-[var(--color-text-primary)] animate-spin" />
                </div>
                <div className="px-4 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                  <span className="text-[var(--color-text-tertiary)]">思考中...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-[var(--color-border)]">
        <div className="max-w-3xl mx-auto flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，按 Enter 发送，Shift+Enter 换行..."
            rows={1}
            className="flex-1 px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg resize-none focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
            style={{ minHeight: '44px', maxHeight: '200px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// 消息项组件
function MessageItem({ message }: { message: Message }) {
  const [showThinking, setShowThinking] = useState(false);
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* 头像 */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-bg-tertiary)]'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-[var(--color-text-primary)]" />
        )}
      </div>

      {/* 消息内容 */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        {/* 思考过程 */}
        {message.thinking && (
          <div className="mb-2">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            >
              <ChevronDown
                className={`w-3 h-3 transition-transform ${showThinking ? 'rotate-180' : ''}`}
              />
              思考过程
            </button>
            {showThinking && (
              <div className="mt-1 p-3 bg-[var(--color-bg-tertiary)] rounded-lg text-sm text-[var(--color-text-secondary)] italic">
                {message.thinking.content}
              </div>
            )}
          </div>
        )}

        {/* 消息正文 */}
        <div
          className={`inline-block px-4 py-2 rounded-lg ${
            isUser
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
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
                className="inline-flex items-center gap-2 px-2 py-1 bg-[var(--color-bg-tertiary)] rounded text-xs"
              >
                <span className="text-[var(--color-text-secondary)]">{tool.name}</span>
                <span
                  className={`${
                    tool.status === 'completed'
                      ? 'text-green-500'
                      : tool.status === 'running'
                      ? 'text-blue-500'
                      : 'text-red-500'
                  }`}
                >
                  {tool.status === 'completed' ? '✓' : tool.status === 'running' ? '⟳' : '✗'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 底部信息 */}
        <div className={`mt-1 flex items-center gap-2 text-xs text-[var(--color-text-tertiary)] ${isUser ? 'justify-end' : ''}`}>
          <span>{formatTime(message.createdAt)}</span>
          {message.tokens && (
            <span>{message.tokens.input} / {message.tokens.output} tokens</span>
          )}
          {!isUser && (
            <div className="flex items-center gap-1">
              <button className="p-0.5 hover:bg-[var(--color-bg-tertiary)] rounded">
                <Copy className="w-3 h-3" />
              </button>
              <button className="p-0.5 hover:bg-[var(--color-bg-tertiary)] rounded">
                <RotateCcw className="w-3 h-3" />
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
  return new Date(date).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
