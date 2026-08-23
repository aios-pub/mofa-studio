/**
 * Analytics real API
 * Backend endpoints: /api/analytics/...
 */

import { apiClient } from "../api/apiClient";

// Use snake_case consistently to match the backend
export interface UsageStats {
  total_conversations: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  avg_response_time: number;
  success_rate: number;
  total_cost: number;
}

export interface DailyStats {
  date: string;
  conversations: number;
  tokens: number;
  input_tokens: number;
  output_tokens: number;
  avg_response_time: number;
  success_rate: number;
  cost: number;
}

export interface HourlyDistribution {
  hour: number;
  count: number;
}

const analyticsRealApi = {
  getOverview: (): Promise<UsageStats> =>
    apiClient.get("/api/analytics/overview"),

  getOverviewStats: (params?: { start_date?: string; end_date?: string }): Promise<UsageStats> =>
    apiClient.get("/api/analytics/overview", { params }),

  getDailyStats: (params?: { start_date?: string; end_date?: string }): Promise<DailyStats[]> =>
    apiClient.get("/api/analytics/daily", { params }),

  getHourlyDistribution: (params?: { date?: string }): Promise<HourlyDistribution[]> =>
    apiClient.get("/api/analytics/hourly", { params }),

  getTrend: (params?: { period?: string }) =>
    apiClient.get("/api/analytics/trend", { params }),

  export: (params?: { format?: string }) =>
    apiClient.get("/api/analytics/export", { params }),

  // Alias methods
  exportData: (format: string = "csv", params?: { start_date?: string; end_date?: string }) =>
    apiClient.get("/api/analytics/export", { params: { ...params, format } }),

  // Legacy interface compatibility
  getUsageStats: (params?: { start_date?: string; end_date?: string }): Promise<UsageStats> =>
    apiClient.get("/api/analytics/overview", { params }),

  getAgentStats: (params?: { agent_id?: string }): Promise<UsageStats> =>
    apiClient.get("/api/analytics/overview", { params }),

  getUserStats: (params?: { user_id?: string }): Promise<UsageStats> =>
    apiClient.get("/api/analytics/overview", { params }),
};

export { analyticsRealApi };
