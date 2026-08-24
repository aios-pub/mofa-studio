/**
 * In-chat image-generation intent detection (CHAT-05).
 *
 * A deterministic keyword/phrase classifier over the user's latest turn:
 * cheap, explainable, and unit-testable against a labeled example set.
 * Chat messages that hit the intent route to the image gateway instead of
 * the chat model.
 */

/** Command-style verbs that clearly ask for a picture. */
const DRAW_VERBS = [
  "画一", "画个", "画张", "画只", "画幅", "帮我画", "给我画",
  "生成一", "生成张", "生成个", "生成图", "生成一张",
  "来一张", "来张", "来个", "来一幅",
  "做一张", "做张", "做张图", "整一张",
  "创建一", "创建张",
  "设计一", "设计张",
  "绘制一", "绘制张",
];

/** Nouns that anchor image output. */
const IMAGE_NOUNS = ["图", "图片", "图像", "插画", "海报", "封面", "壁纸", "头像", "配图", "照片", "插画"];

/** English phrasings (BYOK users may type either language). */
const EN_PATTERNS = [
  /\b(draw|generate|create|make|design)\b[^.?!]{0,24}\b(image|picture|illustration|poster|wallpaper|avatar|photo|logo)\b/i,
  /\b(image|picture) of\b/i,
  /\b(an?|some) (image|picture|illustration)s?\b.*\b(please|for me)\b/i,
];

/** Edit-intent markers when the previous turn already produced an image. */
const EDIT_MARKERS = [
  "换成", "改成", "变一下", "换背景", "调一下", "再改",
  "重新画", "重画", "再来一版", "换个", "更亮", "更暗", "色调",
];

export type ChatIntent =
  | { kind: "image"; edit: boolean }
  | { kind: "chat" };

/**
 * Classify the latest user message. `previousTurnWasImage` enables
 * edit-intent matching (「换成夜景」 re-generates with a refined prompt
 * rather than starting a new subject).
 */
export function detectImageIntent(
  text: string,
  previousTurnWasImage = false,
): ChatIntent {
  const trimmed = text.trim();
  if (!trimmed) return { kind: "chat" };

  // Explicit command prefix wins outright. (\b is ASCII-only in JS regex,
  // so the CJK branch matches a following space or end-of-string instead.)
  if (/^\/(画|image|img|draw)(\s|$)/i.test(trimmed)) {
    return { kind: "image", edit: false };
  }

  const hitDrawVerb = DRAW_VERBS.some((verb) => trimmed.includes(verb));
  const hitImageNoun = IMAGE_NOUNS.some((noun) => trimmed.includes(noun));

  if (hitDrawVerb && hitImageNoun) return { kind: "image", edit: false };

  // 「画一只橘猫」 style: verb alone carries the meaning.
  if (/^(帮我|给我)?画.+/.test(trimmed) && trimmed.length <= 60) {
    return { kind: "image", edit: false };
  }

  for (const pattern of EN_PATTERNS) {
    if (pattern.test(trimmed)) return { kind: "image", edit: false };
  }

  // Follow-up edits only count when the previous assistant turn was an image.
  if (previousTurnWasImage && EDIT_MARKERS.some((m) => trimmed.includes(m))) {
    return { kind: "image", edit: true };
  }

  return { kind: "chat" };
}

/**
 * Build the image prompt for a follow-up edit turn: keep the previous
 * prompt, apply the modification request (v1 refines the prompt; true
 * pixel-level I2I needs engine image-edit support).
 */
export function refineImagePrompt(previousPrompt: string, editRequest: string): string {
  return `${previousPrompt}（调整：${editRequest.trim()}）`;
}
