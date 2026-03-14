/**
 * Agent 相关类型定义
 */

/** Agent 状态 */
export type AgentStatus = 'idle' | 'thinking' | 'tool' | 'waiting' | 'error' | 'offline';

/** Agent 基本信息 */
export interface Agent {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  status: AgentStatus;
  modelId: string;
  providerId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Agent RBAC 权限配置 */
export interface AgentPermission {
  agentId: string;
  // 功能权限
  features: {
    webSearch: boolean;
    webFetch: boolean;
    codeExec: boolean;
    fileRead: boolean;
    fileWrite: boolean;
    systemCommand: boolean;
    databaseAccess: boolean;
  };
  // Skills 访问权限
  accessibleSkills: string[];
  // 提示词访问权限
  accessiblePrompts: string[];
  // 数据权限
  dataScope: 'self' | 'department' | 'organization';
  allowSensitiveData: boolean;
  historyRetentionDays: number;
}

/** Agent 关联的提示词 */
export interface AgentPrompt {
  id: string;
  agentId: string;
  promptId: string;
  type: 'system' | 'user';
  order: number;
  enabled: boolean;
}

/** Agent 关联的 Skill */
export interface AgentSkill {
  id: string;
  agentId: string;
  skillId: string;
  parameters?: Record<string, unknown>;
  order: number;
  enabled: boolean;
}

/** Agent 关联的测试集 */
export interface AgentTestSet {
  id: string;
  agentId: string;
  testSetId: string;
}
