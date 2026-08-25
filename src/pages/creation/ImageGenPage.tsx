/**
 * Image generation workspace (TOOL-01): 文生图 / 垫图 / 局部重绘 three modes.
 *
 * - 文生图 (t2i): prompt → N candidates at a platform size (TOOL-04).
 * - 垫图 (i2i): reference images keep the subject consistent; no mask.
 * - 局部重绘 (inpaint): paint a mask over the base image (Konva, feathered);
 *   only the painted region regenerates.
 *
 * Prompt history dropdown, candidate click-to-zoom, and a local history with
 * full parameter snapshots (TOOL-05 seed) round out the interaction spec.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FirstOutputDialog } from "@/components/onboarding/FirstRunGuide";
import {
  hasFirstOutput,
  markFirstOutput,
  queryRecord,
} from "@/components/onboarding/firstRunCases";
import MaskEditor, { type MaskEditorHandle } from "@/components/creation/MaskEditor";
import { Button, Image as AntImage, Input, Segmented, Select, Spin, message, Empty, Tooltip, Upload } from "antd";
import {
  PictureOutlined,
  DownloadOutlined,
  HistoryOutlined,
  CopyOutlined,
  PlusOutlined,
  HighlightOutlined,
  FormatPainterOutlined,
  FontSizeOutlined,
} from "@ant-design/icons";
import type { UploadFile } from "antd";

/** Derive the antd upload list from the reference data URLs (single source). */
function refsToFileList(refs: string[]): UploadFile[] {
  return refs.map((url, index) => ({
    uid: `ref-${index}`,
    name: `参考 ${index + 1}`,
    status: "done",
    url,
    thumbUrl: url,
  }));
}
import {
  SIZE_PRESETS,
  exportFilename,
  imageService,
  type ImageGenHistoryEntry,
  type ImageMode,
} from "@/services/api/image";
import { AUTO_MODEL, engineService } from "@/services/api/engine";
import { recordImageAssets } from "@/services/api/assets";
import { distinctPrompts, type MaskStroke } from "@/utils/imageMask";

const HISTORY_KEY = "mofa-studio-image-history";
const HISTORY_LIMIT = 50;
/** 垫图参考上限：底图 + 3 张一致性锚点。 */
const MAX_REFS = 4;

const MODE_OPTIONS: Array<{ value: ImageMode; label: string; icon: React.ReactNode }> = [
  { value: "t2i", label: "文生图", icon: <FontSizeOutlined /> },
  { value: "i2i", label: "垫图", icon: <PictureOutlined /> },
  { value: "inpaint", label: "局部重绘", icon: <FormatPainterOutlined /> },
];

const MODE_LABEL: Record<ImageMode, string> = {
  t2i: "文生图",
  i2i: "垫图",
  inpaint: "局部重绘",
};

function loadHistory(): ImageGenHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as ImageGenHistoryEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: ImageGenHistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
  } catch {
    // Storage full/unavailable: history stays in-memory for this session.
  }
}

/** Read an antd upload into a data URL (kept out of component state churn). */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Data URL → Blob for multipart posts. */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

export default function ImageGenPage() {
  const [mode, setMode] = useState<ImageMode>("t2i");
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState(SIZE_PRESETS[0].value);
  const [count, setCount] = useState(4);
  const [model, setModel] = useState(AUTO_MODEL);
  const [imageModels, setImageModels] = useState<Array<{ value: string; label: string }>>([]);
  const [editModels, setEditModels] = useState<Array<{ value: string; label: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [history, setHistory] = useState<ImageGenHistoryEntry[]>(loadHistory);
  const [firstOutputOpen, setFirstOutputOpen] = useState(false);
  const [searchParams] = useSearchParams();

  // 垫图 references (data URLs). 局部重绘 keeps the base separately.
  const [refs, setRefs] = useState<string[]>([]);
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [strokes, setStrokes] = useState<MaskStroke[]>([]);
  const maskEditorRef = useRef<MaskEditorHandle>(null);

  useEffect(() => {
    void engineService.listModels().then((models) => {
      setImageModels(
        models
          .filter((m) => m.capability === "image_gen")
          .map((m) => ({ value: m.id, label: m.id })),
      );
      setEditModels(
        models
          .filter((m) => m.capability === "image_edit")
          .map((m) => ({ value: m.id, label: m.id })),
      );
    });
  }, []);

  const promptHistory = distinctPrompts(history.map((entry) => entry.prompt));

  const switchMode = useCallback((next: ImageMode) => {
    setMode(next);
    setResults([]);
  }, []);

  /** 画师回路：把任一候选作为底稿进入局部重绘。 */
  const repaintCandidate = useCallback(
    (dataUrl: string) => {
      setBaseImage(dataUrl);
      setStrokes([]);
      switchMode("inpaint");
      message.info("已把该候选设为重绘底稿，涂抹要修改的区域");
    },
    [switchMode],
  );

  const handleGenerate = useCallback(async () => {
    const effectivePrompt = prompt.trim();
    if (!effectivePrompt || isGenerating) return;

    if (mode === "i2i" && refs.length === 0) {
      message.warning("垫图模式需要至少一张参考图");
      return;
    }
    let maskBlob: Blob | undefined;
    if (mode === "inpaint") {
      if (!baseImage) {
        message.warning("局部重绘需要一张底图（上传或从候选「重绘此图」）");
        return;
      }
      // Nothing painted → honest whole-image edit (the editor says so too).
      maskBlob = (await maskEditorRef.current?.exportMask()) ?? undefined;
    }

    setIsGenerating(true);
    setResults([]);
    try {
      const effectiveModel = model === AUTO_MODEL ? undefined : model;
      const usedRefs =
        mode === "i2i"
          ? refs
          : mode === "inpaint"
            ? baseImage
              ? [baseImage]
              : []
            : [];
      const images = await Promise.all(usedRefs.map(dataUrlToBlob));

      const response =
        mode === "t2i"
          ? await imageService.generate({
              prompt: effectivePrompt,
              model: effectiveModel,
              n: count,
              size,
            })
          : await imageService.edit({
              prompt: effectivePrompt,
              model: effectiveModel,
              images,
              mask: mode === "inpaint" ? maskBlob : undefined,
              n: count,
              size,
            });
      setResults(response.images);
      // PLAT-06: every generated image lands in the unified asset model.
      void recordImageAssets("studio", effectivePrompt, response.images, {
        size,
        model: response.model_used,
        mode,
      });
      if (!hasFirstOutput() && response.images.length > 0) {
        markFirstOutput();
        setFirstOutputOpen(true);
      }
      if (response.images.length === 0) {
        message.warning("引擎没有返回图片，请检查图像模型配置");
      }
      const entry: ImageGenHistoryEntry = {
        id: `img-${Date.now()}`,
        prompt: effectivePrompt,
        model: response.model_used ?? model,
        n: count,
        size,
        created_at: new Date().toISOString(),
        images: response.images,
        mode,
        refs: mode === "t2i" ? undefined : usedRefs,
        baseImage: mode === "inpaint" ? baseImage ?? undefined : undefined,
      };
      setHistory((prev) => {
        const next = [entry, ...prev];
        saveHistory(next);
        return next;
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(`生成失败：${detail}`);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, isGenerating, mode, model, count, size, refs, baseImage]);

  const handleGenerateRef = useRef(handleGenerate);
  handleGenerateRef.current = handleGenerate;

  // ONBOARD-03: 「做同款」cases arrive with prefilled params and run=1
  // (文生图 only — the seeded cases are pure T2I).
  useEffect(() => {
    const params = queryRecord(window.location.search);
    if (params.prompt) setPrompt(params.prompt);
    if (params.size && SIZE_PRESETS.some((p) => p.value === params.size)) {
      setSize(params.size);
    }
    if (params.run === "1" && params.prompt) {
      void handleGenerateRef.current?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const download = useCallback(
    (dataUrl: string, seq: number) => {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = exportFilename(prompt, size, seq);
      link.click();
    },
    [prompt, size],
  );

  const restoreFromHistory = useCallback((entry: ImageGenHistoryEntry) => {
    setPrompt(entry.prompt);
    setSize(entry.size);
    setCount(entry.n);
    setResults(entry.images);
    if (entry.mode) setMode(entry.mode);
    if (entry.refs?.length) {
      setRefs(entry.refs);
    }
    if (entry.baseImage) {
      setBaseImage(entry.baseImage);
      setStrokes([]);
    }
    message.info("已恢复该次生成的参数与结果");
  }, []);

  const addRef = useCallback(async (file: File) => {
    if (refs.length >= MAX_REFS) {
      message.warning(`参考图最多 ${MAX_REFS} 张`);
      return;
    }
    const url = await fileToDataUrl(file);
    setRefs((prev) => [...prev, url]);
  }, [refs.length]);

  const modelOptions = mode === "t2i" ? imageModels : editModels;
  const missingInputs =
    !prompt.trim() ||
    (mode === "i2i" && refs.length === 0) ||
    (mode === "inpaint" && !baseImage);

  return (
    <div className="flex h-full">
      {/* Control panel */}
      <div className="w-80 border-r border-(--color-border) p-4 space-y-4 overflow-y-auto">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
          <PictureOutlined className="text-[var(--color-primary)]" />
          图像生成
        </h2>

        <div>
          <label className="block text-sm font-medium mb-1">模式</label>
          <Segmented
            block
            value={mode}
            onChange={(value) => switchMode(value as ImageMode)}
            options={MODE_OPTIONS.map(({ value, label, icon }) => ({
              value,
              label: (
                <span className="inline-flex items-center gap-1" title={label}>
                  {icon}
                  {label}
                </span>
              ),
            }))}
            aria-label="生成模式"
          />
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            {mode === "t2i" && "输入描述直接出图"}
            {mode === "i2i" && "上传参考图保持主体一致，整体调整风格或内容"}
            {mode === "inpaint" && "涂抹局部区域，只重绘涂到的部分"}
          </p>
        </div>

        {mode === "i2i" && (
          <div>
            <label className="block text-sm font-medium mb-1">
              参考图（{refs.length}/{MAX_REFS}）
            </label>
            <Upload
              listType="picture-card"
              fileList={refsToFileList(refs)}
              accept="image/*"
              multiple
              showUploadList={{ showPreviewIcon: true }}
              beforeUpload={(file) => {
                void addRef(file);
                return false;
              }}
              onRemove={(file) => {
                const index = Number(file.uid.replace("ref-", ""));
                setRefs((prev) => prev.filter((_, i) => i !== index));
              }}
            >
              {refs.length < MAX_REFS && (
                <div>
                  <PlusOutlined />
                  <div className="mt-1 text-xs">添加参考</div>
                </div>
              )}
            </Upload>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              第一张为编辑主体，其余保持角色/风格一致
            </p>
          </div>
        )}

        {mode === "inpaint" && (
          <div className="space-y-2">
            <label className="block text-sm font-medium mb-1">底图</label>
            {baseImage ? (
              <div className="space-y-2">
                <img
                  src={baseImage}
                  alt="重绘底图"
                  className="w-full rounded-lg border border-(--color-border) object-contain max-h-32"
                />
                <Button
                  size="small"
                  onClick={() => {
                    setBaseImage(null);
                    setStrokes([]);
                  }}
                  aria-label="移除底图"
                >
                  换一张底图
                </Button>
              </div>
            ) : (
              <Upload
                accept="image/*"
                maxCount={1}
                showUploadList={false}
                beforeUpload={async (file) => {
                  setBaseImage(await fileToDataUrl(file));
                  setStrokes([]);
                  return false;
                }}
              >
                <Button icon={<PlusOutlined />} aria-label="上传底图">
                  上传底图
                </Button>
              </Upload>
            )}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium">描述（Prompt）</label>
            {promptHistory.length > 0 && (
              <Select
                size="small"
                placeholder="历史提示词"
                onChange={(value) => setPrompt(value)}
                options={promptHistory.map((p) => ({
                  value: p,
                  label: p.length > 16 ? `${p.slice(0, 16)}…` : p,
                }))}
                style={{ width: 130 }}
                aria-label="提示词历史"
                popupMatchSelectWidth={false}
              />
            )}
          </div>
          <Input.TextArea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              mode === "inpaint"
                ? "例如：把手里的杯子换成一杯咖啡"
                : "例如：一只橘猫坐在洒满阳光的窗台上，胶片质感"
            }
            rows={4}
            aria-label="图像描述"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">尺寸（平台预设）</label>
          <Select
            value={size}
            onChange={setSize}
            options={SIZE_PRESETS}
            style={{ width: "100%" }}
            aria-label="尺寸"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">候选数量</label>
          <Select
            value={count}
            onChange={setCount}
            options={[1, 2, 3, 4].map((n) => ({ value: n, label: `${n} 张` }))}
            style={{ width: "100%" }}
            aria-label="候选数量"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">模型</label>
          <Select
            value={model}
            onChange={setModel}
            options={[{ value: AUTO_MODEL, label: "自动 · 引擎路由" }, ...modelOptions]}
            style={{ width: "100%" }}
            aria-label="图像模型"
          />
          {modelOptions.length === 0 && (
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              {mode === "t2i"
                ? "引擎暂无 image_gen 模型：配置含 image_gen 能力的 provider 后自动出现"
                : "引擎暂无 image_edit 模型（如 gpt-image-1）：配置后自动出现"}
            </p>
          )}
        </div>

        <Button
          type="primary"
          block
          loading={isGenerating}
          disabled={missingInputs}
          onClick={handleGenerate}
          aria-label="生成图片"
        >
          {isGenerating ? "生成中…" : `生成 ${count} 张`}
        </Button>

        {/* History (TOOL-05 参数回溯 seed) */}
        <div>
          <h3 className="flex items-center gap-1 text-sm font-medium mb-2">
            <HistoryOutlined />
            生成历史
          </h3>
          {history.length === 0 ? (
            <p className="text-xs text-[var(--color-text-tertiary)]">
              每次生成保存完整参数快照，可一键恢复复跑
            </p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 10).map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => restoreFromHistory(entry)}
                  className="w-full text-left p-2 rounded-lg border border-(--color-border) hover:bg-(--color-bg-tertiary) transition-colors"
                  title="恢复参数与结果"
                >
                  <div className="flex items-center gap-2">
                    {entry.images[0] && (
                      <img
                        src={entry.images[0]}
                        alt=""
                        className="w-10 h-10 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate text-[var(--color-text-primary)]">
                        {entry.prompt}
                      </p>
                      <p className="text-xs text-[var(--color-text-tertiary)]">
                        {MODE_LABEL[entry.mode ?? "t2i"]} · {entry.size} · {entry.n} 张
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Workspace: mask editor for inpaint, results grid otherwise */}
      <div className="flex-1 overflow-y-auto p-6">
        {isGenerating ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--color-text-tertiary)]">
            <Spin size="large" />
            <p>正在生成…</p>
          </div>
        ) : mode === "inpaint" && baseImage && results.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
              <HighlightOutlined className="text-[var(--color-primary)]" />
              涂抹要重绘的区域
            </h3>
            <MaskEditor
              ref={maskEditorRef}
              baseImage={baseImage}
              strokes={strokes}
              onStrokesChange={setStrokes}
            />
          </div>
        ) : results.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Empty
              description={
                mode === "t2i"
                  ? "输入描述，开始你的第一张图"
                  : mode === "i2i"
                    ? "上传参考图并描述想要的调整"
                    : "上传底图或对候选「重绘此图」，涂抹后生成"
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 max-w-4xl">
            <AntImage.PreviewGroup>
              {results.map((dataUrl, index) => (
                <figure
                  key={index}
                  className="relative group rounded-xl overflow-hidden border border-(--color-border)"
                >
                  {/* 点选放大 (TOOL-01 四宫格候选): antd preview lightbox. */}
                  <AntImage
                    src={dataUrl}
                    alt={`候选 ${index + 1}`}
                    className="w-full cursor-zoom-in"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 p-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                  <Tooltip title="以此为底稿局部重绘">
                    <Button
                      size="small"
                      icon={<FormatPainterOutlined />}
                      onClick={() => repaintCandidate(dataUrl)}
                      aria-label={`重绘候选 ${index + 1}`}
                    />
                  </Tooltip>
                  <Tooltip title="下载（按命名规则）">
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => download(dataUrl, index + 1)}
                      aria-label={`下载候选 ${index + 1}`}
                    />
                  </Tooltip>
                  <Tooltip title="复制 Prompt">
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => {
                        void navigator.clipboard?.writeText(prompt);
                        message.success("Prompt 已复制");
                      }}
                      aria-label={`复制提示词 ${index + 1}`}
                    />
                  </Tooltip>
                </figcaption>
                </figure>
              ))}
            </AntImage.PreviewGroup>
          </div>
        )}
      </div>

      {/* ONBOARD-03: 存为模板 / 继续探索 */}
      <FirstOutputDialog
        open={firstOutputOpen}
        templateName="生图"
        templateBody="{{提示词}}（尺寸 {{尺寸}}）"
        onClose={() => setFirstOutputOpen(false)}
      />
    </div>
  );
}
