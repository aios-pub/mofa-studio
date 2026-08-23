/**
 * Provider mock data
 */

// Re-export types for use by other modules
export type { Provider, ProviderType, ProviderModel } from '../../types/provider';
import type { Provider, ProviderModel, CreateProviderFormData } from '../../types/provider';

/** External models (from vendor API) */
export interface ExternalModel {
  model_id: string;
  model_type: string | null;
  owned_by: string | null;
}

// Legacy type compatibility
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

// Mock providers list
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

// Mock API latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Provider API Mock
export const providerApi = {
  // Get all providers
  async getAll(): Promise<Provider[]> {
    await delay(300);
    return mockProviders;
  },

  // Get a single provider
  async getById(id: string): Promise<Provider | undefined> {
    await delay(200);
    return mockProviders.find((p) => p.id === id);
  },

  // Create provider (legacy interface compatibility)
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

  // Create a provider from form data (returns externally available model list)
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

  // Update provider
  async update(id: string, data: Partial<Provider>): Promise<Provider | undefined> {
    await delay(300);
    const index = mockProviders.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    mockProviders[index] = { ...mockProviders[index], ...data, updatedAt: new Date() };
    return mockProviders[index];
  },

  // Delete provider
  async delete(id: string): Promise<boolean> {
    await delay(300);
    const index = mockProviders.findIndex((p) => p.id === id);
    if (index === -1) return false;
    mockProviders.splice(index, 1);
    return true;
  },

  // Validate API key
  async validateApiKey(id: string): Promise<{ valid: boolean; message: string }> {
    await delay(1000);
    const provider = mockProviders.find((p) => p.id === id);
    if (!provider) {
      return { valid: false, message: 'Provider not found' };
    }
    return { valid: true, message: 'API Key 有效' };
  },

  // Get model list
  async getModels(id: string): Promise<ProviderModel[]> {
    await delay(200);
    const provider = mockProviders.find((p) => p.id === id);
    return provider?.models || [];
  },

  // Get externally available model list (simulating vendor API)
  async refreshModels(_id: string): Promise<ExternalModel[]> {
    await delay(1500);
    return [
      { model_id: 'gpt-4o', model_type: 'model', owned_by: 'openai' },
      { model_id: 'gpt-4o-mini', model_type: 'model', owned_by: 'openai' },
      { model_id: 'gpt-3.5-turbo', model_type: 'model', owned_by: 'openai' },
      { model_id: 'o1-preview', model_type: 'model', owned_by: 'openai' },
    ];
  },

  // Select model: create records for the selected models
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

  // Get usage statistics
  async getUsageStats(id: string): Promise<Provider['usage']> {
    await delay(200);
    const provider = mockProviders.find((p) => p.id === id);
    return provider?.usage || { totalCalls: 0, totalTokens: 0, lastUsed: new Date() };
  },
};
