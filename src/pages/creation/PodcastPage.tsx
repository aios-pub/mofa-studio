import { useTranslation } from "react-i18next";
/**
 * Podcast workshop (TOOL-12): 选题 → A/B 对谈脚本（逐句可编辑/换音色）→
 * 多音色 TTS 合成 → BGM 混音（人声优先）→ MP3 导出 + RSS 输出。
 */

import { useEffect, useCallback, useState } from "react";
import { takePendingPodcastBgm } from "@/services/api/music";
import { Button, Empty, Input, InputNumber, Select, Tag, Upload, message } from "antd";
import {
  AudioOutlined,
  PlayCircleOutlined,
  SoundOutlined,
  DownloadOutlined,
  UploadOutlined,
  WifiOutlined,
} from "@ant-design/icons";
import {
  VOICES,
  buildRssFeed,
  defaultVoiceFor,
  podcastService,
  type PodcastEpisode,
} from "@/services/api/podcast";
import { AUTO_MODEL } from "@/services/api/engine";
import { ModelPicker } from "@/components/conversation";

interface TurnState {
  speaker: "A" | "B";
  text: string;
  voice: string;
  audio?: string;
}

export default function PodcastPage() {  const { t } = useTranslation();

  const [topic, setTopic] = useState("");
  const [minutes, setMinutes] = useState(5);
  const [model, setModel] = useState<string>(AUTO_MODEL);
  const [episode, setEpisode] = useState<PodcastEpisode | null>(null);
  const [turns, setTurns] = useState<TurnState[]>([]);
  const [bgm, setBgm] = useState<string | null>(null);

  // TOOL-10 联动: a clip queued from the music page becomes the BGM here.
  useEffect(() => {
    const pending = takePendingPodcastBgm();
    if (pending) {
      setBgm(pending);
      message.info(t("已载入来自音乐生成的 BGM"));
    }
  }, []);
  const [busy, setBusy] = useState<"script" | "synth" | "render" | number | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const generateScript = useCallback(async () => {
    const trimmed = topic.trim();
    if (!trimmed || busy !== null) return;
    setBusy("script");
    setEpisode(null);
    setTurns([]);
    setResult(null);
    try {
      const generated = await podcastService.generateScript(
        trimmed,
        minutes,
        model === AUTO_MODEL ? undefined : model,
      );
      setEpisode(generated);
      setTurns(
        generated.script.map((turn) => ({
          speaker: turn.speaker,
          text: turn.text,
          voice: defaultVoiceFor(turn.speaker),
        })),
      );
      message.success(t("脚本已生成（{{p0}} 轮对谈）", { p0: generated.script.length }));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(t("脚本生成失败：{{p0}}", { p0: detail }));
    } finally {
      setBusy(null);
    }
  }, [topic, minutes, model, busy]);

  const synthesizeTurn = useCallback(
    async (index: number) => {
      if (busy !== null) return;
      const turn = turns[index];
      if (!turn?.text.trim()) return;
      setBusy(index);
      try {
        const audio = await podcastService.synthesizeTurn(turn.text, turn.voice);
        setTurns((prev) =>
          prev.map((t, i) => (i === index ? { ...t, audio } : t)),
        );
        message.success(`第 ${index + 1} 句已配音（${turn.voice}）`);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        message.error(t("配音失败：{{p0}}", { p0: detail }));
      } finally {
        setBusy(null);
      }
    },
    [turns, busy],
  );

  const synthesizeAll = useCallback(async () => {
    if (busy !== null) return;
    setBusy("synth");
    try {
      for (let i = 0; i < turns.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const audio = await podcastService.synthesizeTurn(turns[i].text, turns[i].voice);
        setTurns((prev) => prev.map((t, idx) => (idx === i ? { ...t, audio } : t)));
      }
      message.success(t("全部句子已配音"));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(t("配音中断：{{p0}}", { p0: detail }));
    } finally {
      setBusy(null);
    }
  }, [turns, busy]);

  const render = useCallback(async () => {
    const audioTurns = turns.map((t) => t.audio).filter(Boolean) as string[];
    if (audioTurns.length !== turns.length || busy !== null) {
      message.warning(t("还有句子未配音"));
      return;
    }
    setBusy("render");
    setResult(null);
    try {
      const rendered = await podcastService.render(audioTurns, bgm ?? undefined);
      setResult(rendered.data_url);
      message.success(`已合成（${Math.round(rendered.size / 1024)} KB）`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(t("合成失败：{{p0}}", { p0: detail }));
    } finally {
      setBusy(null);
    }
  }, [turns, bgm, busy]);

  const downloadMp3 = useCallback(() => {
    if (!result) return;
    const link = document.createElement("a");
    link.href = result;
    link.download = `${episode?.title.slice(0, 20) ?? "podcast"}.mp3`;
    link.click();
  }, [result, episode]);

  const downloadRss = useCallback(() => {
    if (!episode) return;
    const xml = buildRssFeed(episode.title, "https://mofa.local", [
      {
        title: episode.title,
        description: episode.description,
        pubDate: new Date(),
        durationSec: turns.length * 15,
        audioUrl: "episode.mp3",
      },
    ]);
    const blob = new Blob([xml], { type: "application/rss+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "podcast.xml";
    link.click();
    URL.revokeObjectURL(url);
  }, [episode, turns]);

  return (
    <div className="flex h-full">
      {/* Panel */}
      <div className="w-64 border-r border-(--color-border) p-4 space-y-4 overflow-y-auto">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
          <AudioOutlined className="text-[var(--color-primary)]" />
          播客工坊
        </h2>

        <div>
          <label className="block text-sm font-medium mb-1">{t("选题")}</label>
          <Input.TextArea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t("例如：为什么猫都爱纸箱")}
            rows={2}
            aria-label={t("播客选题")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t("时长（分钟）")}</label>
          <InputNumber
            min={1}
            max={30}
            value={minutes}
            onChange={(v) => setMinutes(v ?? 5)}
            style={{ width: "100%" }}
            aria-label={t("时长")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t("脚本模型")}</label>
          <ModelPicker value={model} onChange={setModel} />
        </div>

        <Button
          type="primary"
          block
          loading={busy === "script"}
          disabled={!topic.trim() || busy !== null}
          onClick={generateScript}
          aria-label={t("生成脚本")}
        >
          生成对谈脚本
        </Button>

        {turns.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-(--color-border)">
            <Button
              block
              icon={<SoundOutlined />}
              loading={busy === "synth"}
              disabled={busy !== null}
              onClick={synthesizeAll}
              aria-label={t("全部配音")}
            >
              全部配音
            </Button>

            <Upload
              accept="audio/*"
              showUploadList={false}
              beforeUpload={(file) => {
                const reader = new FileReader();
                reader.onloadend = () => setBgm(reader.result as string);
                reader.readAsDataURL(file);
                message.info(t("BGM 已加载（默认 25% 音量，不压人声）"));
                return false;
              }}
            >
              <Button block icon={<UploadOutlined />} aria-label={t("上传 BGM")}>
                {bgm ? "更换 BGM" : "上传 BGM（可选）"}
              </Button>
            </Upload>

            <Button
              block
              type="primary"
              icon={<PlayCircleOutlined />}
              loading={busy === "render"}
              disabled={busy !== null || turns.some((t) => !t.audio)}
              onClick={render}
              aria-label={t("合成导出")}
            >
              合成导出 MP3
            </Button>
          </div>
        )}

        {result && (
          <div className="space-y-2 pt-2 border-t border-(--color-border)">
            <audio src={result} controls className="w-full" aria-label={t("成品预览")} />
            <Button block icon={<DownloadOutlined />} onClick={downloadMp3} aria-label={t("下载 MP3")}>
              下载 MP3
            </Button>
            <Button block icon={<WifiOutlined />} onClick={downloadRss} aria-label={t("下载 RSS")}>
              输出 RSS
            </Button>
          </div>
        )}
      </div>

      {/* Script editor */}
      <div className="flex-1 overflow-y-auto p-6">
        {turns.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Empty description={t("输入选题，生成双人对谈脚本——逐句可改写、可换音色")} />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                {episode?.title}
              </h3>
              <Tag color="blue">{turns.length} 轮</Tag>
            </div>
            {episode?.description && (
              <p className="text-xs text-[var(--color-text-tertiary)]">{episode.description}</p>
            )}
            {turns.map((turn, index) => (
              <div
                key={index}
                className="p-2 rounded-lg border border-(--color-border) bg-[var(--color-bg-secondary)] space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <Tag color={turn.speaker === "A" ? "blue" : "green"}>{turn.speaker}</Tag>
                  <Select
                    size="small"
                    value={turn.voice}
                    onChange={(voice) =>
                      setTurns((prev) =>
                        prev.map((t, i) => (i === index ? { ...t, voice } : t)),
                      )
                    }
                    options={VOICES.map((v) => ({ value: v.value, label: v.label }))}
                    style={{ width: 140 }}
                    aria-label={`第 ${index + 1} 句音色`}
                  />
                  <Button
                    size="small"
                    icon={<SoundOutlined />}
                    loading={busy === index}
                    disabled={busy !== null}
                    onClick={() => void synthesizeTurn(index)}
                    aria-label={`重配第 ${index + 1} 句`}
                  >
                    {turn.audio ? "重配" : "配音"}
                  </Button>
                  {turn.audio && (
                    <audio src={turn.audio} controls className="h-7 flex-1" aria-label={`第 ${index + 1} 句预览`} />
                  )}
                </div>
                <Input.TextArea
                  value={turn.text}
                  onChange={(e) =>
                    setTurns((prev) =>
                      prev.map((t, i) => (i === index ? { ...t, text: e.target.value } : t)),
                    )
                  }
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  aria-label={`第 ${index + 1} 句文本`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
