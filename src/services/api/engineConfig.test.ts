/**
 * Tests for the engine provider-config service (ONBOARD-02): vendor
 * ordering, registration mapping, key validation, and listing.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import type { ProviderConfig } from "@/types/provider";
import {
  buildRegistration,
  defaultModelFor,
  engineConfigService,
  orderVendorsChinaFirst,
  validateApiKey,
} from "./engineConfig";

vi.mock("../api/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);

function vendor(type: string, prefix?: string): ProviderConfig {
  return {
    type: type as ProviderConfig["type"],
    name: type,
    category: "cloud",
    icon: "x",
    description: "",
    website: "https://example.com",
    api: {
      defaultBaseUrl: `https://${type}.example.com/v1`,
      authType: "bearer",
      apiKeyPrefix: prefix,
      apiKeyPlaceholder: "sk-...",
    },
    configFields: [],
    defaultModels: [],
    capabilities: {
      vision: false,
      streaming: true,
      functionCalling: false,
      codeExecution: false,
      jsonMode: false,
    },
  };
}

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
});

describe("orderVendorsChinaFirst", () => {
  it("puts the curated CN vendors ahead of international ones", () => {
    const ordered = orderVendorsChinaFirst([
      vendor("openai"),
      vendor("deepseek"),
      vendor("zhipu"),
      vendor("anthropic"),
    ]);
    expect(ordered.map((v) => v.type).slice(0, 2)).toEqual(["deepseek", "zhipu"]);
    expect(ordered.map((v) => v.type).slice(2).sort()).toEqual(["anthropic", "openai"]);
  });
});

describe("buildRegistration", () => {
  it("maps the catalog vendor onto the engine payload", () => {
    const reg = buildRegistration(vendor("deepseek", "sk-"), "sk-abc123def456ghi789", "deepseek-chat");
    expect(reg).toMatchObject({
      name: "deepseek",
      kind: "openai_compatible",
      base_url: "https://deepseek.example.com/v1",
      api_key: "sk-abc123def456ghi789",
      enabled: true,
    });
    expect(reg.models).toEqual([
      { name: "deepseek-chat", capability: "chat", context_window: 32768 },
    ]);
  });

  it("trims key and model whitespace", () => {
    const reg = buildRegistration(vendor("x"), "  sk-abc123def456ghi789  ", "  m  ");
    expect(reg.api_key).toBe("sk-abc123def456ghi789");
    expect(reg.models[0].name).toBe("m");
  });
});

describe("validateApiKey", () => {
  it("accepts a well-formed key", () => {
    expect(validateApiKey("sk-abcdefghijklmnop", vendor("deepseek", "sk-"))).toEqual({ ok: true });
  });

  it("rejects empty and whitespace-laden keys", () => {
    expect(validateApiKey("   ", vendor("x")).ok).toBe(false);
    expect(validateApiKey("sk-abc def123456", vendor("x")).ok).toBe(false);
  });

  it("flags a wrong prefix with a specific reason", () => {
    const result = validateApiKey("abc123def456ghi78", vendor("deepseek", "sk-"));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toContain("sk-");
  });

  it("flags too-short keys", () => {
    const result = validateApiKey("sk-short", vendor("x", "sk-"));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toContain("太短");
  });
});

describe("engineConfigService", () => {
  it("posts the registration to the gateway", async () => {
    mockedPost.mockResolvedValueOnce({ name: "deepseek", persisted: true });
    const result = await engineConfigService.register(
      buildRegistration(vendor("deepseek"), "sk-abcdefghijklmnop", "deepseek-chat"),
    );
    expect(mockedPost).toHaveBeenCalledWith("/v1/config/providers", expect.any(Object));
    expect(result.persisted).toBe(true);
  });

  it("lists providers fail-soft", async () => {
    mockedGet.mockResolvedValueOnce({ providers: [{ name: "ollama", models: ["ollama/qwen"] }] });
    expect(await engineConfigService.listProviders()).toEqual([
      { name: "ollama", models: ["ollama/qwen"] },
    ]);
    mockedGet.mockRejectedValueOnce(new Error("down"));
    expect(await engineConfigService.listProviders()).toEqual([]);
  });
});

describe("defaultModelFor", () => {
  it("knows curated vendors and falls back sensibly", () => {
    expect(defaultModelFor("deepseek")).toBe("deepseek-chat");
    expect(defaultModelFor("zhipu")).toBe("glm-4-flash");
    expect(defaultModelFor("unknown-vendor")).toBe("gpt-4o-mini");
  });
});
