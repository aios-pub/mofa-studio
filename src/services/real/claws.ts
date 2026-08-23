/**
 * Claw-related API (non-CRUD part)
 * CRUD is unified in agentApi; channel proxy, CLI sessions and test operations remain here
 *
 * All claw_instance_id parameters replaced with agent_id (agent.id)
 */

import { apiClient } from "../api/apiClient";
import type { ClawChannelMapping, CliToolSession, ChannelProxyInfo } from "@/types";

// ==================== Backend response types ====================

interface BackendChannelMapping {
  id: string;
  agent_id: string;
  channel_id: string;
  remote_channel_id: string;
  remote_channel_type: string;
  config_override?: Record<string, unknown>;
  sync_status: string;
  last_synced_config?: Record<string, unknown>;
  tenant_id: string;
  create_time: string;
  update_time: string;
  channel_name?: string;
  channel_type?: string;
  message_count?: number;
  last_activity?: string;
  proxy_send_url?: string;
  proxy_receive_url?: string;
  proxy_callback_url?: string;
  proxy_token?: string;
  proxy_status?: string;
}

interface BackendCliSession {
  id: string;
  agent_id: string;
  session_id: string;
  user_id?: string;
  working_directory?: string;
  command?: string;
  model_used?: string;
  provider?: string;
  input_tokens: number;
  output_tokens: number;
  total_cost?: string;
  started_at: string;
  ended_at?: string;
  status: string;
  exit_code?: number;
  metadata?: Record<string, unknown>;
  tenant_id: string;
  create_time: string;
  update_time: string;
}

// ==================== Conversion functions ====================

function fromBackendMapping(vo: BackendChannelMapping): ClawChannelMapping {
  const proxyInfo: ChannelProxyInfo | undefined =
    vo.proxy_send_url
      ? {
          sendUrl: vo.proxy_send_url,
          receiveUrl: vo.proxy_receive_url || '',
          callbackUrl: vo.proxy_callback_url,
          proxyToken: vo.proxy_token || '',
        }
      : undefined;

  return {
    id: vo.id,
    agentId: vo.agent_id,
    channelId: vo.channel_id,
    remoteChannelId: vo.remote_channel_id,
    remoteChannelType: vo.remote_channel_type,
    configOverride: vo.config_override,
    syncStatus: vo.sync_status,
    lastSyncedConfig: vo.last_synced_config,
    tenantId: vo.tenant_id,
    createTime: vo.create_time,
    updateTime: vo.update_time,
    channelName: vo.channel_name,
    channelType: vo.channel_type,
    messageCount: vo.message_count,
    lastActivity: vo.last_activity,
    proxyInfo,
    proxyStatus: vo.proxy_status as ClawChannelMapping['proxyStatus'],
  };
}

function fromBackendSession(vo: BackendCliSession): CliToolSession {
  return {
    id: vo.id,
    agentId: vo.agent_id,
    sessionId: vo.session_id,
    userId: vo.user_id,
    workingDirectory: vo.working_directory,
    command: vo.command,
    modelUsed: vo.model_used,
    provider: vo.provider,
    inputTokens: vo.input_tokens,
    outputTokens: vo.output_tokens,
    totalCost: vo.total_cost,
    startedAt: vo.started_at,
    endedAt: vo.ended_at,
    status: vo.status,
    exitCode: vo.exit_code,
    metadata: vo.metadata,
    tenantId: vo.tenant_id,
    createTime: vo.create_time,
    updateTime: vo.update_time,
  };
}

// ==================== API methods ====================

export const clawRealApi = {
  /** Test connectivity (id is agent.id) */
  async test(agentId: string): Promise<boolean> {
    return apiClient.post<boolean>(`/api/claw/test/${agentId}`);
  },

  /** Assign channels (agentId is agent.id) */
  async assignChannel(
    agentId: string,
    channelId: string,
    remoteChannelId: string,
    remoteChannelType: string,
    callbackUrl?: string,
  ): Promise<ClawChannelMapping> {
    const vo = await apiClient.post<BackendChannelMapping>("/api/claw/channel/assign", {
      agent_id: agentId,
      channel_id: channelId,
      remote_channel_id: remoteChannelId,
      remote_channel_type: remoteChannelType,
      callback_url: callbackUrl,
    });
    return fromBackendMapping(vo);
  },

  /** Unassign channel */
  async unassignChannel(mappingId: string): Promise<void> {
    await apiClient.delete(`/api/claw/channel/unassign/${mappingId}`);
  },

  /** List CLI sessions (agentId is agent.id) */
  async listCliSessions(agentId: string): Promise<CliToolSession[]> {
    const data = await apiClient.get<BackendCliSession[]>(
      `/api/claw/cli/sessions?agent_id=${agentId}`,
    );
    if (!Array.isArray(data)) return [];
    return data.map(fromBackendSession);
  },

  /** Get the proxy configuration of a channel mapping */
  async getChannelProxyConfig(mappingId: string): Promise<ChannelProxyInfo> {
    const data = await apiClient.get<{
      proxy_send_url: string;
      proxy_receive_url?: string;
      proxy_callback_url?: string;
      proxy_token: string;
    }>(`/api/claw/channel-proxy/config/${mappingId}`);
    return {
      sendUrl: data.proxy_send_url,
      receiveUrl: data.proxy_receive_url || '',
      callbackUrl: data.proxy_callback_url,
      proxyToken: data.proxy_token,
    };
  },

  /** Test channel proxy connectivity */
  async testChannelProxy(mappingId: string): Promise<boolean> {
    return apiClient.post<boolean>(`/api/claw/channel-proxy/test/${mappingId}`);
  },

  /** Regenerate the channel proxy token */
  async regenerateProxyToken(mappingId: string): Promise<ChannelProxyInfo> {
    const data = await apiClient.post<{
      proxy_send_url: string;
      proxy_receive_url?: string;
      proxy_callback_url?: string;
      proxy_token: string;
    }>(`/api/claw/channel-proxy/regenerate-token/${mappingId}`);
    return {
      sendUrl: data.proxy_send_url,
      receiveUrl: data.proxy_receive_url || '',
      callbackUrl: data.proxy_callback_url,
      proxyToken: data.proxy_token,
    };
  },
};
