/**
 * Permissions 真实 API
 * 后端端点: /api/permission/...
 *
 * 后端字段映射 (snake_case → camelCase):
 *   agent_id        → agentId
 *   is_default      → isDefault
 *   data_scope      → dataScope
 *   allow_sensitive_data → allowSensitiveData
 *   history_retention_days → historyRetentionDays
 *   accessible_skills → accessibleSkills
 *   accessible_prompts → accessiblePrompts
 *   operated_at     → operatedAt
 *   create_time     → createdAt
 *   update_time     → updatedAt
 */

import { apiClient } from "../api/apiClient";
import { parseDate } from "./fieldMapper";

// ==================== 类型定义 ====================

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
  createdAt?: Date;
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

// ==================== 后端原始类型 ====================

interface BackendPermission {
  id?: string;
  agent_id: string;
  features?: unknown;
  accessible_skills?: string[];
  accessible_prompts?: string[];
  data_scope?: string;
  allow_sensitive_data?: boolean;
  history_retention_days?: number;
  config?: unknown;
  tenant_id?: string;
  create_time?: string;
  update_time?: string;
}

interface BackendPermissionTemplate {
  id: string;
  name: string;
  description?: string;
  is_default?: boolean;
  config?: unknown;
  tenant_id?: string;
  create_time?: string;
  update_time?: string;
}

interface BackendAuditLog {
  id: string;
  agent_id: string;
  agent_name?: string;
  action: string;
  changes?: unknown;
  operator?: string;
  operated_at?: string;
  create_time?: string;
}

// ==================== 字段映射 ====================

const DEFAULT_FEATURES: FeaturePermissions = {
  webSearch: true,
  webFetch: true,
  codeExec: false,
  fileRead: true,
  fileWrite: false,
  systemCommand: false,
  databaseAccess: false,
};

function mapPermissionConfig(raw: BackendPermission): PermissionConfig {
  let features = DEFAULT_FEATURES;
  if (raw.features && typeof raw.features === 'object') {
    features = { ...DEFAULT_FEATURES, ...(raw.features as Partial<FeaturePermissions>) };
  }
  if (raw.config && typeof raw.config === 'object') {
    const cfg = raw.config as Record<string, unknown>;
    if (cfg.features) features = { ...DEFAULT_FEATURES, ...(cfg.features as Partial<FeaturePermissions>) };
  }

  return {
    features,
    accessibleSkills: raw.accessible_skills ?? [],
    accessiblePrompts: raw.accessible_prompts ?? [],
    dataScope: (raw.data_scope as PermissionConfig['dataScope']) ?? 'self',
    allowSensitiveData: raw.allow_sensitive_data ?? false,
    historyRetentionDays: raw.history_retention_days ?? 90,
  };
}

function mapPermissionToBackend(config: PermissionConfig): Record<string, unknown> {
  return {
    features: config.features,
    accessible_skills: config.accessibleSkills,
    accessible_prompts: config.accessiblePrompts,
    data_scope: config.dataScope,
    allow_sensitive_data: config.allowSensitiveData,
    history_retention_days: config.historyRetentionDays,
  };
}

function mapTemplate(raw: BackendPermissionTemplate): PermissionTemplate {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description || "",
    isDefault: raw.is_default,
    config: raw.config ? mapPermissionConfig(raw.config as BackendPermission) : {
      features: DEFAULT_FEATURES,
      accessibleSkills: [],
      accessiblePrompts: [],
      dataScope: 'self',
      allowSensitiveData: false,
      historyRetentionDays: 90,
    },
    createdAt: parseDate(raw.create_time),
  };
}

function mapTemplateToBackend(data: Partial<PermissionTemplate>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.description !== undefined) result.description = data.description;
  if (data.isDefault !== undefined) result.is_default = data.isDefault;
  if (data.config !== undefined) result.config = mapPermissionToBackend(data.config);
  return result;
}

function mapAuditLog(raw: BackendAuditLog): PermissionAuditLog {
  return {
    id: raw.id,
    agentId: raw.agent_id,
    agentName: raw.agent_name || "",
    action: raw.action as PermissionAuditLog['action'],
    changes: Array.isArray(raw.changes) ? raw.changes : [],
    operator: raw.operator || "",
    operatedAt: parseDate(raw.operated_at ?? raw.create_time) ?? new Date(),
  };
}

// ==================== 功能权限定义 ====================

export const featurePermissionDefinitions = [
  { key: 'webSearch', label: '联网搜索', description: '允许 Agent 使用搜索引擎搜索互联网信息', icon: '🔍' },
  { key: 'webFetch', label: '网页抓取', description: '允许 Agent 抓取指定网页的内容', icon: '📄' },
  { key: 'codeExec', label: '执行代码', description: '允许 Agent 在沙箱环境中执行代码', icon: '⚡' },
  { key: 'fileRead', label: '文件读取', description: '允许 Agent 读取本地文件', icon: '📖' },
  { key: 'fileWrite', label: '文件写入', description: '允许 Agent 写入或修改本地文件', icon: '✏️' },
  { key: 'systemCommand', label: '系统命令', description: '允许 Agent 执行系统命令', icon: '💻' },
  { key: 'databaseAccess', label: '数据库访问', description: '允许 Agent 访问和查询数据库', icon: '🗄️' },
];

export const defaultFeaturePermissions: FeaturePermissions = { ...DEFAULT_FEATURES };

// ==================== API 方法 ====================

const permissionRealApi = {
  /** 获取 Agent 权限配置 */
  async getAgentPermission(agentId: string): Promise<PermissionConfig> {
    const raw = await apiClient.get<BackendPermission>(`/api/permission/by-agent?agent_id=${agentId}`);
    return mapPermissionConfig(raw);
  },

  /** 更新 Agent 权限配置 */
  async updateAgentPermission(agentId: string, config: PermissionConfig): Promise<PermissionConfig> {
    const body = {
      agent_id: agentId,
      ...mapPermissionToBackend(config),
    };
    const raw = await apiClient.post<BackendPermission>("/api/permission/save", body);
    return mapPermissionConfig(raw);
  },

  /** 删除 Agent 权限配置 */
  async deleteAgentPermission(agentId: string): Promise<void> {
    await apiClient.delete(`/api/permission/delete-by-agent?agent_id=${agentId}`);
  },

  // ==================== 权限模板 ====================

  async getTemplates(): Promise<PermissionTemplate[]> {
    const data = await apiClient.get<BackendPermissionTemplate[]>('/api/permission/template/list');
    if (!Array.isArray(data)) return [];
    return data.map(mapTemplate);
  },

  async getDefaultTemplate(): Promise<PermissionTemplate> {
    const raw = await apiClient.get<BackendPermissionTemplate>('/api/permission/template/default');
    return mapTemplate(raw);
  },

  async getTemplate(id: string): Promise<PermissionTemplate> {
    const raw = await apiClient.get<BackendPermissionTemplate>(`/api/permission/template/${id}`);
    return mapTemplate(raw);
  },

  async createTemplate(data: Partial<PermissionTemplate>): Promise<PermissionTemplate> {
    const body = mapTemplateToBackend(data);
    const raw = await apiClient.post<BackendPermissionTemplate>('/api/permission/template/create', body);
    return mapTemplate(raw);
  },

  async updateTemplate(id: string, data: Partial<PermissionTemplate>): Promise<PermissionTemplate> {
    const body = { id, ...mapTemplateToBackend(data) };
    const raw = await apiClient.post<BackendPermissionTemplate>('/api/permission/template/update', body);
    return mapTemplate(raw);
  },

  async deleteTemplate(id: string): Promise<void> {
    await apiClient.delete(`/api/permission/template/delete/${id}`);
  },

  /** 应用模板 */
  async applyTemplate(agentId: string, templateId: string): Promise<PermissionConfig> {
    const template = await permissionRealApi.getTemplate(templateId);
    return permissionRealApi.updateAgentPermission(agentId, template.config);
  },

  /** 审计日志 */
  async getAuditLogs(agentId?: string): Promise<PermissionAuditLog[]> {
    const data = await apiClient.get<BackendAuditLog[]>('/api/audit-logs', { params: { agent_id: agentId } });
    if (!Array.isArray(data)) return [];
    return data.map(mapAuditLog);
  },

  async addAuditLog(_log: Omit<PermissionAuditLog, 'id' | 'operatedAt'>): Promise<PermissionAuditLog> {
    return {
      id: `mock-${Date.now()}`,
      operatedAt: new Date(),
      ..._log,
    } as PermissionAuditLog;
  },
};

export { permissionRealApi };
export type { PermissionConfig, PermissionTemplate, PermissionAuditLog, FeaturePermissions };
