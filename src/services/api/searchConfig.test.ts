/**
 * Tests for the search-config service: provider catalog, key validation,
 * and fail-soft state reads.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import {
  SEARCH_PROVIDERS,
  providerLabel,
  searchConfigService,
  validateSearchKey,
} from "./searchConfig";

vi.mock("../api/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
});

describe("SEARCH_PROVIDERS", () => {
  it("covers international and CN providers with apply links", () => {
    expect(SEARCH_PROVIDERS.map((p) => p.value)).toEqual(["tavily", "bocha", "zhipu"]);
    for (const provider of SEARCH_PROVIDERS) {
      expect(provider.applyUrl).toMatch(/^https:\/\//);
      expect(provider.hint.length).toBeGreaterThan(4);
    }
  });

  it("providerLabel resolves known values and echoes unknown ones", () => {
    expect(providerLabel("bocha")).toContain("博查");
    expect(providerLabel("weird")).toBe("weird");
  });
});

describe("validateSearchKey", () => {
  it("accepts a reasonable key", () => {
    expect(validateSearchKey("tvly-abcdef123456")).toEqual({ ok: true });
  });

  it("rejects empty, whitespace, and short keys with reasons", () => {
    expect(validateSearchKey("  ").ok).toBe(false);
    expect(validateSearchKey("abc def12345").ok).toBe(false);
    expect(validateSearchKey("short").ok).toBe(false);
  });
});

describe("searchConfigService", () => {
  it("reads config fail-soft", async () => {
    mockedGet.mockResolvedValueOnce({
      provider: "tavily",
      api_key_masked: "tvly••••••••",
      configured: true,
    });
    expect(await searchConfigService.get()).toMatchObject({ provider: "tavily", configured: true });
    mockedGet.mockRejectedValueOnce(new Error("down"));
    expect(await searchConfigService.get()).toMatchObject({ provider: "none", configured: false });
  });

  it("saves via the endpoint and fails soft", async () => {
    mockedPost.mockResolvedValueOnce({ provider: "bocha", configured: true });
    expect(await searchConfigService.save("bocha", "sk-12345678")).toBe(true);
    expect(mockedPost).toHaveBeenCalledWith("/api/search/config", {
      provider: "bocha",
      api_key: "sk-12345678",
    });
    mockedPost.mockRejectedValueOnce(new Error("x"));
    expect(await searchConfigService.save("bocha", "sk-12345678")).toBe(false);
  });
});
