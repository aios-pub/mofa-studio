/**
 * Claw 真实 API
 * 后端端点: /api/claw/...
 */

import { apiClient } from "../api/apiClient";
import type { ClawInstance, ClawInstanceReq, ClawChannelMapping, CliToolSession, ChannelProxyInfo } from "@/types";

// ==================== 后端响应类型 ====================

interface BackendClawInstance {
  id: string;
  agent_id: string;
  instance_name: string;
  claw_type: string;
  version?: string;
  status: string;
  endpoint_url?: string;
  auth_config?: Record<string, unknown>;
  connection_config?: Record<string, unknown>;
  capabilities?: Record<string, unknown>;
  last_health_check?: string;
  last_sync_time?: string;
  metadata?: Record<string, unknown>;
  tenant_id: string;
  enabled: boolean;
  create_time: string;
  update_time: string;
  provider_id: string;
  provider_name?: string;
  model_id: string;
  model_name?: string;
  proxy_api_key?: string;
  proxy_api_base?: string;
}

interface BackendChannelMapping {
  id: string;
  claw_instance_id: string;
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
  claw_instance_id: string;
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

// ==================== 转换函数 ====================

function fromBackend(vo: BackendClawInstance): ClawInstance {
  return {
    id: vo.id,
    agentId: vo.agent_id,
    instanceName: vo.instance_name,
    clawType: vo.claw_type as ClawInstance['clawType'],
    version: vo.version,
    status: vo.status as ClawInstance['status'],
    endpointUrl: vo.endpoint_url,
    authConfig: vo.auth_config,
    connectionConfig: vo.connection_config,
    capabilities: vo.capabilities,
    lastHealthCheck: vo.last_health_check,
    lastSyncTime: vo.last_sync_time,
    metadata: vo.metadata,
    tenantId: vo.tenant_id,
    enabled: vo.enabled,
    createTime: vo.create_time,
    updateTime: vo.update_time,
    providerId: vo.provider_id,
    providerName: vo.provider_name,
    modelId: vo.model_id,
    modelName: vo.model_name,
    proxyApiKey: vo.proxy_api_key,
    proxyApiBase: vo.proxy_api_base,
  };
}

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
    clawInstanceId: vo.claw_instance_id,
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
    clawInstanceId: vo.claw_instance_id,
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

// ==================== API 方法 ====================

export const clawRealApi = {
  /** 列出所有 Claw 实例 */
  async getAll(): Promise<ClawInstance[]> {
    const data = await apiClient.get<BackendClawInstance[]>("/api/claw/list");
    if (!Array.isArray(data)) return [];
    return data.map(fromBackend);
  },

  /** 获取单个 Claw 实例 */
  async getById(id: string): Promise<ClawInstance> {
    return apiClient.get<BackendClawInstance>(`/api/claw/${id}`).then(fromBackend);
  },

  /** 创建 Claw 实例 */
  async create(data: ClawInstanceReq): Promise<ClawInstance> {
    const vo = await apiClient.post<BackendClawInstance>("/api/claw/create", {
      instance_name: data.instanceName,
      claw_type: data.clawType,
      version: data.version,
      endpoint_url: data.endpointUrl,
      auth_config: data.authConfig,
      connection_config: data.connectionConfig,
      capabilities: data.capabilities,
      enabled: data.enabled,
      provider_id: data.providerId,
      model_id: data.modelId,
      system_prompt: data.systemPrompt,
    });
    return fromBackend(vo);
  },

  /** 更新 Claw 实例 */
  async update(data: ClawInstanceReq): Promise<ClawInstance> {
    const vo = await apiClient.post<BackendClawInstance>("/api/claw/update", {
      id: data.id,
      instance_name: data.instanceName,
      claw_type: data.clawType,
      version: data.version,
      endpoint_url: data.endpointUrl,
      auth_config: data.authConfig,
      connection_config: data.connectionConfig,
      capabilities: data.capabilities,
      enabled: data.enabled,
      provider_id: data.providerId,
      model_id: data.modelId,
      system_prompt: data.systemPrompt,
    });
    return fromBackend(vo);
  },

  /** 删除 Claw 实例 */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/claw/delete/${id}`);
  },

  /** 测试连通性 */
  async test(id: string): Promise<boolean> {
    return apiClient.post<boolean>(`/api/claw/test/${id}`);
  },

  /** 分配渠道 */
  async assignChannel(
    clawInstanceId: string,
    channelId: string,
    remoteChannelId: string,
    remoteChannelType: string,
    callbackUrl?: string,
  ): Promise<ClawChannelMapping> {
    const vo = await apiClient.post<BackendChannelMapping>("/api/claw/channel/assign", {
      claw_instance_id: clawInstanceId,
      channel_id: channelId,
      remote_channel_id: remoteChannelId,
      remote_channel_type: remoteChannelType,
      callback_url: callbackUrl,
    });
    return fromBackendMapping(vo);
  },

  /** 取消分配渠道 */
  async unassignChannel(mappingId: string): Promise<void> {
    await apiClient.delete(`/api/claw/channel/unassign/${mappingId}`);
  },

  /** 列出渠道映射 */
  async listChannelMappings(clawInstanceId: string): Promise<ClawChannelMapping[]> {
    const data = await apiClient.get<BackendChannelMapping[]>(
      `/api/claw/channel/mappings?claw_instance_id=${clawInstanceId}`,
    );
    if (!Array.isArray(data)) return [];
    return data.map(fromBackendMapping);
  },

  /** 列出 CLI 会话 */
  async listCliSessions(clawInstanceId: string): Promise<CliToolSession[]> {
    const data = await apiClient.get<BackendCliSession[]>(
      `/api/claw/cli/sessions?claw_instance_id=${clawInstanceId}`,
    );
    if (!Array.isArray(data)) return [];
    return data.map(fromBackendSession);
  },

  /** 获取渠道映射的代理配置 */
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

  /** 测试渠道代理连通性 */
  async testChannelProxy(mappingId: string): Promise<boolean> {
    return apiClient.post<boolean>(`/api/claw/channel-proxy/test/${mappingId}`);
  },

  /** 重新生成渠道代理 Token */
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
