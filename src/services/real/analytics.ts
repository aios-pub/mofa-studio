/**
 * Analytics 真实 API
 * 后端端点: /api/analytics/...
 */

import { apiClient } from "../api/apiClient";

interface AnalyticsOverview {
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  activeUsers: number;
  activeAgents: number;
}

interface DailyStat {
  date: string;
  conversations: number;
  messages: number;
  tokens: number;
}

interface HourlyDistribution {
  hour: number;
  count: number;
}

const analyticsRealApi = {
  getOverview: (): Promise<AnalyticsOverview> =>
    apiClient.get("/api/analytics/overview"),

  getOverviewStats: (params?: { start_date?: string; end_date?: string }): Promise<AnalyticsOverview> =>
    apiClient.get("/api/analytics/overview", { params }),

  getDailyStats: (params?: { start_date?: string; end_date?: string }): Promise<DailyStat[]> =>
    apiClient.get("/api/analytics/daily", { params }),

  getHourlyDistribution: (params?: { date?: string }): Promise<HourlyDistribution[]> =>
    apiClient.get("/api/analytics/hourly", { params }),

  getTrend: (params?: { period?: string }) =>
    apiClient.get("/api/analytics/trend", { params }),

  export: (params?: { format?: string }) =>
    apiClient.get("/api/analytics/export", { params }),

  // 别名方法
  exportData: (format: string = "csv", params?: { start_date?: string; end_date?: string }) =>
    apiClient.get("/api/analytics/export", { params: { ...params, format } }),

  // 兼容旧接口
  getUsageStats: (params?: { start_date?: string; end_date?: string }): Promise<AnalyticsOverview> =>
    apiClient.get("/api/analytics/overview", { params }),

  getAgentStats: (params?: { agent_id?: string }): Promise<AnalyticsOverview> =>
    apiClient.get("/api/analytics/overview", { params }),

  getUserStats: (params?: { user_id?: string }): Promise<AnalyticsOverview> =>
    apiClient.get("/api/analytics/overview", { params }),
};

export { analyticsRealApi };
export type { AnalyticsOverview, DailyStat, HourlyDistribution };
