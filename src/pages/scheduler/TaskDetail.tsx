/**
 * 任务详情面板
 * 参考 apalis-board SingleTaskView：左右分栏（参数+上下文 | 执行时间线）
 */

import { useMemo } from "react";
import { Button, Tag, Tooltip } from "antd";
import {
  CaretRightOutlined,
  PauseOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  RightOutlined,
} from "@ant-design/icons";
import type { ScheduledTask, TaskExecution, ExecutionStatus } from "@/services";
import { taskTypeConfig, parseCronToText } from "@/services";
import type { TaskTypeDescriptor } from "@/services";
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

const getStatusIcon = (status: ExecutionStatus | undefined) => {
  switch (status) {
    case "success":
      return <CheckCircleOutlined className="text-green-500" />;
    case "failure":
      return <CloseCircleOutlined className="text-red-500" />;
    case "running":
      return <LoadingOutlined className="text-blue-500" />;
    default:
      return <ClockCircleOutlined className="text-gray-400" />;
  }
};

const formatDuration = (ms: number | undefined) => {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

interface Props {
  task: ScheduledTask;
  executions: TaskExecution[];
  task_types?: TaskTypeDescriptor[];
  onExecute: (id: string) => void;
  onToggle: (id: string) => void;
  onEdit: (task: ScheduledTask) => void;
  onDelete: (id: string) => void;
  onViewAllExecutions?: () => void;
}

export default function TaskDetail({
  task,
  executions,
  task_types,
  onExecute,
  onToggle,
  onEdit,
  onDelete,
  onViewAllExecutions,
}: Props) {
  const taskExecutions = useMemo(
    () => executions.filter((e) => e.task_id === task.id).slice(0, 5),
    [executions, task.id],
  );

  const successRate =
    task.success_count + task.failure_count > 0
      ? (task.success_count / (task.success_count + task.failure_count)) * 100
      : null;

  // 上下文元数据（参考 apalis-board MetaKey）
  const contextItems = [
    {
      key: "任务类型",
      value: (() => {
        const dynamic = task_types?.find((t) => t.task_type === task.type);
        const staticCfg =
          taskTypeConfig[task.type as keyof typeof taskTypeConfig];
        const cfg = dynamic
          ? { icon: dynamic.icon, label: dynamic.label }
          : staticCfg;
        return cfg ? `${cfg.icon} ${cfg.label}` : task.type;
      })(),
    },
    { key: "Cron 表达式", value: task.cron_expression, mono: true },
    {
      key: "状态",
      value: task.status === "enabled" ? "已启用" : "已禁用",
      tag: true,
    },
    {
      key: "成功率",
      value: successRate !== null ? `${successRate.toFixed(1)}%` : "-",
      highlight:
        successRate !== null
          ? successRate >= 90
            ? "green"
            : successRate >= 70
              ? "orange"
              : "red"
          : undefined,
    },
    { key: "创建人", value: task.created_by || "-" },
    { key: "创建时间", value: formatDate(task.created_at) },
    { key: "更新时间", value: formatDate(task.updated_at) },
  ];

  return (
    <div className="lg:grid lg:grid-cols-5 flex-1 overflow-y-auto">
      {/* 左侧：参数 + 上下文 */}
      <div className="lg:col-span-2 flex flex-col overflow-y-auto border-r border-(--color-border)">
        {/* 参数 JSON */}
        <div className="bg-[var(--color-bg-secondary)]">
          <h3 className="p-3 text-sm font-medium text-[var(--color-text-primary)] border-b border-(--color-border)">
            参数 (Arguments)
          </h3>
          <pre className="p-3 overflow-auto text-xs text-[var(--color-text-primary)] font-mono bg-(--color-bg-tertiary) m-0">
            <code>{JSON.stringify(task.config || {}, null, 2)}</code>
          </pre>
        </div>

        {/* 上下文元数据 */}
        <div className="bg-[var(--color-bg-secondary)] flex-1 overflow-y-auto">
          <h3 className="p-3 text-sm font-medium text-[var(--color-text-primary)] border-b border-(--color-border)">
            上下文 (Context)
          </h3>
          <div className="p-3 space-y-0">
            {contextItems.map((item) => (
              <div
                key={item.key}
                className="flex justify-between items-center py-2 border-b border-(--color-border) last:border-b-0"
              >
                <span className="text-sm text-[var(--color-text-tertiary)]">
                  {item.key}
                </span>
                {item.tag ? (
                  <Tag color={task.status === "enabled" ? "green" : "default"}>
                    {item.value}
                  </Tag>
                ) : (
                  <span
                    className={`text-sm text-[var(--color-text-primary)] truncate max-w-[60%] text-right ${item.mono ? "font-mono" : ""} ${item.highlight === "green" ? "text-green-500" : item.highlight === "orange" ? "text-orange-500" : item.highlight === "red" ? "text-red-500" : ""}`}
                  >
                    {item.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧：执行时间线 + 操作 */}
      <div className="lg:col-span-3 flex flex-col overflow-y-auto">
        {/* 头部操作栏 */}
        <div className="p-3 border-b border-(--color-border) flex items-center justify-between bg-[var(--color-bg-secondary)]">
          <div className="flex items-center gap-2">
            <Tag color={task.status === "enabled" ? "green" : "default"}>
              {task.status === "enabled" ? "已启用" : "已禁用"}
            </Tag>
            <span className="text-xs text-[var(--color-text-tertiary)]">
              {parseCronToText(task.cron_expression)}
            </span>
          </div>
          <div className="flex gap-1.5">
            <Tooltip title="执行">
              <Button
                size="small"
                type="primary"
                icon={<CaretRightOutlined />}
                onClick={() => onExecute(task.id)}
              />
            </Tooltip>
            <Tooltip title={task.status === "enabled" ? "禁用" : "启用"}>
              <Button
                size="small"
                icon={
                  task.status === "enabled" ? (
                    <PauseOutlined />
                  ) : (
                    <PlayCircleOutlined />
                  )
                }
                onClick={() => onToggle(task.id)}
              />
            </Tooltip>
            <Tooltip title="编辑">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit(task)}
              />
            </Tooltip>
            <Tooltip title="删除">
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDelete(task.id)}
              />
            </Tooltip>
          </div>
        </div>

        {/* 最近执行 */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-3 pt-3 pb-1">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-1.5">
              <HistoryOutlined />
              最近执行
            </h3>
            {onViewAllExecutions && (
              <Button type="link" size="small" onClick={onViewAllExecutions}>
                查看全部 <RightOutlined />
              </Button>
            )}
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {taskExecutions.length === 0 ? (
              <p className="text-xs text-[var(--color-text-tertiary)] p-3">
                暂无执行记录
              </p>
            ) : (
              taskExecutions.map((exec) => (
                <div
                  key={exec.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-(--color-bg-tertiary) transition-colors"
                >
                  {getStatusIcon(exec.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text-primary)] truncate">
                        {exec.result || exec.error || "执行中..."}
                      </span>
                      <Tag
                        color={execStatusColorMap[exec.status]}
                        className="ml-2 flex-shrink-0"
                      >
                        {execStatusLabel[exec.status]}
                      </Tag>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--color-text-tertiary)]">
                      <span>{formatDate(exec.started_at)}</span>
                      {exec.duration && (
                        <span>耗时 {formatDuration(exec.duration)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
