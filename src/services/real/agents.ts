/**
 * Agent 真实 API
 * 后端端点: /api/agent/...
 *
 * 后端使用 snake_case 字段名，前端使用 camelCase
 * 此层负责双向转换
 */

import { apiClient } from "../api/apiClient";
import type { Agent, AgentPermission, ThinkingConfig } from "@/types";

// ==================== 后端请求/响应类型 ====================

/** 后端 AgentReq (创建/更新请求) */
interface BackendAgentReq {
  id?: string;
  provider_id: string;
  model_id: string;
  model_name: string;
  agent_code: string;
  agent_name: string;
  agent_order?: number;
  agent_status?: boolean;
  system_prompt: string;
  context_limit?: number;
  custom_params?: Record<string, unknown>;
  temperature?: number;
  thinking?: unknown;
  stream?: boolean;
  response_format?: string;
  max_completion_tokens?: number;
  platform?: number;
  agent_type?: string;
}

/** 后端 AgentVo (响应) */
interface BackendAgentVo {
  id: string;
  model_id: string;
  model_name: string;
  provider: {
    id: string;
    provider_name: string;
  };
  agent_name: string;
  agent_code: string;
  agent_category: string;
  system_prompt: string;
  enabled: boolean;
  agent_order?: number;
  custom_params?: Record<string, unknown>;
  temperature?: number;
  thinking?: unknown;
  stream?: boolean;
  context_limit?: number;
  response_format?: string;
  max_completion_tokens?: number;
}

// ==================== 转换函数 ====================

/** 前端 → 后端 */
function toBackend(data: Partial<Agent>, isUpdate = false): BackendAgentReq {
  const req: BackendAgentReq = {
    provider_id: data.provider?.id || '',
    model_id: data.model_id || '',
    model_name: data.model_name || '',
    agent_code: data.agent_code || '',
    agent_name: data.agent_name || '',
    system_prompt: data.system_prompt || '',
    temperature: data.temperature,
    thinking: data.thinking,
    stream: data.stream,
    context_limit: data.context_limit,
    response_format: data.response_format,
    max_completion_tokens: data.max_completion_tokens,
    platform: data.platform,
    custom_params: data.custom_params,
    agent_order: data.agent_order,
    agent_status: data.enabled,
    agent_type: data.agent_category || 'native',
  };

  if (isUpdate && data.id) {
    req.id = data.id;
  }

  return req;
}

/** jsonb thinking → ThinkingConfig */
function parseThinking(val: unknown): ThinkingConfig | undefined {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'boolean') return { enabled: val };
  if (typeof val === 'object' && val !== null && 'enabled' in (val as any)) {
    const obj = val as { enabled?: unknown; budget_tokens?: unknown };
    return {
      enabled: !!obj.enabled,
      ...(obj.budget_tokens != null ? { budget_tokens: Number(obj.budget_tokens) } : {}),
    };
  }
  return undefined;
}

/** 后端 → 前端 */
function fromBackend(vo: BackendAgentVo): Agent {
  const agentType = vo.agent_category || 'native';
  const cp = vo.custom_params;
  return {
    id: vo.id,
    agent_name: vo.agent_name,
    agent_code: vo.agent_code,
    system_prompt: vo.system_prompt,
    enabled: vo.enabled,
    agent_order: vo.agent_order,
    model_id: vo.model_id,
    model_name: vo.model_name,
    provider: vo.provider,
    temperature: vo.temperature,
    thinking: parseThinking(vo.thinking),
    stream: vo.stream,
    context_limit: vo.context_limit,
    response_format: vo.response_format,
    max_completion_tokens: vo.max_completion_tokens,
    custom_params: cp,
    status: vo.enabled ? 'idle' : 'offline',
    agent_category: agentType,
  };
}

// ==================== API 方法 ====================

export const agentRealApi = {
  /** 获取所有 Agent */
  async getAll(): Promise<Agent[]> {
    const data = await apiClient.get<BackendAgentVo[]>("/api/agent/fetch");
    if (!Array.isArray(data)) return [];
    return data.map(fromBackend);
  },

  /** 获取单个 Agent */
  async getById(id: string): Promise<Agent> {
    const all = await agentRealApi.getAll();
    const item = all.find((a) => a.id === id);
    if (!item) throw new Error(`Agent ${id} not found`);
    return item;
  },

  /** 创建 Agent */
  async create(data: Partial<Agent>): Promise<Agent> {
    const req = toBackend(data, false);
    const vo = await apiClient.post<BackendAgentVo>("/api/agent/create", req);
    return fromBackend(vo);
  },

  /** 更新 Agent */
  async update(id: string, data: Partial<Agent>): Promise<Agent> {
    const req = toBackend({ ...data, id }, true);
    const vo = await apiClient.post<BackendAgentVo>("/api/agent/update", req);
    return fromBackend(vo);
  },

  /** 删除 Agent */
  async delete(id: string): Promise<boolean> {
    await apiClient.delete(`/api/agent/delete/${id}`);
    return true;
  },

  /** 获取 Agent 权限 */
  async getPermissions(agentId: string): Promise<AgentPermission | undefined> {
    return apiClient.get<AgentPermission>(`/api/permission/by-agent?agent_id=${agentId}`);
  },

  /** 更新 Agent 权限 */
  async updatePermissions(
    agentId: string,
    data: Partial<AgentPermission>
  ): Promise<AgentPermission | undefined> {
    return apiClient.post<AgentPermission>("/api/permission/save", {
      agent_id: agentId,
      ...data,
    });
  },
};
