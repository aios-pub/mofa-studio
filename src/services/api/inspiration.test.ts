/**
 * Tests for the inspiration gallery (TASK-21): catalog invariants, kind
 * filtering, dependency detection, and 做同款 targets.
 */
import { describe, expect, it } from "vitest";
import type { EngineModel } from "./engine";
import {
  INSPIRATION_CASES,
  caseHref,
  filterCases,
  missingCaseDependencies,
  templateForCase,
} from "./inspiration";

function model(capability: string): EngineModel {
  return {
    id: `mock/${capability}`,
    object: "model",
    created: 0,
    owned_by: "mock",
    capability,
  };
}

describe("INSPIRATION_CASES (TASK-21)", () => {
  it("covers all three kinds with unique ids", () => {
    const kinds = new Set(INSPIRATION_CASES.map((c) => c.kind));
    expect(kinds).toEqual(new Set(["image", "writing", "flow"]));
    expect(new Set(INSPIRATION_CASES.map((c) => c.id)).size).toBe(INSPIRATION_CASES.length);
  });

  it("every case has a routable 做同款 target", () => {
    for (const case_ of INSPIRATION_CASES) {
      expect(caseHref(case_)).toMatch(/^\/(creation|flow)/);
      expect(case_.title.length).toBeGreaterThan(3);
      expect(case_.description.length).toBeGreaterThan(6);
      expect(case_.requires.length).toBeGreaterThan(0);
    }
  });

  it("flow cases reference existing templates", () => {
    for (const case_ of INSPIRATION_CASES.filter((c) => c.kind === "flow")) {
      expect(templateForCase(case_), `${case_.id} template must exist`).toBeDefined();
    }
    // non-flow cases have no template
    expect(templateForCase(INSPIRATION_CASES[0])).toBeUndefined();
  });

  it("run=1 cases auto-execute on landing (做同款 semantics)", () => {
    for (const case_ of INSPIRATION_CASES.filter((c) => c.kind !== "flow")) {
      expect(case_.target.params.run).toBe("1");
    }
  });
});

describe("filterCases", () => {
  it("filters by kind", () => {
    expect(filterCases(INSPIRATION_CASES, "all")).toHaveLength(INSPIRATION_CASES.length);
    expect(filterCases(INSPIRATION_CASES, "flow").every((c) => c.kind === "flow")).toBe(true);
    expect(filterCases(INSPIRATION_CASES, "writing").length).toBeGreaterThan(0);
  });
});

describe("missingCaseDependencies (缺依赖检测)", () => {
  it("empty when the engine serves the capabilities", () => {
    const case_ = INSPIRATION_CASES.find((c) => c.id === "case-polish-flow")!;
    expect(missingCaseDependencies(case_, [model("chat"), model("image_gen")])).toEqual([]);
  });

  it("reports gaps with guidance-ready data", () => {
    const case_ = INSPIRATION_CASES.find((c) => c.id === "case-polish-flow")!;
    expect(missingCaseDependencies(case_, [])).toEqual(["chat", "image_gen"]);
    expect(missingCaseDependencies(case_, [model("chat")])).toEqual(["image_gen"]);
  });
});

describe("caseHref", () => {
  it("encodes params into the query string", () => {
    const case_ = INSPIRATION_CASES.find((c) => c.id === "case-xhs-copy")!;
    const href = caseHref(case_);
    expect(href).toContain("/creation/writing?");
    expect(href).toContain("genre=xiaohongshu");
    expect(href).toContain("run=1");
  });

  it("flow cases point at the canvas with a template id", () => {
    const case_ = INSPIRATION_CASES.find((c) => c.id === "case-platform-flow")!;
    expect(caseHref(case_)).toBe("/flow?template=platform-sizes");
  });
});
