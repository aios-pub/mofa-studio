/**
 * Tests for the music generation page (TOOL-10): parameter assembly into
 * the submit payload, task lifecycle polling to an inline player, gallery
 * recording, and the podcast-BGM bridge.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MusicGenPage from "./MusicGenPage";
import {
  setPendingPodcastBgm,
  takePendingPodcastBgm,
  PODCAST_BGM_BRIDGE_KEY,
} from "@/services/api/music";

const mockedSubmit = vi.fn();
const mockedPoll = vi.fn();
const mockedCreate = vi.fn();

vi.mock("antd", async (importOriginal) => {
  const antd = await importOriginal<typeof import("antd")>();
  return { ...antd, message: { ...antd.message, success: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() } };
});

vi.mock("@/services/api/music", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api/music")>();
  return {
    ...actual,
    musicService: {
      submit: (...a: unknown[]) => mockedSubmit(...a),
      poll: (...a: unknown[]) => mockedPoll(...a),
    },
  };
});

vi.mock("@/services/api/assets", () => ({
  assetService: {
    create: (...a: unknown[]) => mockedCreate(...a),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <MusicGenPage />
    </MemoryRouter>,
  );
}

async function fillAndSubmit() {
  renderPage();
  fireEvent.change(await screen.findByLabelText("歌曲描述"), {
    target: { value: "一首关于晨跑的歌" },
  });
  fireEvent.click(screen.getByLabelText("生成音乐"));
  await waitFor(() => expect(mockedSubmit).toHaveBeenCalled());
}

describe("MusicGenPage (TOOL-10)", () => {
  it("assembles style/mood/duration into the submit payload", async () => {
    mockedSubmit.mockResolvedValueOnce("mt-1");
    renderPage();

    fireEvent.change(await screen.findByLabelText("歌曲描述"), {
      target: { value: "一首关于晨跑的歌" },
    });
    fireEvent.click(screen.getByLabelText("生成音乐"));

    await waitFor(() => expect(mockedSubmit).toHaveBeenCalled());
    const payload = mockedSubmit.mock.calls[0][0];
    expect(payload.prompt).toContain("一首关于晨跑的歌");
    expect(payload.style).toBe("pop, upbeat");
    expect(payload.instrumental).toBe(false);
  });

  it("polls a task to the inline player and records the gallery asset", async () => {
    mockedSubmit.mockResolvedValueOnce("mt-2");
    mockedPoll.mockImplementation(async (id: string) =>
      id === "mt-2"
        ? {
            task_id: "mt-2",
            status: "succeeded",
            label: "晨跑 · pop, upbeat",
            audio: "data:audio/mpeg;base64,QUJD",
          }
        : null,
    );

    await fillAndSubmit();
    const player = await screen.findByLabelText("试听 晨跑 · pop, upbeat");
    expect(player).toHaveAttribute("src", "data:audio/mpeg;base64,QUJD");
    expect(await screen.findByText("晨跑 · pop, upbeat")).toBeInTheDocument();

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ type: "audio", ref_path: "data:audio/mpeg;base64,QUJD" }),
      ),
    );
  });

  it("failed tasks surface the honest engine reason", async () => {
    mockedSubmit.mockResolvedValueOnce("mt-3");
    mockedPoll.mockResolvedValue({
      task_id: "mt-3",
      status: "failed",
      error: "engine HTTP 503: no music provider configured",
    });

    await fillAndSubmit();
    expect(
      await screen.findByText(/no music provider configured/),
    ).toBeInTheDocument();
  });

  it("queues the finished clip as the podcast BGM", async () => {
    mockedSubmit.mockResolvedValueOnce("mt-4");
    mockedPoll.mockResolvedValue({
      task_id: "mt-4",
      status: "succeeded",
      label: "夜航 · lofi",
      audio: "data:audio/mpeg;base64,WDQ=",
    });

    await fillAndSubmit();
    fireEvent.click(await screen.findByLabelText("设为播客 BGM"));

    expect(localStorage.getItem(PODCAST_BGM_BRIDGE_KEY)).toBe("data:audio/mpeg;base64,WDQ=");
    expect(takePendingPodcastBgm()).toBe("data:audio/mpeg;base64,WDQ=");
    expect(takePendingPodcastBgm()).toBeNull();
  });
});

describe("music service bridge helpers", () => {
  it("setPendingPodcastBgm round-trips and clears on take", () => {
    setPendingPodcastBgm("data:audio/mpeg;base64,eA==");
    expect(takePendingPodcastBgm()).toBe("data:audio/mpeg;base64,eA==");
    expect(takePendingPodcastBgm()).toBeNull();
  });
});
