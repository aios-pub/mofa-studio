/**
 * 定时任务管理页面
 */

import { useState, useEffect, useCallback } from 'react';
import { Input, Button, Select, message, Modal, Form, Checkbox } from 'antd';
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
  CaretDownOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
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
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('');
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [showExecutions, setShowExecutions] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [taskList, executionList, statsData] = await Promise.all([
        scheduledTaskApi.getTasks({
          type: filterType || undefined,
          status: filterStatus || undefined,
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
  }, [filterType, filterStatus, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

          {/* 筛选 */}
          <div className="flex gap-2">
            <Select
              value={filterType || undefined}
              onChange={(v) => setFilterType(v || '')}
              placeholder="全部类型"
              allowClear
              style={{ flex: 1 }}
              size="small"
              options={Object.entries(taskTypeConfig).map(([type, config]) => ({
                label: `${config.icon} ${config.label}`,
                value: type,
              }))}
            />
            <Select
              value={filterStatus || undefined}
              onChange={(v) => setFilterStatus(v || '')}
              placeholder="全部状态"
              allowClear
              style={{ flex: 1 }}
              size="small"
              options={[
                { label: '已启用', value: 'enabled' },
                { label: '已禁用', value: 'disabled' },
              ]}
            />
          </div>

          {/* 统计 */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg text-center">
                <div className="font-semibold text-[var(--color-text-primary)]">{stats.total}</div>
                <div className="text-[var(--color-text-tertiary)]">总任务</div>
              </div>
              <div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg text-center">
                <div className="font-semibold text-green-500">{stats.enabled}</div>
                <div className="text-[var(--color-text-tertiary)]">已启用</div>
              </div>
              <div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg text-center">
                <div className="font-semibold text-[var(--color-text-primary)]">{stats.executionsToday}</div>
                <div className="text-[var(--color-text-tertiary)]">今日执行</div>
              </div>
            </div>
          )}
        </div>

        {/* 任务列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              <SyncOutlined spin className="text-xl" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              <ClockCircleOutlined className="text-3xl mb-2 opacity-50" />
              <p>暂无定时任务</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
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
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          task.status === 'enabled' ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
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
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 overflow-y-auto">
        {selectedTask ? (
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
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
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteTask(selectedTask.id)}
                >
                  删除
                </Button>
              </div>
            </div>

            {/* 任务信息 */}
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

            {/* 任务配置 */}
            <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4 mb-6">
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

            {/* 执行记录 */}
            <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
              <div className="p-3 border-b border-[var(--color-border)] flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--color-text-primary)]">执行记录</h3>
                <Button
                  type="link"
                  size="small"
                  icon={showExecutions ? <CaretDownOutlined /> : <CaretRightOutlined />}
                  onClick={() => setShowExecutions(!showExecutions)}
                >
                  {showExecutions ? '收起' : '展开'}
                </Button>
              </div>
              {showExecutions && (
                <div className="divide-y divide-[var(--color-border)]">
                  {executions
                    .filter((e) => e.taskId === selectedTask.id)
                    .slice(0, 10)
                    .map((execution) => (
                      <div key={execution.id} className="p-3 flex items-center gap-3">
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
                </div>
              )}
            </div>
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
  const [customCron, setCustomCron] = useState(!cronPresets.some((p) => p.value === (task?.cronExpression || '0 0 * * *')));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      message.success(task ? '任务已更新' : '任务已创建');
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
      width={500}
    >
      <Form layout="vertical">
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
            options={Object.entries(taskTypeConfig).map(([type, config]) => ({
              label: `${config.icon} ${config.label} - ${config.description}`,
              value: type,
            }))}
          />
        </Form.Item>

        <Form.Item label="执行频率">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                type={!customCron ? 'primary' : 'default'}
                onClick={() => setCustomCron(false)}
              >
                预设
              </Button>
              <Button
                type={customCron ? 'primary' : 'default'}
                onClick={() => setCustomCron(true)}
              >
                自定义
              </Button>
            </div>
            {!customCron ? (
              <Select
                value={formData.cronExpression}
                onChange={(v) => setFormData({ ...formData, cronExpression: v })}
                style={{ width: '100%' }}
                options={cronPresets.map((preset) => ({
                  label: preset.label,
                  value: preset.value,
                }))}
              />
            ) : (
              <div className="space-y-1">
                <Input
                  value={formData.cronExpression}
                  onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                  placeholder="分 时 日 月 周 (如: 0 9 * * 1)"
                  className="font-mono"
                />
                <p className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1">
                  <ExclamationCircleOutlined />
                  格式: 分钟(0-59) 小时(0-23) 日(1-31) 月(1-12) 周几(0-6)
                </p>
              </div>
            )}
          </div>
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
