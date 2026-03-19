/**
 * Permissions 真实 API
 * 后端端点: /api/permission/...
 */

import { apiClient } from "../api/apiClient";

// 类型定义
interface FeaturePermissions {
  webSearch: boolean;
  webFetch: boolean;
  codeExec: boolean;
  fileRead: boolean;
  fileWrite: boolean;
  systemCommand: boolean;
  databaseAccess: boolean;
}

interface PermissionConfig {
  features: FeaturePermissions;
  accessibleSkills: string[];
  accessiblePrompts: string[];
  dataScope: 'self' | 'department' | 'organization';
  allowSensitiveData: boolean;
  historyRetentionDays: number;
}

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  isDefault?: boolean;
  config: PermissionConfig;
}

interface PermissionAuditLog {
  id: string;
  agentId: string;
  agentName: string;
  action: 'create' | 'update' | 'delete';
  changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  operator: string;
  operatedAt: Date;
}

// 功能权限定义（前端静态数据）
export const featurePermissionDefinitions = [
  { key: 'webSearch', label: '联网搜索', description: '允许 Agent 使用搜索引擎搜索互联网信息', icon: '🔍' },
  { key: 'webFetch', label: '网页抓取', description: '允许 Agent 抓取指定网页的内容', icon: '📄' },
  { key: 'codeExec', label: '执行代码', description: '允许 Agent 在沙箱环境中执行代码', icon: '⚡' },
  { key: 'fileRead', label: '文件读取', description: '允许 Agent 读取本地文件', icon: '📖' },
  { key: 'fileWrite', label: '文件写入', description: '允许 Agent 写入或修改本地文件', icon: '✏️' },
  { key: 'systemCommand', label: '系统命令', description: '允许 Agent 执行系统命令', icon: '💻' },
  { key: 'databaseAccess', label: '数据库访问', description: '允许 Agent 访问和查询数据库', icon: '🗄️' },
];

// 默认功能权限配置
export const defaultFeaturePermissions: FeaturePermissions = {
  webSearch: true,
  webFetch: true,
  codeExec: false,
  fileRead: true,
  fileWrite: false,
  systemCommand: false,
  databaseAccess: false,
};

const permissionRealApi = {
  // 获取 Agent 权限配置
  getAgentPermission: (agentId: string): Promise<PermissionConfig> =>
    apiClient.get<PermissionConfig>(`/api/permission/by-agent?agent_id=${agentId}`),

  // 更新 Agent 权限配置
  updateAgentPermission: (agentId: string, config: PermissionConfig): Promise<PermissionConfig> =>
    apiClient.post<PermissionConfig>("/api/permission/save", { agent_id: agentId, ...config }),

  // 删除 Agent 权限配置
  deleteAgentPermission: (agentId: string): Promise<void> =>
    apiClient.delete(`/api/permission/delete-by-agent?agent_id=${agentId}`),

  // 权限模板
  getTemplates: (): Promise<PermissionTemplate[]> =>
    apiClient.get<PermissionTemplate[]>('/api/permission/template/list'),

  getDefaultTemplate: (): Promise<PermissionTemplate> =>
    apiClient.get<PermissionTemplate>('/api/permission/template/default'),

  getTemplate: (id: string): Promise<PermissionTemplate> =>
    apiClient.get<PermissionTemplate>(`/api/permission/template/${id}`),

  createTemplate: (data: Partial<PermissionTemplate>): Promise<PermissionTemplate> =>
    apiClient.post<PermissionTemplate>('/api/permission/template/create', data),

  updateTemplate: (id: string, data: Partial<PermissionTemplate>): Promise<PermissionTemplate> =>
    apiClient.post<PermissionTemplate>('/api/permission/template/update', { id, ...data }),

  deleteTemplate: (id: string): Promise<void> =>
    apiClient.delete(`/api/permission/template/delete/${id}`),

  // 兼容旧接口
  applyTemplate: (agentId: string, templateId: string): Promise<PermissionConfig> =>
    apiClient.get<PermissionTemplate>(`/api/permission/template/${templateId}`).then((template) => {
      return apiClient.post<PermissionConfig>("/api/permission/save", {
        agent_id: agentId,
        ...template.config,
      });
    }),

  getAuditLogs: (agentId?: string): Promise<PermissionAuditLog[]> =>
    apiClient.get<PermissionAuditLog[]>('/api/audit-logs', { params: { agent_id: agentId } }),

  addAuditLog: async (_log: Omit<PermissionAuditLog, 'id' | 'operatedAt'>): Promise<PermissionAuditLog> => {
    console.warn("permissionApi.addAuditLog: Backend does not support POST to audit-logs endpoint");
    return {
      id: `mock-${Date.now()}`,
      operatedAt: new Date(),
      ..._log,
    } as PermissionAuditLog;
  },
};

export { permissionRealApi };
export type { PermissionConfig, PermissionTemplate, PermissionAuditLog, FeaturePermissions };
