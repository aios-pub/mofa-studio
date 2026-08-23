/**
 * Claw-related type definitions
 * Claw is a special type of Agent，Proxies LLM calls and channel configuration through AgentOS。
 */

/** Claw type */
export type ClawType = 'openclaw' | 'zeroclaw' | 'octos' | 'claude_code' | 'codex';

/** Claw run mode */
export type ClawMode = 'server' | 'cli';

/** Claw status */
export type ClawStatus = 'online' | 'offline' | 'degraded' | 'unknown';


/** Channel proxy status */
export type ChannelProxyStatus = 'active' | 'inactive' | 'error';

/** Channel proxy connection info */
export interface ChannelProxyInfo {
  /** Claw sends messages to channel via this URL */
  sendUrl: string;
  /** Claw receives channel messages via this URL（webhook callback address） */
  receiveUrl: string;
  /** Claw registered callback address，AgentOS forwards channel messages to this address */
  callbackUrl?: string;
  /** Channel proxy auth token */
  proxyToken: string;
}

/** Channel mapping */
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
  /** Channel name */
  channelName?: string;
  /** Channel type */
  channelType?: string;
  /** Proxy message count */
  messageCount?: number;
  /** Last active time */
  lastActivity?: string;
  /** Proxy connection info */
  proxyInfo?: ChannelProxyInfo;
  /** Proxy status */
  proxyStatus?: ChannelProxyStatus;
}

/** CLI tool session */
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

/** Claw type configuration */
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

/** Channel proxy type configuration */
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
