/**
 * Conversation hook
 * Encapsulates conversation logic with streaming support
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

      // Create an AbortController for request cancellation
      abortControllerRef.current = new AbortController();

      try {
        // Build message history
        const messages: ChatRequest['messages'] = [
          ...conversation.messages.map((m) => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content,
          })),
          { role: 'user' as const, content },
        ];

        // Create user message
        const userMessage: Message = {
          id: `msg-${Date.now()}`,
          conversationId: conversation.id,
          role: 'user',
          content,
          status: 'completed',
          createdAt: new Date(),
        };
        onMessageAdded?.(userMessage);

        // Create AI message placeholder
        const aiMessageId = `msg-${Date.now() + 1}`;
        let accumulatedContent = '';

        // Streaming response callback
        const onChunk: StreamCallback = (chunk, done) => {
          if (done) {
            // Create the full AI message on completion
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
            // Intermediate state updates can be triggered here
          }
        };

        // Send request
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

  // Stop generating
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  // Retry
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
