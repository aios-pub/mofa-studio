/**
 * Octos Mock API — 开发阶段使用
 */

import type {
  OctosProfileResponse,
  OctosProfileConfig,
  OctosActionResponse,
  OctosTestProviderResponse,
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
};
