/**
 * Provider Mock 数据
 */

// 重新导出类型以便其他模块使用
export type { Provider, ProviderType, ProviderModel } from '../../types/provider';
import type { Provider, ProviderModel, CreateProviderFormData } from '../../types/provider';

/** 外部模型（来自厂商 API） */
export interface ExternalModel {
  model_id: string;
  model_type: string | null;
  owned_by: string | null;
}

// 兼容旧类型
export interface Model {
  id: string;
  name: string;
  providerId: string;
  maxTokens: number;
  pricing: {
    input: number;
    output: number;
  };
  enabled: boolean;
}

// Mock Providers 列表
export const mockProviders: Provider[] = [
  {
    id: 'provider-1',
    name: 'OpenAI',
    type: 'openai',
    apiKey: 'sk-****...****abcd',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4', name: 'GPT-4', maxTokens: 8192, pricing: { input: 0.03, output: 0.06 }, enabled: true },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', maxTokens: 128000, pricing: { input: 0.01, output: 0.03 }, enabled: true },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', maxTokens: 16384, pricing: { input: 0.0005, output: 0.0015 }, enabled: true },
    ],
    status: 'active',
    config: {},
    usage: {
      totalCalls: 1234,
      totalTokens: 2500000,
      lastUsed: new Date(),
    },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-03-14'),
  },
  {
    id: 'provider-2',
    name: 'Claude (Anthropic)',
    type: 'anthropic',
    apiKey: 'sk-ant-****...****efgh',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-3-opus', name: 'Claude 3 Opus', maxTokens: 200000, pricing: { input: 0.015, output: 0.075 }, enabled: true },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', maxTokens: 200000, pricing: { input: 0.003, output: 0.015 }, enabled: true },
      { id: 'claude-3-haiku', name: 'Claude 3 Haiku', maxTokens: 200000, pricing: { input: 0.00025, output: 0.00125 }, enabled: true },
    ],
    status: 'active',
    config: {},
    usage: {
      totalCalls: 567,
      totalTokens: 890000,
      lastUsed: new Date(),
    },
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-03-14'),
  },
  {
    id: 'provider-3',
    name: '智谱 AI',
    type: 'zhipu',
    apiKey: '****...****ijkl',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-4', name: 'GLM-4', maxTokens: 128000, pricing: { input: 0.014, output: 0.014 }, enabled: true },
      { id: 'glm-3-turbo', name: 'GLM-3 Turbo', maxTokens: 4096, pricing: { input: 0.001, output: 0.001 }, enabled: true },
    ],
    status: 'active',
    config: {},
    usage: {
      totalCalls: 89,
      totalTokens: 120000,
      lastUsed: new Date('2026-03-13'),
    },
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-03-13'),
  },
  {
    id: 'provider-4',
    name: 'Ollama (本地)',
    type: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    models: [
      { id: 'llama2', name: 'Llama 2', maxTokens: 4096, pricing: { input: 0, output: 0 }, enabled: true },
      { id: 'mistral', name: 'Mistral', maxTokens: 8192, pricing: { input: 0, output: 0 }, enabled: true },
      { id: 'codellama', name: 'Code Llama', maxTokens: 16384, pricing: { input: 0, output: 0 }, enabled: false },
    ],
    status: 'active',
    config: {},
    usage: {
      totalCalls: 45,
      totalTokens: 0,
      lastUsed: new Date('2026-03-12'),
    },
    createdAt: new Date('2026-02-15'),
    updatedAt: new Date('2026-03-12'),
  },
];

// 模拟 API 延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Provider API Mock
export const providerApi = {
  // 获取所有 Providers
  async getAll(): Promise<Provider[]> {
    await delay(300);
    return mockProviders;
  },

  // 获取单个 Provider
  async getById(id: string): Promise<Provider | undefined> {
    await delay(200);
    return mockProviders.find((p) => p.id === id);
  },

  // 创建 Provider（兼容旧接口）
  async create(data: Partial<Provider>): Promise<Provider> {
    await delay(500);
    const newProvider: Provider = {
      id: `provider-${Date.now()}`,
      name: data.name || '新 Provider',
      type: data.type || 'custom',
      apiKey: data.apiKey,
      baseUrl: data.baseUrl,
      models: data.models || [],
      config: data.config || {},
      status: 'active',
      usage: {
        totalCalls: 0,
        totalTokens: 0,
        lastUsed: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockProviders.push(newProvider);
    return newProvider;
  },

  // 从表单数据创建 Provider（返回外部可用模型列表）
  async createFromFormData(formData: CreateProviderFormData): Promise<Provider & { availableModels?: ExternalModel[] }> {
    await delay(500);
    const { getProviderConfig } = await import('../provider/providerConfigs');
    const config = getProviderConfig(formData.type);

    const newProvider: Provider & { availableModels?: ExternalModel[] } = {
      id: `provider-${Date.now()}`,
      name: formData.name || config?.name || '新 Provider',
      type: formData.type,
      apiKey: formData.apiKey,
      baseUrl: formData.baseUrl || config?.api.defaultBaseUrl,
      models: [],
      config: formData.config || {},
      status: 'active',
      usage: {
        totalCalls: 0,
        totalTokens: 0,
        lastUsed: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      availableModels: [
        { model_id: 'gpt-4o', model_type: 'model', owned_by: 'openai' },
        { model_id: 'gpt-4o-mini', model_type: 'model', owned_by: 'openai' },
        { model_id: 'gpt-3.5-turbo', model_type: 'model', owned_by: 'openai' },
      ],
    };
    mockProviders.push(newProvider);
    return newProvider;
  },

  // 更新 Provider
  async update(id: string, data: Partial<Provider>): Promise<Provider | undefined> {
    await delay(300);
    const index = mockProviders.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    mockProviders[index] = { ...mockProviders[index], ...data, updatedAt: new Date() };
    return mockProviders[index];
  },

  // 删除 Provider
  async delete(id: string): Promise<boolean> {
    await delay(300);
    const index = mockProviders.findIndex((p) => p.id === id);
    if (index === -1) return false;
    mockProviders.splice(index, 1);
    return true;
  },

  // 验证 API Key
  async validateApiKey(id: string): Promise<{ valid: boolean; message: string }> {
    await delay(1000);
    const provider = mockProviders.find((p) => p.id === id);
    if (!provider) {
      return { valid: false, message: 'Provider not found' };
    }
    return { valid: true, message: 'API Key 有效' };
  },

  // 获取模型列表
  async getModels(id: string): Promise<ProviderModel[]> {
    await delay(200);
    const provider = mockProviders.find((p) => p.id === id);
    return provider?.models || [];
  },

  // 获取外部可用模型列表（模拟厂商 API 返回）
  async refreshModels(_id: string): Promise<ExternalModel[]> {
    await delay(1500);
    return [
      { model_id: 'gpt-4o', model_type: 'model', owned_by: 'openai' },
      { model_id: 'gpt-4o-mini', model_type: 'model', owned_by: 'openai' },
      { model_id: 'gpt-3.5-turbo', model_type: 'model', owned_by: 'openai' },
      { model_id: 'o1-preview', model_type: 'model', owned_by: 'openai' },
    ];
  },

  // 选择模型：为选中的模型创建记录
  async selectModels(providerId: string, modelIds: string[]): Promise<ProviderModel[]> {
    await delay(300);
    const provider = mockProviders.find((p) => p.id === providerId);
    if (!provider) return [];
    provider.models = modelIds.map(id => ({
      id: `model-${Date.now()}-${id}`,
      name: id,
      maxTokens: 0,
      pricing: { input: 0, output: 0 },
      enabled: true,
    }));
    return provider.models;
  },

  // 获取使用统计
  async getUsageStats(id: string): Promise<Provider['usage']> {
    await delay(200);
    const provider = mockProviders.find((p) => p.id === id);
    return provider?.usage || { totalCalls: 0, totalTokens: 0, lastUsed: new Date() };
  },
};
