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

/** 回退模型 - 旧模式 */
export interface OctosFallbackModel {
  provider: string;
  model?: string | null;
  base_url?: string | null;
  api_key_env?: string | null;
  api_type?: string | null;
}

/** 回退配置 - 新模式 (复用 Provider 管理) */
export interface OctosFallbackConfig {
  provider_id: string | null;
  model_id: string | null;
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
  // Provider 配置 - 支持两种模式：
  // 1. 新模式：复用 provider 管理 (provider_id + model_id)
  // 2. 旧模式：直接配置 (provider + model + base_url + api_key_env)
  provider_id?: string | null; // Provider ID (复用 provider 管理)
  model_id?: string | null; // 模型 ID (从 provider 的模型列表中选择)
  provider?: string | null; // 旧模式：Provider 名称
  model?: string | null; // 旧模式：模型名称
  base_url?: string | null; // 旧模式：Base URL
  api_key_env?: string | null; // 旧模式：API Key 环境变量名
  api_type?: string | null; // API 类型

  // 回退模型 - 支持两种模式：
  // 1. 新模式：复用 provider 管理 (fallback_configs)
  // 2. 旧模式：直接配置 (fallback_models)
  fallback_configs?: OctosFallbackConfig[];
  fallback_models?: OctosFallbackModel[] | Record<string, unknown>[];

  // 渠道配置 - 支持两种模式：
  // 1. 新模式：复用渠道管理 (channel_ids)
  // 2. 旧模式：直接配置 (channels)
  channel_ids?: string[]; // Channel ID 列表 (复用渠道管理)
  channels?: OctosChannelCredentials[] | Record<string, unknown>[];

  gateway?: OctosGatewaySettings;
  email?: OctosEmailSettings | null | Record<string, unknown>;
  env_vars?: Record<string, string>;
  admin_mode?: boolean;
  hooks?: HookConfig[];
  sandbox?: SandboxConfig;

  // 允许额外的未知字段（对应 Rust 的 flatten extra）
  [key: string]: unknown;
}

/** Profile 更新请求参数 (PUT /api/admin/profiles/:id) */
export interface OctosUpdateProfileRequest {
  /** Profile 名称 */
  name?: string;
  /** 公开子域名，设置为 null 可清除 */
  public_subdomain?: string | null;
  /** 是否启用 */
  enabled?: boolean;
  /** 数据目录，设置为 null 可清除 */
  data_dir?: string | null;
  /** Profile 配置 */
  config?: OctosProfileConfig;
  /** OTP 登录邮箱 */
  email?: string;
  /** Agent 唯一编码 */
  agent_code?: string;
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
  endpoints?: {
    id: string;
    label: string;
    base_url?: string;
    api_key_env?: string;
  }[];
}

/** Provider 目录条目 */
export interface OctosProviderCatalogEntry {
  env: string;
  models: OctosProviderModelEntry[];
}

/** 支持的渠道类型 */
export type OctosChannelType =
  | "telegram"
  | "discord"
  | "slack"
  | "whatsapp"
  | "feishu"
  | "email"
  | "wecom_bot"
  | "qq_bot"
  | "wechat";

export const OCTOS_CHANNEL_TYPES: OctosChannelType[] = [
  "telegram",
  "discord",
  "slack",
  "whatsapp",
  "feishu",
  "email",
  "wecom_bot",
  "qq_bot",
  "wechat",
];

export const OCTOS_CHANNEL_LABELS: Record<OctosChannelType, string> = {
  telegram: "Telegram",
  discord: "Discord",
  slack: "Slack",
  whatsapp: "WhatsApp",
  feishu: "飞书",
  email: "邮件",
  wecom_bot: "企业微信",
  qq_bot: "QQ Bot",
  wechat: "微信",
};

export const OCTOS_CHANNEL_ICONS: Record<OctosChannelType, string> = {
  telegram: "✈️",
  discord: "💬",
  slack: "📱",
  whatsapp: "📱",
  feishu: "🐦",
  email: "📧",
  wecom_bot: "💼",
  qq_bot: "🐧",
  wechat: "💚",
};

/** 支持的 Provider */
export const OCTOS_PROVIDERS = [
  "anthropic",
  "openai",
  "gemini",
  "r9s",
  "openrouter",
  "deepseek",
  "groq",
  "moonshot",
  "dashscope",
  "minimax",
  "zhipu",
  "zai",
  "nvidia",
  "ollama",
  "vllm",
] as const;

export type OctosProviderName = (typeof OCTOS_PROVIDERS)[number];

// ── Hooks & Sandbox ─────────────────────────────────────────────

/** Hook 配置 */
export interface HookConfig {
  event: string;
  command: string[];
  timeout_ms?: number;
  tool_filter?: string[];
}

/** Docker 沙箱配置 */
export interface DockerConfig {
  image?: string | null;
  cpu_limit?: string | null;
  memory_limit?: string | null;
  pids_limit?: number | null;
}

/** 沙箱配置 */
export interface SandboxConfig {
  enabled?: boolean;
  mode?: "auto" | "macos" | "docker" | "bwrap";
  allow_network?: boolean;
  docker?: DockerConfig;
}

// ── QoS Metrics ─────────────────────────────────────────────────

/** Provider QoS 指标 */
export interface OctosSharedProviderMetrics {
  provider: string;
  model: string;
  latency_ema_ms: number;
  p95_latency_ms: number;
  success_count: number;
  failure_count: number;
  consecutive_failures: number;
  error_rate: number;
  score: number;
}

/** QoS 策略配置 */
export interface OctosSharedPolicy {
  ema_alpha: number;
  failure_threshold: number;
  latency_threshold_ms: number;
  error_rate_threshold: number;
  probe_probability: number;
  probe_interval_secs: number;
  weight_latency: number;
  weight_error_rate: number;
  weight_priority: number;
}

/** Profile QoS 指标汇总 */
export interface OctosSharedMetrics {
  updated_at: string;
  policy: OctosSharedPolicy;
  providers: OctosSharedProviderMetrics[];
}

// ── Profile Skills ───────────────────────────────────────────────

/** Profile 安装的 Skill 条目 */
export interface OctosSkillEntry {
  name: string;
  version: string | null;
  tool_count: number;
  source_repo: string | null;
}

// ── Monitor ─────────────────────────────────────────────────────

/** 监控状态 */
export interface OctosMonitorStatus {
  watchdog_enabled: boolean;
  alerts_enabled: boolean;
}

// ── Purge ───────────────────────────────────────────────────────

/** Profile 清理报告 */
export interface OctosPurgeReport {
  profile_id: string;
  user_email: string | null;
  tenant_id: string | null;
  node_name: string | null;
  port_released: number | null;
  files_removed: string[];
  bytes_freed: number;
}

// ── WhatsApp QR ─────────────────────────────────────────────────

/** WhatsApp 桥接 QR 信息 */
export interface OctosBridgeQrInfo {
  qr: string | null;
  status: "waiting" | "connected" | "disconnected" | "logged_out";
  ws_port: number;
  http_port: number;
  phone_number: string | null;
  lid: string | null;
}

// ── Overview ────────────────────────────────────────────────────

/** 概览响应 */
export interface OctosOverviewResponse {
  total_profiles: number;
  running: number;
  stopped: number;
  profiles: OctosProfileResponse[];
}
