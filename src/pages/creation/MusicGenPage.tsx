/**
 * 音乐生成 (TOOL-10): 风格/情绪/时长参数 + 自定义歌词（Custom Mode）→
 * 异步任务卡（轮询）→ 内联试听 / 下载 mp3 / 入画廊 / 设为播客 BGM。
 * 需要引擎配置 music_gen provider（suno-api 兼容网关）；未配置时任务
 * 卡会收到诚实的失败原因。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Select, Switch, Tag, message } from "antd";
import {
  CustomerServiceOutlined,
  DownloadOutlined,
  PictureOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import {
  MOOD_PRESETS,
  STYLE_PRESETS,
  musicService,
  recordMusicAsset,
  setPendingPodcastBgm,
  type MusicTask,
} from "@/services/api/music";

const POLL_MS = 4000;

interface LocalTask {
  id: string;
  prompt: string;
  styleLabel: string;
  task: MusicTask;
  /** 入画廊标记（防重复）。 */
  recorded: boolean;
}

function downloadMp3(dataUrl: string, name: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${name}.mp3`;
  link.click();
}

export default function MusicGenPage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(STYLE_PRESETS[0].value);
  const [mood, setMood] = useState("");
  const [durationHint, setDurationHint] = useState("");
  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const timerRef = useRef<number | null>(null);

  const pollAll = useCallback(async () => {
    setTasks((prev) => {
      const next = prev.map((t) => ({ ...t }));
      void Promise.all(
        next
          .filter((t) => t.task.status === "running")
          .map(async (t) => {
            const fresh = await musicService.poll(t.id);
            if (fresh) t.task = fresh;
          }),
      ).then(() => {
        // Record finished clips into the gallery exactly once.
        for (const t of next) {
          if (t.task.status === "succeeded" && t.task.audio && !t.recorded) {
            t.recorded = true;
            void recordMusicAsset(
              t.prompt,
              t.task.audio,
              t.task.label ?? null,
            );
          }
        }
        setTasks([...next]);
      });
      return prev;
    });
  }, []);

  useEffect(() => {
    void pollAll();
    const timer = window.setInterval(() => void pollAll(), POLL_MS);
    timerRef.current = timer;
    return () => window.clearInterval(timer);
  }, [pollAll]);

  const submit = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      // 风格/情绪/时长 assemble: mood+题材 in prompt, style in style, 时长提示进标题说明.
      const moodPrefix = mood ? `${mood}` : "";
      const durationSuffix = durationHint ? `（时长约 ${durationHint}）` : "";
      const finalPrompt = `${moodPrefix}${trimmed}${durationSuffix}`;
      const id = await musicService.submit({
        prompt: finalPrompt,
        style,
        title: title.trim() || undefined,
        lyrics: lyrics.trim() || undefined,
        instrumental,
      });
      if (!id) {
        message.error("提交失败：无法连接网关");
        return;
      }
      setTasks((prev) => [
        {
          id,
          prompt: finalPrompt,
          styleLabel: STYLE_PRESETS.find((s) => s.value === style)?.label ?? style,
          task: { task_id: id, status: "running" },
          recorded: false,
        },
        ...prev,
      ]);
      message.success("已提交生成，通常需要 1-2 分钟");
      // First poll immediately so the card reflects the engine's state
      // without waiting a full interval.
      void pollAll();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-[var(--color-text-primary)]">
          <CustomerServiceOutlined className="text-[var(--color-primary)]" />
          音乐生成
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          描述想要的歌曲；成品自动进入画廊，可一键设为播客 BGM
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-(--color-border) p-4" aria-label="创作参数">
        <div>
          <label className="block text-sm mb-1">描述（想写什么歌）*</label>
          <Input.TextArea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            aria-label="歌曲描述"
            placeholder="例如：一首关于晨跑的歌，节奏轻快适合运动"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs mb-1">风格</label>
            <Select
              value={style}
              onChange={setStyle}
              options={STYLE_PRESETS}
              style={{ width: "100%" }}
              aria-label="风格选择"
            />
          </div>
          <div>
            <label className="block text-xs mb-1">情绪</label>
            <Select
              value={mood}
              onChange={setMood}
              options={MOOD_PRESETS}
              style={{ width: "100%" }}
              aria-label="情绪选择"
            />
          </div>
          <div>
            <label className="block text-xs mb-1">时长参考</label>
            <Select
              value={durationHint}
              onChange={setDurationHint}
              options={[
                { value: "", label: "自动" },
                { value: "1 分钟", label: "约 1 分钟" },
                { value: "2 分钟", label: "约 2 分钟" },
                { value: "3 分钟", label: "约 3 分钟" },
              ]}
              style={{ width: "100%" }}
              aria-label="时长选择"
            />
          </div>
          <div>
            <label className="block text-xs mb-1">歌名（可选）</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="歌名"
              placeholder="晨跑"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">
            自定义歌词（可选，填写即进入 Custom Mode）
          </label>
          <Input.TextArea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            rows={4}
            aria-label="自定义歌词"
            placeholder={"[verse]\n清晨六点的街道…\n[chorus]\n跑起来…"}
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={instrumental} onChange={setInstrumental} aria-label="纯音乐开关" />
            纯音乐（无人声）
          </label>
          <Button
            type="primary"
            loading={submitting}
            disabled={!prompt.trim()}
            onClick={() => void submit()}
            aria-label="生成音乐"
          >
            生成歌曲
          </Button>
        </div>
      </section>

      <section className="space-y-3" aria-label="生成任务">
        {tasks.length === 0 ? (
          <p className="text-xs text-[var(--color-text-tertiary)]">
            尚无任务。生成依赖引擎的 music_gen provider（suno-api 兼容网关，见 模型中心/密钥页）
          </p>
        ) : (
          tasks.map((local) => {
            const t = local.task;
            return (
              <div
                key={local.id}
                className="rounded-xl border border-(--color-border) p-4 space-y-2"
                data-status={t.status}
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium truncate flex-1">
                    {t.label || local.prompt}
                  </span>
                  {t.status === "running" && <Tag color="processing">生成中…</Tag>}
                  {t.status === "succeeded" && <Tag color="success">完成</Tag>}
                  {t.status === "failed" && <Tag color="error">失败</Tag>}
                  <span className="text-xs text-[var(--color-text-tertiary)]">
                    {local.styleLabel}
                  </span>
                </div>
                {t.status === "failed" && t.error && (
                  <p className="text-xs text-red-500" aria-label="任务失败原因">
                    {t.error}
                  </p>
                )}
                {t.status === "succeeded" && t.audio && (
                  <>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio controls src={t.audio} className="w-full" aria-label={`试听 ${t.label ?? local.prompt}`} />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() => downloadMp3(t.audio!, t.label?.split(" · ")[0] || local.prompt.slice(0, 12))}
                        aria-label="下载 mp3"
                      >
                        下载
                      </Button>
                      <Button
                        size="small"
                        icon={<PictureOutlined />}
                        onClick={() => {
                          message.success("已存入画廊（音频分区）");
                          navigate("/gallery?type=audio");
                        }}
                        aria-label="在画廊查看"
                      >
                        画廊
                      </Button>
                      <Button
                        size="small"
                        icon={<SoundOutlined />}
                        onClick={() => {
                          setPendingPodcastBgm(t.audio!);
                          message.success("已设为播客 BGM，去播客工坊即可使用");
                          navigate("/creation/podcast");
                        }}
                        aria-label="设为播客 BGM"
                      >
                        设为播客 BGM
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
