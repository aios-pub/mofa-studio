/**
 * Conversation real API
 * Backend endpoints: /api/conversation/...
 *
 * Backend field mapping (snake_case -> camelCase):
 *   agent_id       → agentId
 *   user_id        → userId
 *   total_tokens   → totalTokens
 *   create_time    → createdAt
 *   update_time    → updatedAt
 */

import { apiClient } from "../api/apiClient";
import { parseDate } from "./fieldMapper";
import type { Conversation, Message } from "@/types";

// ==================== Raw backend types ====================

interface BackendConversation {
  id: string;
  agent_id: string;
  user_id: string;
  title?: string;
  total_tokens: number;
  status?: string;
  tenant_id?: string;
  create_time: string;
  update_time: string;
}

// ==================== Field mapping ====================

function mapConversation(raw: BackendConversation): Conversation {
  return {
    id: raw.id,
    agentId: raw.agent_id,
    title: raw.title || "新对话",
    messages: [],
    totalTokens: raw.total_tokens ?? 0,
    createdAt: parseDate(raw.create_time) ?? new Date(),
    updatedAt: parseDate(raw.update_time) ?? new Date(),
  };
}

// ==================== API methods ====================

export const conversationRealApi = {
  /** Get all conversations */
  async getAll(): Promise<Conversation[]> {
    const data = await apiClient.get<BackendConversation[]>("/api/conversation/list");
    if (!Array.isArray(data)) return [];
    return data.map(mapConversation);
  },

  /** Get a single conversation */
  async getById(id: string): Promise<Conversation | undefined> {
    const raw = await apiClient.get<BackendConversation>(`/api/conversation/${id}`);
    return mapConversation(raw);
  },

  /** Get conversations by user_id */
  async getByUser(userId: string): Promise<Conversation[]> {
    const data = await apiClient.get<BackendConversation[]>(`/api/conversation/by-user?user_id=${userId}`);
    if (!Array.isArray(data)) return [];
    return data.map(mapConversation);
  },

  /** Get conversations by agent_id */
  async getByAgent(agentId: string): Promise<Conversation[]> {
    const data = await apiClient.get<BackendConversation[]>(`/api/conversation/by-agent?agent_id=${agentId}`);
    if (!Array.isArray(data)) return [];
    return data.map(mapConversation);
  },

  /** Create conversation */
  async create(data: { agentId: string; title?: string }): Promise<Conversation> {
    const body = {
      agent_id: data.agentId,
      title: data.title || "新对话",
    };
    const raw = await apiClient.post<BackendConversation>("/api/conversation/create", body);
    return mapConversation(raw);
  },

  /** Update conversation */
  async update(id: string, data: Partial<Conversation>): Promise<Conversation> {
    const existing = await conversationRealApi.getById(id);
    const merged = { ...(existing || {}), ...data };
    const body: Record<string, unknown> = { id };
    if (merged.title !== undefined) body.title = merged.title;
    if (merged.agentId !== undefined) body.agent_id = merged.agentId;
    const raw = await apiClient.post<BackendConversation>("/api/conversation/update", body);
    return mapConversation(raw);
  },

  /** Delete conversation */
  async delete(id: string): Promise<boolean> {
    await apiClient.delete(`/api/conversation/delete/${id}`);
    return true;
  },

  /** Get conversation messages - backend has no dedicated message list endpoint yet */
  async getMessages(_conversationId: string): Promise<Message[]> {
    return [];
  },

  /** Send message */
  async sendMessage(
    conversationId: string,
    content: string,
    model?: string,
  ): Promise<{ userMessage: Message; assistantMessage: Message }> {
    // Non-streaming path through the llm-gateway (mofa-engine). The gateway
    // answers in OpenAI chat-completion shape; build the Message pair here.
    const body: Record<string, unknown> = {
      messages: [{ role: "user", content }],
    };
    if (model) body.model = model;
    const completion = await apiClient.post<{
      id?: string;
      model?: string;
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    }>("/v1/chat/completions", body);

    const now = new Date();
    const text = completion.choices?.[0]?.message?.content ?? "";
    const inputTokens = completion.usage?.prompt_tokens ?? 0;
    const outputTokens = completion.usage?.completion_tokens ?? 0;
    return {
      userMessage: {
        id: `msg-u-${completion.id ?? Date.now()}`,
        conversationId,
        role: "user",
        content,
        status: "completed",
        createdAt: now,
      },
      assistantMessage: {
        id: `msg-a-${completion.id ?? Date.now()}`,
        conversationId,
        role: "assistant",
        content: text,
        status: "completed",
        tokens: { input: inputTokens, output: outputTokens },
        createdAt: now,
      },
    };
  },
};
