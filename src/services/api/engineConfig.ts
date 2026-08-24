/**
 * Engine provider configuration service (ONBOARD-02 key wizard):
 * register a BYOK provider on mofa-engine through the gateway; the key is
 * persisted engine-side (config.toml) and never stored in the frontend.
 */

import { apiClient } from "../api/apiClient";
import type { ProviderConfig } from "@/types/provider";

/** Engine-side provider registration payload. */
export interface EngineProviderRegistration {
  name: string;
  kind: "openai_compatible";
  base_url: string;
  api_key: string;
  enabled: boolean;
  priority: number;
  cost_tier: "free" | "low" | "medium" | "high";
  models: Array<{
    name: string;
    capability: string;
    context_window?: number;
    memory_mb?: number;
  }>;
}

/** Curated default chat models for common vendors (国内优先). */
const DEFAULT_MODELS: Partial<Record<string, string>> = {
  deepseek: "deepseek-chat",
  alibaba: "qwen-plus",
  zhipu: "glm-4-flash",
  moonshot: "moonshot-v1-8k",
  minimax: "abab6.5s-chat",
  baidu: "ernnie-speed-4.0",
  bytedance: "doubao-pro-4k",
  baichuan: "Baichuan4",
  iflytek: "generalv3.5",
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-5",
  google: "gemini-2.0-flash",
  openrouter: "openrouter/auto",
  groq: "llama-3.3-70b-versatile",
  mistral: "mistral-large-latest",
  perplexity: "sonar",
};

/** Vendors ordered 国内可达优先 (ONBOARD-02 推荐排序). */
const CN_FIRST_ORDER = [
  "deepseek",
  "alibaba",
  "zhipu",
  "moonshot",
  "minimax",
  "baidu",
  "bytedance",
  "baichuan",
  "iflytek",
  "modelscope",
];

/** Default model name for a vendor (editable in the wizard). */
export function defaultModelFor(type: string): string {
  return DEFAULT_MODELS[type] ?? "gpt-4o-mini";
}

/** Provider catalog ordered 国内优先 for the wizard's vendor picker. */
export function orderVendorsChinaFirst<T extends { type: string }>(vendors: T[]): T[] {
  return [...vendors].sort((a, b) => {
    const ai = CN_FIRST_ORDER.indexOf(a.type);
    const bi = CN_FIRST_ORDER.indexOf(b.type);
    const av = ai === -1 ? CN_FIRST_ORDER.length : ai;
    const bv = bi === -1 ? CN_FIRST_ORDER.length : bi;
    if (av !== bv) return av - bv;
    return a.type.localeCompare(b.type);
  });
}

/** Build the engine registration from a catalog vendor + user input. */
export function buildRegistration(
  vendor: ProviderConfig,
  apiKey: string,
  modelName: string,
): EngineProviderRegistration {
  return {
    name: vendor.type,
    kind: "openai_compatible",
    base_url: vendor.api.defaultBaseUrl,
    api_key: apiKey.trim(),
    enabled: true,
    priority: 10,
    cost_tier: "low",
    models: [
      {
        name: modelName.trim(),
        capability: "chat",
        context_window: 32768,
      },
    ],
  };
}

/** Client-side paste validation: shape check against the vendor's prefix. */
export function validateApiKey(
  apiKey: string,
  vendor: ProviderConfig,
): { ok: true } | { ok: false; reason: string } {
  const trimmed = apiKey.trim();
  if (!trimmed) return { ok: false, reason: "请粘贴 API Key" };
  if (/\s/.test(trimmed)) return { ok: false, reason: "Key 中包含空白字符，请检查是否复制完整" };
  const prefix = vendor.api.apiKeyPrefix;
  if (prefix && !trimmed.startsWith(prefix)) {
    return { ok: false, reason: `该厂商的 Key 通常以 ${prefix} 开头，请确认粘贴的是 API Key` };
  }
  if (trimmed.length < 16) {
    return { ok: false, reason: "Key 长度看起来太短，请检查是否复制完整" };
  }
  return { ok: true };
}

export interface RegisteredProviderInfo {
  name: string;
  models: string[];
}

class EngineConfigService {
  /** Register a provider engine-side (persisted there; key never stored here). */
  async register(registration: EngineProviderRegistration): Promise<{ name: string; persisted: boolean }> {
    return apiClient.post<{ name: string; persisted: boolean }>(
      "/v1/config/providers",
      registration,
    );
  }

  /** Masked listing from the engine. */
  async listProviders(): Promise<RegisteredProviderInfo[]> {
    try {
      const data = await apiClient.get<{ providers: RegisteredProviderInfo[] }>(
        "/v1/config/providers",
      );
      return data?.providers ?? [];
    } catch {
      return [];
    }
  }
}

export const engineConfigService = new EngineConfigService();
