/**
 * Creation-workflow canvas service (FLOW-01/02/04/06): canvas ↔ engine
 * graph conversion, connection validation, SSE execution streaming.
 */

import { apiClient } from "../api/apiClient";

/** Engine node kinds (flow-engine five-piece set). */
export type FlowNodeKind =
  | "prompt_text"
  | "constant"
  | "llm_text"
  | "image_gen"
  | "output"
  | "http_request";

export interface FlowGraphPayload {
  nodes: Array<{
    id: string;
    type: FlowNodeKind;
    params: Record<string, unknown>;
  }>;
  edges: Array<{ from: string; to: string }>;
}

export interface FlowExecutionResult {
  execution_id: string;
  ok: boolean;
  error?: string | null;
  node_outputs: Record<string, Record<string, unknown>>;
  executed: number;
  cached: number;
  duration_ms: number;
}

export type FlowNodeRunStatus =
  | "queued"
  | "running"
  | "cached"
  | "done"
  | "failed";

export interface FlowStreamEvent {
  type: "node_status";
  node_id: string;
  status: FlowNodeRunStatus;
  detail?: string;
}

/** Canvas node shape (xyflow) carried in the page store. */
export interface CanvasNodeData extends Record<string, unknown> {
  kind: FlowNodeKind;
  params: Record<string, unknown>;
  status?: FlowNodeRunStatus;
  detail?: string;
}

/** Node kinds that accept inputs (连线类型校验: sources reject inputs). */
export function acceptsInput(kind: FlowNodeKind): boolean {
  return kind === "llm_text" || kind === "image_gen" || kind === "output";
}

export const NODE_LABELS: Record<FlowNodeKind, string> = {
  prompt_text: "文本提示词",
  constant: "参数常量",
  llm_text: "LLM 文本",
  image_gen: "图像生成",
  output: "输出",
  http_request: "HTTP 服务",
};

/** Convert canvas nodes + xyflow edges into the engine graph payload. */
export function canvasToGraph(
  nodes: Array<{ id: string; data: CanvasNodeData }>,
  edges: Array<{ source: string; target: string }>,
): FlowGraphPayload {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.data.kind,
      params: n.data.params ?? {},
    })),
    edges: edges.map((e) => ({ from: e.source, to: e.target })),
  };
}

/** FLOW-06: JSON export wrapper with metadata for sharing/reproduction. */
export function exportFlowJson(graph: FlowGraphPayload, title: string): string {
  return JSON.stringify(
    {
      format: "mofa-flow",
      version: 1,
      title,
      exported_at: new Date().toISOString(),
      graph,
    },
    null,
    2,
  );
}

/** Parse an exported JSON back into a graph; validates the envelope. */
export function parseFlowJson(raw: string): { title: string; graph: FlowGraphPayload } {
  const parsed = JSON.parse(raw) as {
    format?: string;
    title?: string;
    graph?: FlowGraphPayload;
  };
  if (parsed.format !== "mofa-flow" || !parsed.graph?.nodes) {
    throw new Error("不是有效的 mofa-flow 工作流文件");
  }
  for (const node of parsed.graph.nodes) {
    if (!node.id || !(node.type in NODE_LABELS)) {
      throw new Error(`未知节点类型: ${String(node.type)}`);
    }
  }
  return { title: parsed.title ?? "导入的工作流", graph: parsed.graph };
}

class FlowService {
  /** Blocking execution: returns the aggregate result. */
  async execute(graph: FlowGraphPayload): Promise<FlowExecutionResult> {
    return apiClient.post<FlowExecutionResult>("/api/flow/execute", graph);
  }

  /** Streamed execution: node-status events as they happen, then the
   * aggregate result. Returns the final result. */
  async executeStream(
    graph: FlowGraphPayload,
    onEvent: (event: FlowStreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<FlowExecutionResult> {
    const baseURL = apiClient.getBaseUrl?.() ?? "";
    const response = await fetch(`${baseURL}/api/flow/execute/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(graph),
      signal,
    });
    if (!response.ok || !response.body) {
      // Fall back to the blocking endpoint.
      return this.execute(graph);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult: FlowExecutionResult | null = null;

    const consumeLine = (rawLine: string) => {
      const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
      if (!line.startsWith("data: ")) return;
      const data = line.slice(6).trim();
      if (!data) return;
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(data);
      } catch {
        return;
      }
      if (parsed.type === "node_status") {
        onEvent({
          type: "node_status",
          node_id: String(parsed.node_id),
          status: parsed.status as FlowNodeRunStatus,
          detail: parsed.detail as string | undefined,
        });
      } else if (parsed.execution_id !== undefined) {
        finalResult = parsed as unknown as FlowExecutionResult;
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) consumeLine(line);
    }
    if (buffer) consumeLine(buffer);

    return (
      finalResult ?? {
        execution_id: "unknown",
        ok: false,
        error: "stream ended without a result frame",
        node_outputs: {},
        executed: 0,
        cached: 0,
        duration_ms: 0,
      }
    );
  }
}

export const flowService = new FlowService();
