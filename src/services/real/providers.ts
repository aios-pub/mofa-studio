/**
 * Providers real API
 * Backend endpoints: /api/provider/...
 */

import { apiClient } from "../api/apiClient";

/** Raw backend provider VO */
interface ProviderRaw {
  id: string;
  api_base: string;
  api_key?: string;
  provider_name: string;
  provider_type: string;
  create_time: string;
  update_time: string;
  enabled: boolean;
  models: ProviderModelRaw[];
  model_count: number;
  available_models?: ExternalModel[];
}

/** Raw backend ProviderModel VO */
interface ProviderModelRaw {
  id: string;
  model_id: string;
  model_type: string | null;
  input_price: number | null;
  output_price: number | null;
  enabled: boolean;
}

/** Model used by the frontend (for page display compatibility) */
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

/** External models (not persisted to DB, from vendor API) */
export interface ExternalModel {
  model_id: string;
  model_type: string | null;
  owned_by: string | null;
}

/** Provider used by the frontend */
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
  /** Vendor's externally available models returned on create/refresh (not persisted) */
  availableModels?: ExternalModel[];
}

/** Map backend model to frontend model */
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

/** Map backend fields to frontend fields */
function mapProvider(raw: ProviderRaw): Provider {
  return {
    id: raw.id,
    name: raw.provider_name,
    type: raw.provider_type,
    baseUrl: raw.api_base,
    enabled: raw.enabled,
    apiKey: raw.api_key,
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
    availableModels: raw.available_models,
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
    // Merge existing data to ensure complete fields
    const existing = await providerRealApi.getById(id);
    const merged = {
      ...existing,
      baseUrl: data.baseUrl ?? existing.baseUrl,
      name: data.name ?? existing.name,
      type: data.type ?? existing.type,
      ...data,
    };
    const payload: Record<string, unknown> = {
      id,
      api_base: merged.baseUrl || "",
      provider_name: merged.name || "",
      provider_type: merged.type || "custom",
    };
    if (data.apiKey !== undefined) {
      payload.api_key = data.apiKey;
    }
    if (data.models !== undefined) {
      payload.models = data.models;
    }
    const raw = await apiClient.post<ProviderRaw>("/api/provider/update", payload);
    return mapProvider(raw);
  },

  delete: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/provider/delete/${id}`);
    return true;
  },

  // Validate API key
  validateApiKey: (providerId: string): Promise<{ valid: boolean; message: string; model_count?: number }> =>
    apiClient.post(`/api/provider/validate/${providerId}`),

  // Get externally available model list (not persisted)
  refreshModels: async (providerId: string): Promise<ExternalModel[]> => {
    const result = await apiClient.post<{ models: ExternalModel[] }>(`/api/provider/refresh-models/${providerId}`);
    return result.models || [];
  },

  // Select model: enable the specified models and disable the others
  selectModels: async (providerId: string, modelIds: string[]): Promise<ProviderModel[]> => {
    const result = await apiClient.post<ProviderModelRaw[]>(
      `/api/provider/${providerId}/select-models`,
      { model_ids: modelIds },
    );
    return result.map(mapModel);
  },

  /**
   * Create a provider from frontend form data
   */
  createFromFormData: async (formData: Record<string, unknown>): Promise<Provider> => {
    return providerRealApi.create(formData);
  },
};

export { providerRealApi };
