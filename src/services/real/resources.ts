/**
 * Resources 真实 API
 * 后端端点: /api/resource/...
 *
 * 后端字段映射 (snake_case → camelCase):
 *   key_prefix     → keyPrefix
 *   expires_at     → expiresAt
 *   last_used_at   → lastUsedAt
 *   usage_count    → usageCount
 *   created_by     → createdBy
 *   target_type    → targetType
 *   target_id      → targetId
 *   target_name    → targetName
 *   reset_at       → resetAt
 *   create_time    → createdAt
 *   update_time    → updatedAt
 */

import { apiClient } from "../api/apiClient";
import { parseDate } from "./fieldMapper";

// ==================== 前端类型 ====================

interface ApiKey {
  id: string;
  name: string;
  key: string;
  status: string;
  userId: string;
  provider?: string;
  keyPrefix?: string;
  description?: string;
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount?: number;
  createdBy?: string;
  createdAt?: Date;
}

interface ResourceQuota {
  id: string;
  name: string;
  type: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  limits: {
    maxTokens: number;
    maxRequests: number;
    maxConversations: number;
    maxCost: number;
  };
  usage: {
    tokens: number;
    requests: number;
    conversations: number;
    cost: number;
  };
  period?: string;
  resetAt?: Date;
  createdAt?: Date;
}

interface UsageStats {
  totalApiKeys: number;
  activeApiKeys: number;
  totalQuotas: number;
  quotasUsage: Record<string, number>;
}

// ==================== 后端原始类型 ====================

interface BackendApiKey {
  id: string;
  name: string;
  provider?: string;
  key_prefix?: string;
  status: string;
  description?: string;
  expires_at?: string;
  last_used_at?: string;
  usage_count?: number;
  created_by?: string;
  tenant_id?: string;
  create_time: string;
  update_time: string;
}

interface BackendResourceQuota {
  id: string;
  name: string;
  target_type?: string;
  target_id?: string;
  target_name?: string;
  limits: unknown;
  usage: unknown;
  period?: string;
  reset_at?: string;
  tenant_id?: string;
  create_time: string;
  update_time: string;
}

// ==================== 字段映射 ====================

function mapApiKey(raw: BackendApiKey): ApiKey {
  return {
    id: raw.id,
    name: raw.name,
    key: raw.key_prefix || "",
    status: raw.status,
    userId: raw.created_by || "",
    provider: raw.provider,
    keyPrefix: raw.key_prefix,
    description: raw.description,
    expiresAt: parseDate(raw.expires_at),
    lastUsedAt: parseDate(raw.last_used_at),
    usageCount: raw.usage_count,
    createdBy: raw.created_by,
    createdAt: parseDate(raw.create_time),
  };
}

function mapApiKeyToBackend(data: Partial<ApiKey>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.provider !== undefined) result.provider = data.provider;
  if (data.status !== undefined) result.status = data.status;
  if (data.description !== undefined) result.description = data.description;
  if (data.key !== undefined) result.key = data.key;
  return result;
}

function mapResourceQuota(raw: BackendResourceQuota): ResourceQuota {
  const limits = (raw.limits as Record<string, number>) ?? {};
  const usage = (raw.usage as Record<string, number>) ?? {};
  return {
    id: raw.id,
    name: raw.name,
    type: raw.target_type || "",
    targetType: raw.target_type,
    targetId: raw.target_id,
    targetName: raw.target_name,
    limits: {
      maxTokens: limits.maxTokens ?? limits.max_tokens ?? 0,
      maxRequests: limits.maxRequests ?? limits.max_requests ?? 0,
      maxConversations: limits.maxConversations ?? limits.max_conversations ?? 0,
      maxCost: limits.maxCost ?? limits.max_cost ?? 0,
    },
    usage: {
      tokens: usage.tokens ?? 0,
      requests: usage.requests ?? 0,
      conversations: usage.conversations ?? 0,
      cost: usage.cost ?? 0,
    },
    period: raw.period,
    resetAt: parseDate(raw.reset_at),
    createdAt: parseDate(raw.create_time),
  };
}

// ==================== API 方法 ====================

const resourceRealApi = {
  // ==================== API Keys ====================

  async getApiKeys(params?: { user_id?: string; status?: string }): Promise<ApiKey[]> {
    const data = await apiClient.get<BackendApiKey[]>("/api/resource/apikey/list", { params });
    if (!Array.isArray(data)) return [];
    return data.map(mapApiKey);
  },

  async getApiKeysByUser(userId: string): Promise<ApiKey[]> {
    const data = await apiClient.get<BackendApiKey[]>(`/api/resource/apikey/user?user_id=${userId}`);
    if (!Array.isArray(data)) return [];
    return data.map(mapApiKey);
  },

  async getApiKey(id: string): Promise<ApiKey> {
    const raw = await apiClient.get<BackendApiKey>(`/api/resource/apikey/${id}`);
    return mapApiKey(raw);
  },

  async createApiKey(data: Partial<ApiKey>): Promise<ApiKey> {
    const body = mapApiKeyToBackend(data);
    const raw = await apiClient.post<BackendApiKey>("/api/resource/apikey/create", body);
    return mapApiKey(raw);
  },

  async updateApiKey(id: string, data: Partial<ApiKey>): Promise<ApiKey> {
    const existing = await resourceRealApi.getApiKey(id);
    const merged = { ...existing, ...data };
    const body = { id, ...mapApiKeyToBackend(merged) };
    const raw = await apiClient.post<BackendApiKey>("/api/resource/apikey/update", body);
    return mapApiKey(raw);
  },

  async deleteApiKey(id: string): Promise<boolean> {
    await apiClient.delete(`/api/resource/apikey/delete/${id}`);
    return true;
  },

  recordApiKeyUsage: (id: string): Promise<void> =>
    apiClient.post(`/api/resource/apikey/record-usage/${id}`),

  deactivateApiKey: (id: string): Promise<void> =>
    apiClient.post(`/api/resource/apikey/deactivate/${id}`),

  revokeApiKey: (id: string): Promise<boolean> => resourceRealApi.deactivateApiKey(id).then(() => true),

  async validateApiKey(_key: string): Promise<{ valid: boolean; info?: ApiKey }> {
    return { valid: true };
  },

  // ==================== 资源配额 ====================

  async getQuotas(): Promise<ResourceQuota[]> {
    const data = await apiClient.get<BackendResourceQuota[]>("/api/resource/quota/list");
    if (!Array.isArray(data)) return [];
    return data.map(mapResourceQuota);
  },

  async getQuotasByType(type: string): Promise<ResourceQuota[]> {
    const data = await apiClient.get<BackendResourceQuota[]>(`/api/resource/quota/by-type?type=${type}`);
    if (!Array.isArray(data)) return [];
    return data.map(mapResourceQuota);
  },

  async getQuota(id: string): Promise<ResourceQuota> {
    const raw = await apiClient.get<BackendResourceQuota>(`/api/resource/quota/${id}`);
    return mapResourceQuota(raw);
  },

  async createQuota(data: Partial<ResourceQuota>): Promise<ResourceQuota> {
    const body: Record<string, unknown> = {
      name: data.name || "",
      target_type: data.targetType || "global",
      target_id: data.targetId,
      target_name: data.targetName,
      limits: data.limits ?? { maxTokens: 0, maxRequests: 0, maxConversations: 0, maxCost: 0 },
      usage: { tokens: 0, requests: 0, conversations: 0, cost: 0 },
      period: data.period || "monthly",
    };
    const raw = await apiClient.post<BackendResourceQuota>("/api/resource/quota/create", body);
    return mapResourceQuota(raw);
  },

  async updateQuota(id: string, data: Partial<ResourceQuota>): Promise<ResourceQuota> {
    const body: Record<string, unknown> = { id };
    if (data.name !== undefined) body.name = data.name;
    if (data.targetType !== undefined) body.target_type = data.targetType;
    if (data.targetId !== undefined) body.target_id = data.targetId;
    if (data.targetName !== undefined) body.target_name = data.targetName;
    if (data.limits !== undefined) {
      body.limits = {
        maxTokens: data.limits.maxTokens,
        maxRequests: data.limits.maxRequests,
        maxConversations: data.limits.maxConversations,
        maxCost: data.limits.maxCost,
      };
    }
    if (data.period !== undefined) body.period = data.period;
    const raw = await apiClient.post<BackendResourceQuota>("/api/resource/quota/update", body);
    return mapResourceQuota(raw);
  },

  async deleteQuota(id: string): Promise<boolean> {
    await apiClient.delete(`/api/resource/quota/delete/${id}`);
    return true;
  },

  // ==================== 使用统计 ====================

  async getUsageStats(): Promise<UsageStats> {
    const [apiKeys, quotas] = await Promise.all([
      apiClient.get<BackendApiKey[]>("/api/resource/apikey/list"),
      apiClient.get<BackendResourceQuota[]>("/api/resource/quota/list"),
    ]);
    return {
      totalApiKeys: apiKeys.length,
      activeApiKeys: apiKeys.filter((k) => k.status === "active").length,
      totalQuotas: quotas.length,
      quotasUsage: quotas.reduce<Record<string, number>>((acc, q) => {
        const limits = q.limits as Record<string, number> ?? {};
        const usage = q.usage as Record<string, number> ?? {};
        const targetType = q.target_type || "unknown";
        acc[targetType] = limits.limit ? (usage.used ?? 0) / limits.limit * 100 : 0;
        return acc;
      }, {}),
    };
  },

  getResourceTypes: (): string[] => ["api_key", "storage", "compute", "memory", "bandwidth"],
};

export { resourceRealApi };
// providerOptions 暂时从 mock 导入
export { providerOptions } from "../mock/resources";
