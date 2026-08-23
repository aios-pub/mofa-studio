/**
 * 对话 Hook
 * 封装对话逻辑，支持流式响应
 */

import { useState, useCallback, useRef } from 'react';
import { chatService, type ChatRequest, type StreamCallback } from '../services/api/chat';
import type { Message, Conversation } from '../types';

interface UseChatOptions {
  conversation: Conversation | null;
  onMessageAdded?: (message: Message) => void;
  onError?: (error: Error) => void;
}

interface UseChatReturn {
  isLoading: boolean;
  error: Error | null;
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
  retry: () => void;
}

export function useChat({ conversation, onMessageAdded, onError }: UseChatOptions): UseChatReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string>('');

  // Send message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversation || isLoading) return;

      lastUserMessageRef.current = content;
      setIsLoading(true);
      setError(null);

      // 创建 AbortController 用于取消请求
      abortControllerRef.current = new AbortController();

      try {
        // 构建Messages历史
        const messages: ChatRequest['messages'] = [
          ...conversation.messages.map((m) => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content,
          })),
          { role: 'user' as const, content },
        ];

        // 创建User message
        const userMessage: Message = {
          id: `msg-${Date.now()}`,
          conversationId: conversation.id,
          role: 'user',
          content,
          status: 'completed',
          createdAt: new Date(),
        };
        onMessageAdded?.(userMessage);

        // 创建 AI Messages占位
        const aiMessageId = `msg-${Date.now() + 1}`;
        let accumulatedContent = '';

        // 流式响应回调
        const onChunk: StreamCallback = (chunk, done) => {
          if (done) {
            // 完成时创建完整的 AI Messages
            const aiMessage: Message = {
              id: aiMessageId,
              conversationId: conversation.id,
              role: 'assistant',
              content: accumulatedContent,
              status: 'completed',
              createdAt: new Date(),
            };
            onMessageAdded?.(aiMessage);
          } else {
            accumulatedContent += chunk;
            // 可以在这里触发中间状态更新
          }
        };

        // 发送请求
        await chatService.chatStream(
          {
            messages,
            model: 'gpt-4',
            temperature: 0.7,
            stream: true,
          },
          onChunk
        );
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [conversation, isLoading, onMessageAdded, onError]
  );

  // 停止生成
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  // 重试
  const retry = useCallback(() => {
    if (lastUserMessageRef.current) {
      sendMessage(lastUserMessageRef.current);
    }
  }, [sendMessage]);

  return {
    isLoading,
    error,
    sendMessage,
    stopGeneration,
    retry,
  };
}
