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
  inputParameters?: AgentInputParameter[];
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

/** Agent 输入参数类型 */
export type AgentParameterType = 'text' | 'number' | 'boolean' | 'file' | 'select' | 'date';

/** Agent 输入参数定义 */
export interface AgentInputParameter {
  id: string;
  name: string;
  label: string;
  type: AgentParameterType;
  required: boolean;
  defaultValue?: string | number | boolean;
  placeholder?: string;
  description?: string;
  options?: { label: string; value: string }[]; // for select type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

/** Agent 输入参数值 */
export interface AgentInputValue {
  parameterId: string;
  value: string | number | boolean | File | null;
}
