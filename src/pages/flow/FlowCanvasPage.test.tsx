/**
 * Smoke tests for the flow canvas (FLOW-01/02 UI): palette rendering,
 * node addition, run gating, and connection validation messaging.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FlowCanvasPage from "./FlowCanvasPage";

const { mockedMessageError } = vi.hoisted(() => ({ mockedMessageError: vi.fn() }));
vi.mock("antd", async (importOriginal) => {
  const antd = await importOriginal<typeof import("antd")>();
  return {
    ...antd,
    message: { ...antd.message, warning: vi.fn(), success: vi.fn(), error: mockedMessageError, info: vi.fn() },
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
    expect(screen.getByLabelText("导入 JSON 或图片")).toBeInTheDocument();
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

describe("FlowCanvas template market (FLOW-07)", () => {
  it("opens the market and lists the ten built-in templates", async () => {
    renderPage();
    fireEvent.click(screen.getByLabelText("模板市场"));
    const modal = await screen.findByText("模板市场 · 官方内置");
    expect(modal).toBeInTheDocument();
    expect(await screen.findByLabelText("载入模板 文生图 · 基础链路")).toBeInTheDocument();
    // Dependency states render per template.
    expect(screen.getAllByText("缺少依赖").length).toBeGreaterThan(0);
  });

  it("loading a template populates the canvas and enables run", async () => {
    renderPage();
    fireEvent.click(screen.getByLabelText("模板市场"));
    fireEvent.click(await screen.findByLabelText("载入模板 文生图 · 基础链路"));
    await waitFor(() =>
      expect(screen.getByLabelText("运行工作流")).not.toBeDisabled(),
    );
  });
});

const { mockedSave, mockedVersions, mockedVersion } = vi.hoisted(() => ({
  mockedSave: vi.fn(),
  mockedVersions: vi.fn(),
  mockedVersion: vi.fn(),
}));

vi.mock("@/services/api/flow", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api/flow")>();
  return {
    ...actual,
    flowDocService: {
      save: (...a: unknown[]) => mockedSave(...a),
      versions: (...a: unknown[]) => mockedVersions(...a),
      version: (...a: unknown[]) => mockedVersion(...a),
    },
  };
});

describe("FLOW-06 图片恢复 + 版本历史", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** A PNG carrying a mofa_workflow tEXt chunk (same format as the gateway). */
  function workflowPngFile(): File {
    const crc32 = (data: number[]): number => {
      let c = 0xffffffff;
      for (const byte of data) {
        c ^= byte;
        for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      return (c ^ 0xffffffff) >>> 0;
    };
    const chunk = (kind: string, data: number[]) => {
      const body = [...Array.from(kind, (c) => c.charCodeAt(0)), ...data];
      const crc = new Uint8Array(4);
      new DataView(crc.buffer).setUint32(0, crc32(body));
      return [0, 0, 0, data.length, ...body, ...crc];
    };
    // The gateway embeds the BARE graph (no mofa-flow envelope).
    const workflow = JSON.stringify({
      nodes: [
        { id: "p1", type: "prompt_text", params: { text: "从图片恢复的提示词" } },
        { id: "o", type: "output", params: {} },
      ],
      edges: [{ from: "p1", to: "o" }],
    });
    const utf8 = new TextEncoder().encode(workflow);
    const TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let b64 = "";
    for (let i = 0; i < utf8.length; i += 3) {
      const b = [utf8[i], utf8[i + 1] ?? 0, utf8[i + 2] ?? 0];
      const n = (b[0] << 16) | (b[1] << 8) | b[2];
      b64 += TABLE[(n >> 18) & 63] + TABLE[(n >> 12) & 63];
      b64 += (i + 1 < utf8.length ? TABLE[(n >> 6) & 63] : "=") + (i + 2 < utf8.length ? TABLE[n & 63] : "=");
    }
    const payload = [...Array.from("mofa_workflow", (c) => c.charCodeAt(0)), 0, ...Array.from(b64, (c) => c.charCodeAt(0))];
    const bytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ...chunk("IHDR", new Array(13).fill(0)),
      ...chunk("tEXt", payload),
      ...chunk("IEND", []),
    ]);
    return new File([bytes], "result.png", { type: "image/png" });
  }

  it("imports a workflow from one of its own output PNGs", async () => {
    renderPage();
    // Empty canvas → run disabled; a restored graph makes it runnable.
    expect(screen.getByLabelText("运行工作流")).toBeDisabled();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [workflowPngFile()] });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByLabelText("运行工作流")).not.toBeDisabled();
    });
  });

  it("a snapshot-less PNG is rejected honestly", async () => {
    renderPage();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", {
      value: [new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "plain.png", { type: "image/png" })],
    });
    fireEvent.change(input);
    await waitFor(() => expect(mockedMessageError).toHaveBeenCalled());
    expect(mockedMessageError.mock.calls[0][0]).toContain("没有携带工作流快照");
  });

  it("saving creates version history and restoring a version reloads the graph", async () => {
    mockedSave.mockResolvedValueOnce({ id: "doc-9", version: 1 });
    mockedVersions.mockResolvedValueOnce([
      { id: "doc-9-v1", doc_id: "doc-9", version_index: 1, created_at: "2026-08-26T10:00:00Z" },
      { id: "doc-9-v2", doc_id: "doc-9", version_index: 2, created_at: "2026-08-26T11:00:00Z" },
    ]);
    mockedVersion.mockResolvedValueOnce({
      nodes: [{ id: "r", type: "prompt_text", params: { text: "历史版本的提示词" } }],
      edges: [],
    });

    renderPage();
    fireEvent.click(screen.getByLabelText("保存工作流"));
    await waitFor(() => expect(mockedSave).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText("版本历史"));
    await waitFor(() => expect(screen.getByText(/v2/)).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("恢复版本 2"));
    await waitFor(() => expect(mockedVersion).toHaveBeenCalledWith("doc-9", 2));
  });
});
