/**
 * AI writing service (TOOL-06): genre templates, draft generation, and
 * selection transforms (续写/改写/扩写/缩写) over the chat streaming link.
 * Markdown is the source format throughout.
 */

import { chatService } from "./chat";

/** Writing genres with platform-aware constraints. */
export interface GenreTemplate {
  id: string;
  label: string;
  /** Rough target length in Chinese characters. */
  targetLength: number;
  /** Platform limit hint for the word counter. */
  limitHint: string;
  systemPrompt: string;
}

export const GENRE_TEMPLATES: GenreTemplate[] = [
  {
    id: "xiaohongshu",
    label: "小红书文案",
    targetLength: 300,
    limitHint: "小红书正文上限 1000 字，爆款多在 300 字左右",
    systemPrompt:
      "你是一位小红书爆款文案作者。按以下要求写作：\n" +
      "- 开头 1 句抓人钩子（痛点/反差/数字）\n" +
      "- 正文用短段落 + emoji 点缀，每段一个要点\n" +
      "- 结尾给互动引导（提问或收藏提示）\n" +
      "- 全文使用口语化中文，避免书面腔\n" +
      "输出 Markdown，不要标题号，直接给正文。",
  },
  {
    id: "wechat",
    label: "公众号文章",
    targetLength: 1500,
    limitHint: "公众号建议 1500–3000 字，配 3–5 个小标题",
    systemPrompt:
      "你是一位资深公众号主笔。按以下要求写作：\n" +
      "- 一个吸引点击的标题（# 一级标题）\n" +
      "- 导语 2–3 句交代价值点\n" +
      "- 3–5 个小标题（## 二级标题），每节有案例或数据支撑\n" +
      "- 结尾总结 + 引导在看/转发\n" +
      "输出 Markdown。",
  },
  {
    id: "review",
    label: "测评报告",
    targetLength: 1000,
    limitHint: "测评需覆盖维度表与结论，建议 1000 字以上",
    systemPrompt:
      "你是一位专业测评作者。按以下要求写作：\n" +
      "- 开头给出总体结论与推荐星级\n" +
      "- 用表格（Markdown table）呈现分维度评分\n" +
      "- 每个维度展开优缺点，有具体使用细节\n" +
      "- 结尾给出适合人群与购买建议\n" +
      "输出 Markdown，客观中立，不夸大。",
  },
  {
    id: "script",
    label: "短视频脚本",
    targetLength: 400,
    limitHint: "60 秒短视频脚本约 200–400 字，分镜要细",
    systemPrompt:
      "你是一位短视频编导。按以下要求写脚本：\n" +
      "- 按时间轴分镜：0-3s 钩子 / 3-40s 主体 / 40-60s 收尾\n" +
      "- 每个分镜给出：画面描述、口播文案、字幕要点\n" +
      "- 口播口语化，每句不超过 20 字\n" +
      "输出 Markdown，用列表组织分镜。",
  },
];

export function genreById(id: string): GenreTemplate | undefined {
  return GENRE_TEMPLATES.find((g) => g.id === id);
}

/** Selection transform operations (浮动 AI 菜单). */
export type TransformOp = "continue" | "rewrite" | "expand" | "shrink";

export const TRANSFORM_LABELS: Record<TransformOp, string> = {
  continue: "续写",
  rewrite: "改写",
  expand: "扩写",
  shrink: "缩写",
};

const TRANSFORM_PROMPTS: Record<TransformOp, string> = {
  continue:
    "请顺着上文续写。保持语气、人称与格式一致，直接输出续写内容，不要重复上文，不要解释。",
  rewrite:
    "请改写选中的文字：保持原意，让表达更流畅、更有感染力。直接输出改写后的文字，不要解释。",
  expand:
    "请扩写选中的文字：补充细节、案例或数据，篇幅约为原来的 2 倍。保持原文风格，直接输出扩写后的文字，不要解释。",
  shrink:
    "请缩写选中的文字：保留核心信息，篇幅约为原来的一半。直接输出缩写后的文字，不要解释。",
};

/** Build the message list for a full-draft generation. */
export function buildDraftMessages(
  genreId: string,
  topic: string,
  requirements?: string,
): Array<{ role: "system" | "user"; content: string }> {
  const genre = genreById(genreId);
  const system = genre?.systemPrompt ?? GENRE_TEMPLATES[0].systemPrompt;
  const target = genre?.targetLength ?? 500;
  const parts = [`主题：${topic}`, `篇幅目标：约 ${target} 字`];
  if (requirements?.trim()) parts.push(`补充要求：${requirements.trim()}`);
  return [
    { role: "system", content: system },
    { role: "user", content: parts.join("\n") },
  ];
}

/** Build the message list for a selection transform. */
export function buildTransformMessages(
  op: TransformOp,
  selection: string,
  fullDoc: string,
): Array<{ role: "system" | "user"; content: string }> {
  // The full document rides along as context so 续写/改写 stay coherent
  // with what comes before and after the selection (5000 字不丢上下文).
  const context = fullDoc.length > 12000 ? fullDoc.slice(0, 12000) : fullDoc;
  return [
    {
      role: "system",
      content:
        "你是一位中文写作助手。只输出处理后的文字本身，不加引号，不加解释，不添加标题。",
    },
    {
      role: "user",
      content:
        `【完整文档（供参考的上下文）】\n${context}\n\n` +
        `【需要处理的选中段落】\n${selection}\n\n` +
        `【任务】${TRANSFORM_PROMPTS[op]}`,
    },
  ];
}

/** Stream a writing task; onChunk receives text deltas. */
export async function streamWriting(
  messages: Array<{ role: "system" | "user"; content: string }>,
  model: string | undefined,
  onChunk: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const completion = await chatService.chatStream(
    { messages, model, temperature: 0.8, stream: true },
    (chunk) => onChunk(chunk),
    signal,
  );
  return completion.content;
}

/** Chinese-aware word count: CJK chars count as 1 each, words otherwise. */
export function countWords(text: string): number {
  const cjk = (text.match(/[一-鿿぀-ヿ]/g) ?? []).length;
  const words = (text.match(/[a-zA-Z0-9]+/g) ?? []).length;
  return cjk + words;
}
