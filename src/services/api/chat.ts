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

  // Streaming chat - read the backend streaming response via SSE.
  // An aborted signal keeps the content accumulated so far (half-generated
  // messages stay in the transcript instead of being lost).
  async chatStream(
    request: ChatRequest,
    onChunk: StreamCallback,
    signal?: AbortSignal,
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
      signal,
    });

    if (!response.ok || !response.body) {
      // Fall back to non-streaming
      return this.chat({ ...request, stream: false });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let chatId = `chat-${Date.now()}`;
    let aborted = false;
    // SSE frames can split across network chunks; buffer partial lines so no
    // frame is dropped when a `data:` line arrives in pieces.
    let lineBuffer = "";

    const consumeLine = (rawLine: string) => {
      const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
      if (!line.startsWith("data: ")) return;
      const data = line.slice(6).trim();
      if (data === "[DONE]") {
        onChunk("", true);
        return;
      }
      let parsed: {
        id?: string;
        error?: { message?: string };
        choices?: Array<{ delta?: { content?: string } }>;
      };
      try {
        parsed = JSON.parse(data);
      } catch {
        // Non-JSON keep-alive payload: skip the line
        return;
      }
      if (parsed.error?.message) {
        throw new Error(parsed.error.message);
      }
      const delta = parsed.choices?.[0]?.delta?.content ?? "";
      if (delta) {
        fullContent += delta;
        onChunk(delta, false);
      }
      if (parsed.id) chatId = parsed.id;
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split("\n");
        // The last element is either "" (buffer ended with \n) or an
        // incomplete line carried over to the next chunk.
        lineBuffer = lines.pop() ?? "";
        for (const line of lines) {
          consumeLine(line);
        }
      }
      // Flush a trailing frame if the stream closed without a final newline.
      if (lineBuffer) {
        consumeLine(lineBuffer);
      }
    } catch (streamError) {
      if (signal?.aborted || (streamError instanceof DOMException && streamError.name === "AbortError")) {
        aborted = true;
      } else {
        throw streamError;
      }
    } finally {
      reader.releaseLock();
    }

    return {
      id: chatId,
      content: fullContent,
      finishReason: aborted ? "abort" : "stop",
    };
  }
}

// Export singleton
export const chatService = new ChatService();

// Export convenience methods
export const chat = (request: ChatRequest) => chatService.chat(request);
export const chatStream = (request: ChatRequest, onChunk: StreamCallback) =>
  chatService.chatStream(request, onChunk);
