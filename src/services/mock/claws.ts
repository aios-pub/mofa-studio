/**
 * Claw Mock API
 */

import type { ClawInstance, ClawChannelMapping, CliToolSession, ChannelProxyInfo } from "@/types";

const mockClaws: ClawInstance[] = [
  {
    id: "claw-001",
    agentId: "agent-001",
    instanceName: "生产环境 OpenClaw",
    clawType: "openclaw",
    version: "1.2.0",
    status: "online",
    endpointUrl: "http://localhost:3001",
    enabled: true,
    tenantId: "tenant-001",
    providerId: "prov-001",
    providerName: "OpenAI",
    modelId: "model-001",
    modelName: "gpt-4o",
    createTime: "2026-04-15T10:30:00",
    updateTime: "2026-04-16T08:00:00",
    lastHealthCheck: "2026-04-16T08:00:00",
  },
  {
    id: "claw-002",
    agentId: "agent-002",
    instanceName: "开发环境 ZeroClaw",
    clawType: "zeroclaw",
    version: "0.3.1",
    status: "online",
    endpointUrl: "http://localhost:3000",
    enabled: true,
    tenantId: "tenant-001",
    providerId: "prov-002",
    providerName: "Anthropic",
    modelId: "model-002",
    modelName: "claude-sonnet-4-20250514",
    createTime: "2026-04-14T14:00:00",
    updateTime: "2026-04-16T07:30:00",
    lastHealthCheck: "2026-04-16T07:30:00",
  },
  {
    id: "claw-003",
    agentId: "agent-003",
    instanceName: "开发团队 Claude Code",
    clawType: "claude_code",
    version: "1.0.0",
    status: "unknown",
    enabled: true,
    tenantId: "tenant-001",
    providerId: "prov-002",
    providerName: "Anthropic",
    modelId: "model-002",
    modelName: "claude-sonnet-4-20250514",
    createTime: "2026-04-13T09:00:00",
    updateTime: "2026-04-15T18:00:00",
  },
  {
    id: "claw-004",
    agentId: "agent-004",
    instanceName: "测试 Octos",
    clawType: "octos",
    status: "offline",
    endpointUrl: "http://localhost:8080",
    authConfig: { authToken: "szZX5LqA2EmjCKhB" },
    enabled: false,
    tenantId: "tenant-001",
    providerId: "prov-003",
    providerName: "Google",
    modelId: "model-003",
    modelName: "gemini-2.0-flash",
    createTime: "2026-04-12T11:00:00",
    updateTime: "2026-04-14T16:00:00",
  },
];

const mockMappings: ClawChannelMapping[] = [
  {
    id: "map-001",
    clawInstanceId: "claw-001",
    channelId: "ch-001",
    remoteChannelId: "tg-bot-001",
    remoteChannelType: "telegram",
    syncStatus: "synced",
    tenantId: "tenant-001",
    createTime: "2026-04-15T10:30:00",
    updateTime: "2026-04-15T10:30:00",
    channelName: "Telegram 客服",
    channelType: "telegram",
    messageCount: 1284,
    lastActivity: "2026-04-16T09:45:00",
    proxyStatus: "active",
    proxyInfo: {
      sendUrl: "http://localhost:3001/proxy/v1/channel/map-001/send",
      receiveUrl: "http://localhost:3001/proxy/v1/channel/map-001/webhook",
      proxyToken: "cpt-telegram-xxxx-xxxx",
    },
  },
  {
    id: "map-002",
    clawInstanceId: "claw-001",
    channelId: "ch-002",
    remoteChannelId: "feishu-bot-001",
    remoteChannelType: "feishu",
    syncStatus: "synced",
    tenantId: "tenant-001",
    createTime: "2026-04-15T11:00:00",
    updateTime: "2026-04-15T11:00:00",
    channelName: "飞书工作群",
    channelType: "feishu",
    messageCount: 567,
    lastActivity: "2026-04-16T10:00:00",
    proxyStatus: "active",
    proxyInfo: {
      sendUrl: "http://localhost:3001/proxy/v1/channel/map-002/send",
      receiveUrl: "http://localhost:3001/proxy/v1/channel/map-002/webhook",
      proxyToken: "cpt-feishu-xxxx-xxxx",
    },
  },
  {
    id: "map-003",
    clawInstanceId: "claw-002",
    channelId: "ch-003",
    remoteChannelId: "discord-server-001",
    remoteChannelType: "discord",
    syncStatus: "pending",
    tenantId: "tenant-001",
    createTime: "2026-04-16T08:00:00",
    updateTime: "2026-04-16T08:00:00",
    channelName: "Discord 社区",
    channelType: "discord",
    messageCount: 0,
    proxyStatus: "inactive",
    proxyInfo: {
      sendUrl: "http://localhost:3001/proxy/v1/channel/map-003/send",
      receiveUrl: "http://localhost:3001/proxy/v1/channel/map-003/webhook",
      proxyToken: "cpt-discord-xxxx-xxxx",
    },
  },
];

const mockSessions: CliToolSession[] = [
  {
    id: "sess-001",
    clawInstanceId: "claw-003",
    sessionId: "sess-abc123",
    workingDirectory: "/home/user/project",
    command: "claude --model sonnet",
    modelUsed: "claude-sonnet-4-20250514",
    provider: "anthropic",
    inputTokens: 15000,
    outputTokens: 8000,
    totalCost: "0.15",
    startedAt: "2026-04-16T09:00:00",
    endedAt: "2026-04-16T09:30:00",
    status: "completed",
    exitCode: 0,
    tenantId: "tenant-001",
    createTime: "2026-04-16T09:00:00",
    updateTime: "2026-04-16T09:30:00",
  },
];

export const clawMockApi = {
  async getAll(): Promise<ClawInstance[]> {
    await new Promise((r) => setTimeout(r, 300));
    return mockClaws;
  },

  async getById(id: string): Promise<ClawInstance> {
    await new Promise((r) => setTimeout(r, 200));
    const claw = mockClaws.find((c) => c.id === id);
    if (!claw) throw new Error("Not found");
    return claw;
  },

  async create(data: any): Promise<ClawInstance> {
    await new Promise((r) => setTimeout(r, 500));
    return {
      id: `claw-${Date.now()}`,
      agentId: `agent-${Date.now()}`,
      instanceName: data.instanceName,
      clawType: data.clawType,
      version: data.version,
      status: "unknown",
      endpointUrl: data.endpointUrl,
      enabled: data.enabled ?? true,
      tenantId: "tenant-001",
      providerId: data.providerId,
      modelId: data.modelId,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      proxyApiKey: `ap-${crypto.randomUUID()}`,
      proxyApiBase: "http://localhost:3001/proxy/v1",
    };
  },

  async update(data: any): Promise<ClawInstance> {
    await new Promise((r) => setTimeout(r, 300));
    const existing = mockClaws.find((c) => c.id === data.id);
    if (!existing) throw new Error("Not found");
    return { ...existing, ...data, updateTime: new Date().toISOString() };
  },

  async delete(_id: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 300));
  },

  async test(_id: string): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 1000));
    return true;
  },

  async assignChannel(
    _clawInstanceId: string,
    _channelId: string,
    remoteChannelId: string,
    remoteChannelType: string,
    _callbackUrl?: string,
  ): Promise<ClawChannelMapping> {
    await new Promise((r) => setTimeout(r, 300));
    const id = `map-${Date.now()}`;
    return {
      id,
      clawInstanceId: _clawInstanceId,
      channelId: _channelId,
      remoteChannelId,
      remoteChannelType,
      syncStatus: "synced",
      tenantId: "tenant-001",
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      channelName: remoteChannelId,
      channelType: remoteChannelType,
      messageCount: 0,
      proxyStatus: "active",
      proxyInfo: {
        sendUrl: `http://localhost:3001/proxy/v1/channel/${id}/send`,
        receiveUrl: `http://localhost:3001/proxy/v1/channel/${id}/webhook`,
        callbackUrl: _callbackUrl,
        proxyToken: `cpt-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      },
    };
  },

  async unassignChannel(): Promise<void> {
    await new Promise((r) => setTimeout(r, 200));
  },

  async listChannelMappings(clawInstanceId: string): Promise<ClawChannelMapping[]> {
    await new Promise((r) => setTimeout(r, 200));
    return mockMappings.filter((m) => m.clawInstanceId === clawInstanceId);
  },

  async listCliSessions(clawInstanceId: string): Promise<CliToolSession[]> {
    await new Promise((r) => setTimeout(r, 200));
    return mockSessions.filter((s) => s.clawInstanceId === clawInstanceId);
  },

  async getChannelProxyConfig(mappingId: string): Promise<ChannelProxyInfo> {
    await new Promise((r) => setTimeout(r, 200));
    const mapping = mockMappings.find((m) => m.id === mappingId);
    if (!mapping?.proxyInfo) throw new Error("Not found");
    return mapping.proxyInfo;
  },

  async testChannelProxy(mappingId: string): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 800));
    return mockMappings.some((m) => m.id === mappingId);
  },

  async regenerateProxyToken(mappingId: string): Promise<ChannelProxyInfo> {
    await new Promise((r) => setTimeout(r, 300));
    const mapping = mockMappings.find((m) => m.id === mappingId);
    if (!mapping?.proxyInfo) throw new Error("Not found");
    return {
      ...mapping.proxyInfo,
      proxyToken: `cpt-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    };
  },
};

export { mockClaws };
