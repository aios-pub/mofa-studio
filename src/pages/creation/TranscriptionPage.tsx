import { useTranslation } from "react-i18next";
/**
 * Recording transcription workspace (TOOL-11): record or upload audio →
 * speaker-separated transcript with timestamps → LLM minutes (概要/待办) →
 * one-click handoff to AI sheets (todo CSV) or PPT (slide payload).
 */

import { useCallback, useRef, useState } from "react";
import { Button, Empty, Tag, Upload, message } from "antd";
import {
  AudioOutlined,
  UploadOutlined,
  FileTextOutlined,
  TableOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import {
  formatTimestamp,
  minutesToSlide,
  transcriptionService,
  todosToCsv,
  type Minutes,
  type SpeakerTurn,
} from "@/services/api/transcription";
import { recordingSupported } from "@/services/api/audio";
import { parseCsv } from "@/services/api/sheets";

export default function TranscriptionPage() {  const { t } = useTranslation();

  const [turns, setTurns] = useState<SpeakerTurn[]>([]);
  const [minutes, setMinutes] = useState<Minutes | null>(null);
  const [busy, setBusy] = useState<"transcribing" | "minutes" | null>(null);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleBlob = useCallback(async (blob: Blob) => {
    if (blob.size === 0) return;
    setBusy("transcribing");
    setTurns([]);
    setMinutes(null);
    try {
      const result = await transcriptionService.transcribe(blob);
      setTurns(result.turns.length > 0 ? result.turns : [{ speaker: "A", text: result.raw, startSec: 0 }]);
      message.success(t("转写完成（{{p0}} 字）", { p0: result.raw.length }));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(t("转写失败：{{p0}}", { p0: detail }));
    } finally {
      setBusy(null);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void handleBlob(new Blob(chunksRef.current, { type: "audio/webm" }));
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (error) {
      message.warning(t("无法访问麦克风，请检查系统权限"));
      console.error(error);
    }
  }, [recording, handleBlob]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || !recording) return;
    setRecording(false);
    recorder.stop();
    recorderRef.current = null;
  }, [recording]);

  const generateMinutes = useCallback(async () => {
    if (turns.length === 0 || busy) return;
    setBusy("minutes");
    try {
      const result = await transcriptionService.minutes(turns);
      setMinutes(result);
      message.success(t("纪要已生成"));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(t("纪要生成失败：{{p0}}", { p0: detail }));
    } finally {
      setBusy(null);
    }
  }, [turns, busy]);

  const exportTodosCsv = useCallback(() => {
    if (!minutes) return;
    const csv = todosToCsv(minutes.todos);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "会议待办.csv";
    link.click();
    URL.revokeObjectURL(url);
    // Verify the CSV re-imports through the sheets parser (闭环自证).
    const parsed = parseCsv(csv);
    if (parsed.columns[0] !== "事项") {
      message.warning(t("导出的 CSV 结构异常"));
    }
  }, [minutes]);

  const exportSlide = useCallback(() => {
    if (!minutes) return;
    const slide = minutesToSlide(minutes, "会议纪要");
    const blob = new Blob([JSON.stringify(slide, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "会议纪要-大纲.json";
    link.click();
    URL.revokeObjectURL(url);
  }, [minutes]);

  return (
    <div className="flex h-full">
      {/* Panel */}
      <div className="w-64 border-r border-(--color-border) p-4 space-y-4 overflow-y-auto">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
          <AudioOutlined className="text-[var(--color-primary)]" />
          录音转写
        </h2>

        <Upload
          accept="audio/*"
          showUploadList={false}
          beforeUpload={(file) => {
            void handleBlob(file);
            return false;
          }}
        >
          <Button block icon={<UploadOutlined />} aria-label={t("上传音频")}>
            上传音频文件
          </Button>
        </Upload>

        {recordingSupported() && (
          <Button
            block
            danger={recording}
            icon={<AudioOutlined />}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onClick={stopRecording}
            loading={busy === "transcribing"}
            aria-label={recording ? "停止录音" : "按住录音"}
          >
            {recording ? "录音中…松手结束" : "按住录音"}
          </Button>
        )}

        <Button
          block
          type="primary"
          icon={<FileTextOutlined />}
          disabled={turns.length === 0 || busy !== null}
          loading={busy === "minutes"}
          onClick={generateMinutes}
          aria-label={t("生成纪要")}
        >
          生成纪要（概要+待办）
        </Button>

        {minutes && (
          <div className="space-y-2 pt-2 border-t border-(--color-border)">
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">{t("纪要")}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{minutes.summary}</p>
            {minutes.todos.length > 0 && (
              <ul className="text-xs text-[var(--color-text-tertiary)] list-disc pl-4 space-y-0.5">
                {minutes.todos.map((todo, index) => (
                  <li key={index}>{todo}</li>
                ))}
              </ul>
            )}
            <Button
              block
              size="small"
              icon={<TableOutlined />}
              onClick={exportTodosCsv}
              aria-label={t("待办导出 CSV")}
            >
              待办 → AI 表格 CSV
            </Button>
            <Button
              block
              size="small"
              icon={<DownloadOutlined />}
              onClick={exportSlide}
              aria-label={t("纪要导出 PPT 大纲")}
            >
              纪要 → PPT 大纲
            </Button>
          </div>
        )}

        <p className="text-xs text-[var(--color-text-tertiary)]">
          说话人分离为启发式（A/B 交替）；接入 FunASR 类分离模型后升级。
        </p>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto p-6">
        {turns.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Empty description="上传或录制音频，开始转写" />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-2">
            {turns.map((turn, index) => (
              <div
                key={index}
                className={`flex gap-3 ${turn.speaker === "B" ? "flex-row-reverse" : ""}`}
              >
                <Tag color={turn.speaker === "A" ? "blue" : "green"}>说话人{turn.speaker}</Tag>
                <div className="flex-1">
                  <p className="text-sm text-[var(--color-text-primary)]">{turn.text}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    {formatTimestamp(turn.startSec)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
