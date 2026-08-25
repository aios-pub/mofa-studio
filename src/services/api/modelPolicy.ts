/**
 * Tiered model routing policy (PLAT-03): plan-strong / execute-fast
 * defaults with per-conversation overrides. Resolution order:
 * scope override → policy tier → undefined (engine auto-route).
 */

import { AUTO_MODEL, engineService, type EngineModel } from "./engine";

const POLICY_KEY = "mofa-studio-model-policy";

export type RoutingRole = "planner" | "executor";

export interface ModelRoutingPolicy {
  /** Strong model for planning/writing/outline work; empty = auto. */
  planner: string;
  /** Fast model for chat execution/tool steps; empty = auto. */
  executor: string;
}

export const DEFAULT_POLICY: ModelRoutingPolicy = {
  planner: "",
  executor: "",
};

export function loadPolicy(): ModelRoutingPolicy {
  try {
    const raw = localStorage.getItem(POLICY_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<ModelRoutingPolicy>) : null;
    return {
      planner: typeof parsed?.planner === "string" ? parsed.planner : "",
      executor: typeof parsed?.executor === "string" ? parsed.executor : "",
    };
  } catch {
    return DEFAULT_POLICY;
  }
}

export function savePolicy(policy: ModelRoutingPolicy): void {
  try {
    localStorage.setItem(POLICY_KEY, JSON.stringify(policy));
  } catch {
    // Storage unavailable: policy lives for this session only.
  }
}

/**
 * Resolve the effective model for a role (PLAT-03 任务级手动切换):
 * an explicit scope override (conversation picker) wins; otherwise the
 * policy tier; otherwise undefined = engine auto-route.
 */
export function resolveModel(
  role: RoutingRole,
  scopeOverride: string | undefined,
  policy: ModelRoutingPolicy = loadPolicy(),
): string | undefined {
  if (scopeOverride && scopeOverride !== AUTO_MODEL) return scopeOverride;
  const tier = policy[role];
  return tier && tier !== AUTO_MODEL ? tier : undefined;
}

/** Classify available chat models into strong/fast suggestions. */
export function suggestTiers(models: EngineModel[]): {
  strong: EngineModel[];
  fast: EngineModel[];
} {
  const chat = models.filter(
    (m) => !m.capability || m.capability === "chat" || m.capability === "vlm",
  );
  // Heuristic: remote cloud models with larger context rank as "strong";
  // local (owned_by suggests ollama/local) or small-context rank as "fast".
  const strong: EngineModel[] = [];
  const fast: EngineModel[] = [];
  for (const model of chat) {
    const isLocal =
      model.owned_by.includes("ollama") || model.cost_tier === "free";
    const bigContext = (model.context_window ?? 0) >= 32000;
    if (!isLocal && bigContext) strong.push(model);
    else fast.push(model);
  }
  // Nothing classified strong (all-local): the largest-context local model
  // is the honest strong suggestion.
  if (strong.length === 0 && chat.length > 0) {
    const largest = [...chat].sort(
      (a, b) => (b.context_window ?? 0) - (a.context_window ?? 0),
    )[0];
    return { strong: [largest], fast: chat.filter((m) => m.id !== largest.id) };
  }
  return { strong, fast };
}
