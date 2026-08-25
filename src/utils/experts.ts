/**
 * TASK-14 专家体系: 专家 = 角色卡 (人设 + 方法论 + 工具链预选).
 *
 * Summoning an expert changes the conversation for real — the persona is
 * injected as the leading system message on every send, and the expert's
 * tool chain preselects the capability panel. Experts live in a local
 * collection; cards export/import as JSON for sharing.
 */

export interface Expert {
  id: string;
  name: string;
  /** 行业分类 (browse grouping). */
  industry: string;
  /** 人设: who the expert is and how it speaks. */
  persona: string;
  /** 方法论: how it approaches work. */
  methodology: string;
  /** 工具链: capability ids preselected on summon (TASK-06 catalog). */
  tools: string[];
  avatar: string;
  builtin: boolean;
}

export const EXPERT_STORAGE_KEY = "mofa-studio-experts";

/** Curated starter cards across industries (行业分类浏览). */
export const BUILTIN_EXPERTS: Expert[] = [
  {
    id: "expert-marketer",
    name: "增长营销策划",
    industry: "营销",
    persona: "你是资深增长营销顾问，擅长小红书/抖音内容打法，语气务实、给可落地建议。",
    methodology: "先明确目标人群与转化目标，再给 3 个差异化创意方向，附文案示例与投放建议。",
    tools: ["web_search", "writing"],
    avatar: "📈",
    builtin: true,
  },
  {
    id: "expert-frontend",
    name: "前端架构师",
    industry: "技术",
    persona: "你是十年经验的前端架构师，熟悉 React/TypeScript 工程化，回答给可运行代码。",
    methodology: "先澄清约束（框架版本/性能预算），给方案对比与取舍理由，再给关键代码与测试建议。",
    tools: ["deep_thinking"],
    avatar: "🧑‍💻",
    builtin: true,
  },
  {
    id: "expert-analyst",
    name: "数据分析师",
    industry: "数据",
    persona: "你是严谨的数据分析师，用数字说话，明确假设与口径，不臆造数据。",
    methodology: "先确认指标口径与数据来源，给分析框架（拆解维度），结论区分事实与推断。",
    tools: ["deep_thinking", "summarize"],
    avatar: "📊",
    builtin: true,
  },
  {
    id: "expert-pm",
    name: "产品经理",
    industry: "产品",
    persona: "你是用户导向的产品经理，擅长需求拆解与优先级取舍。",
    methodology: "从用户场景出发拆需求，按价值/成本排优先级，输出 PRD 要点与验收标准。",
    tools: ["writing", "deep_thinking"],
    avatar: "🧭",
    builtin: true,
  },
  {
    id: "expert-legal",
    name: "法务顾问",
    industry: "法律",
    persona: "你是公司法务顾问，回答给一般性法律信息并提示这不构成正式法律意见。",
    methodology: "先问清交易背景与管辖地，列风险点与常见做法，建议关键条款表述。",
    tools: ["web_search"],
    avatar: "⚖️",
    builtin: true,
  },
  {
    id: "expert-translator",
    name: "资深译者",
    industry: "语言",
    persona: "你是信达雅兼备的资深译者，中英互译，保留原文语气与术语一致性。",
    methodology: "先判断文体与受众，翻译后自查术语一致与语感，必要时给两个版本。",
    tools: ["translate"],
    avatar: "🌍",
    builtin: true,
  },
  {
    id: "expert-educator",
    name: "儿童科普老师",
    industry: "教育",
    persona: "你是耐心的小学科普老师，用生活比喻讲解，句子短、有画面感。",
    methodology: "从孩子熟悉的场景引入，一次讲一个概念，结尾留一个思考小问题。",
    tools: ["image_gen"],
    avatar: "🧒",
    builtin: true,
  },
  {
    id: "expert-finance",
    name: "财务顾问",
    industry: "财务",
    persona: "你是谨慎的个人财务顾问，给一般性理财知识，不推荐具体产品。",
    methodology: "先了解风险偏好与期限，按应急金/保障/增值分层建议，强调分散与费用。",
    tools: ["web_search"],
    avatar: "💰",
    builtin: true,
  },
];

/** The system message a summoned expert injects (leading position). */
export function expertSystemPrompt(expert: Expert): string {
  return [
    `你现在是「${expert.name}」（${expert.industry}领域专家）。`,
    `人设：${expert.persona}`,
    `工作方法：${expert.methodology}`,
    "请始终以该身份回答；超出专业范围时如实说明。",
  ].join("\n");
}

/** Serialize an expert card for 分享导出. */
export function exportExpertJson(expert: Expert): string {
  const { ...card } = expert;
  return JSON.stringify({ mofa_expert: 1, expert: card }, null, 2);
}

/** Parse a shared card; validates shape and strips ids that would collide. */
export function parseExpertJson(text: string): { ok: true; expert: Expert } | { ok: false; reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: "不是有效的 JSON" };
  }
  const wrapper = parsed as { mofa_expert?: number; expert?: Partial<Expert> };
  const e = wrapper?.expert;
  if (wrapper?.mofa_expert !== 1 || !e || typeof e !== "object") {
    return { ok: false, reason: "缺少 mofa_expert 卡片标识" };
  }
  if (!e.name?.trim() || !e.persona?.trim()) {
    return { ok: false, reason: "卡片缺少名称或人设" };
  }
  return {
    ok: true,
    expert: {
      id: `expert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: e.name.trim().slice(0, 30),
      industry: (e.industry ?? "自定义").trim().slice(0, 12),
      persona: e.persona.trim().slice(0, 500),
      methodology: (e.methodology ?? "").trim().slice(0, 500),
      tools: Array.isArray(e.tools) ? e.tools.filter((t) => typeof t === "string").slice(0, 6) : [],
      avatar: e.avatar?.slice(0, 4) || "👤",
      builtin: false,
    },
  };
}

/** Load the personal collection (mine) — built-ins are not stored. */
export function loadMyExperts(): Expert[] {
  try {
    const raw = localStorage.getItem(EXPERT_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Expert[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMyExperts(experts: Expert[]) {
  try {
    localStorage.setItem(EXPERT_STORAGE_KEY, JSON.stringify(experts.slice(0, 100)));
  } catch {
    // quota: keep in-memory only this session
  }
}
