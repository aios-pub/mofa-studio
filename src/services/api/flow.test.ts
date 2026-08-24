/**
 * Tests for the flow canvas service: graph conversion, connection rules,
 * JSON round-trips, and SSE event/result parsing.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import type { CanvasNodeData, FlowGraphPayload } from "./flow";
import {
  acceptsInput,
  canvasToGraph,
  exportFlowJson,
  flowService,
  parseFlowJson,
} from "./flow";

vi.mock("../api/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    getBaseUrl: () => "http://gateway.test",
  },
}));

const mockedPost = vi.mocked(apiClient.post);

function canvas() {
  const nodes = [
    { id: "p1", data: { kind: "prompt_text", params: { text: "橘猫" } } as CanvasNodeData },
    { id: "g1", data: { kind: "image_gen", params: { size: "1024x1024" } } as CanvasNodeData },
    { id: "o1", data: { kind: "output", params: {} } as CanvasNodeData },
  ];
  const edges = [
    { source: "p1", target: "g1" },
    { source: "g1", target: "o1" },
  ];
  return { nodes, edges };
}

beforeEach(() => {
  mockedPost.mockReset();
});

describe("canvasToGraph", () => {
  it("maps canvas nodes and xyflow edges onto the engine payload", () => {
    const { nodes, edges } = canvas();
    const graph = canvasToGraph(nodes, edges);
    expect(graph.nodes).toHaveLength(3);
    expect(graph.nodes[0]).toEqual({ id: "p1", type: "prompt_text", params: { text: "橘猫" } });
    expect(graph.edges).toEqual([
      { from: "p1", to: "g1" },
      { from: "g1", to: "o1" },
    ]);
  });
});

describe("acceptsInput (连线类型校验)", () => {
  it("sources reject inputs; generators and outputs accept them", () => {
    expect(acceptsInput("prompt_text")).toBe(false);
    expect(acceptsInput("constant")).toBe(false);
    expect(acceptsInput("llm_text")).toBe(true);
    expect(acceptsInput("image_gen")).toBe(true);
    expect(acceptsInput("output")).toBe(true);
  });
});

describe("FLOW-06 JSON round-trip", () => {
  it("exports an envelope and parses it back", () => {
    const { nodes, edges } = canvas();
    const graph = canvasToGraph(nodes, edges);
    const raw = exportFlowJson(graph, "橘猫产线");
    const { title, graph: parsed } = parseFlowJson(raw);
    expect(title).toBe("橘猫产线");
    expect(parsed).toEqual(graph);
  });

  it("rejects foreign JSON with a specific error", () => {
    expect(() => parseFlowJson('{"foo": 1}')).toThrow("mofa-flow");
  });

  it("rejects unknown node types", () => {
    const bad = JSON.stringify({
      format: "mofa-flow",
      graph: { nodes: [{ id: "x", type: "warp_drive", params: {} }], edges: [] },
    });
    expect(() => parseFlowJson(bad)).toThrow("未知节点类型");
  });
});

describe("flowService.executeStream", () => {
  function sseResponse(frames: string[]): Response {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const frame of frames) controller.enqueue(encoder.encode(frame));
        controller.close();
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  it("surfaces node events and captures the final result frame", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        'data: {"type":"node_status","node_id":"p1","status":"queued"}\n\n',
        'data: {"type":"node_status","node_id":"p1","status":"done"}\n\n',
        'data: {"type":"node_status","node_id":"g1","status":"cached"}\n\n',
        'data: {"execution_id":"exec-1","ok":true,"node_outputs":{},"executed":1,"cached":1,"duration_ms":5}\n\n',
      ]),
    );

    const events: Array<{ node_id: string; status: string }> = [];
    const result = await flowService.executeStream(
      { nodes: [], edges: [] },
      (e) => events.push({ node_id: e.node_id, status: e.status }),
    );

    expect(events).toEqual([
      { node_id: "p1", status: "queued" },
      { node_id: "p1", status: "done" },
      { node_id: "g1", status: "cached" },
    ]);
    expect(result.execution_id).toBe("exec-1");
    expect(result.cached).toBe(1);
    vi.unstubAllGlobals();
  });

  it("falls back to the blocking endpoint on transport failure", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 500 }));
    mockedPost.mockResolvedValueOnce({
      execution_id: "exec-2",
      ok: true,
      node_outputs: {},
      executed: 3,
      cached: 0,
      duration_ms: 9,
    } as FlowGraphPayload extends never ? never : Parameters<typeof flowService.execute>[0]);

    const result = await flowService.executeStream({ nodes: [], edges: [] }, () => {});
    expect(result.execution_id).toBe("exec-2");
    expect(mockedPost).toHaveBeenCalledWith("/api/flow/execute", { nodes: [], edges: [] });
    vi.unstubAllGlobals();
  });
});
