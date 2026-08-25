/**
 * Tests for the podcast service (TOOL-12): script parsing, voice mapping,
 * RSS feed building, and request mapping.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import {
  VOICES,
  buildRssFeed,
  defaultVoiceFor,
  parseEpisode,
  podcastService,
} from "./podcast";

vi.mock("../api/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    getBaseUrl: () => "http://gateway.test",
  },
}));

const mockedPost = vi.mocked(apiClient.post);

beforeEach(() => {
  mockedPost.mockReset();
});

describe("parseEpisode", () => {
  it("parses a full script with alternating speakers", () => {
    const reply = '{"title":"橘猫观察","description":"聊聊猫","script":[{"speaker":"A","text":"欢迎收听！"},{"speaker":"B","text":"大家好。"},{"speaker":"A","text":""}]}';
    const episode = parseEpisode(reply, "橘猫");
    expect(episode.title).toBe("橘猫观察");
    expect(episode.script).toHaveLength(2);
    expect(episode.script[1].speaker).toBe("B");
  });

  it("normalizes invalid speaker values to A", () => {
    const episode = parseEpisode(
      '{"script":[{"speaker":"X","text":"你好"}]}',
      "主题",
    );
    expect(episode.script[0].speaker).toBe("A");
  });

  it("empty scripts throw a specific error", () => {
    expect(() => parseEpisode('{"script":[]}', "t")).toThrow("脚本为空");
    expect(() => parseEpisode("no json", "t")).toThrow("JSON");
  });

  it("title falls back to the topic", () => {
    const episode = parseEpisode('{"script":[{"speaker":"A","text":"x"}]}', "备用主题");
    expect(episode.title).toBe("备用主题");
  });
});

describe("voice mapping (多音色)", () => {
  it("A/B default to distinct voices and the catalog covers both", () => {
    expect(defaultVoiceFor("A")).not.toBe(defaultVoiceFor("B"));
    const speakers = new Set(VOICES.map((v) => v.speaker));
    expect(speakers).toEqual(new Set(["A", "B"]));
  });
});

describe("buildRssFeed (RSS 输出)", () => {
  it("emits a valid channel with escaped titles and enclosures", () => {
    const xml = buildRssFeed("猫猫电台<&>", "https://cat.fm", [
      {
        title: "第一期 <橘猫>",
        description: "聊聊猫",
        pubDate: new Date("2026-08-25T00:00:00Z"),
        durationSec: 630,
        audioUrl: "https://cat.fm/ep1.mp3",
      },
    ]);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("<rss");
    expect(xml).toContain("猫猫电台&lt;&amp;&gt;");
    expect(xml).toContain("第一期 &lt;橘猫&gt;");
    expect(xml).toContain("<itunes:duration>630</itunes:duration>");
    expect(xml).toContain('url="https://cat.fm/ep1.mp3"');
  });
});

describe("podcastService", () => {
  it("render posts turns with bgm and volume", async () => {
    mockedPost.mockResolvedValueOnce({ data_url: "data:audio/mpeg;base64,x", size: 10 });
    await podcastService.render(["data:1", "data:2"], "data:bgm", 0.3);
    expect(mockedPost).toHaveBeenCalledWith("/api/podcast/render", {
      turns: ["data:1", "data:2"],
      bgm: "data:bgm",
      bgm_volume: 0.3,
    });
  });

  it("render without bgm sends null", async () => {
    mockedPost.mockResolvedValueOnce({ data_url: "d", size: 1 });
    await podcastService.render(["data:1"]);
    expect(mockedPost).toHaveBeenCalledWith("/api/podcast/render", {
      turns: ["data:1"],
      bgm: null,
      bgm_volume: 0.25,
    });
  });
});
