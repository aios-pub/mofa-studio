/**
 * Monitoring 真实 API
 * 后端端点: /api/monitoring/...
 */

import { apiClient } from "../api/apiClient";

interface AgentStatus {
  agentId: string;
  agentName: string;
  status: string;
  lastActive: string;
  conversations: number;
  tokens: number;
  avgResponseTime: number;
  errorRate: number;
}

interface ActivityEvent {
  id: string;
  type: string;
  agentId?: string;
  agentName?: string;
  userId?: string;
  userName?: string;
  description: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  activeConnections: number;
  requestRate: number;
  errorRate: number;
  avgLatency: number;
}

interface Alert {
  id: string;
  severity: string;
  message: string;
  source: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

const monitoringRealApi = {
  getAgentStatus: (agentId: string) =>
    apiClient.get(`/api/monitoring/agents/${agentId}`),

  getAllAgentStatus: () =>
    apiClient.get("/api/monitoring/agents"),

  // 别名方法
  getAgentStatuses: (): Promise<AgentStatus[]> =>
    apiClient.get("/api/monitoring/agents"),

  getActivityEvents: (params?: { limit?: number }) =>
    apiClient.get("/api/monitoring/events", { params }),

  getSystemMetrics: () =>
    apiClient.get("/api/monitoring/metrics"),

  getAlerts: (params?: { severity?: string; acknowledged?: boolean }) =>
    apiClient.get("/api/monitoring/alerts", { params }),

  acknowledgeAlert: (alertId: string) =>
    apiClient.post(`/api/monitoring/alerts/${alertId}/acknowledge`),

  // 兼容旧接口
  getAgentMetrics: (agentId: string, params?: { period?: string }) =>
    apiClient.get(`/api/monitoring/agents/${agentId}`, { params }),

  resolveAlert: (alertId: string) =>
    apiClient.post(`/api/monitoring/alerts/${alertId}/acknowledge`),

  // WebSocket 订阅方法 - 后端需要 WebSocket 支持
  subscribeToUpdates: (_callback: (event: ActivityEvent) => void): (() => void) => {
    console.warn("monitoringApi.subscribeToUpdates: WebSocket not implemented, returning no-op");
    // 返回一个空的取消订阅函数
    return () => {};
  },

  subscribeToMetrics: (_callback: (metrics: SystemMetrics) => void): (() => void) => {
    console.warn("monitoringApi.subscribeToMetrics: WebSocket not implemented, returning no-op");
    // 返回一个空的取消订阅函数
    return () => {};
  },
};

export { monitoringRealApi };
export type { AgentStatus, ActivityEvent, SystemMetrics, Alert };
