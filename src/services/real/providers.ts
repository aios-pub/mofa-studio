/**
 * Providers 真实 API
 * 后端端点: /api/provider/...
 */

import { createActionApi } from "./base";
import { apiClient } from "../api/apiClient";

interface Provider {
  id: string;
  name: string;
  type: string;
  status: string;
  channelCount: number;
  models?: string[];
}

const baseApi = createActionApi<Provider>("/api/provider", { listAction: "fetch", hasGetById: false });

const providerRealApi = {
  ...baseApi,

  // 验证 API Key
  validateApiKey: (providerId: string): Promise<{ valid: boolean; message: string; model_count?: number }> =>
    apiClient.post(`/api/provider/validate/${providerId}`),

  // 刷新模型列表
  refreshModels: async (providerId: string): Promise<string[]> => {
    const result = await apiClient.post<{ models: string[] }>(`/api/provider/refresh-models/${providerId}`);
    return result.models || [];
  },

  createFromFormData: async (formData: Record<string, unknown>): Promise<Provider> => {
    return baseApi.create(formData as Partial<Provider>);
  },
};

export { providerRealApi };
