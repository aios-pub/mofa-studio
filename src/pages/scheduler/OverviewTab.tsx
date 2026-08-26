import { useTranslation } from "react-i18next";
/**
 * Overview dashboard tab
 * Modeled on apalis-board home: stats cards (with mini bar chart) + task type cards (activity chart)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type {
  ScheduledTask,
  TaskType,
  TaskExecution,
  TaskTypeDescriptor,
} from "@/services";
import { scheduledTaskApi, taskTypeConfig } from "@/services";

// Merge backend dynamic types + frontend static fallback
function getTaskTypeConfig(type: string, dynamicTypes: TaskTypeDescriptor[]) {
  const dynamic = dynamicTypes.find((t) => t.task_type === type);
  if (dynamic)
    return {
      label: dynamic.label,
      description: dynamic.description,
      icon: dynamic.icon,
    };
  return (
    taskTypeConfig[type as keyof typeof taskTypeConfig] ?? {
      label: type,
      description: "",
      icon: "📋",
    }
  );
}

// Group execution records by date; return counts for the last N days
function groupExecutionsByDay(
  executions: TaskExecution[],
  days: number,
): number[] {
  const result: number[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = executions.filter((e) => {
      const d = new Date(e.started_at);
      return d >= dayStart && d < dayEnd;
    }).length;
    result.push(count);
  }
  return result;
}

// Mini bar chart component (see apalis-board stats_card / queue_card activity chart)
function MiniBarChart({
  data,
  height = "h-8",
  barWidth = "w-1.5",
  color = "bg-[var(--color-primary)]",
}: {
  data: number[];
  height?: string;
  barWidth?: string;
  color?: string;
}) {
  const max = Math.max(...data, 1);
  return (
    <div className={`flex items-end gap-0.5 ${height}`}>
      {data.map((v, i) => (
        <div
          key={i}
          className={`${barWidth} ${color} rounded-sm transition-all`}
          style={{ height: `${(v / max) * 80 + 20}%` }}
          title={v.toString()}
        />
      ))}
    </div>
  );
}

// Stats card (see apalis-board stats_card)
function StatCard({
  title,
  value,
  subtitle,
  icon,
  data,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  data?: number[];
  color?: string;
}) {
  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[var(--color-text-tertiary)]">
          {title}
        </span>
        {icon && <span className="text-lg opacity-60">{icon}</span>}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span
            className={`text-2xl font-bold ${color || "text-[var(--color-text-primary)]"}`}
          >
            {value}
          </span>
          {subtitle && (
            <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {data && data.length > 0 && (
          <MiniBarChart
            data={data}
            height="h-6"
            barWidth="w-1"
            color={color || "bg-[var(--color-primary)]"}
          />
        )}
      </div>
    </div>
  );
}

// Task type card (see apalis-board queue_card)
function TypeCard({
  type,
  tasks,
  activityData,
  dynamicTypes,
  onClick,
}: {
  type: string;
  tasks: ScheduledTask[];
  activityData: number[];
  dynamicTypes: TaskTypeDescriptor[];
  onClick: () => void;
}) {
  const config = getTaskTypeConfig(type, dynamicTypes);
  const enabled = tasks.filter((t) => t.status === "enabled").length;
  const totalSuccess = tasks.reduce((s, t) => s + t.success_count, 0);
  const totalFailure = tasks.reduce((s, t) => s + t.failure_count, 0);
  const rate =
    totalSuccess + totalFailure > 0
      ? (totalSuccess / (totalSuccess + totalFailure)) * 100
      : null;

  return (
    <div
      onClick={onClick}
      className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) p-4 cursor-pointer hover:border-(--color-primary)/50 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.icon}</span>
          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
            {config.label}
          </h3>
        </div>
        <span className="text-xs px-1.5 py-0.5 rounded bg-(--color-bg-tertiary) text-[var(--color-text-tertiary)]">
          {tasks.length} 任务
        </span>
      </div>

      <div className="flex items-end justify-between mb-2">
        <div className="space-y-1 text-xs text-[var(--color-text-tertiary)]">
          <div>
            已启用: <span className="text-green-500">{enabled}</span>
          </div>
          {rate !== null && (
            <div>
              成功率:{" "}
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
            </div>
          )}
        </div>
        <MiniBarChart
          data={activityData}
          height="h-10"
          barWidth="w-2.5"
          color="bg-gray-500"
        />
      </div>

      <p className="text-xs text-[var(--color-text-tertiary)]">
        {config.description}
      </p>
    </div>
  );
}

interface Props {
  onNavigateToTasks?: (type?: TaskType) => void;
}

export default function OverviewTab({ onNavigateToTasks }: Props) {  const { t } = useTranslation();

  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [task_types, setTaskTypes] = useState<TaskTypeDescriptor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [taskList, execList, types] = await Promise.all([
        scheduledTaskApi.getTasks(),
        scheduledTaskApi.getExecutions({ limit: 200 }),
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const enabled = tasks.filter((t) => t.status === "enabled").length;
    const disabled = tasks.filter((t) => t.status === "disabled").length;
    const totalSuccess = tasks.reduce((s, t) => s + t.success_count, 0);
    const totalFailure = tasks.reduce((s, t) => s + t.failure_count, 0);
    const rate =
      totalSuccess + totalFailure > 0
        ? (totalSuccess / (totalSuccess + totalFailure)) * 100
        : 0;
    return {
      total: tasks.length,
      enabled,
      disabled,
      totalSuccess,
      totalFailure,
      rate,
    };
  }, [tasks]);

  const tasksByType = useMemo(() => {
    const map: Record<string, ScheduledTask[]> = {};
    tasks.forEach((t) => {
      if (!map[t.type]) map[t.type] = [];
      map[t.type].push(t);
    });
    return map;
  }, [tasks]);

  // Real activity data: execution counts for the last 10 days
  const statsActivity = useMemo(
    () => groupExecutionsByDay(executions, 10),
    [executions],
  );

  // Activity data grouped by task type
  const activityByType = useMemo(() => {
    const map: Record<string, number[]> = {};
    // Build task_id -> type mapping
    const task_typeMap: Record<string, string> = {};
    tasks.forEach((t) => {
      task_typeMap[t.id] = t.type;
    });

    for (const type of Object.keys(tasksByType)) {
      const typeTaskIds = new Set(tasksByType[type].map((t) => t.id));
      const typeExecs = executions.filter((e) => typeTaskIds.has(e.task_id));
      map[type] = groupExecutionsByDay(typeExecs, 7);
    }
    return map;
  }, [tasks, tasksByType, executions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-[var(--color-text-tertiary)]">
          <ClockCircleOutlined className="text-3xl mb-2 animate-spin" />
          <p>{t("加载中...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-8 overflow-y-auto h-full">
      {/* Statistics overview */}
      <section>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
          概览
        </h2>
        <p className="text-sm text-[var(--color-text-tertiary)] mb-4">
          定时任务调度统计
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title={t("总任务数")}
            value={stats.total}
            icon={<ThunderboltOutlined />}
            data={statsActivity}
          />
          <StatCard
            title={t("已启用")}
            value={stats.enabled}
            color="text-green-500"
            icon={<CheckCircleOutlined />}
            data={statsActivity}
          />
          <StatCard
            title={t("已禁用")}
            value={stats.disabled}
            icon={<CloseCircleOutlined />}
            data={statsActivity}
          />
          <StatCard
            title={t("成功率")}
            value={`${stats.rate.toFixed(1)}%`}
            color={
              stats.rate >= 90
                ? "text-green-500"
                : stats.rate >= 70
                  ? "text-orange-500"
                  : "text-red-500"
            }
            subtitle={t("{{p0}} 成功 / {{p1}} 失败", { p0: stats.totalSuccess, p1: stats.totalFailure })}
            data={statsActivity}
          />
        </div>
      </section>

      {/* Task type cards */}
      <section>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
          任务类型
        </h2>
        <p className="text-sm text-[var(--color-text-tertiary)] mb-4">
          按类型查看任务调度状态
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.keys(tasksByType).map((type) => (
            <TypeCard
              key={type}
              type={type}
              tasks={tasksByType[type] || []}
              activityData={activityByType[type] || Array(7).fill(0)}
              dynamicTypes={task_types}
              onClick={() => onNavigateToTasks?.(type as TaskType)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
