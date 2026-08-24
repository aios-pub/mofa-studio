/**
 * Tests for the version-compare slider (TOOL-05) and the history page.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import CompareSlider from "./CompareSlider";
import ImageHistoryPage from "@/pages/creation/ImageHistoryPage";
import type { ImageGenHistoryEntry } from "@/services/api/image";
import { HISTORY_KEY, prependEntry } from "@/services/api/imageHistory";

vi.mock("antd", async (importOriginal) => {
  const antd = await importOriginal<typeof import("antd")>();
  return {
    ...antd,
    message: { ...antd.message, warning: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn() },
  };
});

function entry(id: string): ImageGenHistoryEntry {
  return {
    id,
    prompt: `prompt-${id}`,
    model: "mock/mock-image",
    n: 1,
    size: "1024x1024",
    created_at: "2026-08-25T10:00:00Z",
    images: [`data:image/png;base64,${id}`],
  };
}

describe("CompareSlider (版本对比滑杆)", () => {
  function renderSlider(position = 50, onPositionChange = vi.fn()) {
    render(
      <CompareSlider
        beforeSrc="data:before"
        afterSrc="data:after"
        beforeLabel="旧版"
        afterLabel="新版"
        position={position}
        onPositionChange={onPositionChange}
      />,
    );
    return { onPositionChange };
  }

  it("renders both layers, labels, and the divider at the position", () => {
    renderSlider(30);
    expect(screen.getByAltText("旧版")).toBeInTheDocument();
    expect(screen.getByAltText("新版")).toBeInTheDocument();
    expect(screen.getByLabelText("对比滑杆")).toHaveValue("30");
    const clip = screen.getByTestId("compare-clip");
    expect(clip.style.width).toBe("30%");
  });

  it("dragging reports new positions", () => {
    const { onPositionChange } = renderSlider(50);
    fireEvent.change(screen.getByLabelText("对比滑杆"), { target: { value: "80" } });
    expect(onPositionChange).toHaveBeenCalledWith(80);
  });
});

describe("ImageHistoryPage", () => {
  beforeEach(() => {
    localStorage.removeItem(HISTORY_KEY);
  });

  it("shows the empty state with no history", () => {
    render(
      <MemoryRouter>
        <ImageHistoryPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/还没有生成记录/)).toBeInTheDocument();
  });

  it("renders entries with restore/compare actions", () => {
    prependEntry(entry("a"));
    prependEntry(entry("b"));
    render(
      <MemoryRouter>
        <ImageHistoryPage />
      </MemoryRouter>,
    );
    expect(screen.getByAltText("prompt-a")).toBeInTheDocument();
    expect(screen.getByAltText("prompt-b")).toBeInTheDocument();
    expect(screen.getByLabelText("恢复参数 prompt-a")).toBeInTheDocument();
    expect(screen.getByLabelText("选择对比 prompt-a")).toBeInTheDocument();
  });

  it("selecting two entries enables compare and opens the slider modal", () => {
    prependEntry(entry("a"));
    prependEntry(entry("b"));
    render(
      <MemoryRouter>
        <ImageHistoryPage />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("对比所选")).toBeDisabled();

    fireEvent.click(screen.getByLabelText("选择对比 prompt-a"));
    fireEvent.click(screen.getByLabelText("选择对比 prompt-b"));
    expect(screen.getByLabelText("对比所选")).not.toBeDisabled();

    fireEvent.click(screen.getByLabelText("对比所选"));
    expect(screen.getByLabelText("对比滑杆")).toBeInTheDocument();
    expect(screen.getByAltText("prompt-a")).toBeInTheDocument();
    expect(screen.getByAltText("prompt-b")).toBeInTheDocument();
  });

  it("deleting an entry removes it from the grid", () => {
    prependEntry(entry("a"));
    prependEntry(entry("b"));
    render(
      <MemoryRouter>
        <ImageHistoryPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByLabelText("删除记录 prompt-b"));
    expect(screen.queryByAltText("prompt-b")).not.toBeInTheDocument();
    expect(screen.getByAltText("prompt-a")).toBeInTheDocument();
  });
});
