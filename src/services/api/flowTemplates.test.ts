/**
 * Tests for built-in workflow templates (FLOW-07): catalog invariants,
 * graph well-formedness, and dependency detection with setup hints.
 */
import { describe, expect, it } from "vitest";
import type { EngineModel } from "./engine";
import {
  BUILTIN_TEMPLATES,
  dependencyHint,
  missingDependencies,
  type FlowTemplate,
} from "./flowTemplates";

const SOURCE_KINDS = new Set(["prompt_text", "constant"]);
const SINK_KINDS = new Set(["llm_text", "image_gen", "output"]);

describe("BUILTIN_TEMPLATES (FLOW-07 v1 ≥10)", () => {
  it("ships at least ten templates across categories", () => {
    expect(BUILTIN_TEMPLATES.length).toBeGreaterThanOrEqual(10);
    const categories = new Set(BUILTIN_TEMPLATES.map((t) => t.category));
    expect(categories.size).toBeGreaterThanOrEqual(3);
  });

  it("every template has unique id, title, description, and requirements", () => {
    const ids = new Set<string>();
    for (const t of BUILTIN_TEMPLATES) {
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
      expect(t.title.length).toBeGreaterThan(3);
      expect(t.description.length).toBeGreaterThan(6);
      expect(t.requires.length).toBeGreaterThan(0);
    }
  });

  it("graphs are structurally valid: known nodes, no dangling edges, sinks have inputs", () => {
    for (const t of BUILTIN_TEMPLATES) {
      const ids = new Set(t.graph.nodes.map((n) => n.id));
      expect(ids.size).toBe(t.graph.nodes.length);
      for (const edge of t.graph.edges) {
        expect(ids.has(edge.from)).toBe(true);
        expect(ids.has(edge.to)).toBe(true);
      }
      const hasInput = new Set(t.graph.edges.map((e) => e.to));
      for (const node of t.graph.nodes) {
        if (SINK_KINDS.has(node.type)) {
          expect(
            hasInput.has(node.id),
            `${t.id}/${node.id} (${node.type}) needs an upstream`,
          ).toBe(true);
        }
        if (SOURCE_KINDS.has(node.type)) {
          expect(
            t.graph.edges.some((e) => e.from === node.id),
            `${t.id}/${node.id} is orphaned`,
          ).toBe(true);
        }
      }
    }
  });

  it("requires lists match the generation nodes actually present", () => {
    for (const t of BUILTIN_TEMPLATES) {
      const kinds = new Set(t.graph.nodes.map((n) => n.type));
      for (const kind of t.requires) {
        expect(kinds.has(kind), `${t.id} requires ${kind} but doesn't use it`).toBe(true);
      }
    }
  });

  it("covers the PRD showcase scenarios", () => {
    const ids = BUILTIN_TEMPLATES.map((t) => t.id).join("|");
    expect(ids).toContain("t2i-basic"); // 文生图
    expect(ids).toContain("platform-sizes"); // 批量多尺寸
    expect(ids).toContain("avatar-pack"); // 批量出图
    const descriptions = BUILTIN_TEMPLATES.map((t) => t.description).join("|");
    expect(descriptions).toContain("尺寸");
  });
});

function model(capability: string): EngineModel {
  return {
    id: `mock/${capability}`,
    object: "model",
    created: 0,
    owned_by: "mock",
    capability,
    status: "hot",
  };
}

describe("missingDependencies (依赖检测)", () => {
  const imageTemplate = BUILTIN_TEMPLATES[0]; // t2i-basic, requires image_gen
  const multiTemplate = BUILTIN_TEMPLATES.find((t) => t.id === "t2i-polished")!;

  it("empty when the engine serves every requirement", () => {
    expect(missingDependencies(imageTemplate, [model("image_gen")])).toEqual([]);
  });

  it("reports image_gen when no image-capable model exists", () => {
    expect(missingDependencies(imageTemplate, [model("chat")])).toEqual(["image_gen"]);
  });

  it("reports both kinds for multi-modal templates", () => {
    expect(missingDependencies(multiTemplate, [])).toEqual(["llm_text", "image_gen"]);
  });

  it("pure-node templates never report missing deps", () => {
    const pure: FlowTemplate = {
      id: "pure",
      title: "纯节点",
      description: "无外部依赖",
      category: "文本",
      requires: [],
      graph: { nodes: [], edges: [] },
    };
    expect(missingDependencies(pure, [])).toEqual([]);
  });
});

describe("dependencyHint", () => {
  it("gives specific guidance per combination", () => {
    expect(dependencyHint(["image_gen", "llm_text"])).toContain("Key 配置");
    expect(dependencyHint(["image_gen"])).toContain("image_gen");
    expect(dependencyHint(["llm_text"])).toContain("Ollama");
    expect(dependencyHint([])).toBe("");
  });
});
