/**
 * Audio service (CHAT-08): speech-to-text via the gateway's OpenAI-style
 * transcription endpoint, and text-to-speech playback via /v1/audio/speech.
 */

import { apiClient } from "../api/apiClient";

export interface TranscriptionResult {
  text: string;
}

class AudioService {
  /** Transcribe an audio blob (MediaRecorder output) to text. */
  async transcribe(blob: Blob): Promise<string> {
    const form = new FormData();
    const ext = blob.type.includes("mp4") ? "mp4" : "webm";
    form.append("file", blob, `speech.${ext}`);
    const data = await apiClient.post<TranscriptionResult>(
      "/v1/audio/transcriptions",
      form,
      { headers: { "Content-Type": undefined } },
    );
    return data?.text ?? "";
  }

  /** Synthesize speech and play it; resolves when playback starts.
   * Returns a stop function. */
  async speak(text: string, voice?: string): Promise<() => void> {
    const baseURL = apiClient.getBaseUrl?.() ?? "";
    const response = await fetch(`${baseURL}/v1/audio/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: text, voice }),
    });
    if (!response.ok) {
      throw new Error(`朗读失败（HTTP ${response.status}）`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.addEventListener("ended", () => URL.revokeObjectURL(url));
    await audio.play();
    return () => {
      audio.pause();
      URL.revokeObjectURL(url);
    };
  }
}

export const audioService = new AudioService();

/** Whether hold-to-talk recording is available in this environment. */
export function recordingSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined"
  );
}
