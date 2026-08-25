/**
 * 局部重绘蒙版画板 (TOOL-01): react-konva stage over the base image.
 *
 * The user paints regions to regenerate as a red overlay; the export maps
 * painted area onto the provider mask convention (transparent = repaint
 * here) with a feathered edge — see utils/imageMask.
 *
 * Strokes are stored at the image's natural resolution so the exported mask
 * never depends on the display size. Imperative handle exposes
 * `exportMask()`/`hasMask()` so the page only deals with blobs.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Button, Segmented, Slider, Space, Tooltip } from "antd";
import {
  ClearOutlined,
  EditOutlined,
  UndoOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { Image as KonvaImage, Layer, Line, Stage } from "react-konva";
import type Konva from "konva";
import {
  BRUSH_LIMITS,
  FEATHER_LIMITS,
  buildMaskDataUrl,
  clampBrush,
  clampFeather,
  hasEditableRegion,
  type MaskStroke,
  type MaskTool,
} from "@/utils/imageMask";

export interface MaskEditorHandle {
  /** The export mask as a PNG blob, or null when nothing is painted. */
  exportMask: () => Promise<Blob | null>;
  /** Whether any region is marked for regeneration. */
  hasMask: () => boolean;
  /** Natural resolution of the base image (0×0 until loaded). */
  naturalSize: () => { width: number; height: number };
}

interface MaskEditorProps {
  /** Data URL of the image to paint on. */
  baseImage: string;
  /** Strokes live in the page state so 参数快照 (TOOL-05) can persist them. */
  strokes: MaskStroke[];
  onStrokesChange: (strokes: MaskStroke[]) => void;
}

const MAX_DISPLAY_WIDTH = 640;

const MaskEditor = forwardRef<MaskEditorHandle, MaskEditorProps>(
  function MaskEditor({ baseImage, strokes, onStrokesChange }, ref) {
    const [tool, setTool] = useState<MaskTool>("brush");
    const [brushSize, setBrushSize] = useState<number>(BRUSH_LIMITS.default);
    const [feather, setFeather] = useState<number>(FEATHER_LIMITS.default);
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    const [display, setDisplay] = useState({ width: 0, height: 0 });
    const [draft, setDraft] = useState<number[] | null>(null);
    const drawing = useRef(false);
    // Display-space points of the stroke currently being drawn.
    const draftRef = useRef<number[]>([]);

    useEffect(() => {
      const image = new window.Image();
      image.onload = () => setImg(image);
      image.src = baseImage;
      return () => {
        image.onload = null;
      };
    }, [baseImage]);

    // Fit the stage into the panel while keeping the aspect ratio.
    useEffect(() => {
      if (!img) return;
      const width = Math.min(MAX_DISPLAY_WIDTH, img.naturalWidth || MAX_DISPLAY_WIDTH);
      const scale = width / (img.naturalWidth || width);
      setDisplay({ width, height: Math.round((img.naturalHeight || width) * scale) });
    }, [img]);

    useImperativeHandle(ref, () => ({
      async exportMask() {
        if (!img) return null;
        const url = buildMaskDataUrl(
          strokes,
          img.naturalWidth,
          img.naturalHeight,
          feather,
        );
        if (!url) return null;
        const blob = await (await fetch(url)).blob();
        return blob;
      },
      hasMask: () => hasEditableRegion(strokes),
      naturalSize: () =>
        img ? { width: img.naturalWidth, height: img.naturalHeight } : { width: 0, height: 0 },
    }), [img, strokes, feather]);

    /** Display coords → natural coords. */
    const toNatural = (x: number, y: number): [number, number] => {
      const ratio = img && display.width ? img.naturalWidth / display.width : 1;
      return [x * ratio, y * ratio];
    };

    const pointer = (e: Konva.KonvaEventObject<PointerEvent | MouseEvent>) => {
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      return pos ? ([pos.x, pos.y] as [number, number]) : null;
    };

    const startStroke = (e: Konva.KonvaEventObject<PointerEvent | MouseEvent>) => {
      if (!img) return;
      const pos = pointer(e);
      if (!pos) return;
      drawing.current = true;
      draftRef.current = [...pos];
      setDraft([...draftRef.current]);
    };

    const extendStroke = (e: Konva.KonvaEventObject<PointerEvent | MouseEvent>) => {
      if (!drawing.current) return;
      const pos = pointer(e);
      if (!pos) return;
      draftRef.current.push(...pos);
      setDraft([...draftRef.current]);
    };

    const finishStroke = () => {
      if (!drawing.current) return;
      drawing.current = false;
      const draft = draftRef.current;
      draftRef.current = [];
      setDraft(null);
      if (draft.length < 2) return;
      const natural: number[] = [];
      for (let i = 0; i + 1 < draft.length; i += 2) {
        natural.push(...toNatural(draft[i], draft[i + 1]));
      }
      onStrokesChange([
        ...strokes,
        {
          tool,
          // Brush diameter scaled from display px to natural resolution so
          // the exported mask matches what was painted at any display size.
          size: toNatural(brushSize, 0)[0],
          points: natural,
        },
      ]);
    };

    const strokesLayerProps = (stroke: MaskStroke) => {
      if (!img || !display.width) return { points: [] as number[] };
      const scale = display.width / img.naturalWidth;
      return {
        points: stroke.points.map((v) => v * scale),
        strokeWidth: stroke.size * scale,
      };
    };

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Space size="small">
            <Segmented
              value={tool}
              onChange={(v) => setTool(v as MaskTool)}
              options={[
                { value: "brush", icon: <EditOutlined />, label: "画笔" },
                { value: "eraser", icon: <StopOutlined />, label: "橡皮" },
              ]}
              aria-label="蒙版工具"
            />
            <Tooltip title={`画笔粗细 ${brushSize}px`}>
              <div className="w-28">
                <Slider
                  min={BRUSH_LIMITS.min}
                  max={BRUSH_LIMITS.max}
                  value={brushSize}
                  onChange={(v) => setBrushSize(clampBrush(v))}
                  aria-label="画笔粗细"
                />
              </div>
            </Tooltip>
            <Tooltip title="羽化让重绘边缘与原图过渡更自然（防锯齿）">
              <div className="w-28">
                <Slider
                  min={FEATHER_LIMITS.min}
                  max={FEATHER_LIMITS.max}
                  value={feather}
                  onChange={(v) => setFeather(clampFeather(v))}
                  aria-label="边缘羽化"
                />
              </div>
            </Tooltip>
          </Space>
          <Space size="small">
            <Button
              size="small"
              icon={<UndoOutlined />}
              disabled={strokes.length === 0}
              onClick={() => onStrokesChange(strokes.slice(0, -1))}
              aria-label="撤销一笔"
            >
              撤销
            </Button>
            <Button
              size="small"
              icon={<ClearOutlined />}
              disabled={strokes.length === 0}
              onClick={() => onStrokesChange([])}
              aria-label="清除蒙版"
            >
              清除
            </Button>
          </Space>
        </div>

        <div
          className="relative rounded-xl overflow-hidden border border-(--color-border) bg-(--color-bg-tertiary) select-none"
          style={{ width: display.width || undefined }}
        >
          {img && display.width > 0 ? (
            <Stage
              width={display.width}
              height={display.height}
              style={{ cursor: "crosshair", touchAction: "none" }}
              onPointerDown={startStroke}
              onPointerMove={extendStroke}
              onPointerUp={finishStroke}
              onPointerLeave={finishStroke}
            >
              <Layer listening={false}>
                <KonvaImage image={img} width={display.width} height={display.height} />
              </Layer>
              <Layer>
                {/* Kept regions dim slightly so the painted area reads as "will change". */}
                {strokes.map((stroke, i) => (
                  <Line
                    key={i}
                    {...strokesLayerProps(stroke)}
                    stroke={
                      stroke.tool === "eraser" ? "#ffffff" : "rgba(255,82,82,0.6)"
                    }
                    globalCompositeOperation={
                      stroke.tool === "eraser" ? "destination-out" : "source-over"
                    }
                    lineCap="round"
                    lineJoin="round"
                  />
                ))}
                {draft && draft.length >= 2 ? (
                  <Line
                    points={draft}
                    stroke={tool === "eraser" ? "#ffffff" : "rgba(255,82,82,0.6)"}
                    strokeWidth={brushSize}
                    globalCompositeOperation={
                      tool === "eraser" ? "destination-out" : "source-over"
                    }
                    lineCap="round"
                    lineJoin="round"
                  />
                ) : null}
              </Layer>
            </Stage>
          ) : (
            <div className="h-40 flex items-center justify-center text-xs text-[var(--color-text-tertiary)]">
              正在载入底图…
            </div>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-tertiary)]">
          红色涂抹区域将被重绘；羽化决定新旧像素的过渡软度。不涂任何区域则整图重绘。
        </p>
      </div>
    );
  },
);

export default MaskEditor;
