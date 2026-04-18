/**
 * Octos 后端 API 客户端
 * 每个 Octos Claw 实例对应一个独立的 API 客户端（不同的 baseUrl）
 * 不使用共享的 apiClient，而是直接创建 axios 实例
 */

import axios, { type AxiosInstance } from "axios";
import type {
  OctosProfileResponse,
  OctosActionResponse,
  OctosTestProviderResponse,
  OctosProfileConfig,
  OctosSharedMetrics,
  OctosSkillEntry,
  OctosMonitorStatus,
  OctosPurgeReport,
  OctosBridgeQrInfo,
  OctosOverviewResponse,
} from "@/types/octos";
import type { Agent } from "@/types";

export class OctosApiClient {
  private http: AxiosInstance;

  constructor(baseUrl: string, authToken?: string) {
    // 开发环境使用代理避免 CORS
    const isDev = import.meta.env.DEV;
    const shouldUseProxy = isDev && baseUrl && !baseUrl.startsWith('/');

    this.http = axios.create({
      baseURL: shouldUseProxy ? '/octos-proxy' : baseUrl,
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
    });
  }

  // ==================== 检测连接 ====================

  async checkConnection(): Promise<boolean> {
    try {
      await this.http.get("/api/admin/overview");
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Profile CRUD ====================

  async listProfiles(): Promise<OctosProfileResponse[]> {
    const { data } = await this.http.get("/api/admin/profiles");
    return data;
  }

  async getProfile(id: string): Promise<OctosProfileResponse> {
    const { data } = await this.http.get(`/api/admin/profiles/${id}`);
    return data;
  }

  async createProfile(params: {
    id: string;
    name: string;
    public_subdomain?: string | null;
    enabled?: boolean;
    data_dir?: string | null;
    config?: OctosProfileConfig;
  }): Promise<OctosProfileResponse> {
    const { data } = await this.http.post("/api/admin/profiles", params);
    return data;
  }

  async updateProfile(
    id: string,
    params: {
      name?: string;
      public_subdomain?: string | null;
      enabled?: boolean;
      data_dir?: string | null;
      config?: OctosProfileConfig;
    },
  ): Promise<OctosProfileResponse> {
    const { data } = await this.http.put(`/api/admin/profiles/${id}`, params);
    return data;
  }

  async deleteProfile(id: string): Promise<OctosActionResponse> {
    const { data } = await this.http.delete(`/api/admin/profiles/${id}`);
    return data;
  }

  // ==================== 网关控制 ====================

  async startGateway(id: string): Promise<OctosActionResponse> {
    const { data } = await this.http.post(`/api/admin/profiles/${id}/start`);
    return data;
  }

  async stopGateway(id: string): Promise<OctosActionResponse> {
    const { data } = await this.http.post(`/api/admin/profiles/${id}/stop`);
    return data;
  }

  async restartGateway(id: string): Promise<OctosActionResponse> {
    const { data } = await this.http.post(`/api/admin/profiles/${id}/restart`);
    return data;
  }

  async gatewayStatus(id: string): Promise<{ running: boolean; pid: number | null }> {
    const { data } = await this.http.get(`/api/admin/profiles/${id}/status`);
    return data;
  }

  // ==================== Provider 操作 ====================

  async testProvider(params: {
    provider: string;
    model: string;
    api_key?: string;
    api_key_env?: string;
    base_url?: string;
  }): Promise<OctosTestProviderResponse> {
    const { data } = await this.http.post("/api/my/test-provider", params);
    return data;
  }

  async fetchProviderModels(params: {
    provider: string;
    model?: string;
    api_key?: string;
    api_key_env?: string;
    base_url?: string;
    profile_id?: string;
  }): Promise<string[]> {
    const { data } = await this.http.post("/api/my/provider-models", params);
    return data;
  }

  // ==================== 批量操作 ====================

  async startAll(): Promise<OctosActionResponse> {
    const { data } = await this.http.post("/api/admin/start-all");
    return data;
  }

  async stopAll(): Promise<OctosActionResponse> {
    const { data } = await this.http.post("/api/admin/stop-all");
    return data;
  }

  // ==================== Profile Skills ====================

  async listProfileSkills(id: string): Promise<{ skills: OctosSkillEntry[] }> {
    const { data } = await this.http.get(`/api/admin/profiles/${id}/skills`);
    return data;
  }

  async installProfileSkill(
    id: string,
    data: { repo: string; force: boolean; branch: string }
  ): Promise<{ ok: boolean; installed: string[]; skipped: string[]; deps_installed: boolean }> {
    const { data: responseData } = await this.http.post(`/api/admin/profiles/${id}/skills`, data);
    return responseData;
  }

  async removeProfileSkill(id: string, name: string): Promise<OctosActionResponse> {
    const { data } = await this.http.delete(`/api/admin/profiles/${id}/skills/${name}`);
    return data;
  }

  // ==================== QoS Metrics ====================

  async getProfileMetrics(id: string): Promise<OctosSharedMetrics | null> {
    const { data } = await this.http.get(`/api/admin/profiles/${id}/metrics`);
    return data;
  }

  // ==================== Monitor & Watchdog ====================

  async getMonitorStatus(): Promise<OctosMonitorStatus> {
    const { data } = await this.http.get("/api/admin/monitor/status");
    return data;
  }

  async toggleWatchdog(enabled: boolean): Promise<{ ok: boolean; watchdog_enabled: boolean }> {
    const { data } = await this.http.post("/api/admin/monitor/watchdog", { enabled });
    return data;
  }

  async toggleAlerts(enabled: boolean): Promise<{ ok: boolean; alerts_enabled: boolean }> {
    const { data } = await this.http.post("/api/admin/monitor/alerts", { enabled });
    return data;
  }

  // ==================== Purge ====================

  async purgeProfile(id: string): Promise<OctosPurgeReport> {
    const { data } = await this.http.post(`/api/admin/profiles/${id}/purge`);
    return data;
  }

  // ==================== WhatsApp QR ====================

  async getWhatsAppQr(id: string): Promise<OctosBridgeQrInfo> {
    const { data } = await this.http.get(`/api/admin/profiles/${id}/whatsapp/qr`);
    return data;
  }

  // ==================== Overview ====================

  async getOverview(): Promise<OctosOverviewResponse> {
    const { data } = await this.http.get("/api/admin/overview");
    return data;
  }

  // ==================== SSE Log Stream URL ====================

  getLogStreamUrl(profileId: string): string {
    const claw = (this.http.defaults.headers?.Authorization as string)?.toString() || "";
    const token = claw.replace("Bearer ", "");
    const base = `/api/admin/profiles/${profileId}/logs`;
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  }

  // ==================== 子账户 ====================

  async listSubAccounts(parentId: string): Promise<OctosProfileResponse[]> {
    const { data } = await this.http.get(`/api/admin/profiles/${parentId}/accounts`);
    return data;
  }

  async createSubAccount(
    parentId: string,
    params: {
      sub_account_id?: string;
      name: string;
      public_subdomain?: string | null;
      email?: string;
      channels?: OctosProfileConfig["channels"];
      system_prompt?: string;
      env_vars?: Record<string, string>;
    },
  ): Promise<OctosProfileResponse> {
    const { data } = await this.http.post(`/api/admin/profiles/${parentId}/accounts`, params);
    return data;
  }
}

/**
 * 从 Agent 创建 OctosApiClient
 * 读取 customParams.claw 中的 endpointUrl 和 authConfig
 */
export function createOctosApiClient(agent: Agent): OctosApiClient {
  const claw = ((agent.customParams as Record<string, unknown>)?.claw as Record<string, unknown>) || {};
  const baseUrl = (claw.endpointUrl as string) || "";
  const authConfig = (claw.authConfig as Record<string, unknown>) || {};
  const authToken = (authConfig.authToken as string) ||
    (authConfig.token as string) || "";
  return new OctosApiClient(baseUrl, authToken);
}
