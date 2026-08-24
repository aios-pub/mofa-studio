/**
 * Media toolbox page (TOOL-13/14/15): upload once, then convert video→GIF,
 * transcode to platform profiles, or compress an image to a target size —
 * each result previews inline and downloads.
 */

import { useCallback, useState } from "react";
import { Button, InputNumber, Select, Upload, message, Empty, Tag } from "antd";
import {
  ToolOutlined,
  UploadOutlined,
  DownloadOutlined,
  FileImageOutlined,
} from "@ant-design/icons";
import {
  TRANSCODE_PROFILES,
  formatSize,
  mediaService,
  resultKind,
  type MediaResult,
  type UploadResult,
} from "@/services/api/media";

export default function MediaPage() {
  const [source, setSource] = useState<UploadResult | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [isImage, setIsImage] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<MediaResult | null>(null);
  const [gifFps, setGifFps] = useState(12);
  const [gifWidth, setGifWidth] = useState(480);
  const [profile, setProfile] = useState<string>("web_720");
  const [targetKb, setTargetKb] = useState(200);

  const onUpload = useCallback(async (file: File) => {
    try {
      const uploaded = await mediaService.upload(file);
      setSource(uploaded);
      setSourceName(file.name);
      setIsImage(file.type.startsWith("image/"));
      setResult(null);
      message.success(`已上传 ${file.name}（${formatSize(uploaded.size)}）`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(`上传失败：${detail}`);
    }
  }, []);

  const runOp = useCallback(
    async (op: "gif" | "transcode" | "compress") => {
      if (!source || busy) return;
      setBusy(op);
      setResult(null);
      try {
        let outcome: MediaResult;
        if (op === "gif") {
          outcome = await mediaService.toGif(source.path, gifFps, gifWidth);
        } else if (op === "transcode") {
          outcome = await mediaService.transcode(source.path, profile);
        } else {
          outcome = await mediaService.compressImage(source.path, targetKb, source.size);
        }
        setResult(outcome);
        const note =
          op === "compress"
            ? `已压缩到 ${formatSize(outcome.size)}（质量 ${outcome.quality}，原始 ${formatSize(source.size)}）`
            : `已生成（${formatSize(outcome.size)}）`;
        message.success(note);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        message.error(`处理失败：${detail}`);
      } finally {
        setBusy(null);
      }
    },
    [source, busy, gifFps, gifWidth, profile, targetKb],
  );

  const kind = result ? resultKind(result.mime) : "other";

  return (
    <div className="flex h-full">
      {/* Panel */}
      <div className="w-72 border-r border-(--color-border) p-4 space-y-4 overflow-y-auto">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
          <ToolOutlined className="text-[var(--color-primary)]" />
          媒体处理
        </h2>

        <Upload
          accept="video/*,image/*"
          showUploadList={false}
          beforeUpload={(file) => {
            void onUpload(file);
            return false;
          }}
        >
          <Button block icon={<UploadOutlined />} aria-label="上传文件">
            上传视频 / 图片
          </Button>
        </Upload>
        {source && (
          <p className="text-xs text-[var(--color-text-tertiary)] truncate">
            已选：{sourceName}（{formatSize(source.size)}）
          </p>
        )}

        <div className="space-y-2 pt-2 border-t border-(--color-border)">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">视频 → GIF</p>
          <div className="flex gap-2">
            <InputNumber
              min={1}
              max={30}
              value={gifFps}
              onChange={(v) => setGifFps(v ?? 12)}
              addonBefore="fps"
              style={{ width: "50%" }}
              aria-label="GIF 帧率"
            />
            <InputNumber
              min={120}
              max={1280}
              step={40}
              value={gifWidth}
              onChange={(v) => setGifWidth(v ?? 480)}
              addonBefore="宽"
              style={{ width: "50%" }}
              aria-label="GIF 宽度"
            />
          </div>
          <Button
            block
            disabled={!source || isImage || busy !== null}
            loading={busy === "gif"}
            onClick={() => runOp("gif")}
            aria-label="转换为 GIF"
          >
            转换为 GIF（palette 两遍）
          </Button>
        </div>

        <div className="space-y-2 pt-2 border-t border-(--color-border)">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">视频转码</p>
          <Select
            value={profile}
            onChange={setProfile}
            options={TRANSCODE_PROFILES.map((p) => ({ value: p.value, label: p.label }))}
            style={{ width: "100%" }}
            aria-label="转码预设"
          />
          <Button
            block
            disabled={!source || isImage || busy !== null}
            loading={busy === "transcode"}
            onClick={() => runOp("transcode")}
            aria-label="转码"
          >
            转码
          </Button>
        </div>

        <div className="space-y-2 pt-2 border-t border-(--color-border)">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">图片压缩</p>
          <InputNumber
            min={5}
            max={10000}
            value={targetKb}
            onChange={(v) => setTargetKb(v ?? 200)}
            addonBefore="目标"
            addonAfter="KB"
            style={{ width: "100%" }}
            aria-label="压缩目标体积"
          />
          <Button
            block
            disabled={!source || !isImage || busy !== null}
            loading={busy === "compress"}
            onClick={() => runOp("compress")}
            icon={<FileImageOutlined />}
            aria-label="压缩图片"
          >
            压缩（二分质量搜索）
          </Button>
        </div>
      </div>

      {/* Result */}
      <div className="flex-1 overflow-auto p-6">
        {!result ? (
          <div className="h-full flex items-center justify-center">
            <Empty description="上传文件后选择处理方式" />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Tag color="blue">{result.mime}</Tag>
              <span className="text-[var(--color-text-secondary)]">
                {formatSize(result.size)}
                {result.quality !== undefined && ` · 质量 ${result.quality}`}
                {source && result.mime === "image/jpeg" && ` · 原始 ${formatSize(source.size)}`}
              </span>
            </div>
            {kind === "image" && (
              <img
                src={result.data_url}
                alt="处理结果"
                className="max-w-full rounded-xl border border-(--color-border)"
              />
            )}
            {kind === "video" && (
              <video
                src={result.data_url}
                controls
                className="w-full rounded-xl border border-(--color-border)"
                aria-label="处理后的视频"
              />
            )}
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => mediaService.download(result, `processed.${result.mime.split("/")[1]}`)}
              aria-label="下载结果"
            >
              下载结果
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
