/**
 * Inspiration gallery (TASK-21 M2 slice): curated case bundles — a case
 * carries everything needed to 做同款 (route + params, or a flow template
 * reference) plus its capability requirements for dependency detection.
 */

import type { EngineModel } from "./engine";
import { BUILTIN_TEMPLATES } from "./flowTemplates";

export type InspirationKind = "writing" | "image" | "flow";

export interface InspirationCase {
  id: string;
  title: string;
  description: string;
  kind: InspirationKind;
  icon: string;
  /** Engine capabilities required (chat / image_gen). */
  requires: string[];
  /** 做同款 target: route + query params consumed by the page. */
  target: { route: string; params: Record<string, string> };
}

export const INSPIRATION_KINDS: Array<{ value: InspirationKind | "all"; label: string }> = [
  { value: "all", label: "全部" },
  { value: "image", label: "生图" },
  { value: "writing", label: "写作" },
  { value: "flow", label: "工作流" },
];

export const INSPIRATION_CASES: InspirationCase[] = [
  {
    id: "case-cat-avatar",
    title: "橘猫程序员头像",
    description: "一句话生成卡通头像，四张候选择优",
    kind: "image",
    icon: "🐱",
    requires: ["image_gen"],
    target: {
      route: "/creation/image-gen",
      params: { prompt: "卡通风格戴眼镜的橘猫程序员头像，温暖色调", size: "1024x1024", run: "1" },
    },
  },
  {
    id: "case-xhs-cover",
    title: "小红书封面（3:4）",
    description: "露营主题竖版封面，直接可发",
    kind: "image",
    icon: "🖼️",
    requires: ["image_gen"],
    target: {
      route: "/creation/image-gen",
      params: { prompt: "周末露营封面，格子野餐布上咖啡与面包，阳光树林", size: "768x1024", run: "1" },
    },
  },
  {
    id: "case-xhs-copy",
    title: "小红书种草文案",
    description: "输入主题，30 秒出一篇带 emoji 的种草文",
    kind: "writing",
    icon: "📝",
    requires: ["chat"],
    target: {
      route: "/creation/writing",
      params: { genre: "xiaohongshu", topic: "新手露营装备怎么选", run: "1" },
    },
  },
  {
    id: "case-script",
    title: "60 秒短视频脚本",
    description: "分镜+口播+字幕的完整脚本",
    kind: "writing",
    icon: "🎬",
    requires: ["chat"],
    target: {
      route: "/creation/writing",
      params: { genre: "script", topic: "一分钟教你挑西瓜", run: "1" },
    },
  },
  {
    id: "case-review",
    title: "产品测评报告",
    description: "维度评分表+结论的测评体",
    kind: "writing",
    icon: "📊",
    requires: ["chat"],
    target: {
      route: "/creation/writing",
      params: { genre: "review", topic: "入门投影仪怎么选", run: "1" },
    },
  },
  {
    id: "case-platform-flow",
    title: "一稿多发 · 三平台尺寸",
    description: "工作流：一个提示词同时出三平台尺寸封面",
    kind: "flow",
    icon: "⚙️",
    requires: ["image_gen"],
    target: { route: "/flow", params: { template: "platform-sizes" } },
  },
  {
    id: "case-polish-flow",
    title: "LLM 润色再生图",
    description: "工作流：想法→专业提示词→成图",
    kind: "flow",
    icon: "✨",
    requires: ["chat", "image_gen"],
    target: { route: "/flow", params: { template: "t2i-polished" } },
  },
  {
    id: "case-avatar-flow",
    title: "头像四连拍流水线",
    description: "工作流：一次生成四张同题头像",
    kind: "flow",
    icon: "👥",
    requires: ["image_gen"],
    target: { route: "/flow", params: { template: "avatar-pack" } },
  },
];

/** Kind filter for the gallery. */
export function filterCases(
  cases: InspirationCase[],
  kind: InspirationKind | "all",
): InspirationCase[] {
  return kind === "all" ? cases : cases.filter((c) => c.kind === kind);
}

/** Capabilities the engine cannot currently serve for this case. */
export function missingCaseDependencies(
  case_: InspirationCase,
  models: EngineModel[],
): string[] {
  return case_.requires.filter(
    (capability) => !models.some((m) => m.capability === capability),
  );
}

/** Resolve a flow-kind case to its template (for the canvas autoload). */
export function templateForCase(case_: InspirationCase) {
  if (case_.kind !== "flow") return undefined;
  const id = case_.target.params.template;
  return BUILTIN_TEMPLATES.find((t) => t.id === id);
}

/** Navigate target for 做同款. */
export function caseHref(case_: InspirationCase): string {
  const search = new URLSearchParams(case_.target.params).toString();
  return `${case_.target.route}${search ? `?${search}` : ""}`;
}
