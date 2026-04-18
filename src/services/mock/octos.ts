/**
 * Octos Mock API — 开发阶段使用
 */

import type {
  OctosProfileResponse,
  OctosProfileConfig,
  OctosActionResponse,
  OctosTestProviderResponse,
  OctosSharedMetrics,
  OctosSkillEntry,
  OctosMonitorStatus,
  OctosPurgeReport,
  OctosBridgeQrInfo,
  OctosOverviewResponse,
} from "@/types/octos";

const defaultGatewaySettings = {
  max_history: 20,
  max_iterations: 10,
  system_prompt: "You are a helpful assistant.",
  max_concurrent_sessions: 5,
  browser_timeout_secs: 30,
  max_output_tokens: 8192,
};

const defaultConfig: OctosProfileConfig = {
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  api_key_env: "ANTHROPIC_API_KEY",
  channels: [],
  gateway: defaultGatewaySettings,
  env_vars: { ANTHROPIC_API_KEY: "sk-ant-***" },
};

const mockProfiles: OctosProfileResponse[] = [
  {
    id: "default",
    name: "Default Profile",
    enabled: true,
    data_dir: null,
    config: { ...defaultConfig },
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-04-01T00:00:00Z",
    status: { running: true, pid: 12345, started_at: "2025-04-01T00:00:00Z", uptime_secs: 86400 },
  },
  {
    id: "test-profile",
    name: "Test Profile",
    enabled: true,
    data_dir: null,
    config: {
      ...defaultConfig,
      provider: "openai",
      model: "gpt-5",
      api_key_env: "OPENAI_API_KEY",
      channels: [{ type: "telegram", bot_token: "123456:ABC-DEF", allowed_senders: "12345,67890" }],
      env_vars: { OPENAI_API_KEY: "sk-***" },
    },
    created_at: "2025-02-01T00:00:00Z",
    updated_at: "2025-04-10T00:00:00Z",
    status: { running: false, pid: null, started_at: null, uptime_secs: null },
  },
];

export const octosMockApi = {
  checkConnection: async (): Promise<boolean> => true,

  listProfiles: async (): Promise<OctosProfileResponse[]> => mockProfiles,

  getProfile: async (id: string): Promise<OctosProfileResponse> =>
    mockProfiles.find((p) => p.id === id) || mockProfiles[0],

  createProfile: async (params: {
    id: string;
    name: string;
    config?: OctosProfileConfig;
  }): Promise<OctosProfileResponse> => ({
    id: params.id,
    name: params.name,
    enabled: true,
    data_dir: null,
    config: params.config || { ...defaultConfig },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: { running: false, pid: null, started_at: null, uptime_secs: null },
  }),

  updateProfile: async (id: string, params: any): Promise<OctosProfileResponse> => {
    const profile = mockProfiles.find((p) => p.id === id) || mockProfiles[0];
    return { ...profile, ...params, updated_at: new Date().toISOString() };
  },

  deleteProfile: async (): Promise<OctosActionResponse> => ({ ok: true }),

  startGateway: async (): Promise<OctosActionResponse> => ({ ok: true, message: "Gateway started" }),

  stopGateway: async (): Promise<OctosActionResponse> => ({ ok: true, message: "Gateway stopped" }),

  restartGateway: async (): Promise<OctosActionResponse> => ({ ok: true, message: "Gateway restarted" }),

  gatewayStatus: async (): Promise<{ running: boolean; pid: number | null }> => ({
    running: true,
    pid: 12345,
  }),

  testProvider: async (): Promise<OctosTestProviderResponse> => ({
    ok: true,
    message: "Provider connection successful",
  }),

  fetchProviderModels: async (): Promise<string[]> => [
    "claude-sonnet-4-6",
    "claude-opus-4-6",
    "claude-haiku-4-5-20251001",
  ],

  listSubAccounts: async (): Promise<OctosProfileResponse[]> => [],

  createSubAccount: async (_parentId: string, params: any): Promise<OctosProfileResponse> => ({
    id: `sub-${Date.now()}`,
    name: params.name,
    enabled: true,
    data_dir: null,
    config: { ...defaultConfig },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: { running: false, pid: null, started_at: null, uptime_secs: null },
  }),

  // ==================== 批量操作 ====================

  startAll: async (): Promise<OctosActionResponse> => ({
    ok: true,
    message: "All profiles started",
  }),

  stopAll: async (): Promise<OctosActionResponse> => ({
    ok: true,
    message: "All profiles stopped",
  }),

  // ==================== Profile Skills ====================

  listProfileSkills: async (): Promise<{ skills: OctosSkillEntry[] }> => ({
    skills: [
      { name: "web-search", version: "1.0.0", tool_count: 3, source_repo: "github.com/octos/skills" },
      { name: "code-exec", version: "2.1.0", tool_count: 5, source_repo: "github.com/octos/skills" },
      { name: "file-ops", version: "1.5.0", tool_count: 8, source_repo: null },
    ],
  }),

  installProfileSkill: async (): Promise<{ ok: boolean; installed: string[]; skipped: string[]; deps_installed: boolean }> => ({
    ok: true,
    installed: ["test-skill"],
    skipped: [],
    deps_installed: true,
  }),

  removeProfileSkill: async (): Promise<OctosActionResponse> => ({ ok: true }),

  // ==================== QoS Metrics ====================

  getProfileMetrics: async (): Promise<OctosSharedMetrics> => ({
    updated_at: new Date().toISOString(),
    policy: {
      ema_alpha: 0.1,
      failure_threshold: 5,
      latency_threshold_ms: 5000,
      error_rate_threshold: 0.1,
      probe_probability: 0.1,
      probe_interval_secs: 60,
      weight_latency: 0.5,
      weight_error_rate: 0.3,
      weight_priority: 0.2,
    },
    providers: [
      {
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        latency_ema_ms: 850,
        p95_latency_ms: 1200,
        success_count: 950,
        failure_count: 50,
        consecutive_failures: 0,
        error_rate: 0.05,
        score: 95,
      },
      {
        provider: "openai",
        model: "gpt-4",
        latency_ema_ms: 600,
        p95_latency_ms: 900,
        success_count: 980,
        failure_count: 20,
        consecutive_failures: 0,
        error_rate: 0.02,
        score: 98,
      },
    ],
  }),

  // ==================== Monitor & Watchdog ====================

  getMonitorStatus: async (): Promise<OctosMonitorStatus> => ({
    watchdog_enabled: true,
    alerts_enabled: true,
  }),

  toggleWatchdog: async (enabled: boolean): Promise<{ ok: boolean; watchdog_enabled: boolean }> => ({
    ok: true,
    watchdog_enabled: enabled,
  }),

  toggleAlerts: async (enabled: boolean): Promise<{ ok: boolean; alerts_enabled: boolean }> => ({
    ok: true,
    alerts_enabled: enabled,
  }),

  // ==================== Purge ====================

  purgeProfile: async (): Promise<OctosPurgeReport> => ({
    profile_id: "test-profile",
    user_email: null,
    tenant_id: null,
    node_name: null,
    port_released: null,
    files_removed: ["/var/lib/octos/test-profile/conversations.json", "/var/lib/octos/test-profile/cache/*"],
    bytes_freed: 1048576,
  }),

  // ==================== WhatsApp QR ====================

  getWhatsAppQr: async (): Promise<OctosBridgeQrInfo> => ({
    qr: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    status: "waiting",
    ws_port: 8081,
    http_port: 8082,
    phone_number: null,
    lid: null,
  }),

  // ==================== Overview ====================

  getOverview: async (): Promise<OctosOverviewResponse> => ({
    total_profiles: 2,
    running: 1,
    stopped: 1,
    profiles: mockProfiles,
  }),

  // ==================== SSE Log Stream URL ====================

  getLogStreamUrl: (profileId: string): string => `/api/admin/profiles/${profileId}/logs`,
};
