/**
 * 对话 API 服务
 * 支持多 Provider (OpenAI/Claude/智谱等)
 */

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
 */
class ChatService {
  private config: APIConfig | null = null;

  // 设置配置
  setConfig(config: APIConfig) {
    this.config = config;
  }

  // 获取当前配置
  getConfig(): APIConfig | null {
    return this.config;
  }

  // 发送聊天请求 (非流式)
  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.config) {
      throw new Error('API not configured');
    }

    // 根据不同 Provider 调用不同的 API
    switch (this.config.provider) {
      case 'openai':
        return this.chatOpenAI(request);
      case 'anthropic':
        return this.chatAnthropic(request);
      case 'zhipu':
        return this.chatZhipu(request);
      default:
        return this.chatGeneric(request);
    }
  }

  // 流式聊天
  async chatStream(
    request: ChatRequest,
    onChunk: StreamCallback
  ): Promise<ChatResponse> {
    if (!this.config) {
      throw new Error('API not configured');
    }

    // 模拟流式响应 (实际项目中调用真实 API)
    return this.chatStreamMock(request, onChunk);
  }

  // OpenAI API 调用
  private async chatOpenAI(request: ChatRequest): Promise<ChatResponse> {
    // TODO: 实现真实 API 调用
    return this.chatMock(request);
  }

  // Anthropic API 调用
  private async chatAnthropic(request: ChatRequest): Promise<ChatResponse> {
    // TODO: 实现真实 API 调用
    return this.chatMock(request);
  }

  // 智谱 API 调用
  private async chatZhipu(request: ChatRequest): Promise<ChatResponse> {
    // TODO: 实现真实 API 调用
    return this.chatMock(request);
  }

  // 通用 API 调用 (兼容 OpenAI 格式)
  private async chatGeneric(request: ChatRequest): Promise<ChatResponse> {
    // TODO: 实现真实 API 调用
    return this.chatMock(request);
  }

  // Mock 响应 (开发环境)
  private async chatMock(request: ChatRequest): Promise<ChatResponse> {
    await this.delay(500 + Math.random() * 500);

    const lastMessage = request.messages[request.messages.length - 1];

    return {
      id: `chat-${Date.now()}`,
      content: this.generateMockResponse(lastMessage.content),
      tokens: {
        input: lastMessage.content.length,
        output: 100,
      },
      finishReason: 'stop',
    };
  }

  // Mock 流式响应
  private async chatStreamMock(
    request: ChatRequest,
    onChunk: StreamCallback
  ): Promise<ChatResponse> {
    const lastMessage = request.messages[request.messages.length - 1];
    const fullResponse = this.generateMockResponse(lastMessage.content);

    // 模拟逐字输出
    const words = fullResponse.split('');
    for (let i = 0; i < words.length; i++) {
      await this.delay(20 + Math.random() * 30);
      onChunk(words[i], false);
    }

    onChunk('', true);

    return {
      id: `chat-${Date.now()}`,
      content: fullResponse,
      tokens: {
        input: lastMessage.content.length,
        output: fullResponse.length,
      },
      finishReason: 'stop',
    };
  }

  // 生成 Mock 响应
  private generateMockResponse(input: string): string {
    const responses = [
      `您的问题是："${input}"。这是一个模拟的 AI 响应。`,
      `关于"${input}"，我来为您详细解答。这是一个开发环境的 Mock 响应，实际使用时需要配置真实的 API。`,
      `收到您的消息："${input}"。正在为您分析中...\n\n这是一个测试响应，用于验证对话功能是否正常工作。`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // 延迟
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// 导出单例
export const chatService = new ChatService();

// 导出便捷方法
export const chat = (request: ChatRequest) => chatService.chat(request);
export const chatStream = (request: ChatRequest, onChunk: StreamCallback) =>
  chatService.chatStream(request, onChunk);
