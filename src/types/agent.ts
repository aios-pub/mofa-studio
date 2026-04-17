/**
 * Agent 相关类型定义
 */

/** Agent 状态 */
export type AgentStatus = 'idle' | 'thinking' | 'tool' | 'waiting' | 'error' | 'offline';

/** Agent 基本信息 */
export interface Agent {
  id: string;
  /** Agent 名称 */
  name: string;
  /** Agent 唯一编码 */
  agentCode: string;
  /** 描述 / 系统提示词（运行时从关联提示词生成） */
  systemPrompt?: string;
  /** 头像 emoji */
  avatar?: string;
  /** 启用状态 */
  enabled: boolean;
  /** 排序权重 */
  order?: number;
  /** 模型 ID (UUID) */
  modelId: string;
  /** 模型名称 */
  modelName: string;
  /** 供应商 ID (UUID) */
  providerId: string;
  /** 供应商名称 */
  providerName?: string;
  /** 上下文限制 */
  contextLimit?: number;
  /** 温度参数 */
  temperature?: number;
  /** 是否启用思考模式 */
  thinking?: boolean;
  /** 是否流式输出 */
  stream?: boolean;
  /** 响应格式 */
  responseFormat?: string;
  /** 最大完成 token 数 */
  maxCompletionTokens?: number;
  /** 自定义参数 */
  customParams?: Record<string, unknown>;
  /** 输入参数配置（前端使用） */
  inputParameters?: AgentInputParameter[];
  /** 平台标识 */
  platform?: number;
  /** 状态（前端用） */
  status?: AgentStatus;
  /** Agent 类型: 'native' | 'openclaw' | 'zeroclaw' | 'octos' | 'claude_code' | 'codex' */
  agentType: string;
  /** Claw 实例 ID（仅 claw 类型 Agent） */
  clawInstanceId?: string;
  /** Claw 状态（仅 claw 类型 Agent） */
  clawStatus?: string;
  /** Claw 版本（仅 claw 类型 Agent） */
  clawVersion?: string;
  /** Claw 端点地址（仅 claw 类型 Agent） */
  endpointUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
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
  options?: { label: string; value: string }[];
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
