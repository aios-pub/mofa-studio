/**
 * Agent 真实 API
 * 后端端点: /api/agent/...
 *
 * 后端使用 snake_case 字段名，前端使用 camelCase
 * 此层负责双向转换
 */

import { apiClient } from "../api/apiClient";
import type { Agent, AgentPermission } from "@/types";

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
  thinking?: unknown; // jsonb: 前端传 boolean，后端存为 jsonb
  stream?: boolean;
  response_format?: string;
  max_completion_tokens?: number;
  platform?: number;
}

/** 后端 AgentVo (响应) */
interface BackendAgentVo {
  id: string;
  model: string;
  provider: {
    id: string;
    provider_name: string;
  };
  agent_name: string;
  agent_code: string;
  system_prompt: string;
  enabled: boolean;
  agent_order?: number;
  custom_params?: Record<string, unknown>;
  temperature?: number;
  thinking?: unknown; // jsonb
  stream?: boolean;
  context_limit?: number;
  response_format?: string;
  max_completion_tokens?: number;
  created_at?: string;
  updated_at?: string;
}

// ==================== 转换函数 ====================

/** 前端 → 后端 */
function toBackend(data: Partial<Agent>, isUpdate = false): BackendAgentReq {
  const req: BackendAgentReq = {
    provider_id: data.providerId || '',
    model_id: data.modelId || '',
    model_name: data.modelName || '',
    agent_code: data.agentCode || '',
    agent_name: data.name || '',
    system_prompt: data.systemPrompt || '',
    temperature: data.temperature,
    thinking: data.thinking,
    stream: data.stream,
    context_limit: data.contextLimit,
    response_format: data.responseFormat,
    max_completion_tokens: data.maxCompletionTokens,
    platform: data.platform,
    custom_params: data.customParams,
    agent_order: data.order,
    agent_status: data.enabled,
  };

  if (isUpdate && data.id) {
    req.id = data.id;
  }

  return req;
}

/** 后端 → 前端 */
/** jsonb thinking → boolean */
function parseThinking(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (val === null || val === undefined) return false;
  if (typeof val === 'object' && val !== null && 'enabled' in (val as any)) return !!(val as any).enabled;
  return !!val;
}

function fromBackend(vo: BackendAgentVo): Agent {
  return {
    id: vo.id,
    name: vo.agent_name,
    agentCode: vo.agent_code,
    systemPrompt: vo.system_prompt,
    enabled: vo.enabled,
    order: vo.agent_order,
    modelId: '', // 需要从 custom_params 或其他字段获取
    modelName: vo.model,
    providerId: vo.provider?.id || '',
    providerName: vo.provider?.provider_name || '',
    temperature: vo.temperature,
    thinking: parseThinking(vo.thinking),
    stream: vo.stream,
    contextLimit: vo.context_limit,
    responseFormat: vo.response_format,
    maxCompletionTokens: vo.max_completion_tokens,
    customParams: vo.custom_params,
    status: vo.enabled ? 'idle' : 'offline',
    createdAt: vo.created_at ? new Date(vo.created_at) : undefined,
    updatedAt: vo.updated_at ? new Date(vo.updated_at) : undefined,
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
    // 后端要求完整字段，先获取现有数据合并
    const existing = await agentRealApi.getById(id);
    const merged = { ...existing, ...data };
    const req = toBackend(merged, true);
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
