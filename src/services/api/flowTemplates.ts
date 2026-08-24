/**
 * Built-in workflow templates (FLOW-07): ten official v1 templates as
 * mofa-flow envelopes, plus dependency detection — loading a template
 * checks the engine's live capabilities and reports what's missing so the
 * UI can guide the user to setup (ONBOARD-02 / FLOW-05).
 */

import type { FlowGraphPayload, FlowNodeKind } from "./flow";
import type { EngineModel } from "./engine";

export interface FlowTemplate {
  id: string;
  title: string;
  description: string;
  category: "图像" | "文本" | "多模态" | "批量";
  /** Node kinds the template needs beyond pure nodes. */
  requires: FlowNodeKind[];
  graph: FlowGraphPayload;
}

/** Capabilities a template's `requires` maps onto engine models. */
const CAPABILITY_BY_KIND: Partial<Record<FlowNodeKind, string>> = {
  llm_text: "chat",
  image_gen: "image_gen",
};

function chain(
  entries: Array<{ id: string; type: FlowNodeKind; params?: Record<string, unknown> }>,
  links: Array<[string, string]>,
): FlowGraphPayload {
  return {
    nodes: entries.map((e) => ({ id: e.id, type: e.type, params: e.params ?? {} })),
    edges: links.map(([from, to]) => ({ from, to })),
  };
}

export const BUILTIN_TEMPLATES: FlowTemplate[] = [
  {
    id: "t2i-basic",
    title: "文生图 · 基础链路",
    description: "提示词 → 图像生成 → 输出，最小心智的五件套起点",
    category: "图像",
    requires: ["image_gen"],
    graph: chain(
      [
        { id: "prompt", type: "prompt_text", params: { text: "一只橘猫坐在洒满阳光的窗台上" } },
        { id: "gen", type: "image_gen", params: { size: "1024x1024" } },
        { id: "out", type: "output" },
      ],
      [
        ["prompt", "gen"],
        ["gen", "out"],
      ],
    ),
  },
  {
    id: "t2i-polished",
    title: "文生图 · LLM 润色提示词",
    description: "先让 LLM 把想法扩写成专业提示词，再生图",
    category: "图像",
    requires: ["llm_text", "image_gen"],
    graph: chain(
      [
        { id: "idea", type: "prompt_text", params: { text: "海边日落，孤独的灯塔" } },
        { id: "polish", type: "llm_text", params: {} },
        { id: "gen", type: "image_gen", params: { size: "1024x1024" } },
        { id: "out", type: "output" },
      ],
      [
        ["idea", "polish"],
        ["polish", "gen"],
        ["gen", "out"],
      ],
    ),
  },
  {
    id: "platform-sizes",
    title: "一稿多发 · 平台尺寸适配",
    description: "一个提示词同时产出小红书 3:4 / 抖音 9:16 / B站 16:9",
    category: "批量",
    requires: ["image_gen"],
    graph: chain(
      [
        { id: "prompt", type: "prompt_text", params: { text: "周末露营主题封面" } },
        { id: "xhs", type: "image_gen", params: { size: "768x1024" } },
        { id: "dy", type: "image_gen", params: { size: "720x1280" } },
        { id: "bili", type: "image_gen", params: { size: "1280x720" } },
        { id: "out", type: "output" },
      ],
      [
        ["prompt", "xhs"],
        ["prompt", "dy"],
        ["prompt", "bili"],
        ["xhs", "out"],
      ],
    ),
  },
  {
    id: "style-variants",
    title: "风格变体 · 三画风对比",
    description: "同一主体出写实/插画/像素三种画风，择优使用",
    category: "批量",
    requires: ["image_gen"],
    graph: chain(
      [
        { id: "prompt", type: "prompt_text", params: { text: "山间小屋" } },
        { id: "realistic", type: "image_gen", params: { size: "1024x1024" } },
        { id: "illustration", type: "image_gen", params: { size: "1024x1024" } },
        { id: "pixel", type: "image_gen", params: { size: "1024x1024" } },
      ],
      [
        ["prompt", "realistic"],
        ["prompt", "illustration"],
        ["prompt", "pixel"],
      ],
    ),
  },
  {
    id: "copy-xhs",
    title: "小红书文案流水线",
    description: "主题 → 种草文案 → 摘要标题",
    category: "文本",
    requires: ["llm_text"],
    graph: chain(
      [
        { id: "topic", type: "prompt_text", params: { text: "新手露营装备怎么选" } },
        { id: "body", type: "llm_text", params: {} },
        { id: "title", type: "llm_text", params: {} },
        { id: "out", type: "output" },
      ],
      [
        ["topic", "body"],
        ["body", "title"],
        ["title", "out"],
      ],
    ),
  },
  {
    id: "script-with-art",
    title: "短视频脚本 + 封面图",
    description: "一条链同时产出分镜脚本与配套封面",
    category: "多模态",
    requires: ["llm_text", "image_gen"],
    graph: chain(
      [
        { id: "idea", type: "prompt_text", params: { text: "一分钟教你挑西瓜" } },
        { id: "script", type: "llm_text", params: {} },
        { id: "cover", type: "image_gen", params: { size: "768x1024" } },
        { id: "out", type: "output" },
      ],
      [
        ["idea", "script"],
        ["script", "cover"],
        ["cover", "out"],
      ],
    ),
  },
  {
    id: "rewrite-loop",
    title: "长文改写 · 双轮打磨",
    description: "初稿 → 精简 → 润色，两轮 LLM 处理长文",
    category: "文本",
    requires: ["llm_text"],
    graph: chain(
      [
        { id: "source", type: "prompt_text", params: { text: "粘贴需要改写的长文…" } },
        { id: "shrink", type: "llm_text", params: {} },
        { id: "polish", type: "llm_text", params: {} },
        { id: "out", type: "output" },
      ],
      [
        ["source", "shrink"],
        ["shrink", "polish"],
        ["polish", "out"],
      ],
    ),
  },
  {
    id: "avatar-pack",
    title: "头像四连拍",
    description: "一次生成四张同题头像候选",
    category: "图像",
    requires: ["image_gen"],
    graph: chain(
      [
        { id: "prompt", type: "prompt_text", params: { text: "卡通风格戴眼镜的猫程序员头像" } },
        { id: "gen", type: "image_gen", params: { size: "1024x1024", n: 4 } },
        { id: "out", type: "output" },
      ],
      [
        ["prompt", "gen"],
        ["gen", "out"],
      ],
    ),
  },
  {
    id: "cover-copy-pair",
    title: "图文成对 · 封面+文案",
    description: "同一主题分别生成封面图与正文文案",
    category: "多模态",
    requires: ["llm_text", "image_gen"],
    graph: chain(
      [
        { id: "topic", type: "prompt_text", params: { text: "秋天的第一杯奶茶" } },
        { id: "copy", type: "llm_text", params: {} },
        { id: "image", type: "image_gen", params: { size: "768x1024" } },
        { id: "out", type: "output" },
      ],
      [
        ["topic", "copy"],
        ["topic", "image"],
        ["image", "out"],
      ],
    ),
  },
  {
    id: "param-sweep",
    title: "参数扫描 · 尺寸对比",
    description: "同一提示词扫三种尺寸，对比构图差异",
    category: "批量",
    requires: ["image_gen"],
    graph: chain(
      [
        { id: "prompt", type: "prompt_text", params: { text: "未来城市天际线，赛博朋克" } },
        { id: "wide", type: "image_gen", params: { size: "1280x720" } },
        { id: "tall", type: "image_gen", params: { size: "720x1280" } },
        { id: "mid", type: "image_gen", params: { size: "1024x1024" } },
      ],
      [
        ["prompt", "wide"],
        ["prompt", "tall"],
        ["prompt", "mid"],
      ],
    ),
  },
];

/**
 * Which of a template's requirements the engine cannot currently serve.
 * Empty = ready to run; otherwise the UI guides setup (key wizard for
 * cloud chat/image models, or Ollama for local).
 */
export function missingDependencies(
  template: FlowTemplate,
  models: EngineModel[],
): FlowNodeKind[] {
  const missing: FlowNodeKind[] = [];
  for (const kind of template.requires) {
    const capability = CAPABILITY_BY_KIND[kind];
    if (!capability) continue;
    const served = models.some((m) => m.capability === capability);
    if (!served) missing.push(kind);
  }
  return missing;
}

/** Setup hint for a missing node kind (联动 ONBOARD-02 / FLOW-05). */
export function dependencyHint(missing: FlowNodeKind[]): string {
  if (missing.includes("image_gen") && missing.includes("llm_text")) {
    return "需要配置对话与图像模型：完成 Key 配置后即可运行";
  }
  if (missing.includes("image_gen")) {
    return "需要 image_gen 模型：在 Key 配置中添加图像厂商（如通义万相 / gpt-image）";
  }
  if (missing.includes("llm_text")) {
    return "需要对话模型：完成 Key 配置或启动本地 Ollama";
  }
  return "";
}
