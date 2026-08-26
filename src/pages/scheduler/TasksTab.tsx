import { useTranslation } from "react-i18next";
/**
 * Task management tab
 * Modeled on apalis-board Tasks: status tab filter + paginated table + detail panel
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Input, Button, Select, message, Popconfirm, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  SearchOutlined,
  CaretRightOutlined,
  PauseOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import type {
  ScheduledTask,
  TaskType,
  TaskStatus,
  TaskExecution,
  TaskTypeDescriptor,
} from "@/services";
import { scheduledTaskApi, taskTypeConfig, parseCronToText } from "@/services";
import { formatDate } from "@/utils";
import TaskDetail from "./TaskDetail";
import TaskFormModal from "./TaskFormModal";

// Merged config of backend dynamic types + frontend static fallback
function buildTypeConfig(dynamicTypes: TaskTypeDescriptor[]) {
  const merged: Record<
    string,
    { label: string; description: string; icon: string }
  > = { ...taskTypeConfig };
  for (const t of dynamicTypes) {
    merged[t.taskType] = {
      label: t.label,
      description: t.description,
      icon: t.icon,
    };
  }
  return merged;
}

export default function TasksTab({
  initialFilterType,
  onFilterTypeConsumed,
}: {
  initialFilterType?: TaskType | "";
  onFilterTypeConsumed?: () => void;
}) {  const { t } = useTranslation();

  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskTypeDescriptor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<TaskType | "">("");
  const [statusTab, setStatusTab] = useState<
    "all" | "enabled" | "disabled" | "running"
  >("all");
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);

  // Merged type configuration
  const mergedConfig = useMemo(() => buildTypeConfig(taskTypes), [taskTypes]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [taskList, execList, types] = await Promise.all([
        scheduledTaskApi.getTasks({
          type: filterType || undefined,
          search: searchQuery || undefined,
        }),
        scheduledTaskApi.getExecutions({ limit: 100 }),
        scheduledTaskApi.getTaskTypes(),
      ]);
      setTasks(taskList);
      setExecutions(execList);
      setTaskTypes(types);
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
    }
  }, [filterType, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Apply type filter when navigating from the overview tab
  useEffect(() => {
    if (initialFilterType) {
      setFilterType(initialFilterType);
      onFilterTypeConsumed?.();
    }
  }, [initialFilterType, onFilterTypeConsumed]);

  const filteredTasks = useMemo(() => {
    switch (statusTab) {
      case "enabled":
        return tasks.filter((t) => t.status === "enabled");
      case "disabled":
        return tasks.filter((t) => t.status === "disabled");
      case "running":
        return tasks.filter((t) => t.lastRunStatus === "running");
      default:
        return tasks;
    }
  }, [tasks, statusTab]);

  const runningCount = tasks.filter(
    (t) => t.lastRunStatus === "running",
  ).length;
  const enabledCount = tasks.filter((t) => t.status === "enabled").length;
  const disabledCount = tasks.filter((t) => t.status === "disabled").length;

  const handleExecute = async (id: string) => {
    try {
      await scheduledTaskApi.executeTask(id);
      message.success(t("任务已开始执行"));
      loadData();
    } catch {
      message.error(t("执行失败"));
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await scheduledTaskApi.toggleTask(id);
      message.success(t("状态已更新"));
      loadData();
    } catch {
      message.error(t("操作失败"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await scheduledTaskApi.deleteTask(id);
      if (selectedTask?.id === id) setSelectedTask(null);
      message.success(t("任务已删除"));
      loadData();
    } catch {
      message.error(t("删除失败"));
    }
  };

  const handleSave = async (data: Partial<ScheduledTask>) => {
    if (editingTask) {
      await scheduledTaskApi.updateTask(editingTask.id, data);
    } else {
      await scheduledTaskApi.createTask(
        data as Omit<
          ScheduledTask,
          | "id"
          | "createdAt"
          | "updatedAt"
          | "successCount"
          | "failureCount"
          | "lastRunAt"
          | "lastRunStatus"
          | "nextRunAt"
        >,
      );
    }
    setShowModal(false);
    setEditingTask(null);
    loadData();
  };

  const columns: ColumnsType<ScheduledTask> = [
    {
      title: t("名称"),
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record: ScheduledTask) => (
        <div className="flex items-center gap-2">
          <span>{(mergedConfig[record.type] ?? { icon: "📋" }).icon}</span>
          <span className="font-medium text-[var(--color-text-primary)]">
            {name}
          </span>
        </div>
      ),
    },
    {
      title: t("状态"),
      dataIndex: "status",
      key: "status",
      width: 90,
      filters: [
        { text: t("已启用"), value: "enabled" },
        { text: t("已禁用"), value: "disabled" },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: TaskStatus) => (
        <Tag color={status === "enabled" ? "green" : "default"}>
          {status === "enabled" ? "已启用" : "已禁用"}
        </Tag>
      ),
    },
    {
      title: "Cron",
      dataIndex: "cronExpression",
      key: "cron",
      width: 160,
      render: (cron: string) => (
        <div>
          <code className="text-xs font-mono text-[var(--color-text-tertiary)]">
            {cron}
          </code>
          <div className="text-xs text-[var(--color-text-tertiary)]">
            {parseCronToText(cron)}
          </div>
        </div>
      ),
    },
    {
      title: t("成功/失败"),
      key: "counts",
      width: 120,
      sorter: (a, b) => a.successCount - b.successCount,
      render: (_: unknown, record: ScheduledTask) => {
        const rate =
          record.successCount + record.failureCount > 0
            ? (record.successCount /
                (record.successCount + record.failureCount)) *
              100
            : null;
        return (
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-0.5 text-green-500">
              <CheckCircleOutlined />
              {record.successCount}
            </span>
            <span className="flex items-center gap-0.5 text-red-500">
              <CloseCircleOutlined />
              {record.failureCount}
            </span>
            {rate !== null && (
              <span
                className={
                  rate >= 90
                    ? "text-green-500"
                    : rate >= 70
                      ? "text-orange-500"
                      : "text-red-500"
                }
              >
                {rate.toFixed(0)}%
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: t("上次执行"),
      dataIndex: "lastRunAt",
      key: "lastRun",
      width: 150,
      render: (v: Date | undefined, record: ScheduledTask) => (
        <div className="text-xs">
          <div>{formatDate(v)}</div>
          {record.lastRunStatus && (
            <Tag
              color={
                record.lastRunStatus === "success"
                  ? "green"
                  : record.lastRunStatus === "failure"
                    ? "red"
                    : "blue"
              }
              className="text-xs mt-0.5"
            >
              {record.lastRunStatus === "success"
                ? "成功"
                : record.lastRunStatus === "failure"
                  ? "失败"
                  : "运行中"}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: t("下次执行"),
      dataIndex: "nextRunAt",
      key: "nextRun",
      width: 150,
      render: (v: Date | undefined) => (
        <span className="text-xs">{formatDate(v)}</span>
      ),
    },
    {
      title: t("操作"),
      key: "actions",
      width: 140,
      render: (_: unknown, record: ScheduledTask) => (
        <div className="flex gap-1">
          <Button
            size="small"
            type="primary"
            icon={<CaretRightOutlined />}
            onClick={() => handleExecute(record.id)}
          />
          <Button
            size="small"
            icon={
              record.status === "enabled" ? (
                <PauseOutlined />
              ) : (
                <PlayCircleOutlined />
              )
            }
            onClick={() => handleToggle(record.id)}
          />
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => setEditingTask(record)}
          />
          <Popconfirm
            title={t("确认删除？")}
            onConfirm={() => handleDelete(record.id)}
            okText={t("删除")}
            cancelText={t("取消")}
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Action bar */}
      <div className="flex items-center gap-3 p-3 border-b border-(--color-border)">
        <Input
          placeholder={t("搜索任务...")}
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          style={{ width: 220 }}
          size="small"
        />
        <Select
          value={filterType || undefined}
          onChange={(v) => setFilterType(v || "")}
          placeholder={t("全部类型")}
          allowClear
          style={{ width: 160 }}
          size="small"
          options={Object.entries(mergedConfig).map(([type, cfg]) => ({
            label: `${cfg.icon} ${cfg.label}`,
            value: type,
          }))}
        />
        <div className="flex-1" />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="small"
          onClick={() => setShowModal(true)}
        >
          创建任务
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex border-b border-(--color-border)">
        {[
          { key: "all" as const, label: t("全部"), count: tasks.length },
          { key: "enabled" as const, label: t("已启用"), count: enabledCount },
          { key: "disabled" as const, label: t("已禁用"), count: disabledCount },
          { key: "running" as const, label: t("运行中"), count: runningCount },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              statusTab === tab.key
                ? "text-[var(--color-primary)] border-(--color-primary)"
                : "text-[var(--color-text-tertiary)] border-transparent hover:text-[var(--color-text-secondary)]"
            }`}
          >
            {tab.label}
            <span className="ml-1 text-xs opacity-70">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Data table */}
      <div className="flex-1 overflow-hidden">
        <Table
          dataSource={filteredTasks}
          columns={columns}
          rowKey="id"
          size="small"
          loading={loading}
          pagination={{
            pageSize: 15,
            showTotal: (t) => t("共 {{p0}} 条", { p0: t }),
            size: "small",
          }}
          onRow={(record) => ({
            onClick: () => setSelectedTask(record),
            className:
              selectedTask?.id === record.id
                ? "bg-[var(--color-primary)]/5 cursor-pointer"
                : "cursor-pointer hover:bg-(--color-bg-tertiary)",
          })}
          scroll={{ y: "calc(100vh - 360px)" }}
        />
      </div>

      {/* Detail panel */}
      {selectedTask && (
        <div className="border-t border-(--color-border) h-72 flex-shrink-0 bg-[var(--color-bg-secondary)]">
          <TaskDetail
            task={selectedTask}
            executions={executions}
            taskTypes={taskTypes}
            onExecute={handleExecute}
            onToggle={handleToggle}
            onEdit={(t) => setEditingTask(t)}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* Create/edit modal */}
      {(showModal || editingTask) && (
        <TaskFormModal
          task={editingTask}
          taskTypes={taskTypes}
          onClose={() => {
            setShowModal(false);
            setEditingTask(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
