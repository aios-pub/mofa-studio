/**
 * Channels 真实 API
 * 后端端点: /api/channel/...
 */

import { apiClient } from "../api/apiClient";

interface Channel {
  id: string;
  name: string;
  type: string;
  providerId: string;
  config: Record<string, unknown>;
  status: string;
}

interface ChannelAgent {
  id: string;
  channelId: string;
  agentId: string;
  enabled: boolean;
}

const baseApi = {
  getAll: (): Promise<Channel[]> =>
    apiClient.get<Channel[]>("/api/channel/list"),

  getById: (id: string): Promise<Channel> =>
    apiClient.get<Channel>(`/api/channel/${id}`),

  create: (data: Partial<Channel>): Promise<Channel> =>
    apiClient.post<Channel>("/api/channel/create", data),

  update: (id: string, data: Partial<Channel>): Promise<Channel> =>
    apiClient.post<Channel>("/api/channel/update", { id, ...data }),

  delete: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/channel/delete/${id}`);
    return true;
  },
};

const channelRealApi = {
  ...baseApi,

  getByType: (type: string): Promise<Channel[]> =>
    apiClient.get<Channel[]>(`/api/channel/by-type?type=${type}`),

  getEnabled: (): Promise<Channel[]> =>
    apiClient.get<Channel[]>("/api/channel/enabled"),

  // Agent Channels
  getAgentChannels: (): Promise<ChannelAgent[]> =>
    apiClient.get("/api/channel/agent-channels"),

  getChannelAgents: (channelId: string): Promise<ChannelAgent[]> =>
    apiClient.get(`/api/channel/agent-channels?channel_id=${channelId}`),

  assign: (agentId: string, channelId: string): Promise<void> =>
    apiClient.post("/api/channel/assign", { agent_id: agentId, channel_id: channelId }),

  addAgentToChannel: (agentId: string, channelId: string): Promise<void> =>
    apiClient.post("/api/channel/assign", { agent_id: agentId, channel_id: channelId }),

  unassign: (id: string): Promise<void> =>
    apiClient.delete(`/api/channel/unassign/${id}`),

  removeAgentFromChannel: (id: string): Promise<void> =>
    apiClient.delete(`/api/channel/unassign/${id}`),

  updateAgentChannel: (id: string, data: Record<string, unknown>): Promise<void> =>
    apiClient.post("/api/channel/agent-channel/update", { id, ...data }),

  // 兼容方法
  testConnection: (channelId: string): Promise<{ success: boolean; message: string; model_count?: number }> =>
    apiClient.post(`/api/channel/test/${channelId}`),

  refreshModels: async (_channelId: string): Promise<string[]> => {
    console.warn("channelApi.refreshModels: Backend does not support refresh models endpoint");
    return [];
  },

  toggleStatus: async (channelId: string): Promise<Channel> => {
    const channel = await baseApi.getById(channelId);
    const newStatus = (channel as Channel).status === 'active' ? 'inactive' : 'active';
    return baseApi.update(channelId, { status: newStatus });
  },
};

export { channelRealApi };
export type { Channel, ChannelAgent };
// channelTypeConfig 暂时从 mock 导入
export { channelTypeConfig } from "../mock/channels";
