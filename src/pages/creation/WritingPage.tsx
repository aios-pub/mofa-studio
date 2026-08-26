import { useTranslation } from "react-i18next";
/**
 * AI writing workspace (TOOL-06): genre templates → streamed draft into a
 * TipTap editor (Markdown source), a floating AI menu over the selection
 * (续写/改写/扩写/缩写), and a word counter with platform limit hints.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FirstOutputDialog } from "@/components/onboarding/FirstRunGuide";
import {
  hasFirstOutput,
  markFirstOutput,
  queryRecord,
} from "@/components/onboarding/firstRunCases";
import { Button, Input, Select, Spin, message, Tooltip } from "antd";
import { EditOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Editor, EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import {
  GENRE_TEMPLATES,
  TRANSFORM_LABELS,
  buildDraftMessages,
  buildTransformMessages,
  countWords,
  genreById,
  streamWriting,
  type TransformOp,
} from "@/services/api/writing";
import { AUTO_MODEL } from "@/services/api/engine";
import { loadPolicy, resolveModel } from "@/services/api/modelPolicy";
import { ModelPicker } from "@/components/conversation";

interface FloatingMenu {
  top: number;
  left: number;
}

export default function WritingPage() {  const { t } = useTranslation();

  const [genre, setGenre] = useState(GENRE_TEMPLATES[0].id);
  const [topic, setTopic] = useState("");
  const [requirements, setRequirements] = useState("");
  const [model, setModel] = useState<string>(AUTO_MODEL);
  const [isGenerating, setIsGenerating] = useState(false);
  const [busyOp, setBusyOp] = useState<TransformOp | "draft" | null>(null);
  const [menu, setMenu] = useState<FloatingMenu | null>(null);
  const [firstOutputOpen, setFirstOutputOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [searchParams] = useSearchParams();

  // ONBOARD-03: 「做同款」cases arrive with genre/topic prefilled + run=1.
  useEffect(() => {
    const params = queryRecord(window.location.search);
    if (
      params.genre &&
      GENRE_TEMPLATES.some((g) => g.id === params.genre)
    ) {
      setGenre(params.genre);
    }
    if (params.topic) setTopic(params.topic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: t("生成初稿后在此编辑，选中文字唤起 AI 菜单…") }),
      Markdown.configure({ html: false }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[300px] px-4 py-3 focus:outline-none",
        "aria-label": "写作编辑器",
      },
    },
  });

  const markdown = editor?.storage.markdown?.getMarkdown() as string | undefined;
  const wordCount = countWords(markdown ?? "");
  const activeGenre = genreById(genre);

  // Floating menu follows the selection.
  useEffect(() => {
    if (!editor) return;
    const updateMenu = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty || busyOp) {
        setMenu(null);
        return;
      }
      const domAtPos = editor.view.domAtPos(from);
      const anchor = (domAtPos.node as HTMLElement).parentElement;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      setMenu({ top: rect.top - 44, left: rect.left + 24 });
    };
    editor.on("selectionUpdate", updateMenu);
    editor.on("blur", () => setTimeout(() => setMenu(null), 200));
    return () => {
      editor.off("selectionUpdate", updateMenu);
    };
  }, [editor, busyOp]);

  const autoRunRef = useRef(false);
  const runDraftRef = useRef<() => void>(() => {});

  const runDraft = useCallback(async () => {
    const trimmed = topic.trim();
    if (!trimmed || isGenerating || !editor) return;
    setIsGenerating(true);
    setBusyOp("draft");
    abortRef.current = new AbortController();
    editor.commands.clearContent();
    try {
      await streamWriting(
        buildDraftMessages(genre, trimmed, requirements),
        resolveModel("planner", model, loadPolicy()),
        (delta) => {
          editor.commands.insertContent(delta);
        },
        abortRef.current.signal,
      );
      message.success(t("初稿已生成"));
      if (!hasFirstOutput()) {
        markFirstOutput();
        setFirstOutputOpen(true);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(t("生成失败：{{p0}}", { p0: detail }));
    } finally {
      setIsGenerating(false);
      setBusyOp(null);
    }
  }, [topic, isGenerating, editor, genre, requirements, model]);

  runDraftRef.current = () => void runDraft();

  // ONBOARD-03 auto-run fires once, after prefill has committed.
  useEffect(() => {
    const params = queryRecord(window.location.search);
    if (params.run === "1" && params.topic && !autoRunRef.current) {
      autoRunRef.current = true;
      runDraftRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  const runTransform = useCallback(
    async (op: TransformOp) => {
      if (!editor || busyOp) return;
      const { from, to, empty } = editor.state.selection;
      if (empty) return;
      const selection = editor.state.doc.textBetween(from, to, "\n");
      const fullDoc = (editor.storage.markdown?.getMarkdown() as string) ?? "";

      setBusyOp(op);
      setMenu(null);
      abortRef.current = new AbortController();

      // rewrite/expand/shrink replace the selection; continue appends after it.
      if (op !== "continue") {
        editor.chain().focus().deleteRange({ from, to }).run();
      }
      const insertPos = op === "continue" ? to : from;
      try {
        await streamWriting(
          buildTransformMessages(op, selection, fullDoc),
          resolveModel("planner", model, loadPolicy()),
          (delta) => {
            editor.commands.insertContentAt(insertPos, delta);
          },
          abortRef.current.signal,
        );
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        message.error(t("{{p0}}失败：{{p1}}", { p0: TRANSFORM_LABELS[op], p1: detail }));
        // Restore the original text on failure for destructive ops.
        if (op !== "continue") {
          editor.commands.insertContentAt(insertPos, selection);
        }
      } finally {
        setBusyOp(null);
      }
    },
    [editor, busyOp, model],
  );

  const downloadMarkdown = useCallback(() => {
    const content = (editor?.storage.markdown?.getMarkdown() as string) ?? "";
    if (!content.trim()) {
      message.warning(t("还没有内容可导出"));
      return;
    }
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${topic.trim().slice(0, 30) || "draft"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }, [editor, topic]);

  return (
    <div className="flex h-full relative">
      {/* Control panel */}
      <div className="w-80 border-r border-(--color-border) p-4 space-y-4 overflow-y-auto">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
          <EditOutlined className="text-[var(--color-primary)]" />
          AI 写作
        </h2>

        <div>
          <label className="block text-sm font-medium mb-1">{t("体裁模板")}</label>
          <Select
            value={genre}
            onChange={setGenre}
            options={GENRE_TEMPLATES.map((g) => ({ value: g.id, label: g.label }))}
            style={{ width: "100%" }}
            aria-label={t("体裁模板")}
          />
          {activeGenre && (
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              {activeGenre.limitHint}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t("主题")}</label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t("例如：新手露营装备怎么选")}
            aria-label={t("写作主题")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t("补充要求（可选）")}</label>
          <Input.TextArea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder={t("语气、受众、必须包含的点…")}
            rows={3}
            aria-label={t("补充要求")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t("模型")}</label>
          <ModelPicker value={model} onChange={setModel} />
        </div>

        <Button
          type="primary"
          block
          loading={isGenerating}
          disabled={!topic.trim()}
          onClick={runDraft}
          icon={<ThunderboltOutlined />}
          aria-label={t("生成初稿")}
        >
          生成初稿
        </Button>

        <Button block onClick={downloadMarkdown} aria-label={t("导出 Markdown")}>
          导出 Markdown
        </Button>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-2 border-b border-(--color-border) flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
          <span>
            字数：{wordCount}
            {activeGenre && wordCount > activeGenre.targetLength * 2 && (
              <span className="ml-2 text-amber-500">
                已超过建议篇幅的 2 倍，注意平台限制
              </span>
            )}
          </span>
          {busyOp && (
            <span className="flex items-center gap-1">
              <Spin size="small" />
              {busyOp === "draft" ? "生成初稿中…" : t("{{p0}}中…", { p0: TRANSFORM_LABELS[busyOp] })}
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto bg-[var(--color-bg-secondary)] rounded-xl border border-(--color-border)">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* ONBOARD-03: 存为模板 / 继续探索 */}
      <FirstOutputDialog
        open={firstOutputOpen}
        templateName={activeGenre?.id === "xiaohongshu" ? "小红书" : "写作"}
        templateBody={`按${activeGenre?.label ?? "指定"}体裁写一篇关于{{主题}}的文章`}
        onClose={() => setFirstOutputOpen(false)}
      />

      {/* Floating AI menu over the selection */}
      {menu && !busyOp && (
        <div
          className="fixed z-40 flex gap-1 px-2 py-1 rounded-lg bg-[var(--color-bg-primary)] border border-(--color-border) shadow-lg"
          style={{ top: menu.top, left: menu.left }}
          role="toolbar"
          aria-label={t("AI 文本处理")}
        >
          {(Object.keys(TRANSFORM_LABELS) as TransformOp[]).map((op) => (
            <Tooltip key={op} title={`AI ${TRANSFORM_LABELS[op]}`}>
              <Button
                size="small"
                onClick={() => void runTransform(op)}
                aria-label={`AI${TRANSFORM_LABELS[op]}`}
              >
                {TRANSFORM_LABELS[op]}
              </Button>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}
