/**
 * Permission-related type definitions
 */

/** Function permission item */
export interface FeaturePermission {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

/** Function permission configuration */
export interface FeaturePermissions {
  webSearch: boolean;
  webFetch: boolean;
  codeExec: boolean;
  fileRead: boolean;
  fileWrite: boolean;
  systemCommand: boolean;
  databaseAccess: boolean;
}

/** Data permission scope */
export type DataScope = 'self' | 'department' | 'organization';

/** Permission configuration */
export interface PermissionConfig {
  // Function permissions
  features: FeaturePermissions;
  // Skills access permissions (skill ID list)
  accessibleSkills: string[];
  // Prompt access permissions (prompt ID list)
  accessiblePrompts: string[];
  // Data permissions
  dataScope: DataScope;
  allowSensitiveData: boolean;
  historyRetentionDays: number;
}

/** Permission template */
export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  config: PermissionConfig;
  isDefault?: boolean;
}

/** Permission change records */
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
