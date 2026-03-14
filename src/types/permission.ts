/**
 * 权限相关类型定义
 */

/** 功能权限项 */
export interface FeaturePermission {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

/** 功能权限配置 */
export interface FeaturePermissions {
  webSearch: boolean;
  webFetch: boolean;
  codeExec: boolean;
  fileRead: boolean;
  fileWrite: boolean;
  systemCommand: boolean;
  databaseAccess: boolean;
}

/** 数据权限范围 */
export type DataScope = 'self' | 'department' | 'organization';

/** 权限配置 */
export interface PermissionConfig {
  // 功能权限
  features: FeaturePermissions;
  // Skills 访问权限 (Skills ID 列表)
  accessibleSkills: string[];
  // 提示词访问权限 (提示词 ID 列表)
  accessiblePrompts: string[];
  // 数据权限
  dataScope: DataScope;
  allowSensitiveData: boolean;
  historyRetentionDays: number;
}

/** 权限模板 */
export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  config: PermissionConfig;
  isDefault?: boolean;
}

/** 权限变更记录 */
export interface PermissionAuditLog {
  id: string;
  agentId: string;
  agentName: string;
  action: 'create' | 'update' | 'delete';
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  operator: string;
  operatedAt: Date;
}
