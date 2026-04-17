/**
 * Octos 相关类型定义
 * 与 Octos 后端 API 对应，字段保持 snake_case 以匹配后端
 */

/** 进程状态 */
export interface OctosProcessStatus {
  running: boolean;
  pid: number | null;
  started_at: string | null;
  uptime_secs: number | null;
}

/** 网关设置 */
export interface OctosGatewaySettings {
  max_history?: number | null;
  max_iterations?: number | null;
  system_prompt?: string | null;
  max_concurrent_sessions?: number | null;
  browser_timeout_secs?: number | null;
  max_output_tokens?: number | null;
}

/** 渠道凭据 */
export interface OctosChannelCredentials {
  type: string;
  [key: string]: string | number;
}

/** 回退模型 */
export interface OctosFallbackModel {
  provider: string;
  model?: string | null;
  base_url?: string | null;
  api_key_env?: string | null;
  api_type?: string | null;
}

/** 邮件设置 */
export interface OctosEmailSettings {
  provider: string;
  smtp_host?: string | null;
  smtp_port?: number | null;
  username?: string | null;
  password_env?: string | null;
  from_address?: string | null;
  feishu_app_id?: string | null;
  feishu_app_secret_env?: string | null;
  feishu_from_address?: string | null;
  feishu_region?: string | null;
}

/** Profile 配置 */
export interface OctosProfileConfig {
  provider?: string | null;
  model?: string | null;
  base_url?: string | null;
  api_key_env?: string | null;
  api_type?: string | null;
  fallback_models?: OctosFallbackModel[];
  channels: OctosChannelCredentials[];
  gateway: OctosGatewaySettings;
  email?: OctosEmailSettings | null;
  env_vars: Record<string, string>;
  admin_mode?: boolean;
}

/** Profile 响应 */
export interface OctosProfileResponse {
  id: string;
  name: string;
  enabled: boolean;
  data_dir: string | null;
  parent_id?: string | null;
  public_subdomain?: string | null;
  config: OctosProfileConfig;
  created_at: string;
  updated_at: string;
  status: OctosProcessStatus;
  email?: string | null;
}

/** 操作响应 */
export interface OctosActionResponse {
  ok: boolean;
  message?: string;
}

/** 测试 Provider 响应 */
export interface OctosTestProviderResponse {
  ok: boolean;
  message?: string;
  error?: string;
  models?: string[];
}

/** Provider 模型条目 */
export interface OctosProviderModelEntry {
  id: string;
  input: number;
  output: number;
  max_output: number;
  endpoints?: { id: string; label: string; base_url?: string; api_key_env?: string }[];
}

/** Provider 目录条目 */
export interface OctosProviderCatalogEntry {
  env: string;
  models: OctosProviderModelEntry[];
}

/** 支持的渠道类型 */
export type OctosChannelType = 'telegram' | 'discord' | 'slack' | 'whatsapp' | 'feishu' | 'email' | 'wecom_bot' | 'qq_bot' | 'wechat';

export const OCTOS_CHANNEL_TYPES: OctosChannelType[] = ['telegram', 'discord', 'slack', 'whatsapp', 'feishu', 'email', 'wecom_bot', 'qq_bot', 'wechat'];

export const OCTOS_CHANNEL_LABELS: Record<OctosChannelType, string> = {
  telegram: 'Telegram',
  discord: 'Discord',
  slack: 'Slack',
  whatsapp: 'WhatsApp',
  feishu: '飞书',
  email: '邮件',
  wecom_bot: '企业微信',
  qq_bot: 'QQ Bot',
  wechat: '微信',
};

export const OCTOS_CHANNEL_ICONS: Record<OctosChannelType, string> = {
  telegram: '✈️',
  discord: '💬',
  slack: '📱',
  whatsapp: '📱',
  feishu: '🐦',
  email: '📧',
  wecom_bot: '💼',
  qq_bot: '🐧',
  wechat: '💚',
};

/** 支持的 Provider */
export const OCTOS_PROVIDERS = [
  'anthropic', 'openai', 'gemini', 'r9s', 'openrouter', 'deepseek',
  'groq', 'moonshot', 'dashscope', 'minimax', 'zhipu', 'zai',
  'nvidia', 'ollama', 'vllm',
] as const;

export type OctosProviderName = typeof OCTOS_PROVIDERS[number];
