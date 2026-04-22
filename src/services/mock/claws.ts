/**
 * Claw Mock API（非 CRUD 部分）
 * CRUD 已统一到 agentApi，此处保留渠道代理、CLI 会话、测试等操作
 */

import type { ClawChannelMapping, CliToolSession, ChannelProxyInfo } from "@/types";

const mockMappings: ClawChannelMapping[] = [
  {
    id: "map-001",
    agentId: "agent-6",
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
    agentId: "agent-6",
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
    agentId: "agent-2",
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
    agentId: "agent-3",
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
  async test(_agentId: string): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 1000));
    return true;
  },

  async assignChannel(
    _agentId: string,
    _channelId: string,
    remoteChannelId: string,
    remoteChannelType: string,
    _callbackUrl?: string,
  ): Promise<ClawChannelMapping> {
    await new Promise((r) => setTimeout(r, 300));
    const id = `map-${Date.now()}`;
    return {
      id,
      agentId: _agentId,
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

  async listCliSessions(agentId: string): Promise<CliToolSession[]> {
    await new Promise((r) => setTimeout(r, 200));
    return mockSessions.filter((s) => s.agentId === agentId);
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
