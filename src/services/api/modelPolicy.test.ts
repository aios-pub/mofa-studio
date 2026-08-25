/**
 * Tests for the tiered routing policy (PLAT-03): persistence round-trips,
 * resolution precedence, and tier suggestions.
 */
import { beforeEach, describe, expect, it } from "vitest";
import type { EngineModel } from "./engine";
import { AUTO_MODEL } from "./engine";
import {
  DEFAULT_POLICY,
  loadPolicy,
  resolveModel,
  savePolicy,
  suggestTiers,
} from "./modelPolicy";

beforeEach(() => {
  localStorage.clear();
});

describe("loadPolicy / savePolicy", () => {
  it("round-trips a configured policy", () => {
    savePolicy({ planner: "deepseek/deepseek-chat", executor: "ollama/qwen2.5:7b" });
    expect(loadPolicy()).toEqual({
      planner: "deepseek/deepseek-chat",
      executor: "ollama/qwen2.5:7b",
    });
  });

  it("unconfigured storage degrades to empty defaults", () => {
    expect(loadPolicy()).toEqual(DEFAULT_POLICY);
    localStorage.setItem("mofa-studio-model-policy", "{corrupt");
    expect(loadPolicy()).toEqual(DEFAULT_POLICY);
  });
});

describe("resolveModel (任务级手动切换/继承)", () => {
  const policy = { planner: "strong/model", executor: "fast/model" };

  it("scope override beats the policy tier", () => {
    expect(resolveModel("executor", "custom/model", policy)).toBe("custom/model");
    expect(resolveModel("planner", "custom/model", policy)).toBe("custom/model");
  });

  it("AUTO scope override falls through to the policy tier", () => {
    expect(resolveModel("executor", AUTO_MODEL, policy)).toBe("fast/model");
    expect(resolveModel("planner", AUTO_MODEL, policy)).toBe("strong/model");
  });

  it("undefined scope inherits the policy tier", () => {
    expect(resolveModel("executor", undefined, policy)).toBe("fast/model");
  });

  it("empty policy resolves to engine auto (undefined)", () => {
    expect(resolveModel("executor", undefined, DEFAULT_POLICY)).toBeUndefined();
    expect(resolveModel("planner", AUTO_MODEL, DEFAULT_POLICY)).toBeUndefined();
    expect(resolveModel("executor", "explicit/model", DEFAULT_POLICY)).toBe("explicit/model");
  });

  it("auto-valued policy tiers resolve to engine auto", () => {
    expect(
      resolveModel("planner", undefined, { planner: AUTO_MODEL, executor: AUTO_MODEL }),
    ).toBeUndefined();
  });
});

function model(overrides: Partial<EngineModel>): EngineModel {
  return {
    id: "mock/m",
    object: "model",
    created: 0,
    owned_by: "mock",
    capability: "chat",
    status: "hot",
    context_window: 8192,
    cost_tier: "low",
    ...overrides,
  };
}

describe("suggestTiers", () => {
  it("cloud large-context models are strong; local/free are fast", () => {
    const tiers = suggestTiers([
      model({ id: "cloud/big", owned_by: "deepseek", context_window: 64000 }),
      model({ id: "local/qwen", owned_by: "ollama", cost_tier: "free" }),
      model({ id: "cloud/small", owned_by: "zhipu", context_window: 8192 }),
    ]);
    expect(tiers.strong.map((m) => m.id)).toEqual(["cloud/big"]);
    expect(tiers.fast.map((m) => m.id).sort()).toEqual(["cloud/small", "local/qwen"]);
  });

  it("all-local setups promote the largest-context model to strong", () => {
    const tiers = suggestTiers([
      model({ id: "local/32k", owned_by: "ollama", context_window: 32000, cost_tier: "free" }),
      model({ id: "local/8k", owned_by: "ollama", context_window: 8192, cost_tier: "free" }),
    ]);
    expect(tiers.strong.map((m) => m.id)).toEqual(["local/32k"]);
    expect(tiers.fast.map((m) => m.id)).toEqual(["local/8k"]);
  });

  it("empty model lists yield empty tiers", () => {
    expect(suggestTiers([])).toEqual({ strong: [], fast: [] });
  });
});
