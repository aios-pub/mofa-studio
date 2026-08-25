/**
 * Tests for the conversation list's TASK-03 「转为项目」 action: the context
 * menu seeds a project from the conversation (title + first user request as
 * goal draft) and navigates to the project workbench.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ConversationList from "./ConversationList";

const mockedCreate = vi.fn();

vi.mock("@/services", () => ({
  conversationApi: {
    getAll: vi.fn().mockResolvedValue([
      {
        id: "c1",
        agentId: "a1",
        title: "发布会策划",
        messages: [
          { id: "m1", role: "user", content: "帮我策划一场新品发布会", status: "completed", createdAt: new Date() },
          { id: "m2", role: "assistant", content: "好的，我们开始", status: "completed", createdAt: new Date() },
        ],
        totalTokens: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]),
    delete: vi.fn(),
    update: vi.fn(),
  },
  agentApi: {
    getAll: vi.fn().mockResolvedValue([{ id: "a1", name: "默认助理" }]),
  },
}));

vi.mock("@/services/api/task", () => ({
  taskService: {
    create: (...args: unknown[]) => mockedCreate(...args),
  },
}));

vi.mock("antd", async (importOriginal) => {
  const antd = await importOriginal<typeof import("antd")>();
  return { ...antd, message: { ...antd.message, success: vi.fn(), error: vi.fn() } };
});

function renderList() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<ConversationList />} />
        <Route path="/projects" element={<div data-testid="projects-page" />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Open the ⋯ context menu on the first conversation row. */
async function openMenu() {
  fireEvent.click(await screen.findByLabelText("更多操作"));
  return screen.findByText("转为项目");
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedCreate.mockResolvedValue({ id: "p1", title: "发布会策划" });
});

describe("ConversationList 转为项目 (TASK-03)", () => {
  it("seeds the project from the conversation and navigates to the workbench", async () => {
    renderList();
    const item = await openMenu();
    fireEvent.click(item);

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith({
        title: "发布会策划",
        goal: "帮我策划一场新品发布会",
      });
    });
    expect(await screen.findByTestId("projects-page")).toBeInTheDocument();
  });

  it("surfaces an error and stays put when creation fails", async () => {
    mockedCreate.mockRejectedValueOnce(new Error("boom"));
    renderList();
    const item = await openMenu();
    fireEvent.click(item);
    await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
    // Still on the conversation list — no navigation happened.
    expect(screen.queryByTestId("projects-page")).not.toBeInTheDocument();
  });
});
