/**
 * Evaluation 真实 API
 * 后端端点: /api/evaluation/...
 *
 * 后端字段映射 (snake_case → camelCase):
 *   agent_id        → agentId
 *   conversation_id → conversationId
 *   overall_score   → overallScore
 *   evaluator_id    → evaluatorId
 *   max_value       → maxValue
 *   create_time     → createdAt
 *   update_time     → updatedAt
 */

import { apiClient } from "../api/apiClient";
import { parseDate } from "./fieldMapper";

// ==================== 前端类型 ====================

interface Evaluation {
  id: string;
  agentId: string;
  conversationId?: string;
  metrics: Record<string, number>;
  overallScore: number;
  evaluator?: string;
  evaluatorId?: string;
  feedback?: string;
  tenantId?: string;
  createTime?: Date;
  updateTime?: Date;
}

interface AgentEvaluationSummary {
  agentId: string;
  agentName: string;
  totalEvaluations: number;
  avgScore: number;
  lastEvaluationAt?: string;
}

interface EvaluationMetric {
  id: string;
  name: string;
  description?: string;
  weight: number;
  maxValue: number;
  category: string;
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ==================== 后端原始类型 ====================

interface BackendEvaluation {
  id: string;
  agent_id: string;
  conversation_id?: string;
  metrics?: Record<string, number>;
  overall_score?: number;
  evaluator?: string;
  evaluator_id?: string;
  feedback?: string;
  tenant_id?: string;
  create_time: string;
  update_time: string;
}

interface BackendEvaluationMetric {
  id: string;
  name: string;
  description?: string;
  weight?: number;
  max_value?: number;
  category?: string;
  tenant_id?: string;
  create_time: string;
  update_time: string;
}

// ==================== 字段映射 ====================

function mapEvaluation(raw: BackendEvaluation): Evaluation {
  return {
    id: raw.id,
    agentId: raw.agent_id,
    conversationId: raw.conversation_id,
    metrics: raw.metrics ?? {},
    overallScore: raw.overall_score ?? 0,
    evaluator: raw.evaluator,
    evaluatorId: raw.evaluator_id,
    feedback: raw.feedback,
    tenantId: raw.tenant_id,
    createTime: parseDate(raw.create_time),
    updateTime: parseDate(raw.update_time),
  };
}

function mapEvaluationToBackend(data: Partial<Evaluation>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (data.agentId !== undefined) result.agent_id = data.agentId;
  if (data.conversationId !== undefined) result.conversation_id = data.conversationId;
  if (data.metrics !== undefined) result.metrics = data.metrics;
  if (data.overallScore !== undefined) result.overall_score = data.overallScore;
  if (data.evaluator !== undefined) result.evaluator = data.evaluator;
  if (data.evaluatorId !== undefined) result.evaluator_id = data.evaluatorId;
  if (data.feedback !== undefined) result.feedback = data.feedback;
  return result;
}

function mapMetric(raw: BackendEvaluationMetric): EvaluationMetric {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    weight: raw.weight ?? 1,
    maxValue: raw.max_value ?? 10,
    category: raw.category || "",
    tenantId: raw.tenant_id,
    createdAt: parseDate(raw.create_time),
    updatedAt: parseDate(raw.update_time),
  };
}

function mapMetricToBackend(data: Partial<EvaluationMetric>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.description !== undefined) result.description = data.description;
  if (data.weight !== undefined) result.weight = data.weight;
  if (data.maxValue !== undefined) result.max_value = data.maxValue;
  if (data.category !== undefined) result.category = data.category;
  return result;
}

// ==================== API 方法 ====================

const evaluationRealApi = {
  async getAll(): Promise<Evaluation[]> {
    const data = await apiClient.get<BackendEvaluation[]>("/api/evaluation/list");
    if (!Array.isArray(data)) return [];
    return data.map(mapEvaluation);
  },

  async getById(id: string): Promise<Evaluation> {
    const raw = await apiClient.get<BackendEvaluation>(`/api/evaluation/${id}`);
    return mapEvaluation(raw);
  },

  async create(data: Partial<Evaluation>): Promise<Evaluation> {
    const body = mapEvaluationToBackend(data);
    const raw = await apiClient.post<BackendEvaluation>("/api/evaluation/create", body);
    return mapEvaluation(raw);
  },

  async update(id: string, data: Partial<Evaluation>): Promise<Evaluation> {
    const existing = await evaluationRealApi.getById(id);
    const merged = { ...existing, ...data };
    const body = { id, ...mapEvaluationToBackend(merged) };
    const raw = await apiClient.post<BackendEvaluation>("/api/evaluation/update", body);
    return mapEvaluation(raw);
  },

  async delete(id: string): Promise<boolean> {
    await apiClient.delete(`/api/evaluation/delete/${id}`);
    return true;
  },

  async getByAgent(agentId: string): Promise<Evaluation[]> {
    const data = await apiClient.get<BackendEvaluation[]>(`/api/evaluation/by-agent?agent_id=${agentId}`);
    if (!Array.isArray(data)) return [];
    return data.map(mapEvaluation);
  },

  async getByConversation(conversationId: string): Promise<Evaluation[]> {
    const data = await apiClient.get<BackendEvaluation[]>(`/api/evaluation/by-conversation?conversation_id=${conversationId}`);
    if (!Array.isArray(data)) return [];
    return data.map(mapEvaluation);
  },

  getAgentEvaluations: (agentIdOrFilter: string | { agentId?: string }): Promise<Evaluation[]> => {
    const agentId = typeof agentIdOrFilter === 'string' ? agentIdOrFilter : agentIdOrFilter.agentId;
    return agentId ? evaluationRealApi.getByAgent(agentId) : evaluationRealApi.getAll();
  },

  getAllAgentSummaries: (): Promise<AgentEvaluationSummary[]> =>
    apiClient.get("/api/evaluation/summaries"),

  getAgents: (): Promise<{ id: string; name: string }[]> =>
    apiClient.get("/api/evaluation/agents"),

  // ==================== Metrics ====================

  async getMetrics(): Promise<EvaluationMetric[]> {
    const data = await apiClient.get<BackendEvaluationMetric[]>("/api/evaluation/metric/list");
    if (!Array.isArray(data)) return [];
    return data.map(mapMetric);
  },

  getEvaluationMetrics: (): Promise<EvaluationMetric[]> => evaluationRealApi.getMetrics(),

  async getMetricsByCategory(category: string): Promise<EvaluationMetric[]> {
    const data = await apiClient.get<BackendEvaluationMetric[]>(`/api/evaluation/metric/by-category?category=${category}`);
    if (!Array.isArray(data)) return [];
    return data.map(mapMetric);
  },

  async getMetric(id: string): Promise<EvaluationMetric> {
    const raw = await apiClient.get<BackendEvaluationMetric>(`/api/evaluation/metric/${id}`);
    return mapMetric(raw);
  },

  async createMetric(data: Partial<EvaluationMetric>): Promise<EvaluationMetric> {
    const body = mapMetricToBackend(data);
    const raw = await apiClient.post<BackendEvaluationMetric>("/api/evaluation/metric/create", body);
    return mapMetric(raw);
  },

  async updateMetric(id: string, data: Partial<EvaluationMetric>): Promise<EvaluationMetric> {
    const existing = await evaluationRealApi.getMetric(id);
    const merged = { ...existing, ...data };
    const body = { id, ...mapMetricToBackend(merged) };
    const raw = await apiClient.post<BackendEvaluationMetric>("/api/evaluation/metric/update", body);
    return mapMetric(raw);
  },

  async deleteMetric(id: string): Promise<boolean> {
    await apiClient.delete(`/api/evaluation/metric/delete/${id}`);
    return true;
  },

  getComparisonData: (agentIds: string[]): Promise<{ agents: unknown[]; metrics: string[] }> =>
    apiClient.get("/api/evaluation/comparison", { params: { agent_ids: agentIds.join(',') } }),

  createEvaluation: (data: Partial<Evaluation>): Promise<Evaluation> => evaluationRealApi.create(data),

  getAgentEvaluationSummary: (agentId: string): Promise<AgentEvaluationSummary | null> =>
    apiClient.get(`/api/evaluation/summary/${agentId}`),
};

export default evaluationRealApi;
export type { Evaluation, AgentEvaluationSummary, EvaluationMetric };
