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

/** Parse a bare `{nodes, edges}` graph (the shape the gateway embeds into
 * PNG snapshots — no mofa-flow envelope). Throws with a readable reason. */
export function parseBareGraph(raw: string): FlowGraphPayload {
  const parsed = JSON.parse(raw) as FlowGraphPayload;
  if (!parsed || !Array.isArray(parsed.nodes)) {
    throw new Error("快照不含 nodes 数组");
  }
  for (const node of parsed.nodes) {
    if (!node.id || !(node.type in NODE_LABELS)) {
      throw new Error(`未知节点类型: ${String(node.type)}`);
    }
  }
  return parsed;
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

// ==================== FLOW-06: 图片元数据恢复 + 版本历史 ====================

/**
 * Extract the workflow snapshot a generated PNG carries (tEXt chunk,
 * keyword `mofa_workflow`, base64 JSON — the gateway embeds it on execute).
 * `null` when the image has no snapshot.
 */
export function extractWorkflowFromPng(bytes: Uint8Array): string | null {
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 8 || SIG.some((b, i) => bytes[i] !== b)) return null;
  const KEYWORD = "mofa_workflow";
  let offset = 8;
  while (offset + 8 <= bytes.length) {
    const length =
      ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
    const kind = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > bytes.length) return null;
    if (kind === "tEXt") {
      const data = bytes.slice(start, end);
      const zero = data.indexOf(0);
      if (zero > 0) {
        const keyword = String.fromCharCode(...data.slice(0, zero));
        if (keyword === KEYWORD) {
          const b64 = String.fromCharCode(...data.slice(zero + 1));
          try {
            const binary = atob(b64);
            const json = new TextDecoder().decode(
              Uint8Array.from(binary, (c) => c.charCodeAt(0)),
            );
            return json;
          } catch {
            return null;
          }
        }
      }
    }
    offset = end + 4;
  }
  return null;
}

export interface FlowDocSummary {
  id: string;
  name: string;
  latest_version: number;
  updated_at: string;
}

export interface FlowVersionIndex {
  id: string;
  doc_id: string;
  version_index: number;
  created_at: string;
}

class FlowDocService {
  async save(input: { id?: string; name: string; graph: unknown }): Promise<{ id: string; version: number } | null> {
    try {
      const data = await apiClient.post<{ data?: { id?: string; version?: number } }>(
        "/api/flow/docs",
        input,
      );
      if (data?.data?.id && data.data.version !== undefined) {
        return { id: data.data.id, version: data.data.version };
      }
      return null;
    } catch {
      return null;
    }
  }

  async list(): Promise<FlowDocSummary[]> {
    try {
      const data = await apiClient.get<{ data?: FlowDocSummary[] }>("/api/flow/docs");
      return data?.data ?? [];
    } catch {
      return [];
    }
  }

  async versions(docId: string): Promise<FlowVersionIndex[]> {
    try {
      const data = await apiClient.get<{ data?: FlowVersionIndex[] }>(
        `/api/flow/docs/${docId}/versions`,
      );
      return data?.data ?? [];
    } catch {
      return [];
    }
  }

  async version(docId: string, index: number): Promise<unknown | null> {
    try {
      const data = await apiClient.get<{ data?: unknown }>(
        `/api/flow/docs/${docId}/versions/${index}`,
      );
      return data?.data ?? null;
    } catch {
      return null;
    }
  }
}

export const flowDocService = new FlowDocService();
