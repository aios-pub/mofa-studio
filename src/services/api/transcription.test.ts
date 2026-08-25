/**
 * Tests for TOOL-11: heuristic speaker separation, timestamp formatting,
 * minutes parsing, and the downstream handoff payloads.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import { audioService } from "./audio";
import type { SpeakerTurn } from "./transcription";
import {
  buildMinutesMessages,
  formatTimestamp,
  minutesToSlide,
  parseMinutes,
  separateSpeakers,
  todosToCsv,
  transcriptionService,
} from "./transcription";

vi.mock("../api/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const mockedPost = vi.mocked(apiClient.post);

beforeEach(() => {
  mockedPost.mockReset();
});

describe("separateSpeakers (说话人分离)", () => {
  it("alternates speakers at long-enough marker turns", () => {
    const transcript =
      "我认为这个方案成本太高。我们再评估一下预算。我觉得可以分期做。首先定第一期范围。";
    const turns = separateSpeakers(transcript);
    expect(turns.length).toBeGreaterThanOrEqual(2);
    // Alternation: no speaker appears twice in a row.
    for (let i = 1; i < turns.length; i += 1) {
      expect(turns[i].speaker).not.toBe(turns[i - 1].speaker);
    }
    expect(turns[0].speaker).toBe("A");
  });

  it("short marker sentences stay in the same turn", () => {
    const transcript = "我认为可以。就这样吧。";
    const turns = separateSpeakers(transcript);
    expect(turns).toHaveLength(1);
  });

  it("timestamps advance with text length", () => {
    const transcript = "我认为这个方案成本太高，需要重新评估预算和排期。我觉得可以分期做，先做第一期。";
    const turns = separateSpeakers(transcript);
    expect(turns[0].startSec).toBe(0);
    expect(turns[1].startSec).toBeGreaterThan(0);
  });

  it("empty transcript yields no turns", () => {
    expect(separateSpeakers("")).toEqual([]);
    expect(separateSpeakers("。！？")).toEqual([]);
  });
});

describe("formatTimestamp", () => {
  it("formats mm:ss", () => {
    expect(formatTimestamp(0)).toBe("00:00");
    expect(formatTimestamp(65)).toBe("01:05");
    expect(formatTimestamp(600)).toBe("10:00");
  });
});

describe("parseMinutes (纪要解析)", () => {
  it("splits summary and todo bullets", () => {
    const minutes = parseMinutes(
      "会议确认了二期范围并讨论了预算。\n待办：\n- 张三出排期表\n- 李四确认预算",
    );
    expect(minutes.summary).toContain("二期范围");
    expect(minutes.todos).toEqual(["张三出排期表", "李四确认预算"]);
  });

  it("summary-only replies degrade gracefully", () => {
    const minutes = parseMinutes("只聊了背景。");
    expect(minutes.summary).toBe("只聊了背景。");
    expect(minutes.todos).toEqual([]);
  });
});

describe("buildMinutesMessages", () => {
  it("formats turns with timestamps and speakers", () => {
    const turns: SpeakerTurn[] = [
      { speaker: "A", text: "开始吧", startSec: 0 },
      { speaker: "B", text: "好的", startSec: 2 },
    ];
    const messages = buildMinutesMessages(turns);
    expect(messages[1].content).toContain("[00:00] 说话人A: 开始吧");
    expect(messages[1].content).toContain("[00:02] 说话人B: 好的");
  });
});

describe("transcriptionService", () => {
  it("transcribes then separates", async () => {
    mockedPost.mockResolvedValueOnce({ text: "我认为可以开始。我觉得先等等。" });
    const result = await transcriptionService.transcribe(new Blob(["x"]));
    expect(result.raw).toContain("我认为");
    expect(result.turns.length).toBeGreaterThanOrEqual(1);
  });

  it("minutes flow through the chat service", async () => {
    mockedPost.mockResolvedValueOnce({
      id: "chat-1",
      content: "概要内容。\n待办：\n- 完成设计",
      finishReason: "stop",
    });
    const minutes = await transcriptionService.minutes([
      { speaker: "A", text: "讨论", startSec: 0 },
    ]);
    expect(minutes.todos).toEqual(["完成设计"]);
    expect(apiClient.post).toHaveBeenCalledWith(
      "/v1/chat/completions",
      expect.objectContaining({ stream: false }),
    );
    expect(audioService).toBeDefined();
  });
});

describe("downstream handoff (下游闭环)", () => {
  it("todos export as an AI-sheets-ready CSV", () => {
    const csv = todosToCsv(["写周报,本周", "约会议"]);
    expect(csv.split("\n")).toEqual(["事项,状态", '"写周报,本周",未开始', "约会议,未开始"]);
  });

  it("minutes fold into one PPT slide", () => {
    const slide = minutesToSlide(
      { summary: "确认了范围与预算", todos: ["排期", "评审"] },
      "项目周会",
    );
    expect(slide.title).toBe("项目周会");
    expect(slide.points[0]).toContain("确认了范围");
    expect(slide.points).toContain("排期");
  });
});
