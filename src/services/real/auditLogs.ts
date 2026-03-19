/**
 * AuditLogs 真实 API
 * 后端端点: /api/audit-logs/...
 */

import { apiClient } from "../api/apiClient";

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

const auditLogRealApi = {
  getAll: (params?: { user_id?: string; action?: string; start_date?: string; end_date?: string }) =>
    apiClient.get("/api/audit-logs", { params }),

  getById: (logId: string) =>
    apiClient.get(`/api/audit-logs/${logId}`),

  getStats: (params?: { start_date?: string; end_date?: string }) =>
    apiClient.get("/api/audit-logs/stats", { params }),

  export: (params?: { start_date?: string; end_date?: string; format?: string }) =>
    apiClient.get("/api/audit-logs/export", { params }),

  // 别名方法
  getLogs: (params?: { user_id?: string; action?: string; start_date?: string; end_date?: string; page?: number; size?: number }) =>
    apiClient.get<AuditLog[]>("/api/audit-logs", { params }),

  exportLogs: (format: string = "csv", params?: { start_date?: string; end_date?: string }) =>
    apiClient.get("/api/audit-logs/export", { params: { ...params, format } }),

  getResourceTypes: (): string[] => {
    return ["user", "agent", "provider", "channel", "skill", "prompt", "testset", "workflow", "knowledge", "role", "menu", "system"];
  },

  getActionTypes: (): string[] => {
    return ["create", "update", "delete", "view", "export", "import", "login", "logout", "enable", "disable"];
  },

  // 兼容旧接口
  getActions: () =>
    apiClient.get("/api/audit-logs/stats"),
};

export { auditLogRealApi };
