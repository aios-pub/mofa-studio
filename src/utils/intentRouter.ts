/**
 * TASK-06 路由 v1: rule-based intent classification → 能力面板预选.
 *
 * As the user types, `suggestSelection` ranks capabilities by keyword
 * evidence and preselects them in the composer's capability panel. Every
 * cataloged capability maps to a REAL behavior — an existing composer
 * toggle, a slash command (CHAT-09), or the image/video intent routes
 * (CHAT-05/06) — so a checked box always changes what actually happens on
 * send. This is v1 (rules); v2 (TASK-07) layers LLM-assisted classification
 * and Skill retrieval on top.
 */

/** Capabilities the panel can preselect. */
export type CapabilityId =
  | "web_search"
  | "deep_thinking"
  | "image_gen"
  | "video_gen"
  | "translate"
  | "summarize"
  | "writing";

/** How a checked capability takes effect on the next send. */
export type CapabilityAction =
  /** Flips an existing composer toggle (webSearch / deepThinking). */
  | { kind: "toggle"; key: "web_search" | "deep_thinking" }
  /** Forces a gateway route already implemented in the send pipeline. */
  | { kind: "route"; target: "image" | "video" }
  /** Prefixes the send with a registered slash command (CHAT-09). */
  | { kind: "slash"; command: string };

export interface Capability {
  id: CapabilityId;
  label: string;
  hint: string;
  action: CapabilityAction;
}

/** The catalog: every entry must have a real, implemented behavior. */
export const CAPABILITIES: Capability[] = [
  {
    id: "web_search",
    label: "联网搜索",
    hint: "先检索再作答，附引用来源",
    action: { kind: "toggle", key: "web_search" },
  },
  {
    id: "deep_thinking",
    label: "深度思考",
    hint: "请求推理链路，适合分析与论证",
    action: { kind: "toggle", key: "deep_thinking" },
  },
  {
    id: "image_gen",
    label: "图像生成",
    hint: "本次发送走生图路由",
    action: { kind: "route", target: "image" },
  },
  {
    id: "video_gen",
    label: "视频生成",
    hint: "本次发送走视频任务路由",
    action: { kind: "route", target: "video" },
  },
  {
    id: "translate",
    label: "翻译",
    hint: "套用 /翻译 模板",
    action: { kind: "slash", command: "翻译" },
  },
  {
    id: "summarize",
    label: "总结",
    hint: "套用 /总结 模板",
    action: { kind: "slash", command: "总结" },
  },
  {
    id: "writing",
    label: "写作",
    hint: "套用 /润色 模板",
    action: { kind: "slash", command: "润色" },
  },
];

/** Keyword evidence per capability; more hits = stronger intent. */
const RULES: Array<{ id: CapabilityId; keywords: string[] }> = [
  {
    id: "web_search",
    keywords: ["最新", "新闻", "今天", "最近", "查一下", "搜索", "现在", "行情", "发布"],
  },
  {
    id: "deep_thinking",
    keywords: ["为什么", "分析", "原因", "证明", "推导", "比较", "优劣", "方案", "权衡", "怎么选"],
  },
  { id: "image_gen", keywords: ["画", "生成图", "图片", "插画", "海报", "照片", "设计图", "头像"] },
  { id: "video_gen", keywords: ["视频", "动画", "短片", "成片", "vlog"] },
  { id: "translate", keywords: ["翻译", "译成", "英文版", "中文版", "怎么说"] },
  { id: "summarize", keywords: ["总结", "摘要", "要点", "归纳", "概括", "TLDR"] },
  { id: "writing", keywords: ["写", "文案", "邮件", "大纲", "润色", "改写", "续写", "扩写"] },
];

/**
 * Rank capabilities for the input text. Returns ids sorted by evidence
 * strength (hit count, then catalog order); empty text or no evidence → []
 * (plain chat, nothing preselected).
 */
export function suggestSelection(text: string): CapabilityId[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const scores = new Map<CapabilityId, number>();
  for (const rule of RULES) {
    let hits = 0;
    for (const keyword of rule.keywords) {
      if (trimmed.includes(keyword)) hits += 1;
    }
    if (hits > 0) scores.set(rule.id, hits);
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

/**
 * The panel's default selection: the top-ranked suggestions, capped so the
 * preselect stays readable. Weak single-hit writing hints are dropped when a
 * stronger specialized intent leads.
 */
export function defaultPreselect(text: string, cap = 3): CapabilityId[] {
  const ranked = suggestSelection(text);
  return ranked.slice(0, cap);
}
