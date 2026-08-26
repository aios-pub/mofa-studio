/**
 * CHAT-07 实时语音通话: VAD（静音检测）与通话状态机，纯函数部分。
 *
 * 通话回路: 连续收音 → 说到停顿（VAD 静音超时）→ 整段上 ASR → 作为用户
 * 消息进对话 → 回答完成自动 TTS 播报 → 播报中被说话（能量超阈）即打断。
 * 浏览器侧的收音/播放由 VoiceCallOverlay 负责，这里只放可测的判定逻辑。
 */

/** One analysis frame's RMS energy in dBFS (typically -100..0). */
export function frameRmsDb(samples: Float32Array): number {
  if (samples.length === 0) return -100;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sum / samples.length);
  return 20 * Math.log10(Math.max(rms, 1e-9));
}

/** Default speech/silence split; tuned for typical laptop mics (dBFS). */
export const VAD_THRESHOLD_DB = -45;
/** Silence that ends an utterance (ms of consecutive quiet frames). */
export const UTTERANCE_SILENCE_MS = 900;
/** Minimum speech duration before a silence can end the utterance (ms). */
export const UTTERANCE_MIN_SPEECH_MS = 250;
/** Analysis frame cadence (ms) — matches the overlay's script processor. */
export const VAD_FRAME_MS = 50;

export interface VadState {
  /** Frames of consecutive speech energy seen so far in this utterance. */
  speechFrames: number;
  /** Frames of consecutive silence. */
  silenceFrames: number;
  /** Whether the current utterance already counted as real speech. */
  speaking: boolean;
  /** Total elapsed ms inside the utterance window. */
  elapsedMs: number;
}

export const initialVadState: VadState = {
  speechFrames: 0,
  silenceFrames: 0,
  speaking: false,
  elapsedMs: 0,
};

export type VadOutcome =
  /** Keep listening. */
  | { action: "continue"; state: VadState }
  /** Silence after enough speech — end the utterance. */
  | { action: "end-utterance"; state: VadState }
  /** Speech detected (fresh or continuing) — resets the silence run. */
  | { action: "speech"; state: VadState; started: boolean };

/**
 * Feed one frame's energy into the VAD. `isSpeech` comes from comparing
 * `frameRmsDb` against the threshold in the caller (so tests can inject
 * booleans directly).
 */
export function vadFrame(
  state: VadState,
  isSpeech: boolean,
  options?: { thresholdMs?: number; minSpeechMs?: number; frameMs?: number },
): VadOutcome {
  const silenceLimit = Math.ceil((options?.thresholdMs ?? UTTERANCE_SILENCE_MS) / (options?.frameMs ?? VAD_FRAME_MS));
  const minSpeech = Math.ceil((options?.minSpeechMs ?? UTTERANCE_MIN_SPEECH_MS) / (options?.frameMs ?? VAD_FRAME_MS));
  const elapsedMs = state.elapsedMs + (options?.frameMs ?? VAD_FRAME_MS);

  if (isSpeech) {
    const wasSpeaking = state.speaking;
    const speechFrames = state.speechFrames + 1;
    const speaking = state.speaking || speechFrames >= 2;
    return {
      action: "speech",
      started: speaking && !wasSpeaking,
      state: { speechFrames, silenceFrames: 0, speaking, elapsedMs },
    };
  }

  const silenceFrames = state.silenceFrames + 1;
  const nextState: VadState = {
    speechFrames: state.speechFrames,
    silenceFrames,
    speaking: state.speaking,
    elapsedMs,
  };
  if (state.speaking && state.speechFrames >= minSpeech && silenceFrames >= silenceLimit) {
    return { action: "end-utterance", state: nextState };
  }
  return { action: "continue", state: nextState };
}

// ==================== 通话状态机 ====================

export type CallPhase =
  | "idle"
  | "listening"
  | "recognizing"
  | "thinking"
  | "replying";

export type CallEvent =
  | { type: "dial" }
  | { type: "hang-up" }
  | { type: "utterance-ended" }
  | { type: "transcript"; text: string }
  | { type: "submitted" }
  | { type: "reply-started" }
  | { type: "reply-finished" }
  /** 用户在播报中开口 → 打断，回到收音. */
  | { type: "barge-in" }
  | { type: "error"; message: string };

export interface CallState {
  phase: CallPhase;
  /** 打断计数（可观测的验收指标）. */
  bargeIns: number;
  lastError: string | null;
}

export const initialCallState: CallState = { phase: "idle", bargeIns: 0, lastError: null };

export function callReducer(state: CallState, event: CallEvent): CallState {
  switch (event.type) {
    case "dial":
      return state.phase === "idle" ? { ...state, phase: "listening" } : state;
    case "hang-up":
      return { ...initialCallState, bargeIns: state.bargeIns };
    case "utterance-ended":
      return state.phase === "listening" ? { ...state, phase: "recognizing" } : state;
    case "transcript":
      if (event.text.trim() === "") {
        // Nothing recognized (噪声触发) — back to listening without a roundtrip.
        return { ...state, phase: "listening" };
      }
      return state.phase === "recognizing" ? { ...state, phase: "thinking" } : state;
    case "submitted":
      return state.phase === "thinking" ? state : state;
    case "reply-started":
      return { ...state, phase: "replying" };
    case "reply-finished":
      return state.phase === "replying" ? { ...state, phase: "listening" } : state;
    case "barge-in":
      return {
        ...state,
        phase: "listening",
        bargeIns: state.bargeIns + 1,
      };
    case "error":
      return { ...state, phase: "listening", lastError: event.message };
    default:
      return state;
  }
}

/** 提示语 per phase — the overlay chip renders this. */
export function callPhaseLabel(phase: CallPhase): string {
  switch (phase) {
    case "idle":
      return "未接通";
    case "listening":
      return "正在听…（说完停顿即发送）";
    case "recognizing":
      return "识别中…";
    case "thinking":
      return "思考中…";
    case "replying":
      return "回答中（开口可打断）";
  }
}
