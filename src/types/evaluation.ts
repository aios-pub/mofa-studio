/**
 * 评估相关类型定义
 */

export interface EvaluationMetric {
  id: string;
  name: string;
  description: string;
  weight: number;
  maxValue: number;
  category: 'quality' | 'performance' | 'safety' | 'user_experience';
}

export interface EvaluationScore {
  metricId: string;
  value: number;
  reason?: string;
}

export interface EvaluationRecord {
  id: string;
  agentId: string;
  conversationId: string;
  metrics: EvaluationScore[];
  overallScore: number;
  evaluatedAt: string;
  evaluator: 'auto' | 'human';
  evaluatorId?: string;
  evaluatorName?: string;
  feedback?: string;
}

export interface AgentEvaluationSummary {
  agentId: string;
  agentName: string;
  avgScore: number;
  totalEvaluations: number;
  metricAverages: Record<string, number>;
  trend: 'up' | 'down' | 'stable';
  lastEvaluatedAt?: string;
}

export interface ComparisonData {
  agentIds: string[];
  metrics: string[];
  data: Record<string, number[]>; // metricId -> scores per agent
}

export type TimeRange = '7d' | '30d' | '90d' | 'custom';

export interface EvaluationFilter {
  agentId?: string;
  evaluator?: 'auto' | 'human' | 'all';
  timeRange?: TimeRange;
  startDate?: string;
  endDate?: string;
  minScore?: number;
  maxScore?: number;
}
