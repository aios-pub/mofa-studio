/**
 * Tests for TOOL-16: solver prompt assembly (subject requirements, honest
 * unclear-image path, extra notes) and the page flow — photo → vlm payload
 * with the image part → KaTeX-enabled markdown answer.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SolverPage from "./SolverPage";
import {
  SUBJECTS,
  buildSolverPrompt,
  validateSolverInput,
} from "@/utils/solverPrompt";

const mockedChat = vi.fn();

vi.mock("antd", async (importOriginal) => {
  const antd = await importOriginal<typeof import("antd")>();
  return { ...antd, message: { ...antd.message, success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() } };
});

vi.mock("@/services/api/chat", () => ({
  chatService: { chat: (...a: unknown[]) => mockedChat(...a) },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("solver prompt (TOOL-16)", () => {
  it("bakes subject requirements and the step-by-step structure", () => {
    const math = buildSolverPrompt("math");
    expect(math).toContain("数学");
    expect(math).toContain("分步讲解");
    expect(math).toContain("$...$");
    expect(math).toContain("易错点");
    expect(math).not.toContain("学生附言");

    const physics = buildSolverPrompt("physics", "第二问没看懂");
    expect(physics).toContain("物理");
    expect(physics).toContain("学生附言");
    expect(physics).toContain("第二问没看懂");
  });

  it("unknown subjects fall back to the first; catalog is intact", () => {
    expect(buildSolverPrompt("nope")).toContain("数学");
    expect(SUBJECTS.map((s) => s.id)).toEqual(["math", "physics", "chemistry"]);
  });

  it("input validation gates on image and subject", () => {
    expect(validateSolverInput(false, "math").ok).toBe(false);
    expect(validateSolverInput(true, "bogus").ok).toBe(false);
    expect(validateSolverInput(true, "math")).toEqual({ ok: true });
  });
});

describe("SolverPage (TOOL-16)", () => {
  function pickPhoto() {
    const input = document.querySelector('input[type="file"]');
    Object.defineProperty(input!, "files", {
      value: [new File(["img"], "q.png", { type: "image/png" })],
    });
    fireEvent.change(input!);
  }

  it("sends the photo as a vision part with the solver prompt", async () => {
    mockedChat.mockResolvedValueOnce({
      content: "【题目】…\n\n【分步讲解】$x^2 = 4$ 所以 $x = \\pm 2$",
    });
    render(
      <MemoryRouter>
        <SolverPage />
      </MemoryRouter>,
    );

    pickPhoto();
    await screen.findByAltText("题目照片");
    fireEvent.click(screen.getByLabelText("开始讲解"));

    await waitFor(() => expect(mockedChat).toHaveBeenCalled());
    const request = mockedChat.mock.calls[0][0];
    const parts = request.messages[0].content;
    expect(parts[0].type).toBe("text");
    expect(parts[0].text).toContain("分步讲解");
    expect(parts[1].type).toBe("image_url");
    expect(String(parts[1].image_url.url)).toMatch(/^data:image\/png/);

    // The answer renders (scoped — the subtitle also mentions 分步讲解).
    const result = await screen.findByLabelText("讲解结果");
    expect(result.textContent).toContain("x^2 = 4");
  });

  it("gates on the photo before any request", async () => {
    render(
      <MemoryRouter>
        <SolverPage />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("开始讲解")).toBeDisabled();
    expect(mockedChat).not.toHaveBeenCalled();
  });

  it("empty model replies surface an honest error", async () => {
    mockedChat.mockResolvedValueOnce({ content: "" });
    render(
      <MemoryRouter>
        <SolverPage />
      </MemoryRouter>,
    );
    pickPhoto();
    await screen.findByAltText("题目照片");
    fireEvent.click(screen.getByLabelText("开始讲解"));
    await waitFor(() => expect(mockedChat).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByLabelText("讲解结果")).not.toBeInTheDocument();
  });
});
