/**
 * 对话页面
 */

import { useState, useEffect, useCallback } from 'react';
import { conversationApi } from '@/services';
import { ConversationList } from '../../components/common';
import { ChatContainer } from '../../components/conversation';
import type { Conversation } from '../../types';

export default function ConversationPage() {
  const [, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 加载会话列表
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const data = await conversationApi.getAll();
      setConversations(data);
      // 默认选中第一个会话
      if (data.length > 0 && !selectedConversation) {
        setSelectedConversation(data[0]);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  // 选择会话
  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
  }, []);

  // 发送消息
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!selectedConversation) return;

      setIsLoading(true);

      try {
        const { userMessage, assistantMessage } = await conversationApi.sendMessage(
          selectedConversation.id,
          content
        );

        // 更新当前会话
        setSelectedConversation((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [...prev.messages, userMessage, assistantMessage],
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
              : c
          )
        );
      } catch (error) {
        console.error('Failed to send message:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedConversation]
  );

  return (
    <div className="flex h-full">
      {/* 左侧会话列表 */}
      <div className="w-72 flex-shrink-0 border-r border-[var(--color-border)]">
        <ConversationList
          onSelectConversation={handleSelectConversation}
          selectedId={selectedConversation?.id}
        />
      </div>

      {/* 右侧对话区域 */}
      <div className="flex-1">
        <ChatContainer
          conversation={selectedConversation}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
