/**
 * TASK-10 任务级工具作用域 + TASK-11 同质工具冲突消歧.
 *
 * 作用域: a conversation can pin the usable tool set (注意力稀释防护) —
 * slash commands outside the scope disappear from the palette, and the
 * capability panel only offers scoped capabilities. The default scope comes
 * from the TASK-06 intent router's preselect.
 *
 * 消歧: when several tools claim the same capability, resolve by
 * 用户历史偏好 > 显式询问 > 默认标记并记录 — never silently guess.
 */

import type { SlashCommand } from "./slashCommands";
import { CAPABILITIES, defaultPreselect, type CapabilityId } from "./intentRouter";

/** A conversation's pinned tool scope; null = unrestricted. */
export type ToolScope = CapabilityId[] | null;

/** The scope a new conversation starts with: intent preselect (≤2, readable). */
export function defaultScope(firstMessage: string): ToolScope {
  if (!firstMessage.trim()) return null;
  const preselect = defaultPreselect(firstMessage, 2);
  return preselect.length > 0 ? preselect : null;
}

/** Map a slash command onto the capability it serves (by name convention). */
const COMMAND_TO_CAPABILITY: Record<string, CapabilityId> = {
  翻译: "translate",
  总结: "summarize",
  润色: "writing",
  小红书: "writing",
};

/** Palette filtering: commands outside the scope vanish (TASK-10). */
export function filterCommandsByScope(
  commands: SlashCommand[],
  scope: ToolScope,
): SlashCommand[] {
  if (scope === null) return commands;
  const allowed = new Set(scope);
  return commands.filter((command) => {
    const capability = COMMAND_TO_CAPABILITY[command.name];
    return capability === undefined || allowed.has(capability);
  });
}

/** The capability panel only offers scoped capabilities (TASK-10). */
export function capabilitiesInScope(scope: ToolScope): CapabilityId[] {
  if (scope === null) return CAPABILITIES.map((c) => c.id);
  const allowed = new Set(scope);
  return CAPABILITIES.filter((c) => allowed.has(c.id)).map((c) => c.id);
}

// ==================== TASK-11 消歧 ====================

export interface ToolCandidate {
  id: string;
  name: string;
  /** The capability several tools claim, e.g. "web_search". */
  capability: string;
}

export interface DisambiguationPreferences {
  /** capability → preferred tool id, from the user's past explicit choices. */
  [capability: string]: string;
}

export type Disambiguation =
  /** 历史偏好命中. */
  | { action: "use"; toolId: string; reason: "preference" }
  /** 需要显式询问（多候选且无偏好）. */
  | { action: "ask"; candidates: ToolCandidate[] }
  /** 单候选或无冲突，直接用并记录. */
  | { action: "use"; toolId: string; reason: "only" | "default" };

/**
 * Resolve which tool serves a capability when several claim it:
 * preference > ask > default (first, recorded).
 */
export function disambiguateTools(
  candidates: ToolCandidate[],
  preferences: DisambiguationPreferences,
): Disambiguation {
  if (candidates.length === 0) {
    throw new Error("disambiguateTools requires at least one candidate");
  }
  if (candidates.length === 1) {
    return { action: "use", toolId: candidates[0].id, reason: "only" };
  }
  // Group by capability — conflicts are per-capability.
  const byCapability = new Map<string, ToolCandidate[]>();
  for (const candidate of candidates) {
    (byCapability.get(candidate.capability) ?? byCapability.set(candidate.capability, []).get(candidate.capability)!).push(candidate);
  }
  const conflicting = [...byCapability.values()].find((list) => list.length > 1);
  if (!conflicting) {
    return { action: "use", toolId: candidates[0].id, reason: "default" };
  }
  const preferred = preferences[conflicting[0].capability];
  if (preferred && conflicting.some((c) => c.id === preferred)) {
    return { action: "use", toolId: preferred, reason: "preference" };
  }
  // No recorded preference: surface the choice instead of guessing.
  return { action: "ask", candidates: conflicting };
}

/** Record an explicit choice so future conflicts resolve by preference. */
export function recordPreference(
  preferences: DisambiguationPreferences,
  capability: string,
  toolId: string,
): DisambiguationPreferences {
  return { ...preferences, [capability]: toolId };
}

const SCOPE_STORAGE = "mofa-studio-tool-preferences";

export function loadPreferences(): DisambiguationPreferences {
  try {
    const raw = localStorage.getItem(SCOPE_STORAGE);
    const parsed = raw ? (JSON.parse(raw) as DisambiguationPreferences) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function savePreferences(preferences: DisambiguationPreferences) {
  try {
    localStorage.setItem(SCOPE_STORAGE, JSON.stringify(preferences));
  } catch {
    // quota: session-only
  }
}
