/**
 * PPT generation workspace (TOOL-07): outline-first — the LLM drafts an
 * editable outline, the user confirms, then each page's content is
 * generated into a slide schema and exported via pptxgenjs (PRD 08-R2
 * Plan B: direct generation + read-only preview). Five theme packs.
 */

import { useCallback, useState } from "react";
import { Button, Empty, Input, InputNumber, Select, Spin, Tag, message } from "antd";
import {
  FileImageOutlined,
  CheckOutlined,
  DownloadOutlined,
  RedoOutlined,
} from "@ant-design/icons";
import {
  PPT_THEMES,
  exportPptx,
  generateOutline,
  generateSlideContent,
  themeById,
  type SlideOutlineItem,
} from "@/services/api/ppt";
import { AUTO_MODEL } from "@/services/api/engine";
import { loadPolicy, resolveModel } from "@/services/api/modelPolicy";
import { ModelPicker } from "@/components/conversation";

type Phase = "input" | "outline" | "generating" | "done";

export default function PptGenPage() {
  const [topic, setTopic] = useState("");
  const [pageCount, setPageCount] = useState(8);
  const [themeId, setThemeId] = useState(PPT_THEMES[0].id);
  const [model, setModel] = useState<string>(AUTO_MODEL);
  const [phase, setPhase] = useState<Phase>("input");
  const [outline, setOutline] = useState<SlideOutlineItem[]>([]);
  const [deckTitle, setDeckTitle] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progressNote, setProgressNote] = useState("");

  const draftOutline = useCallback(async () => {
    const trimmed = topic.trim();
    if (!trimmed || phase === "generating") return;
    setPhase("generating");
    setProgressNote("正在生成大纲…");
    try {
      const items = await generateOutline(trimmed, pageCount, resolveModel("planner", model, loadPolicy()));
      setOutline(items);
      setDeckTitle(trimmed);
      setPhase("outline");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(`大纲生成失败：${detail}`);
      setPhase("input");
    }
  }, [topic, pageCount, model, phase]);

  const confirmOutline = useCallback(async () => {
    if (phase !== "outline") return;
    setPhase("generating");
    try {
      const modelArg = resolveModel("planner", model, loadPolicy());
      const filled: SlideOutlineItem[] = [];
      // Page 0 stays as the cover (outline already carries the overview);
          // pages 1..n get full content generation.
          filled.push(outline[0]);
          for (let i = 1; i < outline.length; i += 1) {
            setProgressNote(`正在生成第 ${i + 1}/${outline.length} 页：${outline[i].title}`);
            // eslint-disable-next-line no-await-in-loop
            filled.push(await generateSlideContent(topic.trim(), outline[i], modelArg));
          }
      setOutline(filled);
      setCurrentSlide(0);
      setPhase("done");
      message.success("全部页面已生成，可导出 .pptx");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(`内容生成失败：${detail}`);
      setPhase("outline");
    }
  }, [phase, outline, topic, model]);

  const regenerateSlide = useCallback(async () => {
    if (phase !== "done" || currentSlide === 0) return;
    setPhase("generating");
    setProgressNote(`正在重新生成第 ${currentSlide + 1} 页…`);
    try {
      const fresh = await generateSlideContent(
        topic.trim(),
        outline[currentSlide],
        resolveModel("planner", model, loadPolicy()),
      );
      setOutline((prev) => prev.map((s, i) => (i === currentSlide ? fresh : s)));
      setPhase("done");
      message.success("该页已重新生成");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(`重新生成失败：${detail}`);
      setPhase("done");
    }
  }, [phase, currentSlide, outline, topic, model]);

  const download = useCallback(async () => {
    try {
      await exportPptx({ title: deckTitle, slides: outline }, themeId);
      message.success("已导出 .pptx（PowerPoint / WPS 可打开）");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(`导出失败：${detail}`);
    }
  }, [deckTitle, outline, themeId]);

  const theme = themeById(themeId);

  return (
    <div className="flex h-full">
      {/* Control panel */}
      <div className="w-80 border-r border-(--color-border) p-4 space-y-4 overflow-y-auto">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
          <FileImageOutlined className="text-[var(--color-primary)]" />
          PPT 生成
        </h2>

        <div>
          <label className="block text-sm font-medium mb-1">主题</label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="例如：橘猫智能产品发布会"
            aria-label="PPT 主题"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">页数</label>
          <InputNumber
            min={3}
            max={20}
            value={pageCount}
            onChange={(value) => setPageCount(value ?? 8)}
            style={{ width: "100%" }}
            aria-label="PPT 页数"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">主题模板</label>
          <Select
            value={themeId}
            onChange={setThemeId}
            options={PPT_THEMES.map((t) => ({
              value: t.id,
              label: (
                <span className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{ backgroundColor: `#${t.primary}` }}
                  />
                  {t.label}
                </span>
              ),
            }))}
            style={{ width: "100%" }}
            aria-label="主题模板选择"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">模型</label>
          <ModelPicker value={model} onChange={setModel} />
        </div>

        {phase === "input" && (
          <Button
            type="primary"
            block
            disabled={!topic.trim()}
            onClick={draftOutline}
            aria-label="生成大纲"
          >
            生成大纲
          </Button>
        )}
        {phase === "outline" && (
          <Button type="primary" block icon={<CheckOutlined />} onClick={confirmOutline} aria-label="确认大纲并生成内容">
            确认大纲，逐页生成
          </Button>
        )}
        {phase === "generating" && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
            <Spin size="small" /> {progressNote}
          </div>
        )}
        {phase === "done" && (
          <div className="space-y-2">
            <Button type="primary" block icon={<DownloadOutlined />} onClick={download} aria-label="导出 pptx">
              导出 .pptx
            </Button>
            <Button block icon={<RedoOutlined />} onClick={regenerateSlide} disabled={currentSlide === 0} aria-label="重新生成本页">
              重新生成本页
            </Button>
          </div>
        )}

        <p className="text-xs text-[var(--color-text-tertiary)]">
          大纲先行：先确认结构再逐页生成，省 token 且可控。
        </p>
      </div>

      {/* Preview / outline editor */}
      <div className="flex-1 overflow-y-auto p-6">
        {outline.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Empty description="输入主题，先生成大纲" />
          </div>
        ) : phase === "outline" ? (
          <div className="max-w-2xl mx-auto space-y-3">
            <p className="text-sm text-[var(--color-text-secondary)]">
              大纲（可编辑标题与要点，确认后逐页生成）
            </p>
            {outline.map((slide, index) => (
              <div
                key={index}
                className="p-3 rounded-xl border border-(--color-border) bg-[var(--color-bg-secondary)] space-y-2"
              >
                <Input
                  value={slide.title}
                  onChange={(e) =>
                    setOutline((prev) =>
                      prev.map((s, i) => (i === index ? { ...s, title: e.target.value } : s)),
                    )
                  }
                  aria-label={`大纲标题 ${index + 1}`}
                />
                <Input.TextArea
                  value={slide.points.join("\n")}
                  onChange={(e) =>
                    setOutline((prev) =>
                      prev.map((s, i) =>
                        i === index ? { ...s, points: e.target.value.split("\n") } : s,
                      ),
                    )
                  }
                  rows={3}
                  aria-label={`大纲要点 ${index + 1}`}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Slide thumbnail rail */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {outline.map((slide, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`flex-shrink-0 w-28 h-16 rounded-lg border text-xs p-1.5 text-left ${
                    index === currentSlide
                      ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]"
                      : "border-(--color-border)"
                  }`}
                  style={{ backgroundColor: `#${theme.background}`, color: `#${theme.text}` }}
                  aria-label={`预览第 ${index + 1} 页`}
                >
                  <span className="line-clamp-2">{slide.title}</span>
                </button>
              ))}
            </div>

            {/* Read-only preview of the selected slide */}
            <div
              className="aspect-video rounded-xl border border-(--color-border) p-8 relative"
              style={{ backgroundColor: `#${theme.background}` }}
              data-testid="slide-preview"
            >
              {currentSlide === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3">
                  <div
                    className="w-full h-full absolute inset-0 rounded-xl flex flex-col items-center justify-center"
                    style={{ backgroundColor: `#${theme.primary}` }}
                  >
                    <h2
                      className="text-3xl font-bold"
                      style={{ color: "#FFFFFF", fontFamily: theme.fontFace }}
                    >
                      {deckTitle || outline[0].title}
                    </h2>
                    {outline[0].points.length > 0 && (
                      <p className="mt-3 text-sm" style={{ color: `#${theme.accent}` }}>
                        {outline[0].points.join("  ·  ")}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <h3
                    className="text-2xl font-bold"
                    style={{ color: `#${theme.primary}`, fontFamily: theme.fontFace }}
                  >
                    {outline[currentSlide].title}
                  </h3>
                  <div
                    className="mt-2 h-1 w-12 rounded"
                    style={{ backgroundColor: `#${theme.accent}` }}
                  />
                  <ul className="mt-5 space-y-3">
                    {outline[currentSlide].points.map((point, i) => (
                      <li
                        key={i}
                        className="text-base flex gap-2"
                        style={{ color: `#${theme.text}`, fontFamily: theme.fontFace }}
                      >
                        <span style={{ color: `#${theme.accent}` }}>•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <span className="absolute bottom-3 right-4 text-xs" style={{ color: `#${theme.accent}` }}>
                {currentSlide + 1} / {outline.length}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              <Tag>只读预览</Tag> 导出 .pptx 后可在 PowerPoint / WPS 中继续编辑。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
