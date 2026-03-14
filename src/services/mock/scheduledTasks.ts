/**
 * Scheduled Tasks Mock 数据和 API
 */

// 任务类型
export type TaskType = 'agent_test' | 'report' | 'cleanup' | 'backup' | 'sync';

// 任务状态
export type TaskStatus = 'enabled' | 'disabled';

// 执行状态
export type ExecutionStatus = 'success' | 'failure' | 'running' | 'pending';

// Cron 表达式预设
export const cronPresets = [
  { label: '每小时', value: '0 * * * *' },
  { label: '每天 0:00', value: '0 0 * * *' },
  { label: '每天 6:00', value: '0 6 * * *' },
  { label: '每天 12:00', value: '0 12 * * *' },
  { label: '每天 18:00', value: '0 18 * * *' },
  { label: '每周一 9:00', value: '0 9 * * 1' },
  { label: '每周日 0:00', value: '0 0 * * 0' },
  { label: '每月 1 日 0:00', value: '0 0 1 * *' },
];

// 定时任务
export interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  type: TaskType;
  cronExpression: string;
  status: TaskStatus;
  config: TaskConfig;
  lastRunAt?: Date;
  lastRunStatus?: ExecutionStatus;
  nextRunAt?: Date;
  successCount: number;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// 任务配置
export interface TaskConfig {
  // Agent 测试任务
  agentIds?: string[];
  testSetId?: string;

  // 报告任务
  reportType?: 'usage' | 'performance' | 'error';
  recipients?: string[];

  // 清理任务
  retentionDays?: number;
  cleanupTarget?: 'logs' | 'conversations' | 'temp_files';

  // 备份任务
  backupTarget?: 'database' | 'configs' | 'all';
  backupPath?: string;

  // 同步任务
  syncTarget?: 'providers' | 'models' | 'users';
}

// 执行记录
export interface TaskExecution {
  id: string;
  taskId: string;
  taskName: string;
  startedAt: Date;
  completedAt?: Date;
  status: ExecutionStatus;
  duration?: number; // 毫秒
  result?: string;
  error?: string;
  details?: Record<string, unknown>;
}

// 任务类型配置
export const taskTypeConfig: Record<TaskType, { label: string; description: string; icon: string }> = {
  agent_test: {
    label: 'Agent 测试',
    description: '定期运行 Agent 测试集',
    icon: '🧪',
  },
  report: {
    label: '报告生成',
    description: '定期生成统计报告',
    icon: '📊',
  },
  cleanup: {
    label: '数据清理',
    description: '定期清理过期数据',
    icon: '🗑️',
  },
  backup: {
    label: '数据备份',
    description: '定期备份系统数据',
    icon: '💾',
  },
  sync: {
    label: '数据同步',
    description: '定期同步外部数据',
    icon: '🔄',
  },
};

// Mock 任务数据
const generateMockTasks = (): ScheduledTask[] => {
  const tasks: ScheduledTask[] = [
    {
      id: 'task-1',
      name: '每日 Agent 健康检查',
      description: '运行所有 Agent 的基础能力测试集',
      type: 'agent_test',
      cronExpression: '0 6 * * *',
      status: 'enabled',
      config: {
        agentIds: ['agent-1', 'agent-2', 'agent-3'],
        testSetId: 'testset-1',
      },
      lastRunAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      lastRunStatus: 'success',
      nextRunAt: new Date(Date.now() + 18 * 60 * 60 * 1000),
      successCount: 45,
      failureCount: 2,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      createdBy: '张三',
    },
    {
      id: 'task-2',
      name: '每周使用报告',
      description: '生成并发送每周使用统计报告',
      type: 'report',
      cronExpression: '0 9 * * 1',
      status: 'enabled',
      config: {
        reportType: 'usage',
        recipients: ['admin@example.com', 'manager@example.com'],
      },
      lastRunAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      lastRunStatus: 'success',
      nextRunAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      successCount: 12,
      failureCount: 0,
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      createdBy: '李四',
    },
    {
      id: 'task-3',
      name: '日志清理',
      description: '清理 30 天前的系统日志',
      type: 'cleanup',
      cronExpression: '0 0 * * *',
      status: 'enabled',
      config: {
        retentionDays: 30,
        cleanupTarget: 'logs',
      },
      lastRunAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      lastRunStatus: 'success',
      nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      successCount: 30,
      failureCount: 0,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      createdBy: '张三',
    },
    {
      id: 'task-4',
      name: '数据库备份',
      description: '每日凌晨备份数据库',
      type: 'backup',
      cronExpression: '0 2 * * *',
      status: 'enabled',
      config: {
        backupTarget: 'database',
        backupPath: '/backups/db',
      },
      lastRunAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
      lastRunStatus: 'success',
      nextRunAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      successCount: 60,
      failureCount: 1,
      createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      createdBy: '王五',
    },
    {
      id: 'task-5',
      name: 'Provider 模型同步',
      description: '同步 Provider 可用模型列表',
      type: 'sync',
      cronExpression: '0 */6 * * *',
      status: 'disabled',
      config: {
        syncTarget: 'models',
      },
      lastRunAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      lastRunStatus: 'failure',
      successCount: 20,
      failureCount: 5,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      createdBy: '李四',
    },
    {
      id: 'task-6',
      name: '性能报告',
      description: '生成每日性能分析报告',
      type: 'report',
      cronExpression: '0 8 * * *',
      status: 'enabled',
      config: {
        reportType: 'performance',
        recipients: ['tech@example.com'],
      },
      lastRunAt: new Date(Date.now() - 16 * 60 * 60 * 1000),
      lastRunStatus: 'success',
      nextRunAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      successCount: 28,
      failureCount: 2,
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      createdBy: '张三',
    },
  ];

  return tasks;
};

// Mock 执行记录
const generateMockExecutions = (): TaskExecution[] => {
  const executions: TaskExecution[] = [];
  const tasks = generateMockTasks();
  const statuses: ExecutionStatus[] = ['success', 'success', 'success', 'success', 'failure'];

  tasks.forEach((task) => {
    // 为每个任务生成最近 10 条执行记录
    for (let i = 0; i < 10; i++) {
      const startedAt = new Date(Date.now() - i * 24 * 60 * 60 * 1000 - Math.random() * 60 * 60 * 1000);
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const duration = Math.floor(Math.random() * 300000) + 1000; // 1-301 秒

      executions.push({
        id: `exec-${task.id}-${i}`,
        taskId: task.id,
        taskName: task.name,
        startedAt,
        completedAt: new Date(startedAt.getTime() + duration),
        status: i === 0 && task.lastRunStatus === 'running' ? 'running' : status,
        duration: status !== 'running' ? duration : undefined,
        result: status === 'success' ? '执行成功' : undefined,
        error: status === 'failure' ? '连接超时' : undefined,
        details: {
          itemsProcessed: Math.floor(Math.random() * 100),
          duration: duration,
        },
      });
    }
  });

  return executions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
};

let mockTasks: ScheduledTask[] = [];
let mockExecutions: TaskExecution[] = [];

// 初始化
const initTasks = () => {
  if (mockTasks.length === 0) {
    mockTasks = generateMockTasks();
    mockExecutions = generateMockExecutions();
  }
};

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 解析 Cron 表达式为可读文本
export function parseCronToText(cron: string): string {
  const preset = cronPresets.find((p) => p.value === cron);
  if (preset) return preset.label;

  const parts = cron.split(' ');
  if (parts.length !== 5) return '自定义';

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (minute.startsWith('*/')) {
    const interval = minute.slice(2);
    return `每 ${interval} 小时`;
  }

  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    if (minute === '0') {
      return `每天 ${hour}:00`;
    }
    return `每天 ${hour}:${minute}`;
  }

  return '自定义';
}

// 计算下次运行时间（简化版，实际应使用 cron 库）
export function calculateNextRun(cron: string): Date {
  const now = new Date();
  const parts = cron.split(' ');
  if (parts.length !== 5) return now;

  const [minute, hour] = parts;
  const next = new Date(now);

  if (minute === '0' && hour !== '*') {
    next.setHours(parseInt(hour), 0, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
  } else if (minute.startsWith('*/')) {
    const interval = parseInt(minute.slice(2));
    const nextHour = Math.ceil((now.getHours() + 1) / interval) * interval;
    next.setHours(nextHour, 0, 0, 0);
  } else {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

// Scheduled Tasks API Mock
export const scheduledTaskApi = {
  // 获取任务列表
  async getTasks(filter?: {
    type?: TaskType;
    status?: TaskStatus;
    search?: string;
  }): Promise<ScheduledTask[]> {
    await delay(300);
    initTasks();

    let tasks = [...mockTasks];

    if (filter?.type) {
      tasks = tasks.filter((t) => t.type === filter.type);
    }
    if (filter?.status) {
      tasks = tasks.filter((t) => t.status === filter.status);
    }
    if (filter?.search) {
      const query = filter.search.toLowerCase();
      tasks = tasks.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      );
    }

    return tasks;
  },

  // 获取单个任务
  async getTask(id: string): Promise<ScheduledTask | undefined> {
    await delay(200);
    initTasks();
    return mockTasks.find((t) => t.id === id);
  },

  // 创建任务
  async createTask(data: Omit<ScheduledTask, 'id' | 'createdAt' | 'updatedAt' | 'successCount' | 'failureCount' | 'lastRunAt' | 'lastRunStatus' | 'nextRunAt'>): Promise<ScheduledTask> {
    await delay(300);
    initTasks();

    const task: ScheduledTask = {
      ...data,
      id: `task-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      successCount: 0,
      failureCount: 0,
      nextRunAt: data.status === 'enabled' ? calculateNextRun(data.cronExpression) : undefined,
    };

    mockTasks.push(task);
    return task;
  },

  // 更新任务
  async updateTask(id: string, data: Partial<ScheduledTask>): Promise<ScheduledTask | undefined> {
    await delay(300);
    initTasks();

    const index = mockTasks.findIndex((t) => t.id === id);
    if (index === -1) return undefined;

    mockTasks[index] = {
      ...mockTasks[index],
      ...data,
      updatedAt: new Date(),
    };

    if (data.cronExpression || data.status) {
      mockTasks[index].nextRunAt = mockTasks[index].status === 'enabled'
        ? calculateNextRun(mockTasks[index].cronExpression)
        : undefined;
    }

    return mockTasks[index];
  },

  // 删除任务
  async deleteTask(id: string): Promise<boolean> {
    await delay(200);
    initTasks();

    const index = mockTasks.findIndex((t) => t.id === id);
    if (index === -1) return false;

    mockTasks.splice(index, 1);
    return true;
  },

  // 切换任务状态
  async toggleTask(id: string): Promise<ScheduledTask | undefined> {
    await delay(200);
    initTasks();

    const task = mockTasks.find((t) => t.id === id);
    if (!task) return undefined;

    task.status = task.status === 'enabled' ? 'disabled' : 'enabled';
    task.updatedAt = new Date();
    task.nextRunAt = task.status === 'enabled' ? calculateNextRun(task.cronExpression) : undefined;

    return task;
  },

  // 立即执行任务
  async executeTask(id: string): Promise<TaskExecution> {
    await delay(500);
    initTasks();

    const task = mockTasks.find((t) => t.id === id);
    if (!task) throw new Error('Task not found');

    const execution: TaskExecution = {
      id: `exec-${id}-${Date.now()}`,
      taskId: id,
      taskName: task.name,
      startedAt: new Date(),
      status: 'success',
      completedAt: new Date(Date.now() + 5000),
      duration: 5000,
      result: '执行成功',
      details: {
        itemsProcessed: Math.floor(Math.random() * 50) + 10,
      },
    };

    mockExecutions.unshift(execution);

    // 更新任务统计
    task.lastRunAt = execution.startedAt;
    task.lastRunStatus = 'success';
    task.successCount++;
    task.updatedAt = new Date();

    return execution;
  },

  // 获取执行记录
  async getExecutions(filter?: {
    taskId?: string;
    status?: ExecutionStatus;
    limit?: number;
  }): Promise<TaskExecution[]> {
    await delay(300);
    initTasks();

    let executions = [...mockExecutions];

    if (filter?.taskId) {
      executions = executions.filter((e) => e.taskId === filter.taskId);
    }
    if (filter?.status) {
      executions = executions.filter((e) => e.status === filter.status);
    }

    if (filter?.limit) {
      executions = executions.slice(0, filter.limit);
    }

    return executions;
  },

  // 获取单个执行记录
  async getExecution(id: string): Promise<TaskExecution | undefined> {
    await delay(200);
    initTasks();
    return mockExecutions.find((e) => e.id === id);
  },

  // 获取任务统计
  async getStats(): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    totalExecutions: number;
    successRate: number;
    executionsToday: number;
  }> {
    await delay(200);
    initTasks();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayExecutions = mockExecutions.filter((e) => e.startedAt >= today);
    const successCount = mockExecutions.filter((e) => e.status === 'success').length;

    return {
      total: mockTasks.length,
      enabled: mockTasks.filter((t) => t.status === 'enabled').length,
      disabled: mockTasks.filter((t) => t.status === 'disabled').length,
      totalExecutions: mockExecutions.length,
      successRate: mockExecutions.length > 0 ? (successCount / mockExecutions.length) * 100 : 0,
      executionsToday: todayExecutions.length,
    };
  },

  // 获取任务类型列表
  async getTaskTypes(): Promise<{ type: TaskType; label: string; description: string }[]> {
    await delay(100);
    return Object.entries(taskTypeConfig).map(([type, config]) => ({
      type: type as TaskType,
      label: config.label,
      description: config.description,
    }));
  },
};
