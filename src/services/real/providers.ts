/**
 * Providers 真实 API
 * 后端端点: /api/provider/...
 */

import { apiClient } from "../api/apiClient";

/** 后端原始 Provider VO */
interface ProviderRaw {
  id: string;
  api_base: string;
  provider_name: string;
  provider_type: string;
  create_time: string;
  update_time: string;
  enabled: boolean;
  models: ProviderModelRaw[];
  model_count: number;
}

/** 后端原始 ProviderModel VO */
interface ProviderModelRaw {
  id: string;
  model_id: string;
  model_type: string | null;
  input_price: number | null;
  output_price: number | null;
  enabled: boolean;
}

/** 前端使用的 Model（兼容页面展示） */
export interface ProviderModel {
  id: string;
  name: string;
  enabled: boolean;
  pricing: {
    input: number;
    output: number;
  };
  maxTokens: number;
}

/** 前端使用的 Provider */
export interface Provider {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  enabled: boolean;
  models: ProviderModel[];
  modelCount: number;
  createdAt: string;
  updatedAt: string;
  status: "active" | "inactive" | "error";
  usage: {
    totalCalls: number;
    totalTokens: number;
    lastUsed: Date;
  };
  apiKey?: string;
}

/** 将后端 model 映射为前端 model */
function mapModel(raw: ProviderModelRaw): ProviderModel {
  return {
    id: raw.id,
    name: raw.model_id,
    enabled: raw.enabled,
    pricing: {
      input: raw.input_price ?? 0,
      output: raw.output_price ?? 0,
    },
    maxTokens: 0,
  };
}

/** 将后端字段映射为前端字段 */
function mapProvider(raw: ProviderRaw): Provider {
  return {
    id: raw.id,
    name: raw.provider_name,
    type: raw.provider_type,
    baseUrl: raw.api_base,
    enabled: raw.enabled,
    models: (raw.models ?? []).map(mapModel),
    modelCount: raw.model_count ?? (raw.models ?? []).length,
    createdAt: raw.create_time,
    updatedAt: raw.update_time,
    status: raw.enabled ? "active" : "inactive",
    usage: {
      totalCalls: 0,
      totalTokens: 0,
      lastUsed: new Date(raw.update_time),
    },
  };
}

const providerRealApi = {
  getAll: async (): Promise<Provider[]> => {
    const rawList = await apiClient.get<ProviderRaw[]>("/api/provider/fetch");
    return rawList.map(mapProvider);
  },

  getById: async (id: string): Promise<Provider> => {
    const all = await providerRealApi.getAll();
    const item = all.find((p) => p.id === id);
    if (!item) throw new Error(`Provider ${id} not found`);
    return item;
  },

  create: async (data: Record<string, unknown>): Promise<Provider> => {
    const payload = {
      api_base: data.baseUrl || "",
      api_key: data.apiKey || "",
      provider_name: data.name || "",
      provider_type: data.type || "custom",
    };
    const raw = await apiClient.post<ProviderRaw>("/api/provider/create", payload);
    return mapProvider(raw);
  },

  update: async (id: string, data: Record<string, unknown>): Promise<Provider> => {
    const payload: Record<string, unknown> = {
      id,
      api_base: data.baseUrl || "",
      provider_name: data.name || "",
      provider_type: data.type || "custom",
    };
    // 只有明确传了 apiKey 才更新，避免用 masked 值覆盖真实密钥
    if (data.apiKey !== undefined) {
      payload.api_key = data.apiKey;
    }
    const raw = await apiClient.post<ProviderRaw>("/api/provider/update", payload);
    return mapProvider(raw);
  },

  delete: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/provider/delete/${id}`);
    return true;
  },

  // 验证 API Key
  validateApiKey: (providerId: string): Promise<{ valid: boolean; message: string; model_count?: number }> =>
    apiClient.post(`/api/provider/validate/${providerId}`),

  // 刷新模型列表
  refreshModels: async (providerId: string): Promise<string[]> => {
    const result = await apiClient.post<{ models: string[] }>(`/api/provider/refresh-models/${providerId}`);
    return result.models || [];
  },

  /**
   * 从前端表单数据创建 Provider
   */
  createFromFormData: async (formData: Record<string, unknown>): Promise<Provider> => {
    return providerRealApi.create(formData);
  },
};

export { providerRealApi };
