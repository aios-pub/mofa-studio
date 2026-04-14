/**
 * 定时任务管理页面
 * UI 参考 apalis-board 设计模式
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Input, Button, Select, message, Modal, Form, Checkbox, Popconfirm, Table, Tag, Tooltip, Tabs } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  CaretRightOutlined,
  PauseOutlined,
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  SyncOutlined,
  PlayCircleOutlined,
  FieldTimeOutlined,
  HistoryOutlined,
  SettingOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { Cron } from 'react-js-cron';
import 'react-js-cron/dist/styles.css';
import type {
  ScheduledTask,
  TaskExecution,
  TaskType,
  TaskStatus,
  ExecutionStatus,
  TaskConfig,
} from '@/services';
import {
  scheduledTaskApi,
  taskTypeConfig,
  cronPresets,
  parseCronToText,
} from '@/services';
import { formatDate } from '@/utils';

// react-js-cron 中文 locale
const cronZhLocale = {
  everyText: '每',
  emptyMonths: '每月',
  emptyMonthDays: '每日(月)',
  emptyMonthDaysShort: '日',
  emptyWeekDays: '每周',
  emptyWeekDaysShort: '周',
  emptyHours: '每小时',
  emptyMinutes: '每分钟',
  emptyMinutesForHourPeriod: '每分钟',
  yearOption: '年',
  monthOption: '月',
  weekOption: '周',
  dayOption: '天',
  hourOption: '小时',
  minuteOption: '分钟',
  rebootOption: '重启',
  prefixPeriod: '每',
  prefixMonths: '的',
  prefixMonthDays: '的',
  prefixWeekDays: '的',
  prefixWeekDaysForMonthAndYearPeriod: '的',
  prefixHours: '的',
  prefixMinutes: '的',
  suffixMinutesForHourPeriod: '分钟',
  errorInvalidCron: '无效的 Cron 表达式',
  weekDays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  months: [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月',
  ],
  altWeekDays: ['日', '一', '二', '三', '四', '五', '六'],
  altMonths: [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月',
  ],
};

// 执行状态颜色/标签映射
const execStatusColorMap: Record<ExecutionStatus, string> = {
  success: 'green',
  failure: 'red',
  running: 'blue',
  pending: 'default',
};

const execStatusLabel: Record<ExecutionStatus, string> = {
  success: '成功',
  failure: '失败',
  running: '运行中',
  pending: '等待中',
};

export default function ScheduledTasksPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    enabled: number;
    disabled: number;
    totalExecutions: number;
    successRate: number;
    executionsToday: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TaskType | ''>('');
  const [statusTab, setStatusTab] = useState<'all' | 'enabled' | 'disabled' | 'running'>('all');
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'executions' | 'config'>('overview');
  const [execStatusFilter, setExecStatusFilter] = useState<ExecutionStatus | ''>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [taskList, executionList, statsData] = await Promise.all([
        scheduledTaskApi.getTasks({
          type: filterType || undefined,
          search: searchQuery || undefined,
        }),
        scheduledTaskApi.getExecutions({ limit: 50 }),
        scheduledTaskApi.getStats(),
      ]);
      setTasks(taskList);
      setExecutions(executionList);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [filterType, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 按 statusTab 过滤任务
  const filteredTasks = useMemo(() => {
    switch (statusTab) {
      case 'enabled':
        return tasks.filter((t) => t.status === 'enabled');
      case 'disabled':
        return tasks.filter((t) => t.status === 'disabled');
      case 'running':
        return tasks.filter((t) => t.lastRunStatus === 'running');
      default:
        return tasks;
    }
  }, [tasks, statusTab]);

  // 运行中任务数
  const runningCount = tasks.filter((t) => t.lastRunStatus === 'running').length;

  const handleToggleTask = async (id: string) => {
    try {
      await scheduledTaskApi.toggleTask(id);
      message.success('任务状态已更新');
      loadData();
    } catch (error) {
      console.error('Failed to toggle task:', error);
      message.error('操作失败');
    }
  };

  const handleExecuteTask = async (id: string) => {
    try {
      await scheduledTaskApi.executeTask(id);
      message.success('任务已开始执行');
      loadData();
    } catch (error) {
      console.error('Failed to execute task:', error);
      message.error('执行失败');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await scheduledTaskApi.deleteTask(id);
      if (selectedTask?.id === id) {
        setSelectedTask(null);
      }
      message.success('任务已删除');
      loadData();
    } catch (error) {
      console.error('Failed to delete task:', error);
      message.error('删除失败');
    }
  };

  const getStatusIcon = (status: ExecutionStatus | undefined) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined className="text-green-500" />;
      case 'failure':
        return <CloseCircleOutlined className="text-red-500" />;
      case 'running':
        return <LoadingOutlined className="text-blue-500" />;
      default:
        return <ClockCircleOutlined className="text-gray-400" />;
    }
  };

  const formatDuration = (ms: number | undefined) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // 当前选中任务的执行记录
  const taskExecutions = useMemo(() => {
    if (!selectedTask) return [];
    return executions
      .filter((e) => e.taskId === selectedTask.id)
      .filter((e) => !execStatusFilter || e.status === execStatusFilter);
  }, [executions, selectedTask, execStatusFilter]);

  // 执行记录表格列定义
  const execColumns: ColumnsType<TaskExecution> = [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: ExecutionStatus) => (
        <Tag color={execStatusColorMap[status]}>{execStatusLabel[status]}</Tag>
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'startedAt',
      key: 'startedAt',
      width: 170,
      render: (v: Date) => formatDate(v),
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 80,
      render: (v: number) => formatDuration(v),
    },
    {
      title: '结果',
      key: 'result',
      render: (_: unknown, record: TaskExecution) =>
        record.result || record.error || '执行中...',
    },
    {
      title: '完成时间',
      dataIndex: 'completedAt',
      key: 'completedAt',
      width: 170,
      render: (v: Date) => formatDate(v),
    },
  ];

  return (
    <div className="flex h-full">
      {/* 左侧列表 */}
      <div className="w-96 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg-secondary)]">
        {/* 头部 */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">定时任务</h2>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowCreateModal(true)}
            />
          </div>

          {/* 搜索 */}
          <Input
            placeholder="搜索任务..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />

          {/* 类型筛选 */}
          <Select
            value={filterType || undefined}
            onChange={(v) => setFilterType(v || '')}
            placeholder="全部类型"
            allowClear
            style={{ width: '100%' }}
            size="small"
            options={Object.entries(taskTypeConfig).map(([type, config]) => ({
              label: `${config.icon} ${config.label}`,
              value: type,
            }))}
          />

          {/* 状态标签页 */}
          <div className="flex border-b border-[var(--color-border)]">
            {[
              { key: 'all' as const, label: '全部', count: stats?.total ?? 0 },
              { key: 'enabled' as const, label: '已启用', count: stats?.enabled ?? 0, dot: 'bg-green-500' },
              { key: 'disabled' as const, label: '已禁用', count: stats?.disabled ?? 0, dot: 'bg-gray-400' },
              { key: 'running' as const, label: '运行中', count: runningCount, dot: 'bg-blue-500' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key)}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                  statusTab === tab.key
                    ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
                    : 'text-[var(--color-text-tertiary)] border-transparent hover:text-[var(--color-text-secondary)]'
                }`}
              >
                <span>{tab.label}</span>
                <span className="ml-1 opacity-70">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* 成功率摘要 */}
          {stats && stats.totalExecutions > 0 && (
            <div className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-2">
              <span>成功率: <span className={stats.successRate >= 90 ? 'text-green-500' : stats.successRate >= 70 ? 'text-orange-500' : 'text-red-500'}>{stats.successRate.toFixed(1)}%</span></span>
              <span>|</span>
              <span>今日: {stats.executionsToday} 次执行</span>
            </div>
          )}
        </div>

        {/* 任务列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              <SyncOutlined spin className="text-xl" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              <ClockCircleOutlined className="text-3xl mb-2 opacity-50" />
              <p>暂无定时任务</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const rate = task.successCount + task.failureCount > 0
                ? (task.successCount / (task.successCount + task.failureCount)) * 100
                : null;
              const dotColor = task.status === 'disabled'
                ? 'bg-gray-400'
                : task.lastRunStatus === 'failure'
                  ? 'bg-red-500 animate-pulse'
                  : task.lastRunStatus === 'running'
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-green-500';
              return (
                <div
                  key={task.id}
                  onClick={() => { setSelectedTask(task); setDetailTab('overview'); }}
                  className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedTask?.id === task.id
                      ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30'
                      : 'hover:bg-[var(--color-bg-tertiary)]'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{taskTypeConfig[task.type].icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--color-text-primary)] truncate">
                          {task.name}
                        </span>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                      </div>
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                        {parseCronToText(task.cronExpression)}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-text-tertiary)]">
                        <span className="flex items-center gap-0.5">
                          <CheckCircleOutlined className="text-green-500 text-xs" />
                          {task.successCount}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <CloseCircleOutlined className="text-red-500 text-xs" />
                          {task.failureCount}
                        </span>
                        {rate !== null && (
                          <span className={
                            rate >= 90 ? 'text-green-500' : rate >= 70 ? 'text-orange-500' : 'text-red-500'
                          }>
                            {rate.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      {/* 悬停快速操作 */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                        <Tooltip title="执行">
                          <Button
                            type="text"
                            size="small"
                            icon={<CaretRightOutlined />}
                            onClick={(e) => { e.stopPropagation(); handleExecuteTask(task.id); }}
                          />
                        </Tooltip>
                        <Tooltip title={task.status === 'enabled' ? '禁用' : '启用'}>
                          <Button
                            type="text"
                            size="small"
                            icon={task.status === 'enabled' ? <PauseOutlined /> : <PlayCircleOutlined />}
                            onClick={(e) => { e.stopPropagation(); handleToggleTask(task.id); }}
                          />
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 overflow-y-auto">
        {selectedTask ? (
          <div className="p-6">
            {/* 头部 */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{taskTypeConfig[selectedTask.type].icon}</span>
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                    {selectedTask.name}
                  </h2>
                </div>
                <p className="text-[var(--color-text-secondary)] mt-1">
                  {selectedTask.description || taskTypeConfig[selectedTask.type].description}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="primary"
                  style={{ backgroundColor: '#22c55e' }}
                  icon={<PlayCircleOutlined />}
                  onClick={() => handleExecuteTask(selectedTask.id)}
                >
                  执行
                </Button>
                <Button
                  icon={selectedTask.status === 'enabled' ? <PauseOutlined /> : <PlayCircleOutlined />}
                  onClick={() => handleToggleTask(selectedTask.id)}
                  className={selectedTask.status === 'enabled' ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}
                >
                  {selectedTask.status === 'enabled' ? '禁用' : '启用'}
                </Button>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => setEditingTask(selectedTask)}
                >
                  编辑
                </Button>
                <Popconfirm
                  title="确认删除"
                  description="确定要删除此任务吗？此操作不可撤销。"
                  onConfirm={() => handleDeleteTask(selectedTask.id)}
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              </div>
            </div>

            {/* 详情标签栏 */}
            <div className="flex border-b border-[var(--color-border)] mb-6">
              {[
                { key: 'overview' as const, label: '概览', icon: <AppstoreOutlined /> },
                { key: 'executions' as const, label: '执行记录', icon: <HistoryOutlined /> },
                { key: 'config' as const, label: '配置', icon: <SettingOutlined /> },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setDetailTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                    detailTab === tab.key
                      ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
                      : 'text-[var(--color-text-tertiary)] border-transparent hover:text-[var(--color-text-secondary)]'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 概览标签 */}
            {detailTab === 'overview' && (
              <>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <span className="text-xs text-[var(--color-text-tertiary)]">执行频率</span>
                    <p className="text-lg font-semibold text-[var(--color-text-primary)] mt-1">
                      {parseCronToText(selectedTask.cronExpression)}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <span className="text-xs text-[var(--color-text-tertiary)]">上次执行</span>
                    <div className="flex items-center gap-1 mt-1">
                      {getStatusIcon(selectedTask.lastRunStatus)}
                      <span className="text-lg font-semibold text-[var(--color-text-primary)]">
                        {formatDate(selectedTask.lastRunAt)}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <span className="text-xs text-[var(--color-text-tertiary)]">下次执行</span>
                    <p className="text-lg font-semibold text-[var(--color-text-primary)] mt-1">
                      {formatDate(selectedTask.nextRunAt)}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <span className="text-xs text-[var(--color-text-tertiary)]">成功率</span>
                    <p className="text-lg font-semibold text-[var(--color-text-primary)] mt-1">
                      {selectedTask.successCount + selectedTask.failureCount > 0
                        ? `${((selectedTask.successCount / (selectedTask.successCount + selectedTask.failureCount)) * 100).toFixed(1)}%`
                        : '-'}
                    </p>
                  </div>
                </div>

                {/* 最近 5 条执行时间线 */}
                <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-[var(--color-text-primary)]">最近执行</h3>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => setDetailTab('executions')}
                    >
                      查看全部
                    </Button>
                  </div>
                  <div className="divide-y divide-[var(--color-border)]">
                    {executions
                      .filter((e) => e.taskId === selectedTask.id)
                      .slice(0, 5)
                      .map((execution) => (
                        <div key={execution.id} className="flex items-center gap-3 py-2">
                          {getStatusIcon(execution.status)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-[var(--color-text-primary)]">
                                {execution.result || execution.error || '执行中...'}
                              </span>
                              <span className="text-xs text-[var(--color-text-tertiary)]">
                                {formatDuration(execution.duration)}
                              </span>
                            </div>
                            <div className="text-xs text-[var(--color-text-tertiary)]">
                              {formatDate(execution.startedAt)}
                            </div>
                          </div>
                        </div>
                      ))}
                    {executions.filter((e) => e.taskId === selectedTask.id).length === 0 && (
                      <p className="text-xs text-[var(--color-text-tertiary)] py-2">暂无执行记录</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* 执行记录标签 */}
            {detailTab === 'executions' && (
              <div>
                {/* 执行状态过滤 */}
                <div className="flex gap-2 mb-4">
                  {[
                    { key: '' as const, label: '全部' },
                    { key: 'success' as const, label: '成功' },
                    { key: 'failure' as const, label: '失败' },
                    { key: 'running' as const, label: '运行中' },
                  ].map((ft) => (
                    <button
                      key={ft.key}
                      onClick={() => setExecStatusFilter(ft.key)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        execStatusFilter === ft.key
                          ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                          : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {ft.label}
                    </button>
                  ))}
                </div>

                <Table
                  dataSource={taskExecutions}
                  columns={execColumns}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
                  className="border border-[var(--color-border)] rounded-lg overflow-hidden"
                />
              </div>
            )}

            {/* 配置标签 */}
            {detailTab === 'config' && (
              <div className="space-y-4">
                <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
                  <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">任务配置</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[var(--color-text-tertiary)]">任务类型：</span>
                      <span className="text-[var(--color-text-primary)]">
                        {taskTypeConfig[selectedTask.type].label}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-tertiary)]">Cron 表达式：</span>
                      <span className="text-[var(--color-text-primary)] font-mono">
                        {selectedTask.cronExpression}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-tertiary)]">创建人：</span>
                      <span className="text-[var(--color-text-primary)]">{selectedTask.createdBy}</span>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-tertiary)]">创建时间：</span>
                      <span className="text-[var(--color-text-primary)]">
                        {formatDate(selectedTask.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* JSON 配置预览 */}
                <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
                  <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">任务参数 (JSON)</h3>
                  <pre className="text-xs font-mono bg-[var(--color-bg-tertiary)] p-3 rounded-lg overflow-auto max-h-64 text-[var(--color-text-primary)]">
                    {JSON.stringify(selectedTask.config || {}, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <ClockCircleOutlined className="text-5xl text-[var(--color-text-tertiary)] mb-4" />
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">选择一个任务</h3>
              <p className="text-[var(--color-text-secondary)]">从左侧列表中选择查看详情</p>
            </div>
          </div>
        )}
      </div>

      {/* 创建/编辑任务弹窗 */}
      {(showCreateModal || editingTask) && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTask(null);
          }}
          onSave={async (data) => {
            if (editingTask) {
              await scheduledTaskApi.updateTask(editingTask.id, data);
            } else {
              await scheduledTaskApi.createTask(data as Omit<ScheduledTask, 'id' | 'createdAt' | 'updatedAt' | 'successCount' | 'failureCount' | 'lastRunAt' | 'lastRunStatus' | 'nextRunAt'>);
            }
            setShowCreateModal(false);
            setEditingTask(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// 任务编辑弹窗
function TaskModal({
  task,
  onClose,
  onSave,
}: {
  task: ScheduledTask | null;
  onClose: () => void;
  onSave: (data: Partial<ScheduledTask>) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    name: task?.name || '',
    description: task?.description || '',
    type: task?.type || 'agent_test' as TaskType,
    cronExpression: task?.cronExpression || '0 0 * * *',
    status: task?.status || 'enabled' as TaskStatus,
    config: task?.config || {} as TaskConfig,
  });
  const [saving, setSaving] = useState(false);
  const [cronError, setCronError] = useState<string | undefined>();
  const [cronMode, setCronMode] = useState<'visual' | 'preset' | 'custom'>('visual');

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      message.warning('请输入任务名称');
      return;
    }
    if (cronError) {
      message.warning('请修正 Cron 表达式');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      message.success(task ? '任务已更新' : '任务已创建');
    } catch (error) {
      console.error('Failed to save task:', error);
      message.error(task ? '更新失败' : '创建失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={task ? '编辑任务' : '创建任务'}
      open={true}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={saving ? '保存中...' : '保存'}
      confirmLoading={saving}
      width={600}
      destroyOnClose
    >
      <Form layout="vertical" className="mt-4">
        <Form.Item label="任务名称" required>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="输入任务名称"
          />
        </Form.Item>

        <Form.Item label="任务描述">
          <Input.TextArea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            placeholder="输入任务描述"
          />
        </Form.Item>

        <Form.Item label="任务类型">
          <Select
            value={formData.type}
            onChange={(v) => setFormData({ ...formData, type: v })}
            style={{ width: '100%' }}
            options={Object.entries(taskTypeConfig).map(([type, config]) => ({
              label: `${config.icon} ${config.label} - ${config.description}`,
              value: type,
            }))}
          />
        </Form.Item>

        <Form.Item label="执行频率">
          <Tabs
            activeKey={cronMode}
            onChange={(key: string) => setCronMode(key as 'visual' | 'preset' | 'custom')}
            size="small"
            items={[
              {
                key: 'visual',
                label: '可视化',
                children: (
                  <div className="cron-visual-container">
                    <Cron
                      value={formData.cronExpression}
                      setValue={(value: string) => {
                        setFormData({ ...formData, cronExpression: value });
                      }}
                      locale={cronZhLocale}
                      humanizeLabels
                      allowedPeriods={['year', 'month', 'week', 'day', 'hour', 'minute']}
                      defaultPeriod="day"
                      onError={(error: { type: string; description: string } | undefined) => {
                        setCronError(error?.description);
                      }}
                      allowClear
                      clockFormat="24-hour-clock"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <FieldTimeOutlined className="text-[var(--color-text-tertiary)]" />
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        当前表达式：
                      </span>
                      <code className="text-sm font-mono bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded">
                        {formData.cronExpression}
                      </code>
                    </div>
                  </div>
                ),
              },
              {
                key: 'preset',
                label: '常用',
                children: (
                  <div className="space-y-2">
                    <Select
                      value={formData.cronExpression}
                      onChange={(v) => setFormData({ ...formData, cronExpression: v })}
                      style={{ width: '100%' }}
                      options={cronPresets.map((preset) => ({
                        label: (
                          <div className="flex items-center justify-between">
                            <span>{preset.label}</span>
                            <code className="text-xs text-[var(--color-text-tertiary)] font-mono">
                              {preset.value}
                            </code>
                          </div>
                        ),
                        value: preset.value,
                      }))}
                    />
                    <div className="flex items-center gap-2">
                      <FieldTimeOutlined className="text-[var(--color-text-tertiary)]" />
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        当前表达式：
                      </span>
                      <code className="text-sm font-mono bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded">
                        {formData.cronExpression}
                      </code>
                    </div>
                  </div>
                ),
              },
              {
                key: 'custom',
                label: '自定义',
                children: (
                  <div className="space-y-2">
                    <Input
                      value={formData.cronExpression}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, cronExpression: val });
                        // 简单验证 cron 表达式格式
                        const parts = val.trim().split(/\s+/);
                        if (parts.length !== 5) {
                          setCronError('Cron 表达式必须包含 5 个字段');
                        } else {
                          setCronError(undefined);
                        }
                      }}
                      placeholder="分 时 日 月 周 (如: 0 9 * * 1)"
                      className="font-mono"
                      status={cronError ? 'error' : undefined}
                    />
                    {cronError && (
                      <p className="text-xs text-red-500">{cronError}</p>
                    )}
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                      格式: 分钟(0-59) 小时(0-23) 日(1-31) 月(1-12) 周几(0-6)
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {[
                        { label: '每小时', value: '0 * * * *' },
                        { label: '每30分钟', value: '*/30 * * * *' },
                        { label: '工作日9点', value: '0 9 * * 1-5' },
                        { label: '每天0和12点', value: '0 0,12 * * *' },
                        { label: '每月1号和15号', value: '0 0 1,15 * *' },
                      ].map((preset) => (
                        <Button
                          key={preset.value}
                          size="small"
                          type={formData.cronExpression === preset.value ? 'primary' : 'default'}
                          onClick={() => {
                            setFormData({ ...formData, cronExpression: preset.value });
                            setCronError(undefined);
                          }}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </Form.Item>

        <Form.Item>
          <Checkbox
            checked={formData.status === 'enabled'}
            onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'enabled' : 'disabled' })}
          >
            创建后立即启用
          </Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}
