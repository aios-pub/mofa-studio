/**
 * Video generation workspace (TOOL-02): prompt → async task cards with
 * live polling, inline playback on completion, gallery recording, and
 * model picker filtered to video-capable models.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Empty, Input, Select, Tag, message } from "antd";
import {
  VideoCameraOutlined,
  DownloadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  VIDEO_SIZES,
  isTerminal,
  videoService,
  type VideoTask,
} from "@/services/api/video";
import { AUTO_MODEL, engineService } from "@/services/api/engine";
import { ModelPicker } from "@/components/conversation";

const STATUS_META: Record<
  VideoTask["status"],
  { label: string; color: string }
> = {
  queued: { label: "排队中", color: "default" },
  running: { label: "生成中…", color: "processing" },
  succeeded: { label: "已完成", color: "success" },
  failed: { label: "失败", color: "error" },
};

/** Task cards survive page navigation in this session. */
const taskStore = new Map<string, VideoTask>();

export default function VideoGenPage() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState(VIDEO_SIZES[0].value);
  const [duration, setDuration] = useState(5);
  const [model, setModel] = useState<string>(AUTO_MODEL);
  const [videoModels, setVideoModels] = useState<Array<{ value: string; label: string }>>([]);
  const [tasks, setTasks] = useState<VideoTask[]>([]);
  const pollTimers = useRef<Set<string>>(new Set());

  useEffect(() => {
    void engineService.listModels().then((models) => {
      const caps = models.filter((m) => m.capability === "video_gen");
      setVideoModels(caps.map((m) => ({ value: m.id, label: m.id })));
    });
  }, []);

  const syncTask = useCallback((task: VideoTask) => {
    taskStore.set(task.task_id, task);
    setTasks((prev) => {
      const next = prev.some((t) => t.task_id === task.task_id)
        ? prev.map((t) => (t.task_id === task.task_id ? task : t))
        : [task, ...prev];
      return next;
    });
    if (isTerminal(task.status)) {
      pollTimers.current.delete(task.task_id);
      if (task.status === "succeeded") {
        void videoService.recordAsset(task);
      }
    }
  }, []);

  const submit = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    try {
      const submitted = await videoService.submit({
        prompt: trimmed,
        model: model === AUTO_MODEL ? undefined : model,
        size,
        duration,
      });
      const initial: VideoTask = {
        task_id: submitted.task_id,
        status: submitted.status,
        prompt: trimmed,
        model,
        video: null,
        error: null,
        created_at: new Date().toISOString(),
      };
      syncTask(initial);
      pollTimers.current.add(submitted.task_id);
      // Poll in the background; syncTask keeps the cards fresh.
      void videoService
        .pollUntilTerminal(submitted.task_id, syncTask, 3000, 200)
        .then((final) => {
          if (final.status === "succeeded") {
            message.success("视频已生成");
          } else if (final.status === "failed") {
            message.error(`生成失败：${final.error ?? "未知错误"}`);
          }
        });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(`提交失败：${detail}`);
    }
  }, [prompt, model, size, duration, syncTask]);

  const download = (task: VideoTask) => {
    if (!task.video) return;
    const link = document.createElement("a");
    link.href = task.video;
    link.download = `${task.prompt.slice(0, 20)}.mp4`;
    link.click();
  };

  return (
    <div className="flex h-full">
      {/* Control panel */}
      <div className="w-80 border-r border-(--color-border) p-4 space-y-4 overflow-y-auto">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
          <VideoCameraOutlined className="text-[var(--color-primary)]" />
          视频生成
        </h2>

        <div>
          <label className="block text-sm font-medium mb-1">描述（Prompt）</label>
          <Input.TextArea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例如：一只橘猫追激光笔，镜头跟随"
            rows={4}
            aria-label="视频描述"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">画面尺寸</label>
          <Select
            value={size}
            onChange={setSize}
            options={VIDEO_SIZES}
            style={{ width: "100%" }}
            aria-label="画面尺寸"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">时长（秒）</label>
          <Select
            value={duration}
            onChange={setDuration}
            options={[3, 5, 10].map((d) => ({ value: d, label: `${d} 秒` }))}
            style={{ width: "100%" }}
            aria-label="视频时长"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">模型</label>
          {videoModels.length > 0 ? (
            <Select
              value={model}
              onChange={setModel}
              options={[{ value: AUTO_MODEL, label: "自动 · 引擎路由" }, ...videoModels]}
              style={{ width: "100%" }}
              aria-label="视频模型"
            />
          ) : (
            <ModelPicker value={model} onChange={setModel} />
          )}
          {videoModels.length === 0 && (
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              引擎暂无 video_gen 模型：配置 video_task 厂商（如 DashScope Seedance）后自动出现
            </p>
          )}
        </div>

        <Button
          type="primary"
          block
          disabled={!prompt.trim()}
          onClick={submit}
          aria-label="提交生成"
        >
          生成视频（异步任务）
        </Button>

        <p className="text-xs text-[var(--color-text-tertiary)]">
          视频生成耗时较长：提交后以任务卡轮询进度，完成后可在此播放与下载。
        </p>
      </div>

      {/* Task cards */}
      <div className="flex-1 overflow-y-auto p-6">
        {tasks.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Empty description="输入描述，创建你的第一个视频任务" />
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl">
            {tasks.map((task) => {
              const meta = STATUS_META[task.status];
              return (
                <div
                  key={task.task_id}
                  className="rounded-xl border border-(--color-border) bg-[var(--color-bg-secondary)] p-4"
                  data-status={task.status}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-[var(--color-text-primary)] truncate">
                      {task.prompt}
                    </p>
                    <Tag color={meta.color}>{meta.label}</Tag>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                    {size} · {duration}s · {task.model || "自动"} ·{" "}
                    {task.created_at.slice(11, 19)}
                  </p>

                  {task.status === "running" && (
                    <div className="mt-3 h-1.5 rounded-full bg-(--color-bg-tertiary) overflow-hidden">
                      <div className="h-full w-1/3 bg-[var(--color-primary)] animate-pulse" />
                    </div>
                  )}

                  {task.status === "failed" && task.error && (
                    <p className="mt-2 text-xs text-red-400">失败原因：{task.error}</p>
                  )}

                  {task.status === "succeeded" && task.video && (
                    <div className="mt-3 space-y-2">
                      <video
                        src={task.video}
                        controls
                        className="w-full rounded-lg border border-(--color-border)"
                        aria-label={`生成的视频 ${task.prompt}`}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => download(task)}
                          aria-label={`下载视频 ${task.prompt}`}
                        >
                          下载
                        </Button>
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() =>
                            setTasks((prev) => prev.filter((t) => t.task_id !== task.task_id))
                          }
                          aria-label={`移除任务 ${task.prompt}`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
