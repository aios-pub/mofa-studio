/**
 * Smoke tests for the AI writing page: control panel wiring, genre hints,
 * and the generate gate (empty topic blocks the draft).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WritingPage from "./WritingPage";

vi.mock("@/services/api/engine", () => ({
  AUTO_MODEL: "__auto__",
  engineService: {
    health: vi.fn().mockResolvedValue({ engine_url: "", reachable: false, status: "down" }),
    listChatModels: vi.fn().mockResolvedValue([]),
    listModels: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/services/api/writing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api/writing")>();
  return { ...actual, streamWriting: vi.fn().mockResolvedValue("") };
});

describe("WritingPage (TOOL-06)", () => {
  it("renders the genre selector with platform hints", async () => {
    render(<WritingPage />);
    expect(screen.getByLabelText("体裁模板")).toBeInTheDocument();
    expect(screen.getByLabelText("写作主题")).toBeInTheDocument();
    expect(screen.getByLabelText("补充要求")).toBeInTheDocument();

    // Default genre = 小红书文案 → its limit hint shows.
    expect(
      await screen.findByText(/小红书正文上限 1000 字/),
    ).toBeInTheDocument();
  });

  it("generate is gated on a non-empty topic", () => {
    render(<WritingPage />);
    const button = screen.getByLabelText("生成初稿");
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText("写作主题"), {
      target: { value: "露营装备" },
    });
    expect(button).not.toBeDisabled();
  });

  it("editor surface and export render", async () => {
    render(<WritingPage />);
    expect(await screen.findByLabelText("写作编辑器")).toBeInTheDocument();
    expect(screen.getByLabelText("导出 Markdown")).toBeInTheDocument();
    expect(screen.getByText(/字数：/)).toBeInTheDocument();
  });
});
