/**
 * Image generation workspace (TOOL-01 core loop + TOOL-04 size presets).
 *
 * Prompt → N candidates at a chosen platform size, results grid with
 * download using the TOOL-04 naming rule, and a local generation history
 * with full parameter snapshots (TOOL-05 seed).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FirstOutputDialog } from "@/components/onboarding/FirstRunGuide";
import {
  hasFirstOutput,
  markFirstOutput,
  queryRecord,
} from "@/components/onboarding/firstRunCases";
import { Button, Input, Select, Spin, message, Empty, Tooltip } from "antd";
import {
  PictureOutlined,
  DownloadOutlined,
  HistoryOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import {
  SIZE_PRESETS,
  exportFilename,
  imageService,
  type ImageGenHistoryEntry,
} from "@/services/api/image";
import { AUTO_MODEL, engineService } from "@/services/api/engine";
import { recordImageAssets } from "@/services/api/assets";

const HISTORY_KEY = "mofa-studio-image-history";
const HISTORY_LIMIT = 50;

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

export default function ImageGenPage() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState(SIZE_PRESETS[0].value);
  const [count, setCount] = useState(4);
  const [model, setModel] = useState(AUTO_MODEL);
  const [imageModels, setImageModels] = useState<Array<{ value: string; label: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [history, setHistory] = useState<ImageGenHistoryEntry[]>(loadHistory);
  const [firstOutputOpen, setFirstOutputOpen] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    void engineService.listModels().then((models) => {
      const imageCaps = models.filter((m) => m.capability === "image_gen");
      setImageModels(imageCaps.map((m) => ({ value: m.id, label: m.id })));
    });
  }, []);

  const handleGenerateFor = useCallback(
    async (promptOverride?: string, sizeOverride?: string) => {
      const effectivePrompt = (promptOverride ?? prompt).trim();
      const effectiveSize =
        sizeOverride && SIZE_PRESETS.some((p) => p.value === sizeOverride)
          ? sizeOverride
          : size;
      if (!effectivePrompt || isGenerating) return;
      setIsGenerating(true);
      setResults([]);
      try {
        const response = await imageService.generate({
          prompt: effectivePrompt,
          model: model === AUTO_MODEL ? undefined : model,
          n: count,
          size: effectiveSize,
        });
        setResults(response.images);
        // PLAT-06: every generated image lands in the unified asset model.
        void recordImageAssets("studio", effectivePrompt, response.images, {
          size: effectiveSize,
          model: response.model_used,
        });
        if (!hasFirstOutput() && response.images.length > 0) {
          markFirstOutput();
          setFirstOutputOpen(true);
        }
        if (response.images.length === 0) {
          message.warning("引擎没有返回图片，请检查 image_gen 模型配置");
        }
        const entry: ImageGenHistoryEntry = {
          id: `img-${Date.now()}`,
          prompt: effectivePrompt,
          model: response.model_used ?? model,
          n: count,
          size: effectiveSize,
          created_at: new Date().toISOString(),
          images: response.images,
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
    },
    [prompt, isGenerating, model, count, size],
  );

  const handleGenerate = useCallback(() => handleGenerateFor(), [handleGenerateFor]);

  const handleGenerateRef = useRef(handleGenerateFor);
  handleGenerateRef.current = handleGenerateFor;

  // ONBOARD-03: 「做同款」cases arrive with prefilled params and run=1.
  useEffect(() => {
    const params = queryRecord(window.location.search);
    if (params.prompt) setPrompt(params.prompt);
    if (params.size && SIZE_PRESETS.some((p) => p.value === params.size)) {
      setSize(params.size);
    }
    if (params.run === "1" && params.prompt) {
      void handleGenerateRef.current?.(params.prompt, params.size);
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
    message.info("已恢复该次生成的参数与结果");
  }, []);

  return (
    <div className="flex h-full">
      {/* Control panel */}
      <div className="w-80 border-r border-(--color-border) p-4 space-y-4 overflow-y-auto">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
          <PictureOutlined className="text-[var(--color-primary)]" />
          图像生成
        </h2>

        <div>
          <label className="block text-sm font-medium mb-1">描述（Prompt）</label>
          <Input.TextArea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例如：一只橘猫坐在洒满阳光的窗台上，胶片质感"
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
            options={[
              { value: AUTO_MODEL, label: "自动 · 引擎路由" },
              ...imageModels,
            ]}
            style={{ width: "100%" }}
            aria-label="图像模型"
          />
          {imageModels.length === 0 && (
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              引擎暂无 image_gen 模型：配置含 image_gen 能力的 provider 后自动出现
            </p>
          )}
        </div>

        <Button
          type="primary"
          block
          loading={isGenerating}
          disabled={!prompt.trim()}
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
                        {entry.size} · {entry.n} 张 · {entry.model}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isGenerating ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--color-text-tertiary)]">
            <Spin size="large" />
            <p>正在生成…</p>
          </div>
        ) : results.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Empty description="输入描述，开始你的第一张图" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 max-w-4xl">
            {results.map((dataUrl, index) => (
              <figure
                key={index}
                className="relative group rounded-xl overflow-hidden border border-(--color-border)"
              >
                <img src={dataUrl} alt={`候选 ${index + 1}`} className="w-full" />
                <figcaption className="absolute inset-x-0 bottom-0 p-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
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
