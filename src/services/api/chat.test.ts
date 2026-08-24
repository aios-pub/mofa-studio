/**
 * Tests for the streaming chat client: SSE parsing against the llm-gateway
 * wire format, in-band error propagation, and abort semantics (partial
 * content preserved).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { chatService } from "./chat";

vi.mock("../api/apiClient", () => ({
  apiClient: {
    getBaseUrl: () => "http://gateway.test",
    post: vi.fn(),
  },
}));

/** Build a Response whose body streams the given chunks as SSE frames. */
function sseResponse(frames: string[], init?: ResponseInit): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const frame of frames) {
        // Split mid-frame on purpose for the first frame: the reader must
        // handle partial SSE lines arriving in separate network chunks.
        const bytes = encoder.encode(frame);
        const mid = Math.floor(bytes.length / 2);
        controller.enqueue(bytes.slice(0, mid));
        controller.enqueue(bytes.slice(mid));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
    ...init,
  });
}

const fetchMock = vi.fn();

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("chatService.chatStream", () => {
  it("assembles OpenAI chunks in order and reports [DONE]", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        'data: {"id":"chatcmpl-1","choices":[{"delta":{"role":"assistant","content":""}}]}\n\n',
        'data: {"id":"chatcmpl-1","choices":[{"delta":{"content":"你"}}]}\n\n',
        'data: {"id":"chatcmpl-1","choices":[{"delta":{"content":"好"}}]}\n\n',
        "data: [DONE]\n\n",
      ]),
    );

    const deltas: string[] = [];
    const dones: boolean[] = [];
    const result = await chatService.chatStream(
      { messages: [{ role: "user", content: "hi" }] },
      (chunk, done) => {
        if (done) dones.push(true);
        else if (chunk) deltas.push(chunk);
      },
    );

    expect(deltas).toEqual(["你", "好"]);
    expect(dones).toHaveLength(1);
    expect(result.content).toBe("你好");
    expect(result.id).toBe("chatcmpl-1");
    expect(result.finishReason).toBe("stop");
  });

  it("propagates in-band error frames as exceptions", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        'data: {"error":{"message":"no capable model: chat","type":"engine_error"}}\n\n',
        "data: [DONE]\n\n",
      ]),
    );

    await expect(
      chatService.chatStream(
        { messages: [{ role: "user", content: "hi" }] },
        () => {},
      ),
    ).rejects.toThrow("no capable model: chat");
  });

  it("keeps partial content when the signal aborts mid-stream", async () => {
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const encoder = new TextEncoder();

    // First frame is readable; the abort macrotask then errors the stream
    // like a real aborted fetch body does (pending read rejects with
    // AbortError). Frame 1 is processed before the timer fires because
    // stream reads settle on the microtask queue.
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(
          encoder.encode(
            'data: {"choices":[{"delta":{"content":"部分回答"}}]}\n\n',
          ),
        );
        controller.signal.addEventListener("abort", () => {
          c.error(
            new DOMException("The operation was aborted.", "AbortError"),
          );
        });
        setTimeout(() => controller.abort(), 0);
      },
    });
    fetchMock.mockResolvedValueOnce(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    const result = await chatService.chatStream(
      { messages: [{ role: "user", content: "hi" }] },
      () => {},
      controller.signal,
    );

    expect(result.finishReason).toBe("abort");
    expect(result.content).toBe("部分回答");
  });

  it("sends the model only when explicitly set", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation(() =>
      Promise.resolve(sseResponse(["data: [DONE]\n\n"])),
    );

    await chatService.chatStream(
      {
        messages: [{ role: "user", content: "hi" }],
        model: "mock/mock-chat",
      },
      () => {},
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("mock/mock-chat");
    expect(body.stream).toBe(true);

    await chatService.chatStream(
      { messages: [{ role: "user", content: "hi" }] },
      () => {},
    );
    const body2 = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body2.model).toBeUndefined();
  });
});
