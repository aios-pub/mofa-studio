/**
 * Tests for the model center page (FLOW-05): dual-track rendering, pull
 * start + progress polling, disk accounting, and honest degradation when
 * Ollama is absent.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ModelCenterPage from "./ModelCenterPage";
import {
  formatBytes,
  type LocalStorage,
  type PullTask,
} from "@/services/api/modelCenter";

const mockedStorage = vi.fn();
const mockedPulls = vi.fn();
const mockedPull = vi.fn();
const mockedCancel = vi.fn();
const mockedDelete = vi.fn();
const mockedListModels = vi.fn();

vi.mock("@/services/api/modelCenter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api/modelCenter")>();
  return {
    ...actual,
    modelCenterService: {
      localStorage: (...a: unknown[]) => mockedStorage(...a),
      pulls: (...a: unknown[]) => mockedPulls(...a),
      pull: (...a: unknown[]) => mockedPull(...a),
      cancel: (...a: unknown[]) => mockedCancel(...a),
      delete: (...a: unknown[]) => mockedDelete(...a),
    },
  };
});

vi.mock("@/services/api/engine", () => ({
  AUTO_MODEL: "__auto__",
  engineService: { listModels: (...a: unknown[]) => mockedListModels(...a) },
}));

const storage = (models: Array<{ name: string; size_bytes: number }>): LocalStorage => ({
  models,
  total_bytes: models.reduce((sum, m) => sum + m.size_bytes, 0),
});

function pull(overrides: Partial<PullTask>): PullTask {
  return {
    id: "pull-1",
    name: "qwen3:8b",
    status: "pulling",
    percent: 40,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedListModels.mockResolvedValue([
    { id: "mock/gpt", capability: "chat", cost_tier: "high" },
    { id: "mock/edit", capability: "image_edit" },
  ]);
  mockedPulls.mockResolvedValue([]);
  mockedStorage.mockResolvedValue(storage([{ name: "qwen3:8b", size_bytes: 4_900_000_000 }]));
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ModelCenterPage />
    </MemoryRouter>,
  );
}

describe("ModelCenterPage (FLOW-05)", () => {
  it("groups engine models by capability on the cloud track", async () => {
    renderPage();
    expect(await screen.findByText("对话")).toBeInTheDocument();
    expect(screen.getByText("改图")).toBeInTheDocument();
    expect(screen.getByText("mock/gpt · 付费")).toBeInTheDocument();
  });

  it("lists local models with disk accounting", async () => {
    renderPage();
    expect(await screen.findByText("qwen3:8b")).toBeInTheDocument();
    expect(screen.getByText(formatBytes(4_900_000_000))).toBeInTheDocument();
    expect(screen.getByText(/磁盘占用 4.6 GB/)).toBeInTheDocument();
  });

  it("starts a pull and renders live progress", async () => {
    mockedPull.mockResolvedValueOnce("pull-1");
    mockedPulls
      .mockResolvedValueOnce([pull({ percent: 40 })])
      .mockResolvedValueOnce([pull({ status: "done", percent: 100 })])
      .mockResolvedValue([pull({ status: "done", percent: 100 })]);

    renderPage();
    fireEvent.change(await screen.findByLabelText("拉取模型名"), {
      target: { value: "llama3:70b" },
    });
    fireEvent.click(screen.getByLabelText("拉取模型"));
    await waitFor(() => expect(mockedPull).toHaveBeenCalledWith("llama3:70b"));
    expect(await screen.findByText("完成")).toBeInTheDocument();
  });

  it("cancels an in-flight pull from the task row", async () => {
    mockedCancel.mockResolvedValue(undefined);
    mockedPulls.mockResolvedValue([pull({})]);
    renderPage();
    const cancel = await screen.findByLabelText("取消拉取 qwen3:8b");
    fireEvent.click(cancel);
    await waitFor(() => expect(mockedCancel).toHaveBeenCalledWith("pull-1"));
  });

  it("deletes a local model and refreshes accounting", async () => {
    mockedDelete.mockResolvedValueOnce(true);
    mockedStorage
      .mockResolvedValueOnce(storage([{ name: "qwen3:8b", size_bytes: 1000 }]))
      .mockResolvedValue(storage([]));
    renderPage();
    fireEvent.click(await screen.findByLabelText("删除 qwen3:8b"));
    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith("qwen3:8b"));
    await waitFor(() =>
      expect(mockedStorage).toHaveBeenCalledTimes(2),
    );
  });

  it("degrades honestly when Ollama is unreachable", async () => {
    mockedStorage.mockResolvedValue(null);
    renderPage();
    expect(await screen.findByText(/本地 Ollama 不可达/)).toBeInTheDocument();
  });
});

describe("formatBytes", () => {
  it("picks human units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(4_900_000_000)).toBe("4.6 GB");
    expect(formatBytes(40_000_000_000)).toBe("37.3 GB");
  });
});
