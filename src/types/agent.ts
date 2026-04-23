/**
 * Agent 相关类型定义
 */

/** Agent 状态 */
export type AgentStatus =
  | "idle"
  | "thinking"
  | "tool"
  | "waiting"
  | "error"
  | "offline";

/** 思考模式配置（对应后端 jsonb 字段） */
export interface ThinkingConfig {
  enabled: boolean;
  budget_tokens?: number;
}

/** Agent 基本信息 */
export interface Agent {
  id: string;
  /** Agent 名称 */
  agent_name: string;
  /** Agent 唯一编码 */
  agent_code: string;
  /** 描述 / 系统提示词（运行时从关联提示词生成） */
  system_prompt: string;
  /** 头像 emoji */
  avatar?: string;
  /** 启用状态 */
  enabled: boolean;
  /** 排序权重 */
  agent_order?: number;
  /** 模型 ID (UUID) */
  model_id: string;
  /** 模型名称 */
  model_name: string;
  /** 供应商 ID (UUID) */
  provider: {
    id: string;
    provider_name: string;
  };
  /** Agent 类型: 'native' | 'openclaw' | 'zeroclaw' | 'octos' | 'claude_code' | 'codex' */
  agent_category: string;
  /** 自定义参数 */
  custom_params?: Record<string, unknown>;
  /** 温度参数 */
  temperature?: number;
  /** 是否流式输出 */
  stream?: boolean;
  /** 思考模式配置（后端 jsonb 存储） */
  thinking?: ThinkingConfig;
  /** 上下文限制 */
  context_limit?: number;
  /** 响应格式 */
  response_format?: string;
  /** 最大完成 token 数 */
  max_completion_tokens?: number;
  /** 输入参数配置（前端使用） */
  input_parameters?: AgentInputParameter[];
  /** 平台标识 */
  platform?: number;
  /** 状态（前端用） */
  status?: AgentStatus;
  /** 创建时间 */
  created_at?: Date;
  /** 更新时间 */
  updated_at?: Date;
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
  dataScope: "self" | "department" | "organization";
  allowSensitiveData: boolean;
  historyRetentionDays: number;
}

/** Agent 关联的提示词 */
export interface AgentPrompt {
  id: string;
  agentId: string;
  promptId: string;
  type: "system" | "user";
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
export type AgentParameterType =
  | "text"
  | "number"
  | "boolean"
  | "file"
  | "select"
  | "date";

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
