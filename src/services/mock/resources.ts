/**
 * Resource Management Mock 数据和 API
 */

// API 密钥状态
export type ApiKeyStatus = 'active' | 'expired' | 'revoked';

// API 密钥
export interface ApiKey {
  id: string;
  name: string;
  provider_id: string;
  provider_name: string | null;
  keyPrefix: string; // 打码前缀，e.g. "sk-abc...xyz"
  fullKey: string; // 完整密钥，后端返回
  status: ApiKeyStatus;
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
  createdBy: string;
  description?: string;
}

// 资源配额
export interface ResourceQuota {
  id: string;
  name: string;
  targetType: 'global' | 'user' | 'department' | 'agent';
  targetId?: string;
  targetName?: string;
  limits: QuotaLimits;
  usage: QuotaUsage;
  period: 'daily' | 'weekly' | 'monthly';
  resetAt: Date;
}

// 配额限制
export interface QuotaLimits {
  maxTokens: number;
  maxRequests: number;
  maxConversations: number;
  maxCost: number; // 金额，单位：元
}

// 配额使用情况
export interface QuotaUsage {
  tokens: number;
  requests: number;
  conversations: number;
  cost: number;
}

// 资源使用统计
export interface ResourceUsageStats {
  totalTokens: number;
  totalRequests: number;
  totalCost: number;
  tokensByProvider: Record<string, number>;
  requestsByProvider: Record<string, number>;
  costByProvider: Record<string, number>;
  dailyUsage: Array<{
    date: string;
    tokens: number;
    requests: number;
    cost: number;
  }>;
}

// Provider 选项
export const providerOptions = [
  { value: 'openai', label: 'OpenAI', prefix: 'sk-' },
  { value: 'anthropic', label: 'Claude (Anthropic)', prefix: 'sk-ant-' },
  { value: 'zhipu', label: '智谱 AI', prefix: '' },
  { value: 'alibaba', label: '阿里云百炼', prefix: '' },
  { value: 'baidu', label: '百度千帆', prefix: '' },
  { value: 'custom', label: '自定义', prefix: '' },
  { value: 'deleted-provider-id', label: '已删除的 Provider', prefix: '' },
];

// Mock API 密钥数据
const generateMockApiKeys = (): ApiKey[] => {
  const keys: ApiKey[] = [
    {
      id: 'key-1',
      name: 'OpenAI 生产环境',
      provider_id: 'openai',
      provider_name: 'OpenAI',
      keyPrefix: 'sk-prod...xyz123',
      fullKey: 'sk-proj-abc123def456789xyz123def456789',
      status: 'active',
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      lastUsedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      usageCount: 15234,
      createdBy: '张三',
      description: '用于生产环境的 OpenAI API 密钥',
    },
    {
      id: 'key-2',
      name: 'Claude 主密钥',
      provider_id: 'anthropic',
      provider_name: 'Claude (Anthropic)',
      keyPrefix: 'sk-ant-main...abc',
      fullKey: 'sk-ant-api123456789abcdefghijklmnopqrstuvwxyz',
      status: 'active',
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      usageCount: 8567,
      createdBy: '李四',
      description: 'Claude API 主密钥',
    },
    {
      id: 'key-3',
      name: '智谱 AI 测试',
      provider_id: 'zhipu',
      provider_name: '智谱 AI',
      keyPrefix: 'zhipu-test...789',
      fullKey: 'zhipu-api-test-key-123456789',
      status: 'active',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      lastUsedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      usageCount: 2341,
      createdBy: '王五',
      description: '智谱 AI 测试环境密钥',
    },
    {
      id: 'key-4',
      name: '旧 OpenAI 密钥',
      provider_id: 'openai',
      provider_name: 'OpenAI',
      keyPrefix: 'sk-old...expired',
      fullKey: 'sk-old-key-987654321abcdefghijklmnopqrstuvwxyz',
      status: 'revoked',
      createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastUsedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      usageCount: 45000,
      createdBy: '张三',
      description: '已废弃的旧密钥',
    },
    {
      id: 'key-5',
      name: '阿里云百炼',
      provider_id: 'alibaba',
      provider_name: '阿里云百炼',
      keyPrefix: 'aliyun...def456',
      fullKey: 'aliyun-sk-abcdef1234567890',
      status: 'active',
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      lastUsedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      usageCount: 5678,
      createdBy: '赵六',
    },
    {
      id: 'key-6',
      name: '已删除的 Provider',
      provider_id: 'deleted-provider-id',
      provider_name: null,
      keyPrefix: 'unknown...xxx',
      fullKey: 'unknown-provider-key-123456789',
      status: 'active',
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      lastUsedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      usageCount: 1234,
      createdBy: '测试用户',
      description: 'Provider 已被删除，需要重新关联',
    },
  ];

  return keys;
};

// Mock 资源配额数据
const generateMockQuotas = (): ResourceQuota[] => {
  const quotas: ResourceQuota[] = [
    {
      id: 'quota-1',
      name: '全局配额',
      targetType: 'global',
      limits: {
        maxTokens: 10000000,
        maxRequests: 100000,
        maxConversations: 50000,
        maxCost: 10000,
      },
      usage: {
        tokens: 5234567,
        requests: 45678,
        conversations: 23456,
        cost: 5234.56,
      },
      period: 'monthly',
      resetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
    },
    {
      id: 'quota-2',
      name: '技术部配额',
      targetType: 'department',
      targetId: 'dept-1',
      targetName: '技术部',
      limits: {
        maxTokens: 5000000,
        maxRequests: 50000,
        maxConversations: 25000,
        maxCost: 5000,
      },
      usage: {
        tokens: 3456789,
        requests: 34567,
        conversations: 17890,
        cost: 3456.78,
      },
      period: 'monthly',
      resetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
    },
    {
      id: 'quota-3',
      name: '张三配额',
      targetType: 'user',
      targetId: 'user-1',
      targetName: '张三',
      limits: {
        maxTokens: 1000000,
        maxRequests: 10000,
        maxConversations: 5000,
        maxCost: 1000,
      },
      usage: {
        tokens: 567890,
        requests: 5678,
        conversations: 2345,
        cost: 567.89,
      },
      period: 'monthly',
      resetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
    },
    {
      id: 'quota-4',
      name: '通用助手配额',
      targetType: 'agent',
      targetId: 'agent-1',
      targetName: '通用助手',
      limits: {
        maxTokens: 2000000,
        maxRequests: 20000,
        maxConversations: 10000,
        maxCost: 2000,
      },
      usage: {
        tokens: 1234567,
        requests: 12345,
        conversations: 6789,
        cost: 1234.56,
      },
      period: 'monthly',
      resetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
    },
  ];

  return quotas;
};

// Mock 资源使用统计
const generateMockUsageStats = (): ResourceUsageStats => {
  const dailyUsage = [];
  const now = Date.now();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    dailyUsage.push({
      date: date.toISOString().split('T')[0],
      tokens: Math.floor(Math.random() * 500000) + 100000,
      requests: Math.floor(Math.random() * 5000) + 1000,
      cost: Math.random() * 500 + 100,
    });
  }

  return {
    totalTokens: 52345678,
    totalRequests: 456789,
    totalCost: 52345.67,
    tokensByProvider: {
      openai: 34567890,
      anthropic: 12345678,
      zhipu: 3456789,
      alibaba: 1965321,
    },
    requestsByProvider: {
      openai: 256789,
      anthropic: 123456,
      zhipu: 45678,
      alibaba: 30866,
    },
    costByProvider: {
      openai: 34567.89,
      anthropic: 12345.67,
      zhipu: 3456.78,
      baidu: 1975.33,
    },
    dailyUsage,
  };
};

let mockApiKeys: ApiKey[] = [];
let mockQuotas: ResourceQuota[] = [];

// 初始化
const initData = () => {
  if (mockApiKeys.length === 0) {
    mockApiKeys = generateMockApiKeys();
    mockQuotas = generateMockQuotas();
  }
};

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 生成随机 API Key
function generateApiKey(prefix: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = prefix;
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// 获取 Key 前缀显示
function getKeyPrefix(fullKey: string): string {
  if (fullKey.length <= 12) return fullKey;
  return fullKey.substring(0, 8) + '...' + fullKey.substring(fullKey.length - 4);
}

// Resource Management API Mock
export const resourceApi = {
  // ============ API 密钥管理 ============

  // 获取 API 密钥列表
  async getApiKeys(filter?: {
    provider?: string;
    status?: ApiKeyStatus;
    search?: string;
  }): Promise<ApiKey[]> {
    await delay(300);
    initData();

    let keys = [...mockApiKeys];

    if (filter?.provider) {
      keys = keys.filter((k) => k.provider_id === filter.provider || k.provider_name === filter.provider);
    }
    if (filter?.status) {
      keys = keys.filter((k) => k.status === filter.status);
    }
    if (filter?.search) {
      const query = filter.search.toLowerCase();
      keys = keys.filter(
        (k) =>
          k.name.toLowerCase().includes(query) ||
          k.description?.toLowerCase().includes(query)
      );
    }

    return keys;
  },

  // 获取单个 API 密钥
  async getApiKey(id: string): Promise<ApiKey | undefined> {
    await delay(200);
    initData();
    return mockApiKeys.find((k) => k.id === id);
  },

  // 创建 API 密钥
  async createApiKey(data: {
    name: string;
    provider_id: string;
    key?: string;
    keyPrefix?: string;
    description?: string;
    expiresAt?: Date;
    createdBy?: string;
  }): Promise<ApiKey & { fullKey: string }> {
    await delay(300);
    initData();

    const provider = providerOptions.find((p) => p.value === data.provider_id);
    const fullKey = data.key || data.keyPrefix || generateApiKey(provider?.prefix || '');

    const apiKey: ApiKey & { fullKey: string } = {
      id: `key-${Date.now()}`,
      name: data.name,
      provider_id: data.provider_id,
      provider_name: provider?.label ?? null,
      keyPrefix: getKeyPrefix(fullKey),
      fullKey,
      status: 'active',
      createdAt: new Date(),
      expiresAt: data.expiresAt,
      usageCount: 0,
      createdBy: data.createdBy || '系统',
      description: data.description,
    };

    mockApiKeys.push(apiKey);
    return apiKey;
  },

  // 更新 API 密钥
  async updateApiKey(id: string, data: Partial<ApiKey>): Promise<ApiKey | undefined> {
    await delay(300);
    initData();

    const index = mockApiKeys.findIndex((k) => k.id === id);
    if (index === -1) return undefined;

    // e.g.果更新了 provider_id，需要同时更新 provider_name
    let providerName = mockApiKeys[index].provider_name;
    if (data.provider_id) {
      const provider = providerOptions.find((p) => p.value === data.provider_id);
      providerName = provider?.label ?? null;
    }

    mockApiKeys[index] = {
      ...mockApiKeys[index],
      ...data,
      provider_name: providerName,
    };

    return mockApiKeys[index];
  },

  // 撤销 API 密钥
  async revokeApiKey(id: string): Promise<ApiKey | undefined> {
    await delay(200);
    initData();

    const key = mockApiKeys.find((k) => k.id === id);
    if (!key) return undefined;

    key.status = 'revoked';
    return key;
  },

  // 删除 API 密钥
  async deleteApiKey(id: string): Promise<boolean> {
    await delay(200);
    initData();

    const index = mockApiKeys.findIndex((k) => k.id === id);
    if (index === -1) return false;

    mockApiKeys.splice(index, 1);
    return true;
  },

  // 验证 API 密钥
  async validateApiKey(id: string): Promise<{ valid: boolean; message: string }> {
    await delay(500);
    initData();

    const key = mockApiKeys.find((k) => k.id === id);
    if (!key) {
      return { valid: false, message: '密钥不存在' };
    }
    if (key.status === 'revoked') {
      return { valid: false, message: '密钥已被撤销' };
    }
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return { valid: false, message: '密钥已过期' };
    }

    return { valid: true, message: '密钥有效' };
  },

  // ============ 资源配额管理 ============

  // 获取配额列表
  async getQuotas(filter?: {
    targetType?: 'global' | 'user' | 'department' | 'agent';
  }): Promise<ResourceQuota[]> {
    await delay(300);
    initData();

    let quotas = [...mockQuotas];

    if (filter?.targetType) {
      quotas = quotas.filter((q) => q.targetType === filter.targetType);
    }

    return quotas;
  },

  // 获取单个配额
  async getQuota(id: string): Promise<ResourceQuota | undefined> {
    await delay(200);
    initData();
    return mockQuotas.find((q) => q.id === id);
  },

  // 更新配额
  async updateQuota(id: string, data: Partial<QuotaLimits>): Promise<ResourceQuota | undefined> {
    await delay(300);
    initData();

    const quota = mockQuotas.find((q) => q.id === id);
    if (!quota) return undefined;

    quota.limits = {
      ...quota.limits,
      ...data,
    };

    return quota;
  },

  // 创建配额
  async createQuota(data: {
    name: string;
    targetType: 'global' | 'user' | 'department' | 'agent';
    targetId?: string;
    targetName?: string;
    limits: QuotaLimits;
    period: 'daily' | 'weekly' | 'monthly';
  }): Promise<ResourceQuota> {
    await delay(300);
    initData();

    const quota: ResourceQuota = {
      id: `quota-${Date.now()}`,
      name: data.name,
      targetType: data.targetType,
      targetId: data.targetId,
      targetName: data.targetName,
      limits: data.limits,
      usage: {
        tokens: 0,
        requests: 0,
        conversations: 0,
        cost: 0,
      },
      period: data.period,
      resetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
    };

    mockQuotas.push(quota);
    return quota;
  },

  // 删除配额
  async deleteQuota(id: string): Promise<boolean> {
    await delay(200);
    initData();

    const index = mockQuotas.findIndex((q) => q.id === id);
    if (index === -1) return false;

    mockQuotas.splice(index, 1);
    return true;
  },

  // ============ 资源使用统计 ============

  // 获取使用统计
  async getUsageStats(_filter?: {
    startDate?: string;
    endDate?: string;
    provider?: string;
  }): Promise<ResourceUsageStats> {
    await delay(300);
    // 简化处理，实际应根据筛选条件过滤
    return generateMockUsageStats();
  },

  // 获取配额使用概览
  async getQuotaOverview(): Promise<{
    global: ResourceQuota | null;
    topUsers: Array<{ name: string; usage: number; limit: number }>;
    topAgents: Array<{ name: string; usage: number; limit: number }>;
  }> {
    await delay(200);
    initData();

    const global = mockQuotas.find((q) => q.targetType === 'global') || null;

    const userQuotas = mockQuotas
      .filter((q) => q.targetType === 'user')
      .map((q) => ({
        name: q.targetName || 'Unknown',
        usage: q.usage.tokens,
        limit: q.limits.maxTokens,
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5);

    const agentQuotas = mockQuotas
      .filter((q) => q.targetType === 'agent')
      .map((q) => ({
        name: q.targetName || 'Unknown',
        usage: q.usage.tokens,
        limit: q.limits.maxTokens,
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5);

    return {
      global,
      topUsers: userQuotas,
      topAgents: agentQuotas,
    };
  },
};
