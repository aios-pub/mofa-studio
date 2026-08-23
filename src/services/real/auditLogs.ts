/**
 * Audit logs real API
 * Backend endpoints: /api/audit-logs/...
 *
 * Backend field mapping (snake_case -> camelCase):
 *   user_id       → userId
 *   user_name     → userName
 *   resource_id   → resourceId
 *   ip_address    → ipAddress
 *   user_agent    → userAgent
 *   create_time   → createdAt
 */

import { apiClient } from "../api/apiClient";

// ==================== Frontend types ====================

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
  createdAt: string | Date;
}

// ==================== Raw backend types ====================

interface BackendAuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  action?: string;
  resource?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  tenant_id?: string;
  create_time?: string;
}

// ==================== Field mapping ====================

function mapAuditLog(raw: BackendAuditLog): AuditLog {
  return {
    id: raw.id,
    userId: raw.user_id || "",
    userName: raw.user_name || "",
    action: raw.action || "",
    resource: raw.resource || "",
    resourceId: raw.resource_id,
    details: raw.details,
    ipAddress: raw.ip_address,
    userAgent: raw.user_agent,
    createdAt: raw.create_time || "",
  };
}

// ==================== API methods ====================

const auditLogRealApi = {
  async getAll(params?: { user_id?: string; action?: string; start_date?: string; end_date?: string }): Promise<AuditLog[]> {
    const data = await apiClient.get<BackendAuditLog[]>("/api/audit-logs", { params });
    if (!Array.isArray(data)) return [];
    return data.map(mapAuditLog);
  },

  async getById(logId: string): Promise<AuditLog> {
    const raw = await apiClient.get<BackendAuditLog>(`/api/audit-logs/${logId}`);
    return mapAuditLog(raw);
  },

  getStats: (params?: { start_date?: string; end_date?: string }) =>
    apiClient.get("/api/audit-logs/stats", { params }),

  export: (params?: { start_date?: string; end_date?: string; format?: string }) =>
    apiClient.get("/api/audit-logs/export", { params }),

  /** Alias */
  getLogs: (params?: { user_id?: string; action?: string; start_date?: string; end_date?: string; page?: number; size?: number }) =>
    auditLogRealApi.getAll(params),

  exportLogs: (format: string = "csv", params?: { start_date?: string; end_date?: string }) =>
    auditLogRealApi.export({ ...params, format }),

  getResourceTypes: (): string[] => ["user", "agent", "provider", "channel", "skill", "prompt", "testset", "workflow", "knowledge", "role", "menu", "system"],

  getActionTypes: (): string[] => ["create", "update", "delete", "view", "export", "import", "login", "logout", "enable", "disable"],

  getActions: () => apiClient.get("/api/audit-logs/stats"),
};

export { auditLogRealApi };
