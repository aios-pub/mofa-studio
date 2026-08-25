/**
 * Tests for the progressive-disclosure engine (ONBOARD-04): funnel
 * ordering, fire-once semantics, permanent dismissal, trigger mapping.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  GUIDANCES,
  STAGE_ORDER,
  dismissGuidance,
  evaluateTrigger,
  fireGuidance,
  hasFired,
  isDismissed,
} from "./progressiveDisclosure";

beforeEach(() => {
  localStorage.clear();
});

describe("GUIDANCES catalog", () => {
  it("covers the PRD funnel stages in order", () => {
    const stages = STAGE_ORDER;
    expect(stages).toEqual(["灵感", "Skill", "连接器", "专家", "专家团"]);
    for (const guidance of Object.values(GUIDANCES)) {
      expect(stages).toContain(guidance.stage);
      expect(guidance.title.length).toBeGreaterThan(4);
      expect(guidance.body.length).toBeGreaterThan(8);
      expect(guidance.action.route).toMatch(/^\//);
    }
  });

  it("every guidance has an actionable route", () => {
    for (const guidance of Object.values(GUIDANCES)) {
      expect(guidance.action.label.length).toBeGreaterThan(1);
    }
  });
});

describe("fire-once + dismissal semantics", () => {
  it("fires once, then never again", () => {
    expect(fireGuidance("first-output-skill")).not.toBeNull();
    expect(hasFired("first-output-skill")).toBe(true);
    expect(fireGuidance("first-output-skill")).toBeNull();
  });

  it("dismissed guidances never fire", () => {
    dismissGuidance("search-unconfigured-connector");
    expect(isDismissed("search-unconfigured-connector")).toBe(true);
    expect(fireGuidance("search-unconfigured-connector")).toBeNull();
  });

  it("dismissal persists across loads", () => {
    dismissGuidance("rerun-often-expert");
    expect(isDismissed("rerun-often-expert")).toBe(true);
  });

  it("independent guidances do not interfere", () => {
    expect(fireGuidance("first-output-skill")).not.toBeNull();
    expect(fireGuidance("search-unconfigured-connector")).not.toBeNull();
    expect(hasFired("image-model-missing-connector")).toBe(false);
  });
});

describe("evaluateTrigger (边界触发)", () => {
  const base = {
    hasOutput: true,
    searchConfigured: false,
    imageModelAvailable: false,
  };

  it("first output maps to the Skill stage", () => {
    expect(evaluateTrigger({ ...base, kind: "first-output" })).toBe("first-output-skill");
  });

  it("search failures only guide when unconfigured", () => {
    expect(evaluateTrigger({ ...base, kind: "search-failed-unconfigured", searchConfigured: false })).toBe(
      "search-unconfigured-connector",
    );
    expect(evaluateTrigger({ ...base, kind: "search-failed-unconfigured", searchConfigured: true })).toBeNull();
  });

  it("image missing only guides without an image model", () => {
    expect(evaluateTrigger({ ...base, kind: "image-model-missing", imageModelAvailable: false })).toBe(
      "image-model-missing-connector",
    );
    expect(evaluateTrigger({ ...base, kind: "image-model-missing", imageModelAvailable: true })).toBeNull();
  });

  it("regenerate/branch milestones map to 专家/专家团", () => {
    expect(evaluateTrigger({ ...base, kind: "third-regenerate" })).toBe("rerun-often-expert");
    expect(evaluateTrigger({ ...base, kind: "third-branch" })).toBe("branch-many-experts");
  });
});
