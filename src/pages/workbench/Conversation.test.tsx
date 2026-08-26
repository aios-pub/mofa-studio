/**
 * Closed-loop test for TASK-14's summon: a conversation with ?expert=<id>
 * injects the persona as the LEADING system message on every send, and
 * dismissing the chip stops the injection.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ConversationPage from "./Conversation";
import { BUILTIN_EXPERTS, expertSystemPrompt } from "@/utils/experts";

const mockedChatStream = vi.fn();
const mockedGetAll = vi.fn();
const mockedAgents = vi.fn();

vi.mock("@/services/api/chat", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api/chat")>();
  return {
    ...actual,
    chatService: {
      ...actual.chatService,
      chatStream: (...a: unknown[]) => mockedChatStream(...a),
    },
  };
});

vi.mock("@/services", () => ({
  conversationApi: {
    getAll: (...a: unknown[]) => mockedGetAll(...a),
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
  agentApi: { getAll: (...a: unknown[]) => mockedAgents(...a) },
}));

vi.mock("@/services/api/engine", () => ({
  AUTO_MODEL: "__auto__",
  engineService: {
    health: vi.fn().mockResolvedValue({ engine_url: "", reachable: false, status: "down" }),
    listChatModels: vi.fn().mockResolvedValue([]),
    listModels: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/services/api/assets", () => ({ recordImageAssets: vi.fn() }));

const mockedTranscribe = vi.fn();
const mockedSpeak = vi.fn();
const speakEndedRef = { current: null as (() => void) | null };

vi.mock("@/services/api/audio", () => ({
  recordingSupported: () => false,
  audioService: {
    transcribe: (...a: unknown[]) => mockedTranscribe(...a),
    speak: (text: string, _voice?: string, onEnded?: () => void) => {
      speakEndedRef.current = onEnded ?? null;
      return mockedSpeak(text);
    },
  },
}));

// Capture the overlay's props so tests can drive the call wiring.
let overlayProps: {
  onUtteranceBlob: (blob: Blob) => void;
  onBargeIn: () => void;
  onHangUp: () => void;
  phase: string;
  bargeIns: number;
} | null = null;
vi.mock("@/components/conversation/VoiceCallOverlay", () => ({
  default: (props: Record<string, unknown>) => {
    overlayProps = props as typeof overlayProps;
    if (props.phase === "idle") return null;
    return <div data-testid="voice-call-overlay" data-phase={String(props.phase)} />;
  },
}));
vi.mock("@/components/onboarding/FirstRunGuide", () => ({ FirstOutputDialog: () => null }));
vi.mock("@/components/onboarding/firstRunCases", async (o) => ({
  ...(await o<typeof import("@/components/onboarding/firstRunCases")>()),
  hasFirstOutput: () => true,
  markFirstOutput: vi.fn(),
}));

const CONVERSATION = {
  id: "c1",
  agentId: "a1",
  title: "专家注入会话",
  messages: [],
  totalTokens: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function renderConversation(expertParam?: string) {
  window.history.replaceState({}, "", expertParam ? `/?expert=${expertParam}` : "/");
  render(
    <MemoryRouter initialEntries={[expertParam ? `/?expert=${expertParam}` : "/"]}>
      <ConversationPage />
    </MemoryRouter>,
  );
  // Open a conversation: pick the one the API returns.
  await waitFor(() => expect(mockedGetAll).toHaveBeenCalled());
  // The title renders in both the list and the header — click the list entry.
  const items = await screen.findAllByText("专家注入会话", {}, { timeout: 2000 });
  fireEvent.click(items[0]);
  await screen.findByPlaceholderText(/输入消息/);
}

function send(text: string) {
  const box = screen.getByPlaceholderText(/输入消息/) as HTMLTextAreaElement;
  fireEvent.change(box, { target: { value: text } });
  fireEvent.click(screen.getByLabelText("发送"));
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/");
  mockedGetAll.mockResolvedValue([CONVERSATION]);
  mockedAgents.mockResolvedValue([{ id: "a1", agent_name: "默认", agent_code: "a1", system_prompt: "", enabled: true, model_id: "", model_name: "", provider: { id: "", provider_name: "" }, agent_category: "native" }]);
  mockedChatStream.mockImplementation((_req, onChunk, _signal, _onThinking, onDone) => {
    onChunk?.("好的", false);
    onDone?.();
    return Promise.resolve({} as never);
  });
});

describe("Conversation expert summon (TASK-14)", () => {
  it("injects the persona as the leading system message", async () => {
    await renderConversation("expert-marketer");
    send("帮我写条种草文案");

    await waitFor(() =>
      expect(
        mockedChatStream.mock.calls.some((call) =>
          call[0].messages.at(-1)?.content === "帮我写条种草文案" ||
          call[0].messages.at(-1)?.content?.text === "帮我写条种草文案",
        ),
      ).toBe(true),
    );
    const request = mockedChatStream.mock.calls.find(
      (call) =>
        call[0].messages.at(-1)?.content === "帮我写条种草文案" ||
        call[0].messages.at(-1)?.content?.text === "帮我写条种草文案",
    )![0];
    const first = request.messages[0];
    const marketer = BUILTIN_EXPERTS.find((e) => e.id === "expert-marketer")!;
    expect(first.role).toBe("system");
    expect(first.content).toBe(expertSystemPrompt(marketer));
    // The chip shows the active expert.
    expect(screen.getByLabelText(/当前专家 增长营销策划/)).toBeInTheDocument();
  });

  it("dismissing the chip stops injecting the persona", async () => {
    await renderConversation("expert-marketer");
    fireEvent.click(screen.getByLabelText(/当前专家 增长营销策划/));
    send("普通问题");

    await waitFor(() => expect(mockedChatStream).toHaveBeenCalled());
    const request = mockedChatStream.mock.calls[0][0];
    expect(request.messages[0].role).toBe("user");
    expect(
      request.messages.some((m: { role: string; content: string }) =>
        m.role === "system" && m.content.includes("增长营销策划"),
      ),
    ).toBe(false);
  });

  it("no expert param → no persona injection at all", async () => {
    await renderConversation();
    send("你好");
    await waitFor(() => expect(mockedChatStream).toHaveBeenCalled());
    const request = mockedChatStream.mock.calls[0][0];
    expect(request.messages.every((m: { role: string }) => m.role !== "system")).toBe(true);
  });
});

describe("live voice call (CHAT-07)", () => {
  it("dial opens the call and an utterance rides ASR into the conversation", async () => {
    mockedTranscribe.mockResolvedValueOnce("今天天气怎么样");
    mockedSpeak.mockResolvedValueOnce(() => {});
    mockedChatStream.mockImplementation((_req, onChunk, _s, _t, onDone) => {
      onChunk?.("晴", false);
      onDone?.();
      return Promise.resolve({ content: "晴" } as never);
    });

    await renderConversation();
    fireEvent.click(screen.getByLabelText("语音通话"));
    expect(await screen.findByTestId("voice-call-overlay")).toHaveAttribute(
      "data-phase",
      "listening",
    );

    // Drive the utterance pipeline as the overlay would.
    overlayProps!.onUtteranceBlob(new Blob(["audio"], { type: "audio/webm" }));
    await waitFor(() => expect(mockedTranscribe).toHaveBeenCalled());
    await waitFor(() => {
      const call = mockedChatStream.mock.calls.find((c) =>
        c[0].messages.at(-1)?.content === "今天天气怎么样",
      );
      expect(call).toBeTruthy();
    });

    // The reply auto-plays in call mode and its completion returns to listening.
    await waitFor(() => expect(mockedSpeak).toHaveBeenCalledWith("晴"));
    speakEndedRef.current?.();
    await waitFor(() =>
      expect(screen.getByTestId("voice-call-overlay")).toHaveAttribute(
        "data-phase",
        "listening",
      ),
    );
  });

  it("barge-in stops the playback and is counted", async () => {
    mockedTranscribe.mockResolvedValue("接着说");
    mockedSpeak.mockResolvedValueOnce(() => {});
    mockedChatStream.mockImplementation((_req, onChunk, _s, _t, onDone) => {
      onChunk?.("答", false);
      onDone?.();
      return Promise.resolve({ content: "答" } as never);
    });

    await renderConversation();
    fireEvent.click(screen.getByLabelText("语音通话"));
    overlayProps!.onUtteranceBlob(new Blob(["x"]));
    await waitFor(() =>
      expect(screen.getByTestId("voice-call-overlay")).toHaveAttribute(
        "data-phase",
        "replying",
      ),
    );

    overlayProps!.onBargeIn();
    await waitFor(() => {
      const overlay = screen.getByTestId("voice-call-overlay");
      expect(overlay).toHaveAttribute("data-phase", "listening");
      expect(overlayProps!.bargeIns).toBe(1);
    });
  });

  it("hang-up closes the call", async () => {
    await renderConversation();
    fireEvent.click(screen.getByLabelText("语音通话"));
    await screen.findByTestId("voice-call-overlay");
    fireEvent.click(screen.getByLabelText("挂断通话"));
    await waitFor(() =>
      expect(screen.queryByTestId("voice-call-overlay")).not.toBeInTheDocument(),
    );
  });
});
