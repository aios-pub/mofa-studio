/**
 * Channels real API
 * Backend endpoints: /api/channel/...
 *
 * Backend field mapping (snake_case -> camelCase):
 *   channel_type   → type
 *   create_time    → createdAt
 *   update_time    → updatedAt
 *   agent_id       → agentId
 *   channel_id     → channelId
 */

import { apiClient } from "../api/apiClient";
import { parseDate } from "./fieldMapper";
import type { Channel, ChannelType, ChannelStats, AgentChannel } from "@/types/channel";

// ==================== Raw backend types ====================

interface BackendChannel {
  id: string;
  name: string;
  channel_type: string;
  description?: string;
  config?: unknown;
  enabled: boolean;
  tenant_id?: string;
  create_time: string;
  update_time: string;
}

interface BackendChannelAgent {
  id: string;
  channel_id: string;
  agent_id: string;
  enabled: boolean;
  [key: string]: unknown;
}

// ==================== Default values ====================

const DEFAULT_STATS: ChannelStats = {
  totalMessages: 0,
  successMessages: 0,
  failedMessages: 0,
  successRate: 0,
  avgResponseTime: 0,
};

// ==================== Field mapping ====================

function mapChannel(raw: BackendChannel): Channel {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.channel_type as ChannelType,
    description: raw.description,
    status: raw.enabled ? "active" : "inactive",
    config: (raw.config as Record<string, unknown>) ?? {},
    stats: { ...DEFAULT_STATS },
    enabled: raw.enabled,
    createdAt: parseDate(raw.create_time) ?? new Date(),
    updatedAt: parseDate(raw.update_time) ?? new Date(),
  };
}

function mapChannelToBackend(data: Partial<Channel>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.type !== undefined) result.channel_type = data.type;
  if (data.description !== undefined) result.description = data.description;
  if (data.config !== undefined) result.config = data.config;
  if (data.enabled !== undefined) result.enabled = data.enabled;
  return result;
}

function mapChannelAgent(raw: BackendChannelAgent): AgentChannel {
  return {
    id: raw.id,
    channelId: raw.channel_id,
    agentId: raw.agent_id,
    enabled: raw.enabled,
    priority: (raw.priority as number) ?? 0,
    createdAt: parseDate(raw.create_time as string) ?? new Date(),
    updatedAt: parseDate(raw.update_time as string) ?? new Date(),
  };
}

// ==================== API methods ====================

const baseApi = {
  getAll: async (): Promise<Channel[]> => {
    const data = await apiClient.get<BackendChannel[]>("/api/channel/list");
    if (!Array.isArray(data)) return [];
    return data.map(mapChannel);
  },

  getById: async (id: string): Promise<Channel> => {
    const raw = await apiClient.get<BackendChannel>(`/api/channel/${id}`);
    return mapChannel(raw);
  },

  create: async (data: Partial<Channel>): Promise<Channel> => {
    const body = mapChannelToBackend(data);
    const raw = await apiClient.post<BackendChannel>("/api/channel/create", body);
    return mapChannel(raw);
  },

  update: async (id: string, data: Partial<Channel>): Promise<Channel> => {
    const existing = await baseApi.getById(id);
    const merged = { ...existing, ...data };
    const body = { id, ...mapChannelToBackend(merged) };
    const raw = await apiClient.post<BackendChannel>("/api/channel/update", body);
    return mapChannel(raw);
  },

  delete: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/channel/delete/${id}`);
    return true;
  },
};

const channelRealApi = {
  ...baseApi,

  async getByType(type: string): Promise<Channel[]> {
    const data = await apiClient.get<BackendChannel[]>(`/api/channel/by-type?type=${type}`);
    if (!Array.isArray(data)) return [];
    return data.map(mapChannel);
  },

  async getEnabled(): Promise<Channel[]> {
    const data = await apiClient.get<BackendChannel[]>("/api/channel/enabled");
    if (!Array.isArray(data)) return [];
    return data.map(mapChannel);
  },

  // ==================== Agent-channel association ====================

  async getAgentChannels(): Promise<AgentChannel[]> {
    const data = await apiClient.get<BackendChannelAgent[]>("/api/channel/agent-channels");
    if (!Array.isArray(data)) return [];
    return data.map(mapChannelAgent);
  },

  async getChannelAgents(channelId: string): Promise<AgentChannel[]> {
    const data = await apiClient.get<BackendChannelAgent[]>(`/api/channel/agent-channels?channel_id=${channelId}`);
    if (!Array.isArray(data)) return [];
    return data.map(mapChannelAgent);
  },

  assign: (agentId: string, channelId: string): Promise<void> =>
    apiClient.post("/api/channel/assign", { agent_id: agentId, channel_id: channelId }),

  addAgentToChannel: (dataOrAgentId: string | { agentId: string; channelId: string; priority?: number }, channelId?: string): Promise<void> => {
    if (typeof dataOrAgentId === 'string') {
      return channelRealApi.assign(dataOrAgentId, channelId!);
    }
    return channelRealApi.assign(dataOrAgentId.agentId, dataOrAgentId.channelId);
  },

  unassign: (id: string): Promise<void> =>
    apiClient.delete(`/api/channel/unassign/${id}`),

  removeAgentFromChannel: (agentIdOrId: string, channelId?: string): Promise<void> => {
    // Page passes agentId + channelId; the backend only needs agentId for reverse lookup
    if (channelId) {
      return channelRealApi.unassign(agentIdOrId);
    }
    return channelRealApi.unassign(agentIdOrId);
  },

  updateAgentChannel: (id: string, data: Record<string, unknown>): Promise<void> =>
    apiClient.post("/api/channel/agent-channel/update", { id, ...data }),

  testConnection: (channelId: string): Promise<{ success: boolean; message: string; model_count?: number }> =>
    apiClient.post(`/api/channel/test/${channelId}`),

  async refreshModels(_channelId: string): Promise<string[]> {
    return [];
  },

  async toggleStatus(channelId: string): Promise<Channel> {
    const channel = await baseApi.getById(channelId);
    const newEnabled = !channel.enabled;
    return baseApi.update(channelId, { enabled: newEnabled, status: newEnabled ? 'active' : 'inactive' });
  },
};

export { channelRealApi };
export type { Channel, AgentChannel };
// channelTypeConfig temporarily imported from mock
export { channelTypeConfig } from "../mock/channels";
