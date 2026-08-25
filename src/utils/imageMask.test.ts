/**
 * Tests for the 局部重绘 mask model (TOOL-01): stroke→mask algebra, the
 * provider convention (transparent = repaint), feather bounds, and prompt
 * history dedupe.
 *
 * jsdom has no 2D canvas, so the drawing functions run against a recording
 * Proxy context — the assertions pin the exact command sequence (the
 * convention IS the contract the gateway/provider rely on).
 */
import { describe, expect, it } from "vitest";
import {
  BRUSH_LIMITS,
  FEATHER_LIMITS,
  buildMaskDataUrl,
  clampBrush,
  clampFeather,
  compositeMask,
  distinctPrompts,
  hasEditableRegion,
  paintStrokeLayer,
  type MaskStroke,
} from "./imageMask";

type Call = { op: string; args: unknown[] };

function recordingCtx() {
  const calls: Call[] = [];
  const ctx = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "__calls") return calls;
        return (...args: unknown[]) => {
          calls.push({ op: String(prop), args });
        };
      },
      set(_target, prop, value) {
        calls.push({ op: `set:${String(prop)}`, args: [value] });
        return true;
      },
    },
  );
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const ops = (calls: Call[]) => calls.map((c) => c.op);

describe("bounds", () => {
  it("clamps feather to [0, 24] with a finite default", () => {
    expect(clampFeather(-5)).toBe(0);
    expect(clampFeather(999)).toBe(FEATHER_LIMITS.max);
    expect(clampFeather(12.4)).toBe(12);
    expect(clampFeather(Number.NaN)).toBe(FEATHER_LIMITS.default);
  });

  it("clamps brush to [4, 96]", () => {
    expect(clampBrush(1)).toBe(BRUSH_LIMITS.min);
    expect(clampBrush(1000)).toBe(BRUSH_LIMITS.max);
    expect(clampBrush(Number.NaN)).toBe(BRUSH_LIMITS.default);
  });
});

describe("hasEditableRegion", () => {
  it("eraser-only or empty strokes mark nothing", () => {
    const eraser: MaskStroke[] = [
      { tool: "eraser", size: 10, points: [0, 0, 5, 5] },
    ];
    expect(hasEditableRegion([])).toBe(false);
    expect(hasEditableRegion(eraser)).toBe(false);
  });

  it("a single brush tap already marks a region", () => {
    expect(hasEditableRegion([{ tool: "brush", size: 8, points: [3, 4] }])).toBe(
      true,
    );
  });

  it("odd point pairs and zero-size brushes are ignored", () => {
    expect(
      hasEditableRegion([{ tool: "brush", size: 8, points: [1, 2, 3] }]),
    ).toBe(false);
    expect(
      hasEditableRegion([{ tool: "brush", size: 0, points: [1, 2] }]),
    ).toBe(false);
  });
});

describe("paintStrokeLayer", () => {
  it("brush strokes draw white source-over polylines", () => {
    const { ctx, calls } = recordingCtx();
    paintStrokeLayer(ctx, [{ tool: "brush", size: 20, points: [0, 0, 10, 10, 20, 5] }]);
    const seq = ops(calls);
    expect(seq).toContain("save");
    expect(seq.indexOf("set:globalCompositeOperation")).toBeGreaterThan(-1);
    expect(calls.find((c) => c.op === "set:globalCompositeOperation")?.args[0]).toBe(
      "source-over",
    );
    expect(calls.find((c) => c.op === "set:lineWidth")?.args[0]).toBe(20);
    expect(seq.indexOf("beginPath")).toBeLessThan(seq.indexOf("moveTo"));
    expect(seq.indexOf("moveTo")).toBeLessThan(seq.indexOf("lineTo"));
    // Two line segments for three points.
    expect(seq.filter((op) => op === "lineTo")).toHaveLength(2);
    expect(seq.indexOf("stroke")).toBeGreaterThan(seq.lastIndexOf("lineTo"));
    expect(seq.lastIndexOf("restore")).toBe(seq.length - 1);
  });

  it("a single tap paints a dot (arc + fill, no stroke)", () => {
    const { ctx, calls } = recordingCtx();
    paintStrokeLayer(ctx, [{ tool: "brush", size: 12, points: [5, 6] }]);
    const seq = ops(calls);
    expect(seq).toContain("arc");
    expect(seq).toContain("fill");
    expect(seq).not.toContain("stroke");
  });

  it("eraser strokes switch to destination-out", () => {
    const { ctx, calls } = recordingCtx();
    paintStrokeLayer(ctx, [{ tool: "eraser", size: 30, points: [0, 0, 9, 9] }]);
    expect(calls.find((c) => c.op === "set:globalCompositeOperation")?.args[0]).toBe(
      "destination-out",
    );
  });

  it("skips malformed strokes", () => {
    const { ctx, calls } = recordingCtx();
    paintStrokeLayer(ctx, [
      { tool: "brush", size: 10, points: [] },
      { tool: "brush", size: 10, points: [1, 2, 3] },
    ]);
    // Only the setup/teardown ran — no path was begun.
    expect(ops(calls)).toEqual([
      "save",
      "set:lineJoin",
      "set:lineCap",
      "restore",
    ]);
  });
});

describe("compositeMask", () => {
  const layer = {} as CanvasImageSource;

  it("fills opaque black then erases through the blurred strokes", () => {
    const { ctx, calls } = recordingCtx();
    compositeMask(ctx, layer, 800, 600, 12);
    const seq = ops(calls);
    // Black base first…
    expect(seq.indexOf("fillRect")).toBeGreaterThan(-1);
    expect(calls.find((c) => c.op === "set:fillStyle")?.args[0]).toBe("#000000");
    expect(seq.indexOf("fillRect")).toBeLessThan(seq.indexOf("drawImage"));
    // …then feathered destination-out erase: the two composite passes run
    // source-over (base fill) → destination-out (erase).
    const composites = calls
      .filter((c) => c.op === "set:globalCompositeOperation")
      .map((c) => c.args[0]);
    expect(composites).toEqual(["source-over", "destination-out"]);
    const filters = calls.filter((c) => c.op === "set:filter").map((c) => c.args[0]);
    expect(filters).toEqual(["none", "blur(12px)"]);
    // The erase (last composite set) directly precedes drawing the strokes in.
    expect(seq[seq.indexOf("drawImage") - 1]).toBe("set:globalCompositeOperation");
  });

  it("feather 0 keeps a hard edge (no blur filter)", () => {
    const { ctx, calls } = recordingCtx();
    compositeMask(ctx, layer, 100, 100, 0);
    const filters = calls.filter((c) => c.op === "set:filter").map((c) => c.args[0]);
    expect(filters).toEqual(["none", "none"]);
  });
});

describe("buildMaskDataUrl", () => {
  it("returns null when nothing is painted (whole-image edit)", () => {
    expect(buildMaskDataUrl([], 100, 100, 8)).toBeNull();
    expect(
      buildMaskDataUrl([{ tool: "eraser", size: 9, points: [0, 0, 5, 5] }], 100, 100, 8),
    ).toBeNull();
  });

  it("returns null for degenerate sizes", () => {
    expect(
      buildMaskDataUrl([{ tool: "brush", size: 9, points: [0, 0] }], 0, 100, 8),
    ).toBeNull();
  });

  it("degrades to null when the canvas context is unavailable (jsdom)", () => {
    // jsdom has no 2D context — the helper must fail soft, not throw.
    expect(
      buildMaskDataUrl([{ tool: "brush", size: 9, points: [0, 0, 4, 4] }], 64, 64, 4),
    ).toBeNull();
  });
});

describe("distinctPrompts", () => {
  it("dedupes on trimmed text, newest first, capped", () => {
    const prompts = [
      "  一只橘猫  ",
      "一只橘猫",
      "夜景城市",
      "",
      "   ",
      "水彩风格",
      ...Array.from({ length: 20 }, (_, i) => `批量 ${i}`),
    ];
    const out = distinctPrompts(prompts, 5);
    expect(out).toHaveLength(5);
    expect(out[0]).toBe("一只橘猫");
    expect(out).toContain("夜景城市");
    expect(out).not.toContain("");
  });
});
