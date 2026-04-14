/**
 * 对话 API 服务
 * 通过后端 /v1/chat/completions 代理调用 LLM Provider
 */

import { apiClient } from "../api/apiClient";

// API 配置
export interface APIConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
}

// 流式响应回调
export type StreamCallback = (chunk: string, done: boolean) => void;

// 对话请求参数
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

// 对话响应
export interface ChatResponse {
  id: string;
  content: string;
  tokens?: {
    input: number;
    output: number;
  };
  finishReason: string;
}

// Provider 配置映射
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
 * 聊天服务类
 * 通过后端代理调用各种 LLM Provider
 */
class ChatService {
  private config: APIConfig | null = null;

  setConfig(config: APIConfig) {
    this.config = config;
  }

  getConfig(): APIConfig | null {
    return this.config;
  }

  // 发送聊天请求 (非流式)
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

  // 流式聊天 - 通过 SSE 读取后端流式响应
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
      // 降级为非流式
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
            // 忽略解析错误，继续处理下一行
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

// 导出单例
export const chatService = new ChatService();

// 导出便捷方法
export const chat = (request: ChatRequest) => chatService.chat(request);
export const chatStream = (request: ChatRequest, onChunk: StreamCallback) =>
  chatService.chatStream(request, onChunk);
