/**
 * Workflows 真实 API
 * 后端端点: /api/workflow/...
 *
 * 后端字段映射 (snake_case → camelCase):
 *   published_at   → publishedAt
 *   create_time    → createdAt
 *   update_time    → updatedAt
 *   workflow_id    → workflowId
 */

import { apiClient } from "../api/apiClient";
import { parseDate } from "./fieldMapper";
import type { Workflow, WorkflowStatus, WorkflowNode, WorkflowEdge, WorkflowVariable, WorkflowTrigger } from "@/types";

// ==================== 后端原始类型 ====================

interface BackendWorkflow {
  id: string;
  name: string;
  description?: string;
  status: string;
  nodes?: unknown;
  edges?: unknown;
  variables?: unknown;
  triggers?: unknown;
  settings?: unknown;
  version: number;
  published_at?: string;
  tenant_id?: string;
  create_time: string;
  update_time: string;
}

interface BackendWorkflowVersion {
  id: string;
  workflow_id?: string;
  [key: string]: unknown;
}

interface BackendWorkflowExecution {
  id: string;
  workflow_id?: string;
  [key: string]: unknown;
}

// ==================== 字段映射 ====================

function mapWorkflow(raw: BackendWorkflow): Workflow {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description || "",
    status: (raw.status || "draft") as WorkflowStatus,
    nodes: Array.isArray(raw.nodes) ? raw.nodes as unknown as WorkflowNode[] : [],
    edges: Array.isArray(raw.edges) ? raw.edges as unknown as WorkflowEdge[] : [],
    variables: Array.isArray(raw.variables) ? raw.variables as unknown as WorkflowVariable[] : [],
    triggers: Array.isArray(raw.triggers) ? raw.triggers as unknown as WorkflowTrigger[] : [],
    settings: (raw.settings as unknown as Workflow['settings']) ?? { timeout: 300 },
    version: raw.version ?? 1,
    publishedAt: parseDate(raw.published_at),
    createdAt: parseDate(raw.create_time) ?? new Date(),
    updatedAt: parseDate(raw.update_time) ?? new Date(),
  };
}

function mapWorkflowToBackend(data: Partial<Workflow>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.description !== undefined) result.description = data.description;
  if (data.status !== undefined) result.status = data.status;
  if (data.nodes !== undefined) result.nodes = data.nodes;
  if (data.edges !== undefined) result.edges = data.edges;
  if (data.variables !== undefined) result.variables = data.variables;
  if (data.triggers !== undefined) result.triggers = data.triggers;
  if (data.settings !== undefined) result.settings = data.settings;
  return result;
}

// ==================== API 方法 ====================

const workflowRealApi = {
  /** 获取所有工作流 */
  async getAll(): Promise<Workflow[]> {
    const data = await apiClient.get<BackendWorkflow[]>("/api/workflow/list");
    if (!Array.isArray(data)) return [];
    return data.map(mapWorkflow);
  },

  /** 获取单个工作流 */
  async getById(id: string): Promise<Workflow> {
    const raw = await apiClient.get<BackendWorkflow>(`/api/workflow/${id}`);
    return mapWorkflow(raw);
  },

  /** 创建工作流 */
  async create(data: Partial<Workflow>): Promise<Workflow> {
    const body = mapWorkflowToBackend(data);
    const raw = await apiClient.post<BackendWorkflow>("/api/workflow/create", body);
    return mapWorkflow(raw);
  },

  /** 更新工作流 */
  async update(id: string, data: Partial<Workflow>): Promise<Workflow> {
    const existing = await workflowRealApi.getById(id);
    const merged = { ...existing, ...data };
    const body = { id, ...mapWorkflowToBackend(merged) };
    const raw = await apiClient.post<BackendWorkflow>("/api/workflow/update", body);
    return mapWorkflow(raw);
  },

  /** 删除工作流 */
  async delete(id: string): Promise<boolean> {
    await apiClient.delete(`/api/workflow/delete/${id}`);
    return true;
  },

  /** 按状态获取 */
  async getByStatus(status: string): Promise<Workflow[]> {
    const data = await apiClient.get<BackendWorkflow[]>(`/api/workflow/by-status?status=${status}`);
    if (!Array.isArray(data)) return [];
    return data.map(mapWorkflow);
  },

  /** 发布工作流 */
  async publish(id: string): Promise<Workflow> {
    const raw = await apiClient.post<BackendWorkflow>(`/api/workflow/publish/${id}`);
    return mapWorkflow(raw);
  },

  // ==================== 版本管理 ====================

  async getVersions(): Promise<BackendWorkflowVersion[]> {
    return apiClient.get("/api/workflow/versions");
  },

  async getVersion(id: string): Promise<BackendWorkflowVersion> {
    return apiClient.get(`/api/workflow/version/${id}`);
  },

  async createVersion(data: Record<string, unknown>): Promise<BackendWorkflowVersion> {
    return apiClient.post("/api/workflow/version/create", data);
  },

  async deleteVersion(id: string): Promise<boolean> {
    await apiClient.delete(`/api/workflow/version/delete/${id}`);
    return true;
  },

  // ==================== 执行管理 ====================

  async getExecutions(): Promise<BackendWorkflowExecution[]> {
    return apiClient.get("/api/workflow/executions");
  },

  async getExecutionsByStatus(status: string): Promise<BackendWorkflowExecution[]> {
    return apiClient.get(`/api/workflow/executions/by-status?status=${status}`);
  },

  async getExecution(id: string): Promise<BackendWorkflowExecution> {
    return apiClient.get(`/api/workflow/execution/${id}`);
  },

  async createExecution(data: Record<string, unknown>): Promise<BackendWorkflowExecution> {
    return apiClient.post("/api/workflow/execution/create", data);
  },

  async deleteExecution(id: string): Promise<boolean> {
    await apiClient.delete(`/api/workflow/execution/delete/${id}`);
    return true;
  },

  /** 复制工作流 */
  async duplicate(id: string): Promise<Workflow> {
    const original = await workflowRealApi.getById(id);
    const { id: _, createdAt, updatedAt, ...rest } = original as Workflow;
    return workflowRealApi.create({
      ...rest,
      name: `${(original as Workflow).name} (Copy)`,
    });
  },

  /** 执行工作流 */
  async execute(id: string): Promise<{ executionId: string }> {
    const execution = await apiClient.post<{ id: string }>("/api/workflow/execution/create", { workflow_id: id });
    return { executionId: execution.id };
  },
};

export { workflowRealApi };
// nodeTypeConfig 暂时从 mock 导入
export { nodeTypeConfig } from "../mock/workflows";
