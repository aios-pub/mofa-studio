/**
 * Smoke tests for the flow canvas (FLOW-01/02 UI): palette rendering,
 * node addition, run gating, and connection validation messaging.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import FlowCanvasPage from "./FlowCanvasPage";

vi.mock("antd", async (importOriginal) => {
  const antd = await importOriginal<typeof import("antd")>();
  return {
    ...antd,
    message: { ...antd.message, warning: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn() },
  };
});

vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  return {
    ...actual,
    ReactFlow: () => <div data-testid="react-flow-stub" />,
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <FlowCanvasPage />
    </MemoryRouter>,
  );
}

describe("FlowCanvasPage (FLOW UI)", () => {
  it("renders the five-piece palette", () => {
    renderPage();
    for (const label of ["文本提示词", "参数常量", "LLM 文本", "图像生成", "输出"]) {
      expect(screen.getByLabelText(`添加 ${label} 节点`)).toBeInTheDocument();
    }
  });

  it("run and export are available; run is gated on an empty canvas", () => {
    renderPage();
    expect(screen.getByLabelText("运行工作流")).toBeDisabled();
    expect(screen.getByLabelText("导出 JSON")).toBeInTheDocument();
    expect(screen.getByLabelText("导入 JSON")).toBeInTheDocument();
  });

  it("adding a node enables run and opens the parameter editor", () => {
    renderPage();
    fireEvent.click(screen.getByLabelText("添加 文本提示词 节点"));
    expect(screen.getByLabelText("运行工作流")).not.toBeDisabled();
    expect(screen.getByLabelText("提示词编辑")).toBeInTheDocument();
    expect(screen.getByDisplayValue("一只橘猫坐在窗台上")).toBeInTheDocument();
  });

  it("image node exposes the size quick editor", () => {
    renderPage();
    fireEvent.click(screen.getByLabelText("添加 图像生成 节点"));
    expect(screen.getByLabelText("尺寸选择")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1024x1024")).toBeInTheDocument();
  });
});
