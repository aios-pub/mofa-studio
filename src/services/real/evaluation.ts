/**
 * Evaluation 真实 API
 * 后端端点: /api/evaluation/...
 */

import { apiClient } from "../api/apiClient";

interface Evaluation {
  id: string;
  agentId: string;
  conversationId?: string;
  metrics: Record<string, number>;
  overallScore: number;
  evaluator?: string;
  evaluatorId?: string;
  feedback?: string;
  tenantId: string;
  createTime: string;
  updateTime: string;
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
  tenantId: string;
  createTime: string;
  updateTime: string;
}

const evaluationRealApi = {
  // 列表 - 获取所有评估
  getAll: (): Promise<Evaluation[]> =>
    apiClient.get<Evaluation[]>("/api/evaluation/list"),

  getById: (id: string): Promise<Evaluation> =>
    apiClient.get<Evaluation>(`/api/evaluation/${id}`),

  create: (data: Partial<Evaluation>): Promise<Evaluation> =>
    apiClient.post<Evaluation>("/api/evaluation/create", data),

  update: (id: string, data: Partial<Evaluation>): Promise<Evaluation> =>
    apiClient.post<Evaluation>("/api/evaluation/update", { id, ...data }),

  delete: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/evaluation/delete/${id}`);
    return true;
  },

  getByAgent: (agentId: string): Promise<Evaluation[]> =>
    apiClient.get<Evaluation[]>(`/api/evaluation/by-agent?agent_id=${agentId}`),

  getByConversation: (conversationId: string): Promise<Evaluation[]> =>
    apiClient.get<Evaluation[]>(`/api/evaluation/by-conversation?conversation_id=${conversationId}`),

  // 别名方法
  getAgentEvaluations: (agentId: string): Promise<Evaluation[]> =>
    apiClient.get<Evaluation[]>(`/api/evaluation/by-agent?agent_id=${agentId}`),

  // 获取所有Agent的评估摘要
  getAllAgentSummaries: (): Promise<AgentEvaluationSummary[]> =>
    apiClient.get("/api/evaluation/summaries"),

  // 获取Agent列表（用于评估页面）
  getAgents: (): Promise<{ id: string; name: string }[]> =>
    apiClient.get("/api/evaluation/agents"),

  // Metrics
  getMetrics: (): Promise<EvaluationMetric[]> =>
    apiClient.get("/api/evaluation/metric/list"),

  getEvaluationMetrics: (): Promise<EvaluationMetric[]> =>
    apiClient.get("/api/evaluation/metric/list"),

  getMetricsByCategory: (category: string): Promise<EvaluationMetric[]> =>
    apiClient.get(`/api/evaluation/metric/by-category?category=${category}`),

  getMetric: (id: string): Promise<EvaluationMetric> =>
    apiClient.get(`/api/evaluation/metric/${id}`),

  createMetric: (data: Partial<EvaluationMetric>): Promise<EvaluationMetric> =>
    apiClient.post("/api/evaluation/metric/create", data),

  updateMetric: (id: string, data: Partial<EvaluationMetric>): Promise<EvaluationMetric> =>
    apiClient.post("/api/evaluation/metric/update", { id, ...data }),

  deleteMetric: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/evaluation/metric/delete/${id}`);
    return true;
  },

  // 获取对比数据
  getComparisonData: (agentIds: string[]): Promise<{ agents: unknown[]; metrics: string[] }> =>
    apiClient.get("/api/evaluation/comparison", { params: { agent_ids: agentIds.join(',') } }),

  // 创建评估
  createEvaluation: (data: Partial<Evaluation>): Promise<Evaluation> =>
    apiClient.post<Evaluation>("/api/evaluation/create", data),

  // 获取Agent评估摘要
  getAgentEvaluationSummary: (agentId: string): Promise<AgentEvaluationSummary | null> =>
    apiClient.get(`/api/evaluation/summary/${agentId}`),
};

export default evaluationRealApi;
export type { Evaluation, AgentEvaluationSummary, EvaluationMetric };
