/**
 * Environment variable API 服务
 * 后端端点: /api/environment/...
 */

import { apiClient } from "../api/apiClient";
import type {
  Environment,
  EnvironmentFormData,
  EnvironmentCreateData,
} from "@/types/testset";

// ==================== 数据映射 ====================

interface BackendEnvironment {
  id: string;
  name: string;
  description?: string;
  variables: Array<{
    key: string;
    value: string;
    description?: string;
    enabled: boolean;
    type?: string;
  }>;
  is_global: boolean;
  tenant_id?: string;
  create_time: string;
  update_time: string;
}

function mapEnvironment(raw: BackendEnvironment): Environment {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    variables: raw.variables.map((v) => ({
      key: v.key,
      value: v.value,
      description: v.description,
      enabled: v.enabled,
      type: v.type as "string" | "number" | "boolean" | "json" | undefined,
    })),
    isGlobal: raw.is_global,
    tenantId: raw.tenant_id,
    createTime: raw.create_time,
    updateTime: raw.update_time,
  };
}

// ==================== API ====================

const environmentRealApi = {
  // ==================== Environment CRUD ====================

  getAll: async (): Promise<Environment[]> => {
    const rawList = await apiClient.get<BackendEnvironment[]>("/api/environment/list");
    return rawList.map(mapEnvironment);
  },

  getById: async (id: string): Promise<Environment> => {
    const raw = await apiClient.get<BackendEnvironment>(`/api/environment/${id}`);
    return mapEnvironment(raw);
  },

  create: async (data: EnvironmentCreateData): Promise<Environment> => {
    const raw = await apiClient.post<BackendEnvironment>("/api/environment/create", {
      name: data.name,
      description: data.description,
      variables: data.variables.map((v) => ({
        key: v.key,
        value: v.value,
        description: v.description,
        enabled: v.enabled,
        type: v.type,
      })),
      is_global: data.isGlobal,
    });
    return mapEnvironment(raw);
  },

  update: async (
    id: string,
    data: Partial<EnvironmentFormData>,
  ): Promise<Environment> => {
    const existing = await environmentRealApi.getById(id);
    const merged = {
      ...existing,
      name: data.name || existing.name,
      description: data.description !== undefined ? data.description : existing.description,
      variables: data.variables || existing.variables,
    };

    const raw = await apiClient.post<BackendEnvironment>("/api/environment/update", {
      id,
      name: merged.name,
      description: merged.description,
      variables: merged.variables.map((v) => ({
        key: v.key,
        value: v.value,
        description: v.description,
        enabled: v.enabled,
        type: v.type,
      })),
    });
    return mapEnvironment(raw);
  },

  delete: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/environment/delete/${id}`);
    return true;
  },

  // ==================== 获取当前活动环境 ====================

  getActive: async (): Promise<Environment | null> => {
    try {
      const raw = await apiClient.get<BackendEnvironment>("/api/environment/active");
      return mapEnvironment(raw);
    } catch {
      return null;
    }
  },

  // ==================== 设置活动环境 ====================

  setActive: async (id: string): Promise<void> => {
    await apiClient.post(`/api/environment/active/set`, {
      environment_id: id,
    });
  },
};

export { environmentRealApi };
