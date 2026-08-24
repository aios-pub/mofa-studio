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
