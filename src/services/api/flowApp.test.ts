/**
 * Tests for Flow App Mode (FLOW-08): publish validation, form binding,
 * and service mapping.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import type { FlowApp, FlowGraphPayload } from "./flowApp";
import { bindAppGraph, flowAppService, validateApp } from "./flowApp";

vi.mock("../api/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);
const mockedDelete = vi.mocked(apiClient.delete);

function graph(): FlowGraphPayload {
  return {
    nodes: [
      { id: "topic", type: "prompt_text", params: { text: "主题" } },
      { id: "style", type: "prompt_text", params: { text: "风格" } },
      { id: "gen", type: "image_gen", params: { size: "1024x1024" } },
    ],
    edges: [
      { from: "topic", to: "gen" },
      { from: "style", to: "gen" },
    ],
  };
}

function app(overrides: Partial<FlowApp> = {}): FlowApp {
  return {
    id: "app-1",
    name: "海报生成器",
    description: "填主题和风格出海报",
    graph: graph(),
    inputs: [
      { nodeId: "topic", label: "主题", placeholder: "露营活动" },
      { nodeId: "style", label: "风格", placeholder: "扁平插画" },
    ],
    created_at: "2026-08-25T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
  mockedDelete.mockReset();
});

describe("validateApp (发布校验)", () => {
  it("valid bindings pass", () => {
    const result = validateApp(graph(), [
      { nodeId: "topic", label: "主题" },
      { nodeId: "style", label: "风格" },
    ]);
    expect(result).toEqual({ ok: true });
  });

  it("rejects empty canvas, missing nodes, non-prompt bindings, zero inputs", () => {
    expect(validateApp({ nodes: [], edges: [] }, [{ nodeId: "x", label: "L" }]).ok).toBe(false);
    expect(validateApp(graph(), [{ nodeId: "missing", label: "L" }]).ok).toBe(false);
    expect(validateApp(graph(), [{ nodeId: "gen", label: "L" }]).ok).toBe(false);
    expect(validateApp(graph(), []).ok).toBe(false);
  });
});

describe("bindAppGraph (表单绑定)", () => {
  it("fills bound prompt nodes and leaves unfilled ones default", () => {
    const bound = bindAppGraph(app(), { topic: "新品发布" });
    const topic = bound.nodes.find((n) => n.id === "topic")!;
    const style = bound.nodes.find((n) => n.id === "style")!;
    expect(topic.params.text).toBe("新品发布");
    expect(style.params.text).toBe("风格"); // default preserved
    expect(bound.edges).toHaveLength(2);
  });

  it("empty-string values fall back to defaults", () => {
    const bound = bindAppGraph(app(), { topic: "" });
    expect(bound.nodes.find((n) => n.id === "topic")!.params.text).toBe("主题");
  });

  it("does not mutate the original app graph", () => {
    const original = app();
    bindAppGraph(original, { topic: "改" });
    expect(original.graph.nodes[0].params.text).toBe("主题");
  });
});

describe("flowAppService", () => {
  it("publish/list/remove map endpoints", async () => {
    mockedPost.mockResolvedValueOnce(app());
    await flowAppService.publish({
      name: "N",
      description: "D",
      graph: graph(),
      inputs: [{ nodeId: "topic", label: "主题" }],
    });
    expect(mockedPost).toHaveBeenCalledWith("/api/flowapp/create", expect.any(Object));

    mockedGet.mockResolvedValueOnce([app()]);
    expect(await flowAppService.list()).toHaveLength(1);
    mockedGet.mockRejectedValueOnce(new Error("x"));
    expect(await flowAppService.list()).toEqual([]);

    mockedDelete.mockResolvedValueOnce(undefined);
    expect(await flowAppService.remove("app-1")).toBe(true);
  });
});
