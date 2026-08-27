import { useTranslation } from "react-i18next";
/**
 * Execution records tab
 * Modeled on apalis-board Tasks + Logs: status filter + search + paginated table
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Input, Segmented, Table, Tag } from "antd";
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

export default function ExecutionsTab() {  const { t } = useTranslation();

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
          e.task_name.toLowerCase().includes(q) ||
          e.result?.toLowerCase().includes(q) ||
          e.error?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [executions, statusFilter, search]);

  // Statistics
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
      title: t("任务名称"),
      dataIndex: "taskName",
      key: "taskName",
      sorter: (a, b) => a.task_name.localeCompare(b.task_name),
    },
    {
      title: t("状态"),
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
      title: t("开始时间"),
      dataIndex: "startedAt",
      key: "startedAt",
      width: 170,
      sorter: (a, b) =>
        new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
      defaultSortOrder: "descend",
      render: (v: Date) => formatDate(v),
    },
    {
      title: t("耗时"),
      dataIndex: "duration",
      key: "duration",
      width: 80,
      sorter: (a, b) => (a.duration || 0) - (b.duration || 0),
      render: (v: number) => formatDuration(v),
    },
    {
      title: t("结果"),
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
      title: t("完成时间"),
      dataIndex: "completedAt",
      key: "completedAt",
      width: 170,
      render: (v: Date | undefined) => (v ? formatDate(v) : "-"),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-3 border-b border-(--color-border)">
        <Input
          placeholder={t("搜索执行记录...")}
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: 250 }}
          size="small"
        />
        <Segmented
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as typeof statusFilter)}
          options={[
            { key: "", label: t("全部"), count: counts.all },
            { key: "success", label: t("成功"), count: counts.success },
            { key: "failure", label: t("失败"), count: counts.failure },
            { key: "running", label: t("运行中"), count: counts.running },
            { key: "pending", label: t("等待中"), count: counts.pending },
          ].map((f) => ({
            value: f.key,
            label: `${f.label} (${f.count})`,
          }))}
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <Table
          dataSource={filteredExecutions}
          columns={columns}
          rowKey="id"
          size="small"
          loading={loading}
          pagination={{
            pageSize: 20,
            showTotal: (total) => t("共 {{p0}} 条", { p0: total }),
            size: "small",
          }}
          scroll={{ y: "calc(100vh - 280px)" }}
          locale={{
            emptyText: (
              <div className="py-8 text-[var(--color-text-tertiary)]">
                <ClockCircleOutlined className="text-2xl mb-2 opacity-50" />
                <p>{t("暂无执行记录")}</p>
              </div>
            ),
          }}
        />
      </div>
    </div>
  );
}
