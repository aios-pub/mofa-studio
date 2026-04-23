/**
 * Worker 监控 Tab
 * 参考 apalis-board Workers 页面：Worker 状态 + Handler 列表
 * Handler 数据从后端 GET /api/task/types 动态获取
 */

import { useState, useEffect, useCallback } from "react";
import { Table, Tag, Badge } from "antd";
import type { ColumnsType } from "antd/es/table";
import { TeamOutlined, ApiOutlined } from "@ant-design/icons";
import { scheduledTaskApi } from "@/services";
import type { TaskTypeDescriptor } from "@/services";

// Handler 信息（从 TaskTypeDescriptor 转换）
interface HandlerInfo {
  taskType: string;
  label: string;
  description: string;
  icon: string;
}

export default function WorkersTab() {
  const [handlers, setHandlers] = useState<HandlerInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const types = await scheduledTaskApi.getTaskTypes();
      setHandlers(
        types.map((t: TaskTypeDescriptor) => ({
          taskType: t.taskType,
          label: t.label,
          description: t.description,
          icon: t.icon,
        })),
      );
    } catch (error) {
      console.error("Failed to load handler types:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlerColumns: ColumnsType<HandlerInfo> = [
    {
      title: "图标",
      dataIndex: "icon",
      key: "icon",
      width: 60,
      render: (icon: string) => <span className="text-lg">{icon}</span>,
    },
    {
      title: "任务类型",
      dataIndex: "taskType",
      key: "taskType",
      render: (type: string) => (
        <code className="text-xs font-mono">{type}</code>
      ),
    },
    {
      title: "名称",
      dataIndex: "label",
      key: "label",
      render: (label: string) => (
        <span className="text-[var(--color-text-primary)]">{label}</span>
      ),
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      render: (desc: string) => (
        <span className="text-xs text-[var(--color-text-tertiary)]">
          {desc}
        </span>
      ),
    },
    {
      title: "状态",
      key: "status",
      width: 100,
      render: () => <Tag color="green">活跃</Tag>,
    },
  ];

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full">
      {/* 调度器状态 */}
      <section>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1 flex items-center gap-2">
          <TeamOutlined /> 调度器状态
        </h2>
        <p className="text-sm text-[var(--color-text-tertiary)] mb-4">
          Cron 调度工作进程
        </p>
        <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) p-4 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Badge status="success" />
            <span className="font-medium text-[var(--color-text-primary)]">
              scheduled-task-worker
            </span>
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-bg-tertiary)]">
              <ApiOutlined />
              CronStream (apalis-cron)
            </span>
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)]">
            并发: 1
          </div>
          <Tag color="green">运行中</Tag>
        </div>
      </section>

      {/* 已注册 Handler */}
      <section>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1 flex items-center gap-2">
          <ApiOutlined /> 已注册 Handler
        </h2>
        <p className="text-sm text-[var(--color-text-tertiary)] mb-4">
          共 {handlers.length} 个处理函数注册 — 数据来自后端{" "}
          <code className="text-xs">/api/task/types</code>
        </p>
        <Table
          dataSource={handlers}
          columns={handlerColumns}
          rowKey="taskType"
          size="small"
          loading={loading}
          pagination={false}
          className="border border-(--color-border) rounded-lg overflow-hidden"
          locale={{ emptyText: "暂无已注册的 Handler" }}
        />
      </section>
    </div>
  );
}
