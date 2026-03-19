/**
 * Conversation 真实 API
 * 后端端点: /api/conversation/...
 */

import { createActionApi } from "./base";
import { apiClient } from "../api/apiClient";
import type { Conversation, Message } from "@/types";

const baseApi = createActionApi<Conversation>("/api/conversation", "list");

export const conversationRealApi = {
  ...baseApi,

  async getByUser(userId: string): Promise<Conversation[]> {
    return apiClient.get<Conversation[]>(`/api/conversation/by-user?user_id=${userId}`);
  },

  async getByAgent(agentId: string): Promise<Conversation[]> {
    return apiClient.get<Conversation[]>(`/api/conversation/by-agent?agent_id=${agentId}`);
  },

  async getMessages(_conversationId: string): Promise<Message[]> {
    // 后端可能没有单独的消息列表端点，暂时返回空数组
    // 实际实现需要根据后端API调整
    return [];
  },

  async sendMessage(
    _conversationId: string,
    content: string
  ): Promise<{ userMessage: Message; assistantMessage: Message }> {
    // 使用 chat completions API
    return apiClient.post("/v1/chat/completions", {
      messages: [{ role: "user", content }],
    });
  },
};
