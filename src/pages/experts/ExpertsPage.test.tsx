/**
 * Tests for the experts page (TASK-14): industry browsing, summoning into a
 * conversation (route param), creating 我的专家, and the expert chip's
 * dismissal on the conversation surface.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExpertsPage from "./ExpertsPage";
import { BUILTIN_EXPERTS, expertSystemPrompt, loadMyExperts } from "@/utils/experts";

vi.mock("antd", async (importOriginal) => {
  const antd = await importOriginal<typeof import("antd")>();
  return { ...antd, message: { ...antd.message, success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() } };
});

beforeEach(() => {
  localStorage.clear();
});

function ConversationProbe() {
  const { search } = useLocation();
  return <div data-testid="conversation-root" data-search={search} />;
}

describe("ExpertsPage (TASK-14)", () => {
  it("renders builtin cards grouped by industry filter", async () => {
    render(
      <MemoryRouter>
        <ExpertsPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText("增长营销策划")).toBeInTheDocument();
    expect(screen.getByText("前端架构师")).toBeInTheDocument();

    // Filter narrows to one industry (native filter chips).
    fireEvent.click(screen.getByRole("button", { name: "法律" }));
    await waitFor(() => {
      expect(screen.queryByText("前端架构师")).not.toBeInTheDocument();
    });
    expect(screen.getByText("法务顾问")).toBeInTheDocument();
  });

  it("summon navigates to the conversation with the expert id", async () => {
    render(
      <MemoryRouter initialEntries={["/experts"]}>
        <Routes>
          <Route path="/experts" element={<ExpertsPage />} />
          <Route path="/" element={<ConversationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByLabelText("召唤 增长营销策划"));
    const root = await screen.findByTestId("conversation-root");
    expect(root).toBeInTheDocument();
    expect(root.getAttribute("data-search")).toContain("expert=expert-marketer");
  });

  it("creates a personal expert and persists it", async () => {
    render(
      <MemoryRouter>
        <ExpertsPage />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByLabelText("创建我的专家"));
    fireEvent.change(await screen.findByLabelText("专家名称"), {
      target: { value: "跨境电商运营" },
    });
    fireEvent.change(screen.getByLabelText("专家人设"), {
      target: { value: "你是跨境电商老兵，懂选品与投放。" },
    });
    fireEvent.click(screen.getByRole("button", { name: /创 建|确 定/ }));

    await waitFor(() => {
      expect(loadMyExperts().some((e) => e.name === "跨境电商运营")).toBe(true);
    });
    expect(await screen.findByText("跨境电商运营")).toBeInTheDocument();
  });

  it("exports a shareable card via download", async () => {
    const clickSpy = vi.fn();
    HTMLAnchorElement.prototype.click = clickSpy;
    render(
      <MemoryRouter>
        <ExpertsPage />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByLabelText("导出 增长营销策划"));
    expect(clickSpy).toHaveBeenCalled();
  });
});

describe("BUILTIN_EXPERTS content quality", () => {
  it("every builtin card builds a usable system prompt", () => {
    for (const expert of BUILTIN_EXPERTS) {
      const prompt = expertSystemPrompt(expert);
      expect(prompt.length).toBeGreaterThan(40);
      expect(prompt).toContain(expert.name);
    }
  });
});
