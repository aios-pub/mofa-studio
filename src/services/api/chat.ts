/**
 * Conversation API service
 * Call LLM providers via the backend /v1/chat/completions proxy
 */

import { apiClient } from "../api/apiClient";

// API configuration
export interface APIConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
}

// Streaming response callback
export type StreamCallback = (chunk: string, done: boolean) => void;

// Conversation request parameters
export interface ChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

// Conversation response
export interface ChatResponse {
  id: string;
  content: string;
  tokens?: {
    input: number;
    output: number;
  };
  finishReason: string;
}

// Provider configuration mapping
export const providerConfigs: Record<string, { baseUrl: string; models: string[] }> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  },
  zhipu: {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4', 'glm-3-turbo'],
  },
};

/**
 * Chat service class
 * Call various LLM providers via the backend proxy
 */
class ChatService {
  private config: APIConfig | null = null;

  setConfig(config: APIConfig) {
    this.config = config;
  }

  getConfig(): APIConfig | null {
    return this.config;
  }

  // Send chat request (non-streaming)
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const body: Record<string, unknown> = {
      messages: request.messages,
      stream: false,
    };
    if (request.model) body.model = request.model;
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;

    const data = await apiClient.post<{
      id?: string;
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      content?: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    }>("/v1/chat/completions", body);

    return {
      id: data.id ?? `chat-${Date.now()}`,
      content: data.choices?.[0]?.message?.content ?? data.content ?? "",
      tokens: data.usage
        ? { input: data.usage.prompt_tokens ?? 0, output: data.usage.completion_tokens ?? 0 }
        : undefined,
      finishReason: data.choices?.[0]?.finish_reason ?? "stop",
    };
  }

  // Streaming chat - read the backend streaming response via SSE
  async chatStream(
    request: ChatRequest,
    onChunk: StreamCallback,
  ): Promise<ChatResponse> {
    const baseURL = apiClient.getBaseUrl?.() ?? "";
    const url = `${baseURL}/v1/chat/completions`;

    const body: Record<string, unknown> = {
      messages: request.messages,
      stream: true,
    };
    if (request.model) body.model = request.model;
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      // Fall back to non-streaming
      return this.chat({ ...request, stream: false });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let chatId = `chat-${Date.now()}`;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            onChunk("", true);
            continue;
          }
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              fullContent += delta;
              onChunk(delta, false);
            }
            if (parsed.id) chatId = parsed.id;
          } catch {
            // Ignore parse errors and continue with the next line
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      id: chatId,
      content: fullContent,
      finishReason: "stop",
    };
  }
}

// Export singleton
export const chatService = new ChatService();

// Export convenience methods
export const chat = (request: ChatRequest) => chatService.chat(request);
export const chatStream = (request: ChatRequest, onChunk: StreamCallback) =>
  chatService.chatStream(request, onChunk);
