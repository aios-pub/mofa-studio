/**
 * Web-search configuration service (CHAT-03): BYOK provider + key stored
 * server-side; the frontend only ever sees a mask.
 */

import { apiClient } from "../api/apiClient";

export type SearchProvider = "tavily" | "bocha" | "zhipu";

export const SEARCH_PROVIDERS: Array<{
  value: SearchProvider;
  label: string;
  hint: string;
  applyUrl: string;
}> = [
  {
    value: "tavily",
    label: "Tavily（国际）",
    hint: "LLM 优化检索，免费额度够个人使用",
    applyUrl: "https://app.tavily.com",
  },
  {
    value: "bocha",
    label: "博查（国内）",
    hint: "中文检索质量好，按次计费",
    applyUrl: "https://open.bochaai.com",
  },
  {
    value: "zhipu",
    label: "智谱搜索（国内）",
    hint: "与智谱大模型 Key 通用",
    applyUrl: "https://open.bigmodel.cn",
  },
];

export interface SearchConfigState {
  provider: string;
  api_key_masked: string;
  configured: boolean;
}

export function providerLabel(value: string): string {
  return SEARCH_PROVIDERS.find((p) => p.value === value)?.label ?? value;
}

/** Client-side key shape check before sending to the server. */
export function validateSearchKey(key: string): { ok: true } | { ok: false; reason: string } {
  const trimmed = key.trim();
  if (!trimmed) return { ok: false, reason: "请粘贴搜索 API Key" };
  if (/\s/.test(trimmed)) return { ok: false, reason: "Key 中包含空白字符" };
  if (trimmed.length < 8) return { ok: false, reason: "Key 长度看起来太短" };
  return { ok: true };
}

class SearchConfigService {
  async get(): Promise<SearchConfigState> {
    try {
      const data = await apiClient.get<SearchConfigState>("/api/search/config");
      return {
        provider: data?.provider ?? "none",
        api_key_masked: data?.api_key_masked ?? "",
        configured: Boolean(data?.configured),
      };
    } catch {
      return { provider: "none", api_key_masked: "", configured: false };
    }
  }

  async save(provider: SearchProvider, apiKey: string): Promise<boolean> {
    try {
      await apiClient.post("/api/search/config", { provider, api_key: apiKey.trim() });
      return true;
    } catch {
      return false;
    }
  }
}

export const searchConfigService = new SearchConfigService();
