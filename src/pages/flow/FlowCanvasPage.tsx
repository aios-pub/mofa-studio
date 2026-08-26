/**
 * Creation-workflow canvas (FLOW-01/02/04/06): five-piece node palette on
 * xyflow, connection-type validation, live node coloring driven by the
 * execution SSE stream, and JSON import/export.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button, Empty, message, Modal, Tag, Upload } from "antd";
import {
  PlayCircleOutlined,
  DownloadOutlined,
  UploadOutlined,
  PlusOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import {
  NODE_LABELS,
  acceptsInput,
  canvasToGraph,
  exportFlowJson,
  flowService,
  parseFlowJson,
  type CanvasNodeData,
  type FlowNodeKind,
  type FlowNodeRunStatus,
} from "@/services/api/flow";
import {
  BUILTIN_TEMPLATES,
  dependencyHint,
  missingDependencies,
  type FlowTemplate,
} from "@/services/api/flowTemplates";
import { useSearchParams } from "react-router-dom";
import { flowAppService } from "@/services/api/flowApp";
import { validateApp } from "@/services/api/flowApp";
import { engineService, type EngineModel } from "@/services/api/engine";

const STATUS_COLORS: Record<FlowNodeRunStatus, string> = {
  queued: "#8c8c8c",
  running: "#1677ff",
  cached: "#faad14",
  done: "#52c41a",
  failed: "#ff4d4f",
};

const STATUS_LABELS: Record<FlowNodeRunStatus, string> = {
  queued: "排队",
  running: "运行中",
  cached: "命中缓存",
  done: "完成",
  failed: "失败",
};

const PALETTE: FlowNodeKind[] = [
  "prompt_text",
  "constant",
  "llm_text",
  "image_gen",
  "http_request",
  "output",
];

/** Params rendered compactly inside each node. */
function paramSummary(kind: FlowNodeKind, params: Record<string, unknown>): string {
  const text = typeof params.text === "string" ? params.text : "";
  switch (kind) {
    case "prompt_text":
      return text.slice(0, 24) || "（空提示词）";
    case "constant":
      return JSON.stringify(params.value ?? "");
    case "llm_text":
      return typeof params.model === "string" ? params.model : "自动 · 引擎路由";
    case "image_gen":
      return typeof params.size === "string" ? params.size : "1024×1024";
    case "http_request": {
      const method = typeof params.method === "string" ? params.method : "GET";
      const url = typeof params.url === "string" ? params.url : "（未设置 URL）";
      return `${method} ${url.slice(0, 18)}`;
    }
    case "output":
      return "终点";
  }
}

function FlowNodeView({ data }: NodeProps) {
  const nodeData = data as CanvasNodeData;
  const color = nodeData.status ? STATUS_COLORS[nodeData.status] : "#d9d9d9";
  return (
    <div
      className="rounded-xl border-2 bg-[var(--color-bg-secondary)] px-3 py-2 min-w-[160px] shadow-sm"
      style={{ borderColor: color }}
      data-status={nodeData.status}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--color-text-primary)]">
          {NODE_LABELS[nodeData.kind]}
        </span>
        {nodeData.status && (
          <Tag color={STATUS_COLORS[nodeData.status]} style={{ margin: 0 }}>
            {STATUS_LABELS[nodeData.status]}
          </Tag>
        )}
      </div>
      <p className="mt-1 text-xs text-[var(--color-text-tertiary)] truncate">
        {paramSummary(nodeData.kind, nodeData.params)}
      </p>
      {nodeData.status === "failed" && nodeData.detail && (
        <p className="mt-1 text-xs text-red-400 truncate" title={nodeData.detail}>
          {nodeData.detail}
        </p>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { flow: FlowNodeView };

export default function FlowCanvasPage() {
  const [nodes, setNodes] = useState<Node<CanvasNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [preview, setPreview] = useState<string[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [engineModels, setEngineModels] = useState<EngineModel[]>([]);
  const counterRef = useRef(0);
  const [searchParams] = useSearchParams();

  // TASK-21: 灵感广场/模板深链 (?template=<id>) auto-loads the graph once.
  // (Late-bound via ref so declaration order doesn't matter.)

  const openTemplates = useCallback(async () => {
    setTemplateOpen(true);
    // FLOW-07: dependency check against the live engine on open.
    setEngineModels(await engineService.listModels());
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<CanvasNodeData>>[]) =>
      setNodes((ns) => applyNodeChanges(changes, ns)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((es) => applyEdgeChanges(changes, es)),
    [],
  );

  // 连线类型校验: source-kind nodes reject inputs; duplicates rejected.
  const onConnect = useCallback(
    (connection: Connection) => {
      const target = nodes.find((n) => n.id === connection.target);
      const kind = target?.data.kind;
      if (!kind || !acceptsInput(kind)) {
        message.warning(`${NODE_LABELS[kind ?? "prompt_text"]} 不接受输入连线`);
        return;
      }
      if (edges.some((e) => e.source === connection.source && e.target === connection.target)) {
        return;
      }
      setEdges((es) => addEdge({ ...connection, animated: false }, es));
    },
    [nodes, edges],
  );

  const addNode = useCallback((kind: FlowNodeKind) => {
    counterRef.current += 1;
    const id = `${kind}-${counterRef.current}`;
    setNodes((ns) => [
      // Deselect the rest so the new node's editor opens immediately.
      ...ns.map((n) => ({ ...n, selected: false })),
      {
        id,
        type: "flow",
        selected: true,
        position: { x: 120 + ns.length * 40, y: 80 + ns.length * 30 },
        data: {
          kind,
          params:
            kind === "prompt_text"
              ? { text: "一只橘猫坐在窗台上" }
              : kind === "image_gen"
                ? { size: "1024x1024", n: 1 }
                : {},
        },
      },
    ]);
  }, []);

  const updateSelectedParams = useCallback(
    (patch: Partial<CanvasNodeData>) => {
      setNodes((ns) =>
        ns.map((n) => (n.selected ? { ...n, data: { ...n.data, ...patch } } : n)),
      );
    },
    [],
  );

  const clearStatuses = useCallback(() => {
    setNodes((ns) =>
      ns.map((n) => ({
        ...n,
        data: { ...n.data, status: undefined, detail: undefined },
      })),
    );
  }, []);

  const run = useCallback(async () => {
    if (nodes.length === 0 || running) return;
    setRunning(true);
    clearStatuses();
    setPreview([]);
    try {
      const graph = canvasToGraph(nodes, edges);
      const result = await flowService.executeStream(graph, (event) => {
        setNodes((ns) =>
          ns.map((n) =>
            n.id === event.node_id
              ? { ...n, data: { ...n.data, status: event.status, detail: event.detail } }
              : n,
          ),
        );
      });
      if (result.ok) {
        setSummary(`执行 ${result.executed} · 缓存 ${result.cached} · ${result.duration_ms}ms`);
        // Surface image outputs from every node for quick preview.
        const images: string[] = [];
        for (const output of Object.values(result.node_outputs)) {
          const list = output.images;
          if (Array.isArray(list)) {
            for (const item of list) {
              if (typeof item === "string") images.push(`data:image/png;base64,${item}`);
            }
          }
        }
        setPreview(images);
        message.success(`工作流完成（执行 ${result.executed} · 缓存 ${result.cached}）`);
      } else {
        setSummary(`失败：${result.error ?? "未知错误"}`);
        message.error(`执行失败：${result.error ?? "未知错误"}`);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(`执行失败：${detail}`);
    } finally {
      setRunning(false);
    }
  }, [nodes, edges, running, clearStatuses]);

  const exportJson = useCallback(() => {
    const graph = canvasToGraph(nodes, edges);
    const blob = new Blob([exportFlowJson(graph, "我的工作流")], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "workflow.json";
    link.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const loadTemplate = useCallback(
    (template: FlowTemplate) => {
      setNodes(
        template.graph.nodes.map((n, index) => ({
          id: n.id,
          type: "flow" as const,
          selected: index === template.graph.nodes.length - 1,
          position: { x: 120 + index * 60, y: 60 + index * 40 },
          data: { kind: n.type, params: n.params },
        })),
      );
      setEdges(
        template.graph.edges.map((e) => ({
          id: `e-${e.from}-${e.to}`,
          source: e.from,
          target: e.to,
        })),
      );
      clearStatuses();
      setTemplateOpen(false);
      message.success(`已载入模板「${template.title}」`);
    },
    [clearStatuses],
  );

  // TASK-21 deep-link autoload (declared after loadTemplate).
  const templateLoadedRef = useRef(false);
  useEffect(() => {
    if (templateLoadedRef.current) return;
    const templateId = new URLSearchParams(window.location.search).get("template");
    if (!templateId) return;
    const template = BUILTIN_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    templateLoadedRef.current = true;
    loadTemplate(template);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loadTemplate]);

  const importJson = useCallback(
    async (file: File) => {
      try {
        const raw = await file.text();
        const { graph } = parseFlowJson(raw);
        counterRef.current += 1;
        setNodes(
          graph.nodes.map((n, index) => ({
            id: n.id,
            type: "flow" as const,
            position: { x: 120 + index * 60, y: 80 + index * 40 },
            data: { kind: n.type, params: n.params },
          })),
        );
        setEdges(
          graph.edges.map((e) => ({
            id: `e-${e.from}-${e.to}`,
            source: e.from,
            target: e.to,
          })),
        );
        clearStatuses();
        message.success(`已导入「${file.name}」（${graph.nodes.length} 节点）`);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        message.error(detail);
      }
    },
    [clearStatuses],
  );

  const selected = nodes.find((n) => n.selected);
  const selectedText =
    selected?.data.kind === "prompt_text"
      ? String(selected.data.params.text ?? "")
      : "";
  const selectedSize =
    selected?.data.kind === "image_gen"
      ? String(selected.data.params.size ?? "1024x1024")
      : "";
  const selectedHttp =
    selected?.data.kind === "http_request"
      ? {
          url: String(selected.data.params.url ?? ""),
          method: String(selected.data.params.method ?? "GET"),
          body: String(selected.data.params.body ?? ""),
        }
      : null;

  return (
    <div className="flex h-full">
      {/* Palette */}
      <div className="w-56 border-r border-(--color-border) p-3 space-y-2 overflow-y-auto">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
          节点库
        </h3>
        {PALETTE.map((kind) => (
          <button
            key={kind}
            onClick={() => addNode(kind)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-(--color-border) hover:border-[var(--color-primary)] hover:bg-(--color-bg-tertiary) transition-colors text-left"
            aria-label={`添加 ${NODE_LABELS[kind]} 节点`}
          >
            <PlusOutlined className="text-xs text-[var(--color-primary)]" />
            <span className="text-xs">{NODE_LABELS[kind]}</span>
          </button>
        ))}

        <div className="pt-3 border-t border-(--color-border) space-y-2">
          <Button
            type="primary"
            block
            icon={<PlayCircleOutlined />}
            loading={running}
            disabled={nodes.length === 0}
            onClick={run}
            aria-label="运行工作流"
          >
            运行
          </Button>
          <Button
            block
            icon={<AppstoreOutlined />}
            onClick={() => void openTemplates()}
            aria-label="模板市场"
          >
            模板市场
          </Button>
          <Button
            block
            onClick={() => {
              const graph = canvasToGraph(nodes, edges);
              const inputs = nodes
                .filter((n) => n.data.kind === "prompt_text")
                .map((n) => ({
                  nodeId: n.id,
                  label:
                    String(n.data.params.text ?? "").slice(0, 12) || "输入",
                  placeholder: String(n.data.params.text ?? ""),
                }));
              const validation = validateApp(graph, inputs);
              if (!validation.ok) {
                message.warning(validation.reason);
                return;
              }
              void flowAppService
                .publish({
                  name: prompt("应用名称：") || "未命名应用",
                  description: "从工作流画布发布",
                  graph,
                  inputs,
                })
                .then((app) => {
                  if (app) {
                    message.success(`已发布「${app.name}」——在「应用」页可用`);
                  } else {
                    message.error("发布失败");
                  }
                });
            }}
            aria-label="发布为应用"
          >
            发布为应用
          </Button>
          <Button block icon={<DownloadOutlined />} onClick={exportJson} aria-label="导出 JSON">
            导出 JSON
          </Button>
          <Upload
            accept=".json"
            showUploadList={false}
            beforeUpload={(file) => {
              void importJson(file);
              return false;
            }}
          >
            <Button block icon={<UploadOutlined />} aria-label="导入 JSON">
              导入 JSON
            </Button>
          </Upload>
        </div>

        {summary && (
          <p className="text-xs text-[var(--color-text-tertiary)] pt-2">{summary}</p>
        )}
        {preview.length > 0 && (
          <div className="pt-2 space-y-2">
            {preview.map((src, index) => (
              <img
                key={index}
                src={src}
                alt={`产物 ${index + 1}`}
                className="w-full rounded-lg border border-(--color-border)"
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected-node quick editor */}
      {selected && (
        <div className="w-64 border-r border-(--color-border) p-3 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {NODE_LABELS[selected.data.kind]} 参数
          </h3>
          {selected.data.kind === "prompt_text" && (
            <div>
              <label className="block text-xs mb-1">提示词</label>
              <textarea
                value={selectedText}
                onChange={(e) =>
                  updateSelectedParams({
                    params: { ...selected.data.params, text: e.target.value },
                  })
                }
                rows={6}
                className="w-full px-2 py-1.5 bg-(--color-bg-secondary) border border-(--color-border) rounded-lg text-xs resize-y focus:outline-none"
                aria-label="提示词编辑"
              />
            </div>
          )}
          {selectedHttp && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs mb-1">服务 URL</label>
                <input
                  value={selectedHttp.url}
                  onChange={(e) =>
                    updateSelectedParams({
                      params: { ...selected.data.params, url: e.target.value },
                    })
                  }
                  placeholder="https://api.example.com/endpoint"
                  className="w-full px-2 py-1.5 bg-(--color-bg-secondary) border border-(--color-border) rounded-lg text-xs"
                  aria-label="HTTP 服务 URL"
                />
              </div>
              <div>
                <label className="block text-xs mb-1">方法</label>
                <select
                  value={selectedHttp.method}
                  onChange={(e) =>
                    updateSelectedParams({
                      params: { ...selected.data.params, method: e.target.value },
                    })
                  }
                  className="w-full px-2 py-1.5 bg-(--color-bg-secondary) border border-(--color-border) rounded-lg text-xs"
                  aria-label="HTTP 方法"
                >
                  {["GET", "POST", "PUT", "DELETE"].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1">
                  请求体模板（{"{{upstream}}"} 注入上游文本）
                </label>
                <textarea
                  value={selectedHttp.body}
                  onChange={(e) =>
                    updateSelectedParams({
                      params: { ...selected.data.params, body: e.target.value },
                    })
                  }
                  rows={5}
                  className="w-full px-2 py-1.5 bg-(--color-bg-secondary) border border-(--color-border) rounded-lg text-xs resize-y"
                  aria-label="HTTP 请求体模板"
                />
              </div>
            </div>
          )}
          {selected.data.kind === "image_gen" && (
            <div>
              <label className="block text-xs mb-1">尺寸</label>
              <select
                value={selectedSize}
                onChange={(e) =>
                  updateSelectedParams({
                    params: { ...selected.data.params, size: e.target.value },
                  })
                }
                className="w-full px-2 py-1.5 bg-(--color-bg-secondary) border border-(--color-border) rounded-lg text-xs"
                aria-label="尺寸选择"
              >
                {["1024x1024", "768x1024", "720x1280", "1280x720"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
          <p className="text-xs text-[var(--color-text-tertiary)]">
            修改参数后再次运行：未变更节点命中缓存，仅此节点及其下游重跑。
          </p>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {/* FLOW-07: built-in templates with live dependency detection */}
      <Modal
        title="模板市场 · 官方内置"
        open={templateOpen}
        onCancel={() => setTemplateOpen(false)}
        footer={null}
        width={640}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
          {BUILTIN_TEMPLATES.length === 0 ? (
            <Empty description="暂无模板" />
          ) : (
            BUILTIN_TEMPLATES.map((template) => {
              const missing = missingDependencies(template, engineModels);
              const hint = dependencyHint(missing);
              return (
                <button
                  key={template.id}
                  onClick={() => loadTemplate(template)}
                  className="text-left p-3 rounded-xl border border-(--color-border) hover:border-[var(--color-primary)] hover:shadow transition-all"
                  aria-label={`载入模板 ${template.title}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      {template.title}
                    </span>
                    <Tag>{template.category}</Tag>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                    {template.description}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                    {template.graph.nodes.length} 节点
                    {missing.length === 0 ? (
                      <span className="ml-2 text-green-500">依赖就绪</span>
                    ) : (
                      <span className="ml-2 text-amber-500">缺少依赖</span>
                    )}
                  </p>
                  {hint && <p className="mt-1 text-xs text-amber-500">{hint}</p>}
                </button>
              );
            })
          )}
        </div>
      </Modal>
    </div>
  );
}
