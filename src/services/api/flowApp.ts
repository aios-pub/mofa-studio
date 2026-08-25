/**
 * Flow App Mode (FLOW-08): publish a flow canvas as a simple form tool —
 * selected prompt nodes become the exposed inputs; teammates fill the
 * form, not the canvas. Apps appear in the creation tool list.
 */

import { apiClient } from "../api/apiClient";
import type { FlowGraphPayload } from "./flow";

export interface FlowAppInput {
  /** The canvas node id this input binds to. */
  nodeId: string;
  label: string;
  placeholder?: string;
}

export interface FlowApp {
  id: string;
  name: string;
  description: string;
  /** The wrapped graph (nodes/edges) — the app's engine. */
  graph: FlowGraphPayload;
  /** Exposed inputs; each binds to one prompt node's text. */
  inputs: FlowAppInput[];
  created_at: string;
}

export interface FlowAppFormValue {
  [nodeId: string]: string;
}

/** Bind form values into the graph (returns a runnable copy). */
export function bindAppGraph(app: FlowApp, values: FlowAppFormValue): FlowGraphPayload {
  return {
    nodes: app.graph.nodes.map((node) => {
      const input = app.inputs.find((input) => input.nodeId === node.id);
      if (!input) return node;
      const value = values[node.id];
      return {
        ...node,
        params: {
          ...node.params,
          text: value !== undefined && value !== "" ? value : node.params.text,
        },
      };
    }),
    edges: app.graph.edges,
  };
}

/** Validate a publish payload: inputs must reference prompt nodes. */
export function validateApp(
  graph: FlowGraphPayload,
  inputs: FlowAppInput[],
): { ok: true } | { ok: false; reason: string } {
  if (graph.nodes.length === 0) return { ok: false, reason: "画布为空，无法封装" };
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  for (const input of inputs) {
    if (!nodeIds.has(input.nodeId)) {
      return { ok: false, reason: `输入「${input.label}」绑定的节点不存在` };
    }
    const node = graph.nodes.find((n) => n.id === input.nodeId);
    if (node && node.type !== "prompt_text") {
      return {
        ok: false,
        reason: `输入「${input.label}」只能绑定文本提示词节点`,
      };
    }
  }
  if (inputs.length === 0) {
    return { ok: false, reason: "至少暴露一个输入" };
  }
  return { ok: true };
}

class FlowAppService {
  async publish(app: {
    name: string;
    description: string;
    graph: FlowGraphPayload;
    inputs: FlowAppInput[];
  }): Promise<FlowApp | null> {
    try {
      return await apiClient.post<FlowApp>("/api/flowapp/create", app);
    } catch {
      return null;
    }
  }

  async list(): Promise<FlowApp[]> {
    try {
      const data = await apiClient.get<FlowApp[]>("/api/flowapp/list");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/api/flowapp/delete/${id}`);
      return true;
    } catch {
      return false;
    }
  }
}

export const flowAppService = new FlowAppService();
