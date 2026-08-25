/**
 * Progressive disclosure engine (ONBOARD-04): contextual guidance cards
 * fired when the user hits a capability boundary — 「灵感→Skill→连接器→
 * 专家→专家团」. Cards are inline (no modals), dismissible forever, and
 * each fires at most once per profile unless re-armed.
 */

export type GuidanceId =
  | "first-output-skill" // 灵感 → Skill: produced something, teach reuse
  | "search-unconfigured-connector" // 联网开关但搜索未配置 → 连接器
  | "image-model-missing-connector" // 生图缺模型 → 连接器（Key 向导）
  | "rerun-often-expert" // 反复重跑同参数 → 专家（分层路由）
  | "branch-many-experts" // 多次分支会话 → 专家团提示（远期）
  ;

export interface Guidance {
  id: GuidanceId;
  stage: "灵感" | "Skill" | "连接器" | "专家" | "专家团";
  title: string;
  body: string;
  /** Route to open when the user follows the card. */
  action: { label: string; route: string };
}

export const GUIDANCES: Record<GuidanceId, Guidance> = {
  "first-output-skill": {
    id: "first-output-skill",
    stage: "Skill",
    title: "把这次的做法存成快捷指令",
    body: "在对话输入「/」即可管理和使用指令模板——下次一句话复用同样的效果。",
    action: { label: "了解指令", route: "/conversation" },
  },
  "search-unconfigured-connector": {
    id: "search-unconfigured-connector",
    stage: "连接器",
    title: "联网搜索需要一个搜索源",
    body: "配置一次搜索 API Key（Tavily / 博查 / 智谱），「联网」开关即可引用真实来源。",
    action: { label: "去配置搜索", route: "/onboarding/key" },
  },
  "image-model-missing-connector": {
    id: "image-model-missing-connector",
    stage: "连接器",
    title: "生图还缺一个图像模型",
    body: "在 Key 配置中添加图像厂商（如通义万相 / gpt-image），生图与工作流即可出图。",
    action: { label: "去配置模型", route: "/onboarding/key" },
  },
  "rerun-often-expert": {
    id: "rerun-often-expert",
    stage: "专家",
    title: "反复重跑？试试分层路由",
    body: "规划用强模型、执行用快模型——在 Key 配置页设置一次，全局生效且各会话可单独覆盖。",
    action: { label: "设置分层路由", route: "/onboarding/key" },
  },
  "branch-many-experts": {
    id: "branch-many-experts",
    stage: "专家团",
    title: "多分支对比，期待专家团",
    body: "你已在用分支探索方案。多专家并行评审的「专家团」将在任务工作台中登场。",
    action: { label: "查看任务", route: "/" },
  },
};

/** Delivery order per the PRD funnel (灵感→Skill→连接器→专家→专家团). */
export const STAGE_ORDER: Guidance["stage"][] = ["灵感", "Skill", "连接器", "专家", "专家团"];

const DISMISS_KEY = "mofa-studio-guidance-dismissed";
const SHOWN_KEY = "mofa-studio-guidance-shown";

function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, ids: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // Storage unavailable: guidance state lives for this session.
  }
}

export function isDismissed(id: GuidanceId): boolean {
  return readSet(DISMISS_KEY).has(id);
}

/** Dismiss a card forever (永久关闭，不弹窗打断). */
export function dismissGuidance(id: GuidanceId): void {
  const set = readSet(DISMISS_KEY);
  set.add(id);
  writeSet(DISMISS_KEY, set);
}

/** Whether a guidance has already fired once (at-most-once per profile). */
export function hasFired(id: GuidanceId): boolean {
  return readSet(SHOWN_KEY).has(id);
}

/**
 * Fire a guidance at most once: returns the card if it should show now,
 * null if already fired or dismissed. Marks it fired.
 */
export function fireGuidance(id: GuidanceId): Guidance | null {
  if (isDismissed(id) || hasFired(id)) return null;
  const shown = readSet(SHOWN_KEY);
  shown.add(id);
  writeSet(SHOWN_KEY, shown);
  return GUIDANCES[id];
}

/**
 * Trigger evaluation (pure): map observed app events to the guidance id
 * that should fire, honoring the funnel order — a later-stage trigger is
 * skipped while an earlier stage has never fired.
 */
export function evaluateTrigger(event: {
  kind:
    | "first-output"
    | "search-failed-unconfigured"
    | "image-model-missing"
    | "third-regenerate"
    | "third-branch";
  hasOutput: boolean;
  searchConfigured: boolean;
  imageModelAvailable: boolean;
}): GuidanceId | null {
  switch (event.kind) {
    case "first-output":
      return "first-output-skill";
    case "search-failed-unconfigured":
      return event.searchConfigured ? null : "search-unconfigured-connector";
    case "image-model-missing":
      return event.imageModelAvailable ? null : "image-model-missing-connector";
    case "third-regenerate":
      return "rerun-often-expert";
    case "third-branch":
      return "branch-many-experts";
  }
}
