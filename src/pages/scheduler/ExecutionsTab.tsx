/**
 * 执行记录 Tab
 * 参考 apalis-board Tasks + Logs 页面：状态过滤 + 搜索 + 分页表格
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Input, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined, ClockCircleOutlined } from "@ant-design/icons";
import type { TaskExecution, ExecutionStatus } from "@/services";
import { scheduledTaskApi } from "@/services";
import { formatDate } from "@/utils";

const execStatusColorMap: Record<ExecutionStatus, string> = {
  success: "green",
  failure: "red",
  running: "blue",
  pending: "default",
};

const execStatusLabel: Record<ExecutionStatus, string> = {
  success: "成功",
  failure: "失败",
  running: "运行中",
  pending: "等待中",
};

export default function ExecutionsTab() {
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExecutionStatus | "">("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await scheduledTaskApi.getExecutions({ limit: 200 });
      setExecutions(data);
    } catch (error) {
      console.error("Failed to load executions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredExecutions = useMemo(() => {
    let result = executions;
    if (statusFilter) result = result.filter((e) => e.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.taskName.toLowerCase().includes(q) ||
          e.result?.toLowerCase().includes(q) ||
          e.error?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [executions, statusFilter, search]);

  // 统计
  const counts = useMemo(
    () => ({
      all: executions.length,
      success: executions.filter((e) => e.status === "success").length,
      failure: executions.filter((e) => e.status === "failure").length,
      running: executions.filter((e) => e.status === "running").length,
      pending: executions.filter((e) => e.status === "pending").length,
    }),
    [executions],
  );

  const formatDuration = (ms: number | undefined) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const columns: ColumnsType<TaskExecution> = [
    {
      title: "任务名称",
      dataIndex: "taskName",
      key: "taskName",
      sorter: (a, b) => a.taskName.localeCompare(b.taskName),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 90,
      filters: Object.entries(execStatusLabel).map(([k, v]) => ({
        text: v,
        value: k,
      })),
      onFilter: (value, record) => record.status === value,
      render: (status: ExecutionStatus) => (
        <Tag color={execStatusColorMap[status]}>{execStatusLabel[status]}</Tag>
      ),
    },
    {
      title: "开始时间",
      dataIndex: "startedAt",
      key: "startedAt",
      width: 170,
      sorter: (a, b) =>
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
      defaultSortOrder: "descend",
      render: (v: Date) => formatDate(v),
    },
    {
      title: "耗时",
      dataIndex: "duration",
      key: "duration",
      width: 80,
      sorter: (a, b) => (a.duration || 0) - (b.duration || 0),
      render: (v: number) => formatDuration(v),
    },
    {
      title: "结果",
      key: "result",
      render: (_: unknown, record: TaskExecution) => (
        <span
          className={
            record.error ? "text-red-500" : "text-[var(--color-text-primary)]"
          }
        >
          {record.result || record.error || "执行中..."}
        </span>
      ),
    },
    {
      title: "完成时间",
      dataIndex: "completedAt",
      key: "completedAt",
      width: 170,
      render: (v: Date | undefined) => (v ? formatDate(v) : "-"),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center gap-3 p-3 border-b border-(--color-border)">
        <Input
          placeholder="搜索执行记录..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: 250 }}
          size="small"
        />
        <div className="flex gap-1.5">
          {[
            { key: "" as const, label: "全部", count: counts.all },
            {
              key: "success" as const,
              label: "成功",
              count: counts.success,
              color: "text-green-500",
            },
            {
              key: "failure" as const,
              label: "失败",
              count: counts.failure,
              color: "text-red-500",
            },
            {
              key: "running" as const,
              label: "运行中",
              count: counts.running,
              color: "text-blue-500",
            },
            { key: "pending" as const, label: "等待中", count: counts.pending },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                statusFilter === f.key
                  ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium"
                  : `bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] ${f.color || ""}`
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* 表格 */}
      <div className="flex-1 overflow-hidden">
        <Table
          dataSource={filteredExecutions}
          columns={columns}
          rowKey="id"
          size="small"
          loading={loading}
          pagination={{
            pageSize: 20,
            showTotal: (t) => `共 ${t} 条`,
            size: "small",
          }}
          scroll={{ y: "calc(100vh - 280px)" }}
          locale={{
            emptyText: (
              <div className="py-8 text-[var(--color-text-tertiary)]">
                <ClockCircleOutlined className="text-2xl mb-2 opacity-50" />
                <p>暂无执行记录</p>
              </div>
            ),
          }}
        />
      </div>
    </div>
  );
}
