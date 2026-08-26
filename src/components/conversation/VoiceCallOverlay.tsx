/**
 * CHAT-07 实时语音通话浮层: 连续收音 + VAD（静音断句）→ 整段上 ASR；
 * 播报中检测到人声即回调打断。判定逻辑在 utils/voiceCall（纯函数、已测），
 * 这里只做浏览器 API 的接线薄壳。
 */

import { useEffect, useRef, useState } from "react";
import { Button, Tag } from "antd";
import { PhoneOutlined, PoweroffOutlined } from "@ant-design/icons";
import {
  VAD_FRAME_MS,
  VAD_THRESHOLD_DB,
  callPhaseLabel,
  frameRmsDb,
  initialVadState,
  vadFrame,
  type CallPhase,
} from "@/utils/voiceCall";

interface VoiceCallOverlayProps {
  phase: CallPhase;
  bargeIns: number;
  lastError: string | null;
  /** 一段话说完（静音断句）→ 上 ASR 的音频块. */
  onUtteranceBlob: (blob: Blob) => void;
  /** 播报中用户开口 → 父级停止 TTS 播放. */
  onBargeIn: () => void;
  onHangUp: () => void;
}

export default function VoiceCallOverlay({
  phase,
  bargeIns,
  lastError,
  onUtteranceBlob,
  onBargeIn,
  onHangUp,
}: VoiceCallOverlayProps) {
  const [micError, setMicError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const phaseRef = useRef<CallPhase>(phase);
  const vadRef = useRef(initialVadState);

  phaseRef.current = phase;

  useEffect(() => {
    let cancelled = false;
    let frameTimer: number | null = null;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        // 2048 samples ≈ 46ms at 44.1k — matches the VAD frame cadence.
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        const buffer = new Float32Array(analyser.fftSize);

        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
          chunksRef.current = [];
          if (blob.size > 0) onUtteranceBlob(blob);
        };
        recorder.start(250);

        const tick = () => {
          analyser.getFloatTimeDomainData(buffer);
          const db = frameRmsDb(buffer);
          const isSpeech = db > VAD_THRESHOLD_DB;

          if (phaseRef.current === "replying") {
            // Barge-in: user talks over the reply → cut the TTS playback.
            if (isSpeech && vadRef.current.silenceFrames >= 2) {
              onBargeIn();
            }
            // VAD state keeps running so transitions stay smooth.
            const out = vadFrame({ ...vadRef.current, speechFrames: 0 }, isSpeech);
            vadRef.current = out.state;
            return;
          }

          if (phaseRef.current === "listening") {
            const out = vadFrame(vadRef.current, isSpeech);
            vadRef.current = out.state;
            if (out.action === "speech" && out.started) {
              chunksRef.current = [];
            }
            if (out.action === "end-utterance") {
              vadRef.current = initialVadState;
              recorderRef.current?.stop();
              // Immediately re-arm for the next utterance.
              const fresh = new MediaRecorder(streamRef.current!);
              fresh.ondataavailable = recorder.ondataavailable;
              fresh.onstop = recorder.onstop;
              recorderRef.current = fresh;
              fresh.start(250);
            }
          } else {
            // recognizing/thinking: reset so the next listen starts clean.
            vadRef.current = initialVadState;
          }
        };

        frameTimer = window.setInterval(tick, VAD_FRAME_MS);
      } catch (error) {
        setMicError(
          error instanceof Error ? error.message : "无法访问麦克风",
        );
      }
    };

    if (phase !== "idle") void start();

    return () => {
      cancelled = true;
      if (frameTimer !== null) window.clearInterval(frameTimer);
      try {
        recorderRef.current?.state === "recording" && recorderRef.current.stop();
      } catch {
        // recorder already stopped
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void audioCtxRef.current?.close();
      streamRef.current = null;
      audioCtxRef.current = null;
    };
    // Mount/unmount lifecycle: the mic session spans the whole call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "idle") return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 rounded-2xl border border-(--color-border) bg-[var(--color-bg-base)] shadow-lg p-4 w-64 space-y-2"
      role="dialog"
      aria-label="语音通话"
    >
      <div className="flex items-center gap-2">
        <PhoneOutlined className="text-[var(--color-primary)]" />
        <span className="text-sm font-medium flex-1">语音通话</span>
        {phase === "replying" ? (
          <Tag color="processing">播报中</Tag>
        ) : (
          <Tag color="success">通话中</Tag>
        )}
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]" aria-label="通话状态提示">
        {callPhaseLabel(phase)}
      </p>
      {bargeIns > 0 && (
        <p className="text-xs text-[var(--color-text-tertiary)]">已打断 {bargeIns} 次</p>
      )}
      {(micError ?? lastError) && (
        <p className="text-xs text-red-500" aria-label="通话错误">
          {micError ?? lastError}
        </p>
      )}
      <Button
        block
        danger
        icon={<PoweroffOutlined />}
        onClick={onHangUp}
        aria-label="挂断"
      >
        挂断
      </Button>
      <p className="text-[10px] text-[var(--color-text-tertiary)]">
        说完停顿约 1 秒自动发送；回答播放中开口即可打断
      </p>
    </div>
  );
}
