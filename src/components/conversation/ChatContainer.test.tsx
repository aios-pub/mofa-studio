/**
 * Component tests for CHAT-10 message actions: hover action bar rendering
 * and the regenerate/edit-resend/branch callback wiring.
 */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChatContainer from "./ChatContainer";
import type { Conversation, Message } from "@/types";

// ModelPicker calls the engine service on mount; stub the module away.
vi.mock("@/services/api/engine", () => ({
  AUTO_MODEL: "__auto__",
  engineService: {
    health: vi.fn().mockResolvedValue({ engine_url: "", reachable: false, status: "down" }),
    listChatModels: vi.fn().mockResolvedValue([]),
    listModels: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("antd", async (importOriginal) => {
  const antd = await importOriginal<typeof import("antd")>();
  return { ...antd, message: { ...antd.message, warning: vi.fn(), success: vi.fn(), error: vi.fn() } };
});

function msg(id: string, role: "user" | "assistant", content: string): Message {
  return {
    id,
    conversationId: "c1",
    role,
    content,
    status: "completed",
    createdAt: new Date("2026-01-01T00:00:00Z"),
  };
}

function conversation(messages: Message[]): Conversation {
  return {
    id: "c1",
    agentId: "a1",
    title: "测试对话",
    messages,
    totalTokens: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function renderChat(overrides: Partial<Parameters<typeof ChatContainer>[0]>) {
  const props = {
    conversation: conversation([msg("u1", "user", "你好"), msg("a1", "assistant", "你好，有什么可以帮你？")]),
    onSendMessage: vi.fn(),
    onRegenerate: vi.fn(),
    onEditResend: vi.fn(),
    onBranch: vi.fn(),
    ...overrides,
  };
  render(<ChatContainer {...props} />);
  return props;
}

describe("ChatContainer message actions (CHAT-10)", () => {
  it("shows regenerate/branch on assistant messages and edit on user messages", () => {
    renderChat({});

    expect(screen.getByLabelText("重新生成")).toBeInTheDocument();
    expect(screen.getAllByLabelText("分支对话").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("编辑重发")).toBeInTheDocument();
    expect(screen.getAllByLabelText("复制消息").length).toBe(2);
  });

  it("regenerate invokes the callback with the assistant message id", () => {
    const props = renderChat({});
    fireEvent.click(screen.getByLabelText("重新生成"));
    expect(props.onRegenerate).toHaveBeenCalledWith("a1");
  });

  it("branch from an assistant message includes the anchor; from a user message excludes it", () => {
    const props = renderChat({});
    // Assistant branch buttons include the anchor exchange.
    fireEvent.click(screen.getAllByLabelText("分支对话")[1]);
    expect(props.onBranch).toHaveBeenCalledWith("a1", true);
    // User branch button excludes the anchor (it becomes the new seed).
    fireEvent.click(screen.getAllByLabelText("分支对话")[0]);
    expect(props.onBranch).toHaveBeenCalledWith("u1", false);
  });

  it("edit-resend flow: edit textarea then confirm truncation and resend", async () => {
    const props = renderChat({});
    fireEvent.click(screen.getByLabelText("编辑重发"));

    const textarea = await screen.findByLabelText("编辑消息");
    fireEvent.change(textarea, { target: { value: "改写后的问题" } });
    fireEvent.click(screen.getByText("重发"));

    // The truncate confirm dialog appears (编辑重发截断需二次确认).
    const confirm = await screen.findByText("编辑重发将丢弃这条消息之后的对话");
    expect(confirm).toBeInTheDocument();

    // Confirm the truncation.
    fireEvent.click(screen.getByText("确认重发"));
    await waitFor(() =>
      expect(props.onEditResend).toHaveBeenCalledWith("u1", "改写后的问题"),
    );
  });

  it("copy uses the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderChat({});
    fireEvent.click(screen.getAllByLabelText("复制消息")[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("你好"));
  });
});

describe("slash command palette (CHAT-09)", () => {
  function renderForSlash() {
    return renderChat({});
  }

  it("opens the palette when input starts with / and filters by name", async () => {
    renderForSlash();
    const textarea = screen.getByPlaceholderText(/输入消息/);
    fireEvent.change(textarea, { target: { value: "/" } });
    const listbox = await screen.findByRole("listbox", { name: "快捷指令" });
    // Seeds present
    expect(within(listbox).getByText("/翻译")).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: "/小红书" } });
    expect(within(listbox).getByText("/小红书")).toBeInTheDocument();
    expect(within(listbox).queryByText("/翻译")).not.toBeInTheDocument();
  });

  it("picking a command opens the slot modal; filling slots injects the template", async () => {
    renderForSlash();
    const textarea = screen.getByPlaceholderText(/输入消息/);
    fireEvent.change(textarea, { target: { value: "/翻译" } });
    fireEvent.click(within(screen.getByRole("listbox", { name: "快捷指令" })).getByText("/翻译"));

    const slotInput = await screen.findByLabelText("参数 目标语言");
    fireEvent.change(slotInput, { target: { value: "英文" } });
    fireEvent.click(screen.getByRole("button", { name: /填\s*入/ }));

    await waitFor(() => {
      expect((textarea as HTMLTextAreaElement).value).toContain("翻译成英文");
      // Unfilled slot stays visible as a placeholder
      expect((textarea as HTMLTextAreaElement).value).toContain("{{原文}}");
    });
  });
});

describe("image attachment rendering (CHAT-05)", () => {
  it("renders image attachments with download/enlarge actions", () => {
    renderChat({
      conversation: {
        ...conversation([]),
        messages: [
          msg("u1", "user", "画一只橘猫"),
          {
            ...msg("a1", "assistant", "画一只橘猫"),
            attachments: [
              {
                id: "img1",
                name: "橘猫_1024x1024_1.png",
                type: "image/png",
                size: 0,
                url: "data:image/png;base64,QUJD",
              },
            ],
          },
        ],
      },
    });

    const img = screen.getByAltText("橘猫_1024x1024_1.png");
    expect(img).toHaveAttribute("src", "data:image/png;base64,QUJD");
    expect(screen.getByLabelText("下载图片 橘猫_1024x1024_1.png")).toBeInTheDocument();
    expect(screen.getByLabelText("放大查看 橘猫_1024x1024_1.png")).toBeInTheDocument();
  });
});

describe("video attachment rendering (CHAT-06)", () => {
  it("renders video attachments with a player and download", () => {
    renderChat({
      conversation: {
        ...conversation([]),
        messages: [
          msg("u1", "user", "生成一段视频"),
          {
            ...msg("a1", "assistant", "生成一段视频"),
            attachments: [
              { id: "v1", name: "橘猫.mp4", type: "video/mp4", size: 0, url: "data:video/mp4;base64,QUJD" },
            ],
          },
        ],
      },
    });
    const video = screen.getByLabelText("橘猫.mp4");
    expect(video).toHaveAttribute("src", "data:video/mp4;base64,QUJD");
    expect(screen.getByLabelText("下载视频 橘猫.mp4")).toBeInTheDocument();
  });
});

describe("capability panel (TASK-06 路由 v1)", () => {
  it("suggests capabilities from the typed input and preselect applies them", async () => {
    const onWebSearchChange = vi.fn();
    const onSendMessage = vi.fn();
    renderChat({
      onWebSearchChange,
      onDeepThinkingChange: vi.fn(),
      onSendMessage,
    });

    // Type an intent-bearing input, then open the panel.
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "查一下最新的AI新闻" },
    });
    fireEvent.click(screen.getByLabelText("能力面板"));

    // The suggestion line names the top capability.
    const panel = await screen.findByTestId("capability-panel");
    expect(panel.textContent).toContain("联网搜索");
    fireEvent.click(screen.getByLabelText("预选建议能力"));
    expect(onWebSearchChange).toHaveBeenCalledWith(true);

    // Manual route checkboxes ride along as force_route on the next send.
    fireEvent.click(screen.getByLabelText("能力-图像生成"));
    fireEvent.click(screen.getByRole("button", { name: /发送/ }));
    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalled();
    });
    const params = onSendMessage.mock.calls[0][2] as Record<string, unknown>;
    expect(params.force_route).toBe("image");
  });

  it("route flags reset after one send", async () => {
    const onSendMessage = vi.fn();
    renderChat({ onSendMessage });
    fireEvent.click(screen.getByLabelText("能力面板"));
    fireEvent.click(await screen.findByLabelText("能力-视频生成"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "你好" } });
    fireEvent.click(screen.getByRole("button", { name: /发送/ }));
    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalled();
    });
    expect(
      (onSendMessage.mock.calls[0][2] as Record<string, unknown>).force_route,
    ).toBe("video");

    // Second send carries no stale route.
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "再来一条" } });
    fireEvent.click(screen.getByRole("button", { name: /发送/ }));
    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledTimes(2);
    });
    expect(
      onSendMessage.mock.calls[1][2] as Record<string, unknown>,
    ).not.toHaveProperty("force_route");
  });
});
