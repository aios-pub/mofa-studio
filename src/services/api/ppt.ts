/**
 * PPT generation service (TOOL-07): outline-first → per-page slide
 * schema via the LLM → pptxgenjs export. Five built-in theme packs.
 */

import { chatService } from "./chat";

// ==================== Themes ====================

export interface PptTheme {
  id: string;
  label: string;
  /** pptxgenjs color hex (no #). */
  primary: string;
  background: string;
  text: string;
  accent: string;
  fontFace: string;
}

export const PPT_THEMES: PptTheme[] = [
  { id: "clean-white", label: "简约白", primary: "1677FF", background: "FFFFFF", text: "333333", accent: "69B7FF", fontFace: "Microsoft YaHei" },
  { id: "midnight", label: "午夜蓝", primary: "4F7CFF", background: "0F1B3D", text: "EAF0FF", accent: "8FB3FF", fontFace: "Microsoft YaHei" },
  { id: "warm-paper", label: "暖纸", primary: "C5690B", background: "FBF4E8", text: "3D2E1E", accent: "E0A458", fontFace: "Microsoft YaHei" },
  { id: "forest", label: "森绿", primary: "1F7A4D", background: "F2F8F4", text: "1E3A2A", accent: "6FBC95", fontFace: "Microsoft YaHei" },
  { id: "vivid-red", label: "活力红", primary: "D93A3A", background: "FFF7F5", text: "3A1E1E", accent: "FF8A7A", fontFace: "Microsoft YaHei" },
];

export function themeById(id: string): PptTheme {
  return PPT_THEMES.find((t) => t.id === id) ?? PPT_THEMES[0];
}

// ==================== Wire schema ====================

export interface SlideOutlineItem {
  title: string;
  points: string[];
}

export interface SlideSchema {
  title: string;
  slides: SlideOutlineItem[];
}

/** Extract the first JSON object/array from an LLM reply (fences, prose). */
export function extractJson<T = unknown>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [fenced?.[1], text];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end <= start) continue;
    try {
      return JSON.parse(candidate.slice(start, end + 1)) as T;
    } catch {
      // try the next candidate
    }
  }
  throw new Error("模型未返回有效的 JSON 结构");
}

/** Validate/normalize a parsed outline. */
export function normalizeOutline(raw: unknown, maxPages: number): SlideOutlineItem[] {
  const slides = Array.isArray((raw as { slides?: unknown }).slides)
    ? ((raw as { slides: unknown[] }).slides as unknown[])
    : Array.isArray(raw)
      ? (raw as unknown[])
      : [];
  const items: SlideOutlineItem[] = [];
  for (const slide of slides) {
    const title = String((slide as { title?: unknown }).title ?? "").trim();
    if (!title) continue;
    const points = Array.isArray((slide as { points?: unknown }).points)
      ? ((slide as { points: unknown[] }).points as unknown[])
          .map((p) => String(p).trim())
          .filter(Boolean)
          .slice(0, 6)
      : [];
    items.push({ title, points });
    if (items.length >= maxPages) break;
  }
  if (items.length === 0) {
    throw new Error("大纲为空：请重试或调整主题描述");
  }
  return items;
}

export function buildOutlineMessages(topic: string, pageCount: number) {
  return [
    {
      role: "system" as const,
      content:
        "你是演示文稿策划。只输出 JSON，不要解释。格式：" +
        '{"slides":[{"title":"页标题","points":["要点1","要点2","要点3"]}]}。' +
        `共 ${pageCount} 页：第 1 页为封面式总览（标题即主题，points 给副标题与关键结论），其余页每页 3-5 个要点。`,
    },
    { role: "user" as const, content: `主题：${topic}` },
  ];
}

export function buildSlideContentMessages(topic: string, outline: SlideOutlineItem) {
  return [
    {
      role: "system" as const,
      content:
        "你是演示文稿撰写者。只输出 JSON，不要解释。格式：" +
        '{"title":"页标题","points":["完整句子要点（每条不超过40字，含数据或案例）"]}。' +
        "要点数量与大纲一致，内容具体、可直接上屏。",
    },
    {
      role: "user" as const,
      content: `总主题：${topic}\n本页大纲：${JSON.stringify(outline)}`,
    },
  ];
}

// ==================== pptxgenjs mapping ====================

/** A slide definition in pptxgenjs-ready form (pure, testable). */
export interface PptxSlideDef {
  layout: "TITLE_SLIDE" | "TITLE_AND_CONTENT";
  title: string;
  bullets: string[];
  background: string;
  titleColor: string;
  bulletColor: string;
  accentColor: string;
  fontFace: string;
}

export function schemaToPptxSlides(schema: SlideSchema, theme: PptTheme): PptxSlideDef[] {
  return schema.slides.map((slide, index) => ({
    layout: index === 0 ? "TITLE_SLIDE" : "TITLE_AND_CONTENT",
    title: index === 0 ? schema.title || slide.title : slide.title,
    bullets: index === 0 ? slide.points : slide.points,
    background: theme.background,
    titleColor: index === 0 ? theme.background : theme.primary,
    // Cover slide inverts: colored band with light text handled at render.
    bulletColor: theme.text,
    accentColor: theme.accent,
    fontFace: theme.fontFace,
  }));
}

// ==================== Export ====================

export async function exportPptx(
  schema: SlideSchema,
  themeId: string,
): Promise<void> {
  const theme = themeById(themeId);
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.title = schema.title;

  const defs = schemaToPptxSlides(schema, theme);
  defs.forEach((def, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: def.background };
    if (index === 0) {
      // Cover: full-bleed primary band + theme-colored title.
      slide.addShape("rect", {
        x: 0, y: 0, w: "100%", h: "100%",
        fill: { color: theme.primary },
      });
      slide.addText(def.title, {
        x: "8%", y: "34%", w: "84%", h: "20%",
        fontSize: 40, bold: true, color: "FFFFFF",
        fontFace: def.fontFace, align: "center",
      });
      if (def.bullets.length > 0) {
        slide.addText(def.bullets.join("  ·  "), {
          x: "12%", y: "56%", w: "76%", h: "12%",
          fontSize: 16, color: theme.accent,
          fontFace: def.fontFace, align: "center",
        });
      }
    } else {
      slide.addText(def.title, {
        x: "8%", y: "8%", w: "84%", h: "12%",
        fontSize: 28, bold: true, color: theme.primary,
        fontFace: def.fontFace,
      });
      slide.addShape("rect", {
        x: "8%", y: "21%", w: "12%", h: "0.08",
        fill: { color: def.accentColor },
      });
      if (def.bullets.length > 0) {
        slide.addText(def.bullets.map((b) => ({ text: b, options: { bullet: true } })), {
          x: "10%", y: "28%", w: "80%", h: "62%",
          fontSize: 18, color: def.bulletColor,
          fontFace: def.fontFace, lineSpacingMultiple: 1.4,
        });
      }
      slide.addSlideNumber({
        x: "92%", y: "92%", fontSize: 10, color: theme.accent,
      });
    }
  });

  await pptx.writeFile({ fileName: `${schema.title.slice(0, 30) || "presentation"}.pptx` });
}

// ==================== LLM steps ====================

export async function generateOutline(
  topic: string,
  pageCount: number,
  model?: string,
): Promise<SlideOutlineItem[]> {
  const reply = await chatService.chat({
    messages: buildOutlineMessages(topic, pageCount),
    model,
    temperature: 0.7,
  });
  return normalizeOutline(extractJson(reply.content), pageCount);
}

export async function generateSlideContent(
  topic: string,
  outline: SlideOutlineItem,
  model?: string,
): Promise<SlideOutlineItem> {
  const reply = await chatService.chat({
    messages: buildSlideContentMessages(topic, outline),
    model,
    temperature: 0.7,
  });
  const parsed = extractJson<{ title?: string; points?: string[] }>(reply.content);
  return {
    title: String(parsed.title ?? outline.title),
    points: Array.isArray(parsed.points)
      ? parsed.points.map(String).slice(0, 6)
      : outline.points,
  };
}
