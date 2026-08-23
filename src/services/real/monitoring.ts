/**
 * Monitoring real API
 * Backend endpoints: /api/monitoring/...
 * Supports real-time WebSocket subscription
 */

import { apiClient } from "../api/apiClient";
import { getWebSocketManager } from "../websocket";

// Use snake_case consistently to match the backend
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

  // Alias methods
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

  // Legacy interface compatibility
  getAgentMetrics: (agentId: string, params?: { period?: string }) =>
    apiClient.get(`/api/monitoring/agents/${agentId}`, { params }),

  resolveAlert: (alertId: string) =>
    apiClient.post(`/api/monitoring/alerts/${alertId}/acknowledge`),

  // ==================== WebSocket subscription ====================

  /**
   * Subscribe to real-time updates (activity events)
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
   * Subscribe to system metric updates
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
   * Subscribe to agent status updates
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
   * Subscribe to alert updates
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
   * Subscribe to all monitoring events
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
