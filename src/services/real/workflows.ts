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
import type { Workflow, WorkflowStatus, WorkflowNode, WorkflowEdge, WorkflowVariable, WorkflowTrigger, WorkflowStats } from "@/types";

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
  async execute(id: string, _payload?: Record<string, unknown>): Promise<{ executionId: string }> {
    const execution = await apiClient.post<{ id: string }>("/api/workflow/execution/create", { workflow_id: id });
    return { executionId: execution.id };
  },

  /** 回滚到指定版本 */
  async rollback(workflowId: string, versionId: string): Promise<Workflow> {
    const raw = await apiClient.post<BackendWorkflow>("/api/workflow/rollback", { workflow_id: workflowId, version_id: versionId });
    return mapWorkflow(raw);
  },

  /** 取消执行 */
  async cancelExecution(executionId: string): Promise<boolean> {
    await apiClient.post(`/api/workflow/execution/cancel/${executionId}`);
    return true;
  },

  /** 验证工作流 */
  async validate(workflowId: string): Promise<{ valid: boolean; errors: string[] }> {
    return apiClient.post<{ valid: boolean; errors: string[] }>(`/api/workflow/validate/${workflowId}`);
  },

  /** 获取工作流统计 */
  async getStats(workflowId: string): Promise<WorkflowStats> {
    const data = await apiClient.get<Record<string, unknown>>(`/api/workflow/${workflowId}/stats`);
    return {
      totalExecutions: (data.total_executions ?? data.totalExecutions ?? 0) as number,
      successfulExecutions: (data.successful_executions ?? data.successfulExecutions ?? 0) as number,
      failedExecutions: (data.failed_executions ?? data.failedExecutions ?? 0) as number,
      avgDuration: (data.avg_duration ?? data.avgDuration ?? 0) as number,
      lastExecutionAt: parseDate((data.last_execution_at ?? data.lastExecutionAt) as string | undefined),
    };
  },
};

export { workflowRealApi };

// 节点类型配置 — UI 常量，非 mock 数据
export const nodeTypeConfig: Record<string, { name: string; icon: string; category: string; description: string; color: string }> = {
  start: { name: '开始', icon: '▶️', category: 'trigger', description: '工作流开始节点', color: '#52c41a' },
  end: { name: '结束', icon: '⏹️', category: 'trigger', description: '工作流结束节点', color: '#ff4d4f' },
  agent: { name: 'Agent', icon: '🤖', category: 'action', description: '调用 Agent 执行任务', color: '#1890ff' },
  prompt: { name: '提示词', icon: '📝', category: 'action', description: '应用提示词模板', color: '#722ed1' },
  skill: { name: 'Skill', icon: '⚡', category: 'action', description: '调用 Skill 技能', color: '#fa8c16' },
  condition: { name: '条件', icon: '🔀', category: 'logic', description: '条件分支判断', color: '#13c2c2' },
  loop: { name: '循环', icon: '🔄', category: 'logic', description: '循环节点', color: '#eb2f96' },
  parallel: { name: '并行', icon: '⚡', category: 'logic', description: '并行执行', color: '#faad14' },
  http_request: { name: 'HTTP 请求', icon: '🌐', category: 'action', description: '发送 HTTP 请求', color: '#2f54eb' },
  transform: { name: '数据转换', icon: '🔧', category: 'transform', description: '转换数据格式', color: '#a0d911' },
  variable: { name: '变量', icon: '📦', category: 'transform', description: '设置变量值', color: '#b37feb' },
  delay: { name: '延迟', icon: '⏱️', category: 'logic', description: '延迟执行', color: '#ffc53d' },
  webhook: { name: 'Webhook', icon: '🔗', category: 'trigger', description: 'Webhook 触发', color: '#36cfc9' },
  schedule: { name: '定时', icon: '📅', category: 'trigger', description: '定时触发', color: '#ff7a45' },
};

export const executionStatusConfig: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '等待中' },
  running: { color: 'blue', text: '运行中' },
  completed: { color: 'green', text: '已完成' },
  failed: { color: 'red', text: '失败' },
  cancelled: { color: 'default', text: '已取消' },
};
