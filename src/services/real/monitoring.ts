/**
 * Monitoring 真实 API
 * 后端端点: /api/monitoring/...
 * 统一使用 snake_case 与后端保持一致
 */

import { apiClient } from "../api/apiClient";

// 统一使用 snake_case 与后端保持一致
export interface AgentStatus {
  agent_id: string;
  agent_name: string;
  status: "online" | "offline" | "busy" | "error";
  current_conversation?: string;
  last_active: string;
  metrics: {
    conversations_today: number;
    avg_response_time: number;
    success_rate: number;
    tokens_used: number;
  };
}

export interface ActivityEvent {
  id: string;
  type: string;
  agent_id?: string;
  agent_name?: string;
  user_id?: string;
  user_name?: string;
  description: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  active_connections: number;
  request_rate: number;
  error_rate: number;
  avg_latency: number;
}

export interface Alert {
  id: string;
  type: "error" | "warning" | "info";
  title: string;
  message: string;
  agent_id?: string;
  agent_name?: string;
  timestamp: string;
  acknowledged: boolean;
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
