/**
 * Resources 真实 API
 * 后端端点: /api/resource/...
 */

import { apiClient } from "../api/apiClient";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  status: string;
  userId: string;
  createdAt: string;
}

interface ResourceQuota {
  id: string;
  type: string;
  limit: number;
  used: number;
}

interface UsageStats {
  totalApiKeys: number;
  activeApiKeys: number;
  totalQuotas: number;
  quotasUsage: Record<string, number>;
}

const resourceRealApi = {
  // API Keys
  getApiKeys: (params?: { user_id?: string; status?: string }): Promise<ApiKey[]> =>
    apiClient.get("/api/resource/apikey/list", { params }),

  getApiKeysByUser: (userId: string): Promise<ApiKey[]> =>
    apiClient.get(`/api/resource/apikey/user?user_id=${userId}`),

  getApiKey: (id: string): Promise<ApiKey> =>
    apiClient.get(`/api/resource/apikey/${id}`),

  createApiKey: (data: Partial<ApiKey>): Promise<ApiKey> =>
    apiClient.post("/api/resource/apikey/create", data),

  updateApiKey: (id: string, data: Partial<ApiKey>): Promise<ApiKey> =>
    apiClient.post("/api/resource/apikey/update", { id, ...data }),

  deleteApiKey: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/resource/apikey/delete/${id}`);
    return true;
  },

  recordApiKeyUsage: (id: string): Promise<void> =>
    apiClient.post(`/api/resource/apikey/record-usage/${id}`),

  deactivateApiKey: (id: string): Promise<void> =>
    apiClient.post(`/api/resource/apikey/deactivate/${id}`),

  revokeApiKey: async (id: string): Promise<boolean> => {
    await apiClient.post(`/api/resource/apikey/deactivate/${id}`);
    return true;
  },

  validateApiKey: async (_key: string): Promise<{ valid: boolean; info?: ApiKey }> => {
    console.warn("resourceApi.validateApiKey: Backend does not support validation endpoint");
    return { valid: true };
  },

  // Resource Quotas
  getQuotas: (): Promise<ResourceQuota[]> =>
    apiClient.get("/api/resource/quota/list"),

  getQuotasByType: (type: string): Promise<ResourceQuota[]> =>
    apiClient.get(`/api/resource/quota/by-type?type=${type}`),

  getQuota: (id: string): Promise<ResourceQuota> =>
    apiClient.get(`/api/resource/quota/${id}`),

  createQuota: (data: Partial<ResourceQuota>): Promise<ResourceQuota> =>
    apiClient.post("/api/resource/quota/create", data),

  updateQuota: (id: string, data: Partial<ResourceQuota>): Promise<ResourceQuota> =>
    apiClient.post("/api/resource/quota/update", { id, ...data }),

  deleteQuota: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/resource/quota/delete/${id}`);
    return true;
  },

  // Usage Stats
  getUsageStats: async (): Promise<UsageStats> => {
    const apiKeys = await apiClient.get<ApiKey[]>("/api/resource/apikey/list");
    const quotas = await apiClient.get<ResourceQuota[]>("/api/resource/quota/list");
    return {
      totalApiKeys: apiKeys.length,
      activeApiKeys: apiKeys.filter(k => k.status === 'active').length,
      totalQuotas: quotas.length,
      quotasUsage: quotas.reduce((acc, q) => {
        acc[q.type] = q.used / q.limit * 100;
        return acc;
      }, {} as Record<string, number>),
    };
  },

  // 资源类型列表
  getResourceTypes: (): string[] => {
    return ["api_key", "storage", "compute", "memory", "bandwidth"];
  },
};

export { resourceRealApi };
// providerOptions 暂时从 mock 导入
export { providerOptions } from "../mock/resources";
