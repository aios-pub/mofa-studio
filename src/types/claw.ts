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

/** Claw 实例 */
export interface ClawInstance {
  id: string;
  agentId: string;
  instanceName: string;
  clawType: ClawType;
  version?: string;
  status: ClawStatus;
  endpointUrl?: string;
  authConfig?: Record<string, unknown>;
  connectionConfig?: Record<string, unknown>;
  capabilities?: Record<string, unknown>;
  lastHealthCheck?: string;
  lastSyncTime?: string;
  metadata?: Record<string, unknown>;
  tenantId: string;
  enabled: boolean;
  createTime: string;
  updateTime: string;
  // Agent-related
  providerId: string;
  providerName?: string;
  modelId: string;
  modelName?: string;
  // Connection info (only on creation)
  proxyApiKey?: string;
  proxyApiBase?: string;
}

/** 创建/更新 Claw 请求 */
export interface ClawInstanceReq {
  id?: string;
  instanceName: string;
  clawType: ClawType;
  version?: string;
  endpointUrl?: string;
  authConfig?: Record<string, unknown>;
  connectionConfig?: Record<string, unknown>;
  capabilities?: Record<string, unknown>;
  enabled?: boolean;
  providerId: string;
  modelId: string;
  systemPrompt?: string;
}

/** 渠道映射 */
export interface ClawChannelMapping {
  id: string;
  clawInstanceId: string;
  channelId: string;
  remoteChannelId: string;
  remoteChannelType: string;
  configOverride?: Record<string, unknown>;
  syncStatus: string;
  lastSyncedConfig?: Record<string, unknown>;
  tenantId: string;
  createTime: string;
  updateTime: string;
}

/** CLI 工具会话 */
export interface CliToolSession {
  id: string;
  clawInstanceId: string;
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
