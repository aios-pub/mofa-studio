/**
 * Claw 相关类型定义
 * Claw 是一种特殊的 Agent，通过 AgentOS 代理 LLM 调用和渠道配置。
 */

/** Claw 类型 */
export type ClawType = 'openclaw' | 'zeroclaw' | 'octos' | 'claude_code' | 'codex';

/** Claw 运行模式 */
export type ClawMode = 'server' | 'cli';

/** Claw 状态 */
export type ClawStatus = 'online' | 'offline' | 'degraded' | 'unknown';


/** 渠道代理状态 */
export type ChannelProxyStatus = 'active' | 'inactive' | 'error';

/** 渠道代理连接信息 */
export interface ChannelProxyInfo {
  /** Claw 通过此 URL 向渠道发送消息 */
  sendUrl: string;
  /** Claw 通过此 URL 接收渠道消息（webhook 回调地址） */
  receiveUrl: string;
  /** Claw 注册的回调地址，AgentOS 将渠道消息转发到此地址 */
  callbackUrl?: string;
  /** 渠道代理鉴权 Token */
  proxyToken: string;
}

/** 渠道映射 */
export interface ClawChannelMapping {
  id: string;
  agentId: string;
  channelId: string;
  remoteChannelId: string;
  remoteChannelType: string;
  configOverride?: Record<string, unknown>;
  syncStatus: string;
  lastSyncedConfig?: Record<string, unknown>;
  tenantId: string;
  createTime: string;
  updateTime: string;
  /** 渠道名称 */
  channelName?: string;
  /** 渠道类型 */
  channelType?: string;
  /** 代理消息计数 */
  messageCount?: number;
  /** 最后活动时间 */
  lastActivity?: string;
  /** 代理连接信息 */
  proxyInfo?: ChannelProxyInfo;
  /** 代理状态 */
  proxyStatus?: ChannelProxyStatus;
}

/** CLI 工具会话 */
export interface CliToolSession {
  id: string;
  agentId: string;
  sessionId: string;
  userId?: string;
  workingDirectory?: string;
  command?: string;
  modelUsed?: string;
  provider?: string;
  inputTokens: number;
  outputTokens: number;
  totalCost?: string;
  startedAt: string;
  endedAt?: string;
  status: string;
  exitCode?: number;
  metadata?: Record<string, unknown>;
  tenantId: string;
  createTime: string;
  updateTime: string;
}

/** Claw 类型配置 */
export const clawTypeConfig: Record<ClawType, {
  label: string;
  mode: ClawMode;
  description: string;
  icon: string;
  color: string;
  envKey: string;
  setupGuide: string[];
}> = {
  openclaw: {
    label: 'OpenClaw',
    mode: 'server',
    description: 'TypeScript 实现的 AI Agent 框架',
    icon: '🟢',
    color: '#52c41a',
    envKey: 'OPENAI_API_KEY',
    setupGuide: [
      'export OPENAI_API_KEY="{proxyApiKey}"',
      'export OPENAI_API_BASE="{proxyApiBase}"',
    ],
  },
  zeroclaw: {
    label: 'ZeroClaw',
    mode: 'server',
    description: 'Rust 实现的高性能 AI Agent 框架',
    icon: '🔵',
    color: '#1677ff',
    envKey: 'OPENAI_API_KEY',
    setupGuide: [
      'export OPENAI_API_KEY="{proxyApiKey}"',
      'export OPENAI_API_BASE="{proxyApiBase}"',
    ],
  },
  octos: {
    label: 'Octos',
    mode: 'server',
    description: 'Rust 实现的多模态 AI Agent',
    icon: '🟣',
    color: '#722ed1',
    envKey: 'OPENAI_API_KEY',
    setupGuide: [
      'export OPENAI_API_KEY="{proxyApiKey}"',
      'export OPENAI_BASE_URL="{proxyApiBase}"',
    ],
  },
  claude_code: {
    label: 'Claude Code',
    mode: 'cli',
    description: 'Anthropic 的 AI 编程助手',
    icon: '🟠',
    color: '#fa8c16',
    envKey: 'ANTHROPIC_API_KEY',
    setupGuide: [
      'export ANTHROPIC_API_KEY="{proxyApiKey}"',
      'export ANTHROPIC_BASE_URL="{proxyApiBase}"',
      'claude',
    ],
  },
  codex: {
    label: 'Codex',
    mode: 'cli',
    description: 'OpenAI 的 AI 编程助手',
    icon: '⚪',
    color: '#8c8c8c',
    envKey: 'OPENAI_API_KEY',
    setupGuide: [
      'export OPENAI_API_KEY="{proxyApiKey}"',
      'export OPENAI_BASE_URL="{proxyApiBase}"',
      'codex',
    ],
  },
};

/** 渠道代理类型配置 */
export const channelProxyTypeConfig: Record<string, {
  label: string;
  icon: string;
  color: string;
  setupGuide: string[];
}> = {
  feishu: {
    label: '飞书',
    icon: '🐦',
    color: '#3370ff',
    setupGuide: [
      'export CHANNEL_PROXY_BASE="{proxyApiBase}/channel/{mappingId}"',
      'export CHANNEL_PROXY_TOKEN="{proxyToken}"',
      '# 发送消息: POST $CHANNEL_PROXY_BASE/send',
      '# 接收消息: 注册 webhook 到 $CHANNEL_PROXY_BASE/webhook',
    ],
  },
  telegram: {
    label: 'Telegram',
    icon: '✈️',
    color: '#0088cc',
    setupGuide: [
      'export CHANNEL_PROXY_BASE="{proxyApiBase}/channel/{mappingId}"',
      'export CHANNEL_PROXY_TOKEN="{proxyToken}"',
      '# 发送消息: POST $CHANNEL_PROXY_BASE/send',
      '# 接收消息: 注册 webhook 到 $CHANNEL_PROXY_BASE/webhook',
    ],
  },
  discord: {
    label: 'Discord',
    icon: '💬',
    color: '#5865f2',
    setupGuide: [
      'export CHANNEL_PROXY_BASE="{proxyApiBase}/channel/{mappingId}"',
      'export CHANNEL_PROXY_TOKEN="{proxyToken}"',
      '# 发送消息: POST $CHANNEL_PROXY_BASE/send',
      '# 接收消息: 注册 webhook 到 $CHANNEL_PROXY_BASE/webhook',
    ],
  },
  slack: {
    label: 'Slack',
    icon: '📱',
    color: '#4a154b',
    setupGuide: [
      'export CHANNEL_PROXY_BASE="{proxyApiBase}/channel/{mappingId}"',
      'export CHANNEL_PROXY_TOKEN="{proxyToken}"',
      '# 发送消息: POST $CHANNEL_PROXY_BASE/send',
      '# 接收消息: 注册 webhook 到 $CHANNEL_PROXY_BASE/webhook',
    ],
  },
  wechat: {
    label: '微信',
    icon: '💚',
    color: '#07c160',
    setupGuide: [
      'export CHANNEL_PROXY_BASE="{proxyApiBase}/channel/{mappingId}"',
      'export CHANNEL_PROXY_TOKEN="{proxyToken}"',
      '# 发送消息: POST $CHANNEL_PROXY_BASE/send',
      '# 接收消息: 注册 webhook 到 $CHANNEL_PROXY_BASE/webhook',
    ],
  },
  wechat_work: {
    label: '企业微信',
    icon: '💼',
    color: '#07c160',
    setupGuide: [
      'export CHANNEL_PROXY_BASE="{proxyApiBase}/channel/{mappingId}"',
      'export CHANNEL_PROXY_TOKEN="{proxyToken}"',
      '# 发送消息: POST $CHANNEL_PROXY_BASE/send',
      '# 接收消息: 注册 webhook 到 $CHANNEL_PROXY_BASE/webhook',
    ],
  },
  dingtalk: {
    label: '钉钉',
    icon: '🔵',
    color: '#0089ff',
    setupGuide: [
      'export CHANNEL_PROXY_BASE="{proxyApiBase}/channel/{mappingId}"',
      'export CHANNEL_PROXY_TOKEN="{proxyToken}"',
      '# 发送消息: POST $CHANNEL_PROXY_BASE/send',
      '# 接收消息: 注册 webhook 到 $CHANNEL_PROXY_BASE/webhook',
    ],
  },
  webhook: {
    label: 'Webhook',
    icon: '🔗',
    color: '#8c8c8c',
    setupGuide: [
      'export CHANNEL_PROXY_BASE="{proxyApiBase}/channel/{mappingId}"',
      'export CHANNEL_PROXY_TOKEN="{proxyToken}"',
      '# 发送消息: POST $CHANNEL_PROXY_BASE/send',
      '# 接收消息: 注册 webhook 到 $CHANNEL_PROXY_BASE/webhook',
    ],
  },
};
