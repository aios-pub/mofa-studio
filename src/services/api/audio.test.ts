/**
 * Tests for the audio service (CHAT-08): multipart transcription mapping,
 * TTS playback flow, and environment capability detection.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import { audioService, recordingSupported } from "./audio";

vi.mock("../api/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    getBaseUrl: () => "http://gateway.test",
  },
}));

const mockedPost = vi.mocked(apiClient.post);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("audioService.transcribe", () => {
  it("uploads the blob as multipart and returns the text", async () => {
    mockedPost.mockResolvedValueOnce({ text: "你好世界" });
    const blob = new Blob(["audio"], { type: "audio/webm" });
    const text = await audioService.transcribe(blob);
    expect(text).toBe("你好世界");
    const [url, body] = mockedPost.mock.calls[0];
    expect(url).toBe("/v1/audio/transcriptions");
    expect(body).toBeInstanceOf(FormData);
    const file = (body as FormData).get("file") as File;
    expect(file.name).toBe("speech.webm");
  });

  it("empty transcription degrades to empty string", async () => {
    mockedPost.mockResolvedValueOnce({ text: null } as never);
    expect(await audioService.transcribe(new Blob(["x"]))).toBe("");
  });
});

describe("audioService.speak", () => {
  it("posts the input and plays the returned audio", async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    const addEventListener = vi.fn();
    const constructed: Array<{ src: string }> = [];
    vi.stubGlobal(
      "Audio",
      class {
        src: string;
        constructor(src: string) {
          this.src = src;
          constructed.push(this);
        }
        play = play;
        pause = pause;
        addEventListener = addEventListener;
      },
    );
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("audio-bytes", {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const revokeObjectURL = vi.fn();
    const createObjectURL = vi.fn().mockReturnValue("blob:mock");
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });

    const stop = await audioService.speak("读我", "alloy");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://gateway.test/v1/audio/speech",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ input: "读我", voice: "alloy" }),
      }),
    );
    expect(play).toHaveBeenCalled();
    stop();
    expect(pause).toHaveBeenCalled();
  });

  it("propagates HTTP failures with a specific message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("no", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(audioService.speak("x")).rejects.toThrow("503");
  });
});

describe("recordingSupported", () => {
  it("reports the environment capability", () => {
    const supported = recordingSupported();
    expect(typeof supported).toBe("boolean");
  });
});
