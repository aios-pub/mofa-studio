/**
 * Mock evaluation service
 */

import type {
  EvaluationMetric,
  EvaluationRecord,
  AgentEvaluationSummary,
  ComparisonData,
  EvaluationFilter,
} from '../../types/evaluation';

// Default evaluation metrics
const DEFAULT_METRICS: EvaluationMetric[] = [
  {
    id: 'accuracy',
    name: '响应准确性',
    description: '评估 Agent 响应内容的准确性和相关性',
    weight: 0.3,
    maxValue: 10,
    category: 'quality',
  },
  {
    id: 'relevance',
    name: '上下文相关性',
    description: '评估响应与对话上下文的关联程度',
    weight: 0.2,
    maxValue: 10,
    category: 'quality',
  },
  {
    id: 'coherence',
    name: '响应连贯性',
    description: '评估响应内容的逻辑性和连贯性',
    weight: 0.15,
    maxValue: 10,
    category: 'quality',
  },
  {
    id: 'response_time',
    name: '响应速度',
    description: '评估 Agent 的响应时间表现',
    weight: 0.15,
    maxValue: 10,
    category: 'performance',
  },
  {
    id: 'safety',
    name: '安全合规',
    description: '评估响应内容是否符合安全规范',
    weight: 0.1,
    maxValue: 10,
    category: 'safety',
  },
  {
    id: 'user_satisfaction',
    name: '用户满意度',
    description: '基于用户反馈的满意度评分',
    weight: 0.1,
    maxValue: 10,
    category: 'user_experience',
  },
];

// Agent list
const AGENTS = [
  { id: 'agent-1', name: 'Customer Service Bot' },
  { id: 'agent-2', name: 'Technical Support Agent' },
  { id: 'agent-3', name: 'Sales Assistant' },
  { id: 'agent-4', name: 'Data Analyst Bot' },
];

// Generate random rating
const generateScore = (base: number = 7): number => {
  const variance = 3;
  const score = base + (Math.random() - 0.5) * variance;
  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
};

// Generate mock evaluation records
const generateMockEvaluation = (index: number): EvaluationRecord => {
  const agent = AGENTS[index % AGENTS.length];
  const now = new Date();
  const evaluatedAt = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);

  const metrics = DEFAULT_METRICS.map((metric) => ({
    metricId: metric.id,
    value: generateScore(),
    reason: `Sample evaluation reason for ${metric.name}`,
  }));

  const overallScore = metrics.reduce((sum, m, i) => {
    return sum + m.value * DEFAULT_METRICS[i].weight;
  }, 0);

  return {
    id: `eval-${index + 1}`,
    agentId: agent.id,
    conversationId: `conv-${Math.floor(Math.random() * 1000)}`,
    metrics,
    overallScore: Math.round(overallScore * 10) / 10,
    evaluatedAt: evaluatedAt.toISOString(),
    evaluator: Math.random() > 0.3 ? 'auto' : 'human',
    evaluatorId: Math.random() > 0.5 ? 'user-1' : 'user-2',
    evaluatorName: Math.random() > 0.5 ? 'John Doe' : 'Jane Smith',
    feedback: Math.random() > 0.7 ? 'Good response overall.' : undefined,
  };
};

// Generate mock data
const MOCK_EVALUATIONS: EvaluationRecord[] = Array.from({ length: 100 }, (_, i) =>
  generateMockEvaluation(i)
);

// Simulated latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const evaluationApi = {
  /**
   * Get evaluation metric list
   */
  getEvaluationMetrics: async (): Promise<EvaluationMetric[]> => {
    await delay(200);
    return DEFAULT_METRICS;
  },

  /**
   * Get agent evaluation records
   */
  getAgentEvaluations: async (
    filter?: EvaluationFilter
  ): Promise<{ data: EvaluationRecord[]; total: number }> => {
    await delay(400);

    let filtered = [...MOCK_EVALUATIONS];

    if (filter) {
      if (filter.agentId) {
        filtered = filtered.filter((e) => e.agentId === filter.agentId);
      }
      if (filter.evaluator && filter.evaluator !== 'all') {
        filtered = filtered.filter((e) => e.evaluator === filter.evaluator);
      }
      if (filter.minScore !== undefined) {
        filtered = filtered.filter((e) => e.overallScore >= filter.minScore!);
      }
      if (filter.maxScore !== undefined) {
        filtered = filtered.filter((e) => e.overallScore <= filter.maxScore!);
      }
    }

    // Sort by time
    filtered.sort((a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime());

    return {
      data: filtered,
      total: filtered.length,
    };
  },

  /**
   * Create evaluation record
   */
  createEvaluation: async (data: {
    agentId: string;
    conversationId: string;
    metrics: { metricId: string; value: number; reason?: string }[];
    evaluator: 'auto' | 'human';
    feedback?: string;
  }): Promise<EvaluationRecord> => {
    await delay(300);

    const overallScore = data.metrics.reduce((sum, m) => {
      const metric = DEFAULT_METRICS.find((dm) => dm.id === m.metricId);
      return sum + m.value * (metric?.weight || 0);
    }, 0);

    const evaluation: EvaluationRecord = {
      id: `eval-${Date.now()}`,
      ...data,
      overallScore: Math.round(overallScore * 10) / 10,
      evaluatedAt: new Date().toISOString(),
    };

    MOCK_EVALUATIONS.unshift(evaluation);
    return evaluation;
  },

  /**
   * Get agent evaluation summary
   */
  getAgentEvaluationSummary: async (agentId: string): Promise<AgentEvaluationSummary | null> => {
    await delay(300);

    const agentEvals = MOCK_EVALUATIONS.filter((e) => e.agentId === agentId);
    if (agentEvals.length === 0) return null;

    const agent = AGENTS.find((a) => a.id === agentId);
    const avgScore =
      agentEvals.reduce((sum, e) => sum + e.overallScore, 0) / agentEvals.length;

    const metricAverages: Record<string, number> = {};
    DEFAULT_METRICS.forEach((metric) => {
      const scores = agentEvals
        .map((e) => e.metrics.find((m) => m.metricId === metric.id)?.value)
        .filter((v): v is number => v !== undefined);
      metricAverages[metric.id] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    });

    // Compute trend
    const recentEvals = agentEvals
      .sort((a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime())
      .slice(0, 10);
    const olderAvg = agentEvals.length > 10
      ? agentEvals.slice(10).reduce((sum, e) => sum + e.overallScore, 0) / (agentEvals.length - 10)
      : avgScore;
    const recentAvg = recentEvals.reduce((sum, e) => sum + e.overallScore, 0) / recentEvals.length;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (recentAvg - olderAvg > 0.5) trend = 'up';
    else if (olderAvg - recentAvg > 0.5) trend = 'down';

    return {
      agentId,
      agentName: agent?.name || 'Unknown',
      avgScore: Math.round(avgScore * 10) / 10,
      totalEvaluations: agentEvals.length,
      metricAverages,
      trend,
      lastEvaluatedAt: agentEvals[0]?.evaluatedAt,
    };
  },

  /**
   * Get evaluation summaries of all agents
   */
  getAllAgentSummaries: async (): Promise<AgentEvaluationSummary[]> => {
    await delay(400);

    const summaries: AgentEvaluationSummary[] = [];

    for (const agent of AGENTS) {
      const agentEvals = MOCK_EVALUATIONS.filter((e) => e.agentId === agent.id);
      if (agentEvals.length === 0) continue;

      const avgScore =
        agentEvals.reduce((sum, e) => sum + e.overallScore, 0) / agentEvals.length;

      const metricAverages: Record<string, number> = {};
      DEFAULT_METRICS.forEach((metric) => {
        const scores = agentEvals
          .map((e) => e.metrics.find((m) => m.metricId === metric.id)?.value)
          .filter((v): v is number => v !== undefined);
        metricAverages[metric.id] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      });

      const recentEvals = agentEvals
        .sort((a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime())
        .slice(0, 10);
      const olderAvg = agentEvals.length > 10
        ? agentEvals.slice(10).reduce((sum, e) => sum + e.overallScore, 0) / (agentEvals.length - 10)
        : avgScore;
      const recentAvg = recentEvals.reduce((sum, e) => sum + e.overallScore, 0) / recentEvals.length;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (recentAvg - olderAvg > 0.5) trend = 'up';
      else if (olderAvg - recentAvg > 0.5) trend = 'down';

      summaries.push({
        agentId: agent.id,
        agentName: agent.name,
        avgScore: Math.round(avgScore * 10) / 10,
        totalEvaluations: agentEvals.length,
        metricAverages,
        trend,
        lastEvaluatedAt: agentEvals[0]?.evaluatedAt,
      });
    }

    return summaries.sort((a, b) => b.avgScore - a.avgScore);
  },

  /**
   * Get agent comparison data
   */
  getComparisonData: async (agentIds: string[]): Promise<ComparisonData> => {
    await delay(400);

    const data: Record<string, number[]> = {};

    DEFAULT_METRICS.forEach((metric) => {
      data[metric.id] = agentIds.map((agentId) => {
        const agentEvals = MOCK_EVALUATIONS.filter((e) => e.agentId === agentId);
        const scores = agentEvals
          .map((e) => e.metrics.find((m) => m.metricId === metric.id)?.value)
          .filter((v): v is number => v !== undefined);
        return scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
      });
    });

    return {
      agentIds,
      metrics: DEFAULT_METRICS.map((m) => m.id),
      data,
    };
  },

  /**
   * Get agent list
   */
  getAgents: async (): Promise<Array<{ id: string; name: string }>> => {
    await delay(200);
    return AGENTS;
  },
};

export default evaluationApi;
