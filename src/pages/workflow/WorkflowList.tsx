/**
 * 工作流列表页面
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Input,
  Button,
  Dropdown,
  message,
  Modal,
  Tag,
  Empty,
  Spin,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  PlayCircleOutlined,
  HistoryOutlined,
  ShareAltOutlined,
  BranchesOutlined,
} from "@ant-design/icons";
import { workflowApi } from "@/services";
import type { Workflow, WorkflowStatus } from "../../types/workflow";

// 状态配置
const statusConfig: Record<WorkflowStatus, { color: string; text: string }> = {
  draft: { color: "default", text: "草稿" },
  published: { color: "green", text: "已发布" },
  archived: { color: "default", text: "已归档" },
};

export default function WorkflowListPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const data = await workflowApi.getAll();
      setWorkflows(data);
    } catch (error) {
      console.error("Failed to load workflows:", error);
      message.error("加载失败");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (workflow: Workflow) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除工作流「${workflow.name}」吗？删除后无法恢复。`,
      okText: "删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await workflowApi.delete(workflow.id);
          setWorkflows((prev) => prev.filter((w) => w.id !== workflow.id));
          message.success("工作流已删除");
        } catch (error) {
          console.error("Failed to delete workflow:", error);
          message.error("删除失败");
        }
      },
    });
  };

  const handleDuplicate = async (workflow: Workflow) => {
    try {
      const newWorkflow = await workflowApi.duplicate(workflow.id);
      if (newWorkflow) {
        setWorkflows((prev) => [...prev, newWorkflow]);
        message.success("工作流已复制");
      }
    } catch (error) {
      console.error("Failed to duplicate workflow:", error);
      message.error("复制失败");
    }
  };

  const handlePublish = async (workflow: Workflow) => {
    try {
      const updated = await workflowApi.publish(workflow.id);
      if (updated) {
        setWorkflows((prev) =>
          prev.map((w) => (w.id === updated.id ? updated : w)),
        );
        message.success("工作流已发布");
      }
    } catch (error) {
      console.error("Failed to publish workflow:", error);
      message.error("发布失败");
    }
  };

  const handleExecute = async (workflow: Workflow) => {
    if (workflow.status !== "published") {
      message.warning("请先发布工作流");
      return;
    }
    try {
      const execution = await workflowApi.execute(workflow.id);
      message.success("工作流已开始执行");
      // 可以跳转到执行详情页
      console.log("Execution started:", execution);
    } catch (error) {
      console.error("Failed to execute workflow:", error);
      message.error("执行失败");
    }
  };

  const handleCreateWorkflow = async () => {
    try {
      const newWorkflow = await workflowApi.create({
        name: "新工作流",
        nodes: [
          {
            id: "node-start",
            type: "start",
            position: { x: 100, y: 200 },
            config: { type: "start", config: { label: "开始", inputs: [] } },
          },
          {
            id: "node-end",
            type: "end",
            position: { x: 400, y: 200 },
            config: { type: "end", config: { label: "结束", outputs: [] } },
          },
        ],
        edges: [
          {
            id: "edge-1",
            sourceNodeId: "node-start",
            targetNodeId: "node-end",
          },
        ],
      });
      navigate(`/workflow/editor/${newWorkflow.id}`);
    } catch (error) {
      console.error("Failed to create workflow:", error);
      message.error("创建失败");
    }
  };

  const getActionMenuItems = (workflow: Workflow) => [
    {
      key: "edit",
      label: "编辑",
      icon: <EditOutlined />,
      onClick: () => navigate(`/workflow/editor/${workflow.id}`),
    },
    {
      key: "duplicate",
      label: "复制",
      icon: <CopyOutlined />,
      onClick: () => handleDuplicate(workflow),
    },
    {
      key: "versions",
      label: "版本历史",
      icon: <HistoryOutlined />,
      onClick: () => message.info("版本历史功能开发中"),
    },
    { type: "divider" as const },
    ...(workflow.status === "draft"
      ? [
          {
            key: "publish",
            label: "发布",
            icon: <ShareAltOutlined />,
            onClick: () => handlePublish(workflow),
          },
        ]
      : []),
    {
      key: "execute",
      label: "执行",
      icon: <PlayCircleOutlined />,
      disabled: workflow.status !== "published",
      onClick: () => handleExecute(workflow),
    },
    { type: "divider" as const },
    {
      key: "delete",
      label: "删除",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDelete(workflow),
    },
  ];

  const filteredWorkflows = workflows.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="h-full overflow-y-auto bg-[var(--color-bg-base)]">
      {/* 头部 */}
      <div className="p-6 border-b border-(--color-border)">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              工作流
            </h1>
            <p className="text-[var(--color-text-secondary)] mt-1">
              可视化编排 Agent 执行流程
            </p>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateWorkflow}
          >
            创建工作流
          </Button>
        </div>

        <Input
          placeholder="搜索工作流..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          className="max-w-md"
        />
      </div>

      {/* 列表 */}
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spin size="large" />
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={searchQuery ? "没有找到匹配的工作流" : "暂无工作流"}
            className="py-12"
          >
            {!searchQuery && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateWorkflow}
              >
                创建第一个工作流
              </Button>
            )}
          </Empty>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onEdit={() => navigate(`/workflow/editor/${workflow.id}`)}
                onExecute={() => handleExecute(workflow)}
                actionMenu={getActionMenuItems(workflow)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 工作流卡片
function WorkflowCard({
  workflow,
  onEdit,
  onExecute,
  actionMenu,
}: {
  workflow: Workflow;
  onEdit: () => void;
  onExecute: () => void;
  actionMenu: any[];
}) {
  return (
    <div className="bg-[var(--color-bg-secondary)] border border-(--color-border) rounded-lg p-4 hover:border-(--color-primary)/50 transition-colors group">
      {/* 头部 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
            <BranchesOutlined className="text-xl text-[var(--color-primary)]" />
          </div>
          <div>
            <h3 className="font-medium text-[var(--color-text-primary)]">
              {workflow.name}
            </h3>
            <Tag
              color={statusConfig[workflow.status].color}
              className="text-xs mt-1"
            >
              {statusConfig[workflow.status].text}
            </Tag>
          </div>
        </div>
        <Dropdown
          menu={{ items: actionMenu }}
          trigger={["click"]}
          placement="bottomRight"
        >
          <Button type="text" size="small" icon={<MoreOutlined />} />
        </Dropdown>
      </div>

      {/* 描述 */}
      <p className="text-sm text-[var(--color-text-secondary)] mb-4 line-clamp-2">
        {workflow.description || "暂无描述"}
      </p>

      {/* 统计 */}
      <div className="flex items-center gap-4 text-xs text-[var(--color-text-tertiary)] mb-4">
        <span>{workflow.nodes.length} 个节点</span>
        <span>{workflow.edges.length} 条连接</span>
        <span>v{workflow.version}</span>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button size="small" onClick={onEdit}>
          编辑
        </Button>
        <Button
          type="primary"
          size="small"
          icon={<PlayCircleOutlined />}
          disabled={workflow.status !== "published"}
          onClick={onExecute}
        >
          执行
        </Button>
      </div>
    </div>
  );
}
