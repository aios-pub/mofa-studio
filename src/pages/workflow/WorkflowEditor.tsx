/**
 * 工作流编辑器页面
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ReactFlow,
  Node,
  Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button, message, Tooltip, Dropdown } from "antd";
import {
  SaveOutlined,
  PlayCircleOutlined,
  UndoOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  FullscreenOutlined,
  ShareAltOutlined,
  ArrowLeftOutlined,
  SettingOutlined,
  HistoryOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { workflowApi, nodeTypeConfig } from "@/services";
import NodePanel from "./panels/NodePanel";
import ConfigPanel from "./panels/ConfigPanel";
import { useWorkflowStore } from "../../stores/useWorkflowStore";
import type { Workflow, NodeType, NodeConfig } from "../../types/workflow";

// 自定义节点组件
import StartNode from "./nodes/StartNode";
import EndNode from "./nodes/EndNode";
import AgentNode from "./nodes/AgentNode";
import ConditionNode from "./nodes/ConditionNode";
import LoopNode from "./nodes/LoopNode";
import ParallelNode from "./nodes/ParallelNode";
import HttpRequestNode from "./nodes/HttpRequestNode";
import TransformNode from "./nodes/TransformNode";
import VariableNode from "./nodes/VariableNode";
import DelayNode from "./nodes/DelayNode";

// 节点类型映射
const nodeTypes = {
  start: StartNode,
  end: EndNode,
  agent: AgentNode,
  condition: ConditionNode,
  loop: LoopNode,
  parallel: ParallelNode,
  http_request: HttpRequestNode,
  transform: TransformNode,
  variable: VariableNode,
  delay: DelayNode,
};

export default function WorkflowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    nodes,
    edges,
    selectedNodeId,
    setNodes,
    setEdges,
    setSelectedNodeId,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useWorkflowStore();

  // 加载工作流
  useEffect(() => {
    if (id) {
      loadWorkflow(id);
    }
  }, [id]);

  const loadWorkflow = async (workflowId: string) => {
    try {
      setLoading(true);
      const data = await workflowApi.getById(workflowId);
      if (data) {
        setWorkflow(data);
        // 转换节点格式
        const rfNodes = data.nodes.map(
          (n: {
            id: string;
            type: string;
            position: { x: number; y: number };
            config: Record<string, unknown>;
          }) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: {
              config: n.config,
              label: (n.config.config as { label?: string })?.label || "",
            },
          }),
        );
        // 转换边格式
        const rfEdges = data.edges.map(
          (e: {
            id: string;
            sourceNodeId: string;
            targetNodeId: string;
            sourcePortId?: string;
            targetPortId?: string;
            label?: string;
          }) => ({
            id: e.id,
            source: e.sourceNodeId,
            target: e.targetNodeId,
            sourceHandle: e.sourcePortId ?? undefined,
            targetHandle: e.targetPortId ?? undefined,
            label: e.label,
            animated: true,
          }),
        );
        setNodes(rfNodes);
        setEdges(rfEdges);
      } else {
        message.error("工作流不存在");
        navigate("/workflow");
      }
    } catch (error) {
      console.error("Failed to load workflow:", error);
      message.error("加载失败");
    } finally {
      setLoading(false);
    }
  };

  // 保存工作流
  const handleSave = async () => {
    if (!workflow) return;
    try {
      setSaving(true);
      // 转换回工作流格式
      const wfNodes = nodes.map((n) => ({
        id: n.id,
        type: n.type as NodeType,
        position: n.position,
        config: (n.data as { config: NodeConfig }).config,
      }));
      const wfEdges = edges.map((e) => ({
        id: e.id,
        sourceNodeId: e.source,
        targetNodeId: e.target,
        sourcePortId: e.sourceHandle ?? undefined,
        targetPortId: e.targetHandle ?? undefined,
        label: typeof e.label === "string" ? e.label : undefined,
      }));
      await workflowApi.update(workflow.id, {
        nodes: wfNodes,
        edges: wfEdges,
      });
      message.success("保存成功");
    } catch (error) {
      console.error("Failed to save workflow:", error);
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  // 发布工作流
  const handlePublish = async () => {
    if (!workflow) return;
    try {
      await handleSave();
      await workflowApi.publish(workflow.id);
      message.success("发布成功");
      loadWorkflow(workflow.id);
    } catch (error) {
      console.error("Failed to publish workflow:", error);
      message.error("发布失败");
    }
  };

  // 执行工作流
  const handleExecute = async () => {
    if (!workflow || workflow.status !== "published") {
      message.warning("请先发布工作流");
      return;
    }
    try {
      const execution = await workflowApi.execute(workflow.id);
      message.success("工作流已开始执行");
      navigate(`/workflow/execution/${execution.id}`);
    } catch (error) {
      console.error("Failed to execute workflow:", error);
      message.error("执行失败");
    }
  };

  // 节点变化处理
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes(applyNodeChanges(changes, nodes));
    },
    [nodes, setNodes],
  );

  // 边变化处理
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges(applyEdgeChanges(changes, edges));
    },
    [edges, setEdges],
  );

  // 连接处理
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges(addEdge({ ...connection, animated: true }, edges));
    },
    [edges, setEdges],
  );

  // 节点点击处理
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId],
  );

  // 画布点击处理
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  // 添加节点
  const handleAddNode = useCallback(
    (type: NodeType) => {
      const newNode = {
        id: `node-${Date.now()}`,
        type,
        position: {
          x: 200 + Math.random() * 100,
          y: 200 + Math.random() * 100,
        },
        data: {
          config: { type, config: { label: nodeTypeConfig[type].name } },
          label: nodeTypeConfig[type].name,
        },
      };
      setNodes([...nodes, newNode]);
    },
    [nodes, setNodes],
  );

  // 选中的节点
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId],
  );

  // 更新节点配置
  const handleUpdateNodeConfig = useCallback(
    (nodeId: string, config: any) => {
      setNodes(
        nodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, config } } : n,
        ),
      );
    },
    [nodes, setNodes],
  );

  // 删除节点
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes(nodes.filter((n) => n.id !== nodeId));
      setEdges(edges.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
    },
    [nodes, edges, selectedNodeId, setNodes, setEdges, setSelectedNodeId],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-[var(--color-text-secondary)]">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="h-14 border-b border-(--color-border) bg-[var(--color-bg-secondary)] flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/workflow")}
          />
          <div>
            <h1 className="text-lg font-medium text-[var(--color-text-primary)]">
              {workflow?.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip title="撤销">
            <Button
              icon={<UndoOutlined />}
              disabled={!canUndo}
              onClick={undo}
            />
          </Tooltip>
          <Tooltip title="重做">
            <Button
              icon={<RedoOutlined />}
              disabled={!canRedo}
              onClick={redo}
            />
          </Tooltip>
          <div className="w-px h-6 bg-[var(--color-border)] mx-2" />
          <Button icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            保存
          </Button>
          {workflow?.status === "draft" && (
            <Button
              type="primary"
              icon={<ShareAltOutlined />}
              onClick={handlePublish}
            >
              发布
            </Button>
          )}
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            disabled={workflow?.status !== "published"}
            onClick={handleExecute}
          >
            执行
          </Button>
          <Dropdown
            menu={{
              items: [
                {
                  key: "versions",
                  label: "版本历史",
                  icon: <HistoryOutlined />,
                },
                { key: "settings", label: "设置", icon: <SettingOutlined /> },
              ],
            }}
          >
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧节点面板 */}
        <NodePanel onAddNode={handleAddNode} />

        {/* 中间画布 */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls />
            <MiniMap />
            <Panel position="top-right">
              <div className="flex gap-1">
                <Tooltip title="放大">
                  <Button size="small" icon={<ZoomInOutlined />} />
                </Tooltip>
                <Tooltip title="缩小">
                  <Button size="small" icon={<ZoomOutOutlined />} />
                </Tooltip>
                <Tooltip title="适应画布">
                  <Button size="small" icon={<FullscreenOutlined />} />
                </Tooltip>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* 右侧配置面板 */}
        {selectedNode && (
          <ConfigPanel
            node={selectedNode}
            onClose={() => setSelectedNodeId(null)}
            onUpdate={(config) =>
              handleUpdateNodeConfig(selectedNode.id, config)
            }
            onDelete={() => handleDeleteNode(selectedNode.id)}
          />
        )}
      </div>
    </div>
  );
}
