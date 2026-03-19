/**
 * Workflows 真实 API
 * 后端端点: /api/workflow/...
 */

import { createActionApi } from "./base";
import { apiClient } from "../api/apiClient";
import type { Workflow } from "@/types";

const baseApi = createActionApi<Workflow>("/api/workflow", "list");

const workflowRealApi = {
  ...baseApi,

  getByStatus: (status: string): Promise<Workflow[]> =>
    apiClient.get<Workflow[]>(`/api/workflow/by-status?status=${status}`),

  publish: (id: string): Promise<Workflow> =>
    apiClient.post<Workflow>(`/api/workflow/publish/${id}`),

  // Workflow Versions
  getVersions: (): Promise<unknown[]> =>
    apiClient.get("/api/workflow/versions"),

  getVersion: (id: string): Promise<unknown> =>
    apiClient.get(`/api/workflow/version/${id}`),

  createVersion: (data: Record<string, unknown>): Promise<unknown> =>
    apiClient.post("/api/workflow/version/create", data),

  deleteVersion: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/workflow/version/delete/${id}`);
    return true;
  },

  // Workflow Executions
  getExecutions: (): Promise<unknown[]> =>
    apiClient.get("/api/workflow/executions"),

  getExecutionsByStatus: (status: string): Promise<unknown[]> =>
    apiClient.get(`/api/workflow/executions/by-status?status=${status}`),

  getExecution: (id: string): Promise<unknown> =>
    apiClient.get(`/api/workflow/execution/${id}`),

  createExecution: (data: Record<string, unknown>): Promise<unknown> =>
    apiClient.post("/api/workflow/execution/create", data),

  deleteExecution: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/workflow/execution/delete/${id}`);
    return true;
  },

  // 兼容方法 - 复制工作流
  duplicate: async (id: string): Promise<Workflow> => {
    const original = await baseApi.getById(id);
    const { id: _, createdAt, updatedAt, ...rest } = original as Workflow;
    return baseApi.create({
      ...rest,
      name: `${(original as Workflow).name} (Copy)`,
    });
  },

  // 执行工作流
  execute: async (id: string): Promise<{ executionId: string }> => {
    const execution = await apiClient.post<{ id: string }>("/api/workflow/execution/create", { workflow_id: id });
    return { executionId: execution.id };
  },
};

export { workflowRealApi };
// nodeTypeConfig 暂时从 mock 导入
export { nodeTypeConfig } from "../mock/workflows";
