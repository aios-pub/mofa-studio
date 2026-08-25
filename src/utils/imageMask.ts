/**
 * 局部重绘蒙版 (TOOL-01): stroke model + mask rendering.
 *
 * Wire convention (provider-side, OpenAI `/images/edits`): the mask PNG is
 * opaque everywhere EXCEPT the regions to regenerate — painted strokes erase
 * alpha (`destination-out`), so transparent = "repaint here". Feathering
 * blurs the erased edge so regenerated pixels blend into the kept ones
 * without hard jaggies (PRD 验收: 蒙版边缘无明显锯齿).
 *
 * The drawing commands are split from canvas creation so tests can drive
 * them against a stub 2D context.
 */

/** Which tool produced a stroke. */
export type MaskTool = "brush" | "eraser";

/**
 * One stroke at the image's natural resolution: `points` are x,y pairs.
 * Eraser strokes only remove previously painted area — they never mark
 * anything for regeneration.
 */
export interface MaskStroke {
  tool: MaskTool;
  /** Brush diameter in pixels (natural resolution). */
  size: number;
  /** Flattened [x0, y0, x1, y1, ...] polyline. */
  points: number[];
}

/** Feather (edge blur) bounds in pixels; 0 = hard edge. */
export const FEATHER_LIMITS = { min: 0, max: 24, default: 12 } as const;

/** Brush diameter bounds in pixels. */
export const BRUSH_LIMITS = { min: 4, max: 96, default: 32 } as const;

export function clampFeather(px: number): number {
  if (!Number.isFinite(px)) return FEATHER_LIMITS.default;
  return Math.min(FEATHER_LIMITS.max, Math.max(FEATHER_LIMITS.min, Math.round(px)));
}

export function clampBrush(px: number): number {
  if (!Number.isFinite(px)) return BRUSH_LIMITS.default;
  return Math.min(BRUSH_LIMITS.max, Math.max(BRUSH_LIMITS.min, Math.round(px)));
}

/**
 * Whether the strokes mark at least one region to regenerate. An eraser-only
 * or empty history exports no mask (whole-image edit).
 */
export function hasEditableRegion(strokes: MaskStroke[]): boolean {
  return strokes.some(
    (s) => s.tool === "brush" && s.points.length >= 2 && s.points.length % 2 === 0 && s.size > 0,
  );
}

/** A stroke needs at least one x,y pair (a single tap paints a dot). */
function drawable(s: MaskStroke): boolean {
  return s.points.length >= 2 && s.points.length % 2 === 0 && s.size > 0;
}

/**
 * Paint the stroke layer onto `ctx` (any size): white strokes on whatever is
 * already there. Brush adds with `source-over`; eraser removes with
 * `destination-out` — the same algebra the live overlay shows, so the export
 * matches what the user saw.
 */
export function paintStrokeLayer(
  ctx: CanvasRenderingContext2D,
  strokes: MaskStroke[],
): void {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const stroke of strokes) {
    if (!drawable(stroke)) continue;
    const erasing = stroke.tool === "eraser";
    ctx.globalCompositeOperation = erasing ? "destination-out" : "source-over";
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = stroke.size;
    const [x0, y0] = stroke.points;
    ctx.beginPath();
    if (stroke.points.length === 2) {
      // Single tap: a dot, not a zero-length line.
      ctx.arc(x0, y0, stroke.size / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.moveTo(x0, y0);
    for (let i = 2; i + 1 < stroke.points.length; i += 2) {
      ctx.lineTo(stroke.points[i], stroke.points[i + 1]);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Composite the export mask onto `ctx` (`width` × `height`): fill opaque
 * black, then erase alpha through the (blurred) stroke layer. The feather is
 * applied to the stroke layer when it is drawn in, so the erased edge — the
 * boundary the provider regenerates along — is soft.
 */
export function compositeMask(
  ctx: CanvasRenderingContext2D,
  strokeLayer: CanvasImageSource,
  width: number,
  height: number,
  featherPx: number,
): void {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  const blur = clampFeather(featherPx);
  ctx.filter = blur > 0 ? `blur(${blur}px)` : "none";
  ctx.globalCompositeOperation = "destination-out";
  ctx.drawImage(strokeLayer, 0, 0);
  ctx.restore();
}

/**
 * Serialize the strokes into the export mask PNG data URL at natural
 * resolution. Returns null when nothing is painted (caller sends no mask →
 * whole-image I2I).
 */
export function buildMaskDataUrl(
  strokes: MaskStroke[],
  width: number,
  height: number,
  featherPx: number,
): string | null {
  if (!hasEditableRegion(strokes) || width <= 0 || height <= 0) return null;
  const layer = document.createElement("canvas");
  layer.width = width;
  layer.height = height;
  const layerCtx = layer.getContext("2d");
  if (!layerCtx) return null;
  paintStrokeLayer(layerCtx, strokes);

  const mask = document.createElement("canvas");
  mask.width = width;
  mask.height = height;
  const maskCtx = mask.getContext("2d");
  if (!maskCtx) return null;
  compositeMask(maskCtx, layer, width, height, featherPx);
  return mask.toDataURL("image/png");
}

/**
 * Distinct prompts, most recent first, for the 提示词历史下拉. Dedupes on
 * trimmed text so re-runs don't flood the list.
 */
export function distinctPrompts(prompts: string[], limit = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of prompts) {
    const prompt = raw.trim();
    if (!prompt || seen.has(prompt)) continue;
    seen.add(prompt);
    out.push(prompt);
    if (out.length >= limit) break;
  }
  return out;
}
