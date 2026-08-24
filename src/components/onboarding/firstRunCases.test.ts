/**
 * Tests for ONBOARD-03 first-run cases: catalog shape, flag semantics,
 * and query parsing.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  FIRST_RUN_CASES,
  FIRST_OUTPUT_FLAG,
  hasFirstOutput,
  markFirstOutput,
  queryRecord,
} from "./firstRunCases";

describe("FIRST_RUN_CASES (ONBOARD-03)", () => {
  it("offers 3–5 lightweight cases per the PRD", () => {
    expect(FIRST_RUN_CASES.length).toBeGreaterThanOrEqual(3);
    expect(FIRST_RUN_CASES.length).toBeLessThanOrEqual(5);
  });

  it("every case routes to an existing creation tool with auto-run params", () => {
    for (const c of FIRST_RUN_CASES) {
      expect(["/creation/writing", "/creation/image-gen"]).toContain(c.to);
      expect(c.params.run).toBe("1");
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.description.length).toBeGreaterThan(4);
    }
  });

  it("covers both a writing case and an image case", () => {
    expect(FIRST_RUN_CASES.some((c) => c.to === "/creation/writing")).toBe(true);
    expect(FIRST_RUN_CASES.some((c) => c.to === "/creation/image-gen")).toBe(true);
  });

  it("image cases carry a prompt and size", () => {
    for (const c of FIRST_RUN_CASES.filter((x) => x.to === "/creation/image-gen")) {
      expect(c.params.prompt.length).toBeGreaterThan(6);
      expect(c.params.size).toMatch(/^\d+x\d+$/);
    }
  });

  it("writing cases carry a genre and topic", () => {
    for (const c of FIRST_RUN_CASES.filter((x) => x.to === "/creation/writing")) {
      expect(["xiaohongshu", "wechat", "review", "script"]).toContain(c.params.genre);
      expect(c.params.topic.length).toBeGreaterThan(2);
    }
  });
});

describe("first-output flag", () => {
  beforeEach(() => localStorage.clear());

  it("starts unset and flips once", () => {
    expect(hasFirstOutput()).toBe(false);
    markFirstOutput();
    expect(localStorage.getItem(FIRST_OUTPUT_FLAG)).toBe("1");
    expect(hasFirstOutput()).toBe(true);
  });
});

describe("queryRecord", () => {
  it("parses search strings", () => {
    expect(queryRecord("?genre=script&topic=%E6%8C%91%E8%A5%BF%E7%93%9C&run=1")).toEqual({
      genre: "script",
      topic: "挑西瓜",
      run: "1",
    });
  });

  it("empty search yields an empty record", () => {
    expect(queryRecord("")).toEqual({});
  });
});
