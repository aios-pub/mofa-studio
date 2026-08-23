/**
 * Agent real API
 * Backend endpoints: /api/agent/...
 *
 * Backend uses snake_case field names; frontend uses camelCase
 * This layer handles bidirectional conversion
 */

import { apiClient } from "../api/apiClient";
import type { Agent, AgentPermission, ThinkingConfig } from "@/types";

// ==================== Backend request/response types ====================

/** Backend AgentReq (create/update request) */
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

/** Backend AgentVo (response) */
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

// ==================== Conversion functions ====================

/** Frontend -> backend */
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

/** Backend -> frontend */
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

// ==================== API methods ====================

export const agentRealApi = {
  /** Get all agents */
  async getAll(): Promise<Agent[]> {
    const data = await apiClient.get<BackendAgentVo[]>("/api/agent/fetch");
    if (!Array.isArray(data)) return [];
    return data.map(fromBackend);
  },

  /** Get a single agent */
  async getById(id: string): Promise<Agent> {
    const all = await agentRealApi.getAll();
    const item = all.find((a) => a.id === id);
    if (!item) throw new Error(`Agent ${id} not found`);
    return item;
  },

  /** Create agent */
  async create(data: Partial<Agent>): Promise<Agent> {
    const req = toBackend(data, false);
    const vo = await apiClient.post<BackendAgentVo>("/api/agent/create", req);
    return fromBackend(vo);
  },

  /** Update agent */
  async update(id: string, data: Partial<Agent>): Promise<Agent> {
    const req = toBackend({ ...data, id }, true);
    const vo = await apiClient.post<BackendAgentVo>("/api/agent/update", req);
    return fromBackend(vo);
  },

  /** Delete agent */
  async delete(id: string): Promise<boolean> {
    await apiClient.delete(`/api/agent/delete/${id}`);
    return true;
  },

  /** Get agent permissions */
  async getPermissions(agentId: string): Promise<AgentPermission | undefined> {
    return apiClient.get<AgentPermission>(`/api/permission/by-agent?agent_id=${agentId}`);
  },

  /** Update agent permissions */
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
