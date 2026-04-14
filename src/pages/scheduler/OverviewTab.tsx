/**
 * 概览仪表盘 Tab
 * 参考 apalis-board Home 页面：统计卡片(含迷你柱状图) + 任务类型卡片(活动图)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { ScheduledTask, TaskType } from '@/services';
import { scheduledTaskApi, taskTypeConfig } from '@/services';

// 迷你柱状图组件（参考 apalis-board stats_card / queue_card 活动图）
function MiniBarChart({ data, height = 'h-8', barWidth = 'w-1.5', color = 'bg-[var(--color-primary)]' }: {
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

// 统计卡片（参考 apalis-board stats_card）
function StatCard({ title, value, subtitle, icon, data, color }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  data?: number[];
  color?: string;
}) {
  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[var(--color-text-tertiary)]">{title}</span>
        {icon && <span className="text-lg opacity-60">{icon}</span>}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className={`text-2xl font-bold ${color || 'text-[var(--color-text-primary)]'}`}>{value}</span>
          {subtitle && <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{subtitle}</p>}
        </div>
        {data && data.length > 0 && <MiniBarChart data={data} height="h-6" barWidth="w-1" color={color || 'bg-[var(--color-primary)]'} />}
      </div>
    </div>
  );
}

// 任务类型卡片（参考 apalis-board queue_card）
function TypeCard({ type, tasks, onClick }: {
  type: TaskType;
  tasks: ScheduledTask[];
  onClick: () => void;
}) {
  const config = taskTypeConfig[type];
  const enabled = tasks.filter((t) => t.status === 'enabled').length;
  const totalSuccess = tasks.reduce((s, t) => s + t.successCount, 0);
  const totalFailure = tasks.reduce((s, t) => s + t.failureCount, 0);
  const rate = totalSuccess + totalFailure > 0
    ? (totalSuccess / (totalSuccess + totalFailure)) * 100 : null;

  // 模拟 7 天活动数据
  const activity = useMemo(() =>
    Array.from({ length: 7 }, () => Math.floor(Math.random() * 10)),
    [],
  );

  return (
    <div
      onClick={onClick}
      className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4 cursor-pointer hover:border-[var(--color-primary)]/50 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.icon}</span>
          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">{config.label}</h3>
        </div>
        <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]">
          {tasks.length} 任务
        </span>
      </div>

      <div className="flex items-end justify-between mb-2">
        <div className="space-y-1 text-xs text-[var(--color-text-tertiary)]">
          <div>已启用: <span className="text-green-500">{enabled}</span></div>
          {rate !== null && (
            <div>成功率: <span className={rate >= 90 ? 'text-green-500' : rate >= 70 ? 'text-orange-500' : 'text-red-500'}>{rate.toFixed(0)}%</span></div>
          )}
        </div>
        <MiniBarChart data={activity} height="h-10" barWidth="w-2.5" color="bg-gray-500" />
      </div>

      <p className="text-xs text-[var(--color-text-tertiary)]">{config.description}</p>
    </div>
  );
}

interface Props {
  onNavigateToTasks?: (type?: TaskType) => void;
}

export default function OverviewTab({ onNavigateToTasks }: Props) {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await scheduledTaskApi.getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = useMemo(() => {
    const enabled = tasks.filter((t) => t.status === 'enabled').length;
    const disabled = tasks.filter((t) => t.status === 'disabled').length;
    const totalSuccess = tasks.reduce((s, t) => s + t.successCount, 0);
    const totalFailure = tasks.reduce((s, t) => s + t.failureCount, 0);
    const rate = totalSuccess + totalFailure > 0 ? (totalSuccess / (totalSuccess + totalFailure)) * 100 : 0;
    return { total: tasks.length, enabled, disabled, totalSuccess, totalFailure, rate };
  }, [tasks]);

  const tasksByType = useMemo(() => {
    const map: Partial<Record<TaskType, ScheduledTask[]>> = {};
    tasks.forEach((t) => {
      if (!map[t.type]) map[t.type] = [];
      map[t.type]!.push(t);
    });
    return map;
  }, [tasks]);

  // 模拟统计活动数据
  const statsActivity = useMemo(() => Array.from({ length: 10 }, () => Math.floor(Math.random() * 20)), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-[var(--color-text-tertiary)]">
          <ClockCircleOutlined className="text-3xl mb-2 animate-spin" />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-8 overflow-y-auto h-full">
      {/* 统计概览 */}
      <section>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">概览</h2>
        <p className="text-sm text-[var(--color-text-tertiary)] mb-4">定时任务调度统计</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="总任务数"
            value={stats.total}
            icon={<ThunderboltOutlined />}
            data={statsActivity}
          />
          <StatCard
            title="已启用"
            value={stats.enabled}
            color="text-green-500"
            icon={<CheckCircleOutlined />}
            data={statsActivity.map((v) => Math.floor(v * 0.7))}
          />
          <StatCard
            title="已禁用"
            value={stats.disabled}
            icon={<CloseCircleOutlined />}
            data={statsActivity.map((v) => Math.floor(v * 0.3))}
          />
          <StatCard
            title="成功率"
            value={`${stats.rate.toFixed(1)}%`}
            color={stats.rate >= 90 ? 'text-green-500' : stats.rate >= 70 ? 'text-orange-500' : 'text-red-500'}
            subtitle={`${stats.totalSuccess} 成功 / ${stats.totalFailure} 失败`}
            data={statsActivity.map(() => stats.rate)}
          />
        </div>
      </section>

      {/* 任务类型卡片 */}
      <section>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">任务类型</h2>
        <p className="text-sm text-[var(--color-text-tertiary)] mb-4">按类型查看任务调度状态</p>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {(Object.keys(taskTypeConfig) as TaskType[]).map((type) => (
            <TypeCard
              key={type}
              type={type}
              tasks={tasksByType[type] || []}
              onClick={() => onNavigateToTasks?.(type)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
