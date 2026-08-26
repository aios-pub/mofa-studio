/**
 * 解题答疑 (TOOL-16): 拍照/上传题目 → 识图模型（vlm）分步讲解 →
 * KaTeX 公式渲染。边界声明: 只做拍照解题+讲解，不含错题本等教育闭环。
 * 需要引擎配置 vlm 能力模型；未配置时呈现诚实错误。
 */

import { useRef, useState } from "react";
import { Button, Input, Select, Spin, Upload, message } from "antd";
import { CameraOutlined, CopyOutlined, SolutionOutlined } from "@ant-design/icons";
import { MarkdownRenderer } from "@/components/common";
import { chatService } from "@/services/api/chat";
import { SUBJECTS, buildSolverPrompt, validateSolverInput } from "@/utils/solverPrompt";

export default function SolverPage() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [subject, setSubject] = useState(SUBJECTS[0].id);
  const [extraNote, setExtraNote] = useState("");
  const [solution, setSolution] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  const pickImage = (file: File) => {
    if (!file.type.startsWith("image/")) {
      message.warning("请上传图片（拍照或截图）");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const solve = async () => {
    const check = validateSolverInput(Boolean(imageDataUrl), subject);
    if (!check.ok) {
      message.warning(check.reason);
      return;
    }
    setLoading(true);
    setSolution(null);
    try {
      const response = await chatService.chat({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: buildSolverPrompt(subject, extraNote) },
              { type: "image_url", image_url: { url: imageDataUrl! } },
            ],
          },
        ],
      });
      if (!response.content?.trim()) {
        message.error("模型没有返回内容（检查 vlm 模型配置）");
        return;
      }
      setSolution(response.content);
    } catch (error) {
      message.error(`讲解失败：${error instanceof Error ? error.message : error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-[var(--color-text-primary)]">
          <SolutionOutlined className="text-[var(--color-primary)]" />
          解题答疑
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          拍照上传题目，识图模型分步讲解（公式自动排版）；支持数学 / 物理 / 化学
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-(--color-border) p-4" aria-label="题目输入">
        <div className="flex items-start gap-3">
          {imageDataUrl ? (
            <div className="space-y-1">
              <img
                src={imageDataUrl}
                alt="题目照片"
                className="max-h-48 rounded-lg border border-(--color-border)"
              />
              <Button size="small" onClick={() => uploadRef.current?.click()} aria-label="更换题目照片">
                重拍/更换
              </Button>
            </div>
          ) : (
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={(file) => {
                pickImage(file);
                return false;
              }}
            >
              <Button icon={<CameraOutlined />} aria-label="上传题目照片">
                拍照 / 上传题目
              </Button>
            </Upload>
          )}
          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) pickImage(file);
              e.target.value = "";
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-32">
            <Select
              value={subject}
              onChange={setSubject}
              options={SUBJECTS.map((s) => ({ value: s.id, label: s.label }))}
              style={{ width: "100%" }}
              aria-label="学科选择"
            />
          </div>
          <Input
            value={extraNote}
            onChange={(e) => setExtraNote(e.target.value)}
            placeholder="补充说明（可选），如：第二问没看懂"
            aria-label="补充说明"
          />
          <Button
            type="primary"
            loading={loading}
            disabled={!imageDataUrl}
            onClick={() => void solve()}
            aria-label="开始讲解"
          >
            讲解
          </Button>
        </div>
      </section>

      {loading && (
        <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
          <Spin /> 正在识别题目并生成分步讲解…
        </div>
      )}

      {solution && (
        <section className="space-y-2" aria-label="讲解结果">
          <div className="flex justify-end">
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => {
                void navigator.clipboard?.writeText(solution);
                message.success("讲解已复制");
              }}
              aria-label="复制讲解"
            >
              复制
            </Button>
          </div>
          <div className="rounded-xl border border-(--color-border) p-4">
            <MarkdownRenderer content={solution} math />
          </div>
        </section>
      )}
    </div>
  );
}
