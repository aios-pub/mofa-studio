/**
 * Octos-related type definitions
 * Corresponds to Octos backend API，Fields keep snake_case to match backend
 */

/** Process status */
export interface OctosProcessStatus {
  running: boolean;
  pid: number | null;
  started_at: string | null;
  uptime_secs: number | null;
}

/** Gateway settings */
export interface OctosGatewaySettings {
  max_history?: number | null;
  max_iterations?: number | null;
  system_prompt?: string | null;
  max_concurrent_sessions?: number | null;
  browser_timeout_secs?: number | null;
  max_output_tokens?: number | null;
}

/** Channel credentials */
export interface OctosChannelCredentials {
  type: string;
  [key: string]: string | number;
}

// ==================== LLM configuration ====================

/** LLM routing configuration */
export interface LlmRouteConfig {
  /** Route ID (Corresponds to backend route_id) */
  route_id?: string;
  /** Base URL */
  base_url?: string;
  /** API Key environment variable name */
  api_key_env?: string;
  /** API type */
  api_type?: string;
  /** Label */
  label?: string;
}

/** LLM model selection configuration */
export interface LlmModelSelectionConfig {
  /** Model family/provider family (e.g. "moonshot", "deepseek") */
  family_id?: string | null;
  /** Specific model identifier (e.g. "kimi-k2.5") */
  model_id?: string | null;
  /** Selected provider route */
  route?: LlmRouteConfig | null;
  /** Optional model behavior hint */
  model_hints?: Record<string, unknown> | null;
  /** Output price (USD per million tokens) */
  cost_per_m?: number | null;
  /** Whether it is a powerful model (Used for large tool-intensive runs) */
  strong?: boolean | null;
}

/** LLM Profile configuration */
export interface LlmProfileConfig {
  /** Primary model configuration */
  primary?: LlmModelSelectionConfig | null;
  /** Fallback model configuration list */
  fallbacks?: LlmModelSelectionConfig[];
}

/** Email settings */
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

/** Profile configuration */
export interface OctosProfileConfig {
  // LLM configuration
  llm?: LlmProfileConfig | null;
  // API protocol type: "openai" or "anthropic"
  api_type?: string | null;
  channels?: OctosChannelCredentials[] | Record<string, unknown>[];
  gateway?: OctosGatewaySettings;
  email?: OctosEmailSettings | null | Record<string, unknown>;
  env_vars?: Record<string, string>;
  admin_mode?: boolean;
  hooks?: HookConfig[];
  sandbox?: SandboxConfig;
  channel_ids?: string[];
  // Allow extra unknown fields（Corresponds to Rust flatten extra）
  [key: string]: unknown;
}

/** Profile update request params (PUT /api/admin/profiles/:id) */
export interface OctosUpdateProfileRequest {
  /** Profile name */
  name?: string;
  /** Public subdomain，Set to null to clear */
  public_subdomain?: string | null;
  /** Whether to enable */
  enabled?: boolean;
  /** Data directory，Set to null to clear */
  data_dir?: string | null;
  /** Profile configuration */
  config?: OctosProfileConfig;
  /** OTP login email */
  email?: string;
  /** Agent unique code */
  agent_code?: string;
}

/** Profile response */
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

/** Operation response */
export interface OctosActionResponse {
  ok: boolean;
  message?: string;
}

/** Test provider response */
export interface OctosTestProviderResponse {
  ok: boolean;
  message?: string;
  error?: string;
  models?: string[];
}

/** Provider model entry */
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

/** Provider directory entry */
export interface OctosProviderCatalogEntry {
  env: string;
  models: OctosProviderModelEntry[];
}

/** Supported Channel types */
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

/** Supported Providers */
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

/** Hook configuration */
export interface HookConfig {
  event: string;
  command: string[];
  timeout_ms?: number;
  tool_filter?: string[];
}

/** Docker sandbox configuration */
export interface DockerConfig {
  image?: string | null;
  cpu_limit?: string | null;
  memory_limit?: string | null;
  pids_limit?: number | null;
}

/** Sandbox configuration */
export interface SandboxConfig {
  enabled?: boolean;
  mode?: "auto" | "macos" | "docker" | "bwrap";
  allow_network?: boolean;
  docker?: DockerConfig;
}

// ── QoS Metrics ─────────────────────────────────────────────────

/** Provider QoS metrics */
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

/** QoS policy configuration */
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

/** Profile QoS metrics summary */
export interface OctosSharedMetrics {
  updated_at: string;
  policy: OctosSharedPolicy;
  providers: OctosSharedProviderMetrics[];
}

// ── Profile Skills ───────────────────────────────────────────────

/** Profile installed Skill entries */
export interface OctosSkillEntry {
  name: string;
  version: string | null;
  tool_count: number;
  source_repo: string | null;
}

// ── Monitor ─────────────────────────────────────────────────────

/** Monitoring status */
export interface OctosMonitorStatus {
  watchdog_enabled: boolean;
  alerts_enabled: boolean;
}

// ── Purge ───────────────────────────────────────────────────────

/** Profile cleanup report */
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

/** WhatsApp bridge QR info */
export interface OctosBridgeQrInfo {
  qr: string | null;
  status: "waiting" | "connected" | "disconnected" | "logged_out";
  ws_port: number;
  http_port: number;
  phone_number: string | null;
  lid: string | null;
}

// ── Overview ────────────────────────────────────────────────────

/** Overview response */
export interface OctosOverviewResponse {
  total_profiles: number;
  running: number;
  stopped: number;
  profiles: OctosProfileResponse[];
}
