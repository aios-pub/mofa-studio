/**
 * Agent-related type definitions
 */

/** Agent status */
export type AgentStatus =
  | "idle"
  | "thinking"
  | "tool"
  | "waiting"
  | "error"
  | "offline";

/** Thinking mode config (corresponds to backend jsonb field) */
export interface ThinkingConfig {
  enabled: boolean;
  budget_tokens?: number;
}

/** Agent basic info */
export interface Agent {
  id: string;
  /** Agent name */
  agent_name: string;
  /** Agent unique code */
  agent_code: string;
  /** Description / system prompt (generated at runtime from linked prompt) */
  system_prompt: string;
  /** Avatar emoji */
  avatar?: string;
  /** Enabled status */
  enabled: boolean;
  /** Sort weight */
  agent_order?: number;
  /** Model ID (UUID) */
  model_id: string;
  /** Model name */
  model_name: string;
  /** Provider ID (UUID) */
  provider: {
    id: string;
    provider_name: string;
  };
  /** Agent type: 'native' | 'openclaw' | 'zeroclaw' | 'octos' | 'claude_code' | 'codex' */
  agent_category: string;
  /** Custom parameters */
  custom_params?: Record<string, unknown>;
  /** Temperature parameter */
  temperature?: number;
  /** Whether to stream output */
  stream?: boolean;
  /** Thinking mode config (stored as backend jsonb) */
  thinking?: ThinkingConfig;
  /** Context limit */
  context_limit?: number;
  /** Response format */
  response_format?: string;
  /** Max completion tokens */
  max_completion_tokens?: number;
  /** Input parameter config (frontend use) */
  input_parameters?: AgentInputParameter[];
  /** Platform identifier */
  platform?: number;
  /** Status (frontend use) */
  status?: AgentStatus;
  /** Created time */
  created_at?: Date;
  /** Updated time */
  updated_at?: Date;
}

/** Agent RBAC permission configuration */
export interface AgentPermission {
  agentId: string;
  // Function permissions
  features: {
    webSearch: boolean;
    webFetch: boolean;
    codeExec: boolean;
    fileRead: boolean;
    fileWrite: boolean;
    systemCommand: boolean;
    databaseAccess: boolean;
  };
  // Skills access permissions
  accessibleSkills: string[];
  // Prompt access permissions
  accessiblePrompts: string[];
  // Data permissions
  dataScope: "self" | "department" | "organization";
  allowSensitiveData: boolean;
  historyRetentionDays: number;
}

/** Prompts associated with the agent */
export interface AgentPrompt {
  id: string;
  agentId: string;
  promptId: string;
  type: "system" | "user";
  order: number;
  enabled: boolean;
}

/** Skills associated with the agent */
export interface AgentSkill {
  id: string;
  agentId: string;
  skillId: string;
  parameters?: Record<string, unknown>;
  order: number;
  enabled: boolean;
}

/** Test sets associated with the agent */
export interface AgentTestSet {
  id: string;
  agentId: string;
  testSetId: string;
}

/** Agent input parameter types */
export type AgentParameterType =
  | "text"
  | "number"
  | "boolean"
  | "file"
  | "select"
  | "date";

/** Agent input parameter definitions */
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

/** Agent input parameter values */
export interface AgentInputValue {
  parameterId: string;
  value: string | number | boolean | File | null;
}
