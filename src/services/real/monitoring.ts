/**
 * Monitoring 真实 API
 * 后端端点: /api/monitoring/...
 * 支持 WebSocket 实时订阅
 */

import { apiClient } from "../api/apiClient";
import { getWebSocketManager } from "../websocket";

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
  type: string;  // WebSocket events use 'type', REST API uses 'event_type'
  agent_id?: string;
  agent_name?: string;
  user_id?: string;
  user_name?: string;
  details: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  network: number;
  active_connections: number;
  queue_length: number;
  timestamp?: string;
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
  // ==================== REST API ====================

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

  // ==================== WebSocket 订阅 ====================

  /**
   * 订阅实时更新 (活动事件)
   */
  subscribeToUpdates: (callback: (event: ActivityEvent) => void): (() => void) => {
    try {
      const ws = getWebSocketManager();
      return ws.on('monitoring:activity', callback);
    } catch (error) {
      console.warn('WebSocket not initialized, activity updates disabled');
      return () => {};
    }
  },

  /**
   * 订阅系统指标更新
   */
  subscribeToMetrics: (callback: (metrics: SystemMetrics) => void): (() => void) => {
    try {
      const ws = getWebSocketManager();
      return ws.on('monitoring:metrics', callback);
    } catch (error) {
      console.warn('WebSocket not initialized, metrics updates disabled');
      return () => {};
    }
  },

  /**
   * 订阅 Agent status更新
   */
  subscribeToAgentStatus: (callback: (status: AgentStatus) => void): (() => void) => {
    try {
      const ws = getWebSocketManager();
      return ws.on('monitoring:agent_status', callback);
    } catch (error) {
      console.warn('WebSocket not initialized, agent status updates disabled');
      return () => {};
    }
  },

  /**
   * 订阅告警更新
   */
  subscribeToAlerts: (callback: (alert: Alert) => void): (() => void) => {
    try {
      const ws = getWebSocketManager();
      return ws.on('monitoring:alert', callback);
    } catch (error) {
      console.warn('WebSocket not initialized, alert updates disabled');
      return () => {};
    }
  },

  /**
   * 订阅所有监控事件
   */
  subscribeToAll: (handlers: {
    onActivity?: (event: ActivityEvent) => void;
    onMetrics?: (metrics: SystemMetrics) => void;
    onAgentStatus?: (status: AgentStatus) => void;
    onAlert?: (alert: Alert) => void;
  }): (() => void) => {
    const unsubscribers: (() => void)[] = [];

    try {
      const ws = getWebSocketManager();

      if (handlers.onActivity) {
        unsubscribers.push(ws.on('monitoring:activity', handlers.onActivity));
      }
      if (handlers.onMetrics) {
        unsubscribers.push(ws.on('monitoring:metrics', handlers.onMetrics));
      }
      if (handlers.onAgentStatus) {
        unsubscribers.push(ws.on('monitoring:agent_status', handlers.onAgentStatus));
      }
      if (handlers.onAlert) {
        unsubscribers.push(ws.on('monitoring:alert', handlers.onAlert));
      }
    } catch (error) {
      console.warn('WebSocket not initialized');
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  },
};

export { monitoringRealApi };
