/**
 * Scheduled tasks mock data and API
 */

// Task types (dynamic, determined by handlers registered on the backend)
export type TaskType = string;

// Task status
export type TaskStatus = "enabled" | "disabled";

// Execution status
export type ExecutionStatus = "success" | "failure" | "running" | "pending";

// Cron expression presets
export const cronPresets = [
  { label: "每小时", value: "0 * * * *" },
  { label: "每天 0:00", value: "0 0 * * *" },
  { label: "每天 6:00", value: "0 6 * * *" },
  { label: "每天 12:00", value: "0 12 * * *" },
  { label: "每天 18:00", value: "0 18 * * *" },
  { label: "每周一 9:00", value: "0 9 * * 1" },
  { label: "每周日 0:00", value: "0 0 * * 0" },
  { label: "每月 1 日 0:00", value: "0 0 1 * *" },
];

// Scheduled tasks
export interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  type: TaskType;
  cron_expression: string;
  status: TaskStatus;
  config: TaskConfig;
  last_run_at?: Date;
  last_run_status?: ExecutionStatus;
  next_run_at?: Date;
  success_count: number;
  failure_count: number;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

// Task configuration
export interface TaskConfig {
  // Agent loop scheduled task (scheduling unit = agent)
  agent_id?: string;
  prompt?: string;
  max_iterations?: number;
  timeout_seconds?: number;

  // Agent test task
  agent_ids?: string[];
  test_set_id?: string;

  // Common extension fields
  [key: string]: unknown;
}

// Task type descriptor - provided when the backend registers a handler
export interface TaskTypeDescriptor {
  task_type: string;
  label: string;
  description: string;
  icon: string;
  config_schema?: Record<string, unknown>;
}

// Execution records
export interface TaskExecution {
  id: string;
  task_id: string;
  task_name: string;
  started_at: Date;
  completed_at?: Date;
  status: ExecutionStatus;
  duration?: number; // milliseconds
  result?: string;
  error?: string;
  details?: Record<string, unknown>;
}

// Task type configuration
export const taskTypeConfig: Record<
  TaskType,
  { label: string; description: string; icon: string }
> = {
  agent_loop: {
    label: "Agent 调度",
    description: "定时调度 Agent 自主执行任务",
    icon: "🔁",
  },
  agent_test: {
    label: "Agent 测试",
    description: "定期运行 Agent 测试集",
    icon: "🧪",
  },
};

// Mock task data
const generateMockTasks = (): ScheduledTask[] => {
  const tasks: ScheduledTask[] = [
    {
      id: "task-1",
      name: "每日 Agent 健康检查",
      description: "运行所有 Agent 的基础能力测试集",
      type: "agent_test",
      cron_expression: "0 6 * * *",
      status: "enabled",
      config: {
        agentIds: ["agent-1", "agent-2", "agent-3"],
        testSetId: "testset-1",
      },
      last_run_at: new Date(Date.now() - 6 * 60 * 60 * 1000),
      last_run_status: "success",
      next_run_at: new Date(Date.now() + 18 * 60 * 60 * 1000),
      success_count: 45,
      failure_count: 2,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      created_by: "张三",
    },
    {
      id: "task-2",
      name: "每周使用报告",
      description: "生成并发送每周使用统计报告",
      type: "report",
      cron_expression: "0 9 * * 1",
      status: "enabled",
      config: {
        reportType: "usage",
        recipients: ["admin@aios.pub", "manager@aios.pub"],
      },
      last_run_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      last_run_status: "success",
      next_run_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      success_count: 12,
      failure_count: 0,
      created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      created_by: "李四",
    },
    {
      id: "task-3",
      name: "日志清理",
      description: "清理 30 天前的系统日志",
      type: "cleanup",
      cron_expression: "0 0 * * *",
      status: "enabled",
      config: {
        retentionDays: 30,
        cleanupTarget: "logs",
      },
      last_run_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
      last_run_status: "success",
      next_run_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      success_count: 30,
      failure_count: 0,
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      created_by: "张三",
    },
    {
      id: "task-4",
      name: "数据库备份",
      description: "每日凌晨备份数据库",
      type: "backup",
      cron_expression: "0 2 * * *",
      status: "enabled",
      config: {
        backupTarget: "database",
        backupPath: "/backups/db",
      },
      last_run_at: new Date(Date.now() - 22 * 60 * 60 * 1000),
      last_run_status: "success",
      next_run_at: new Date(Date.now() + 2 * 60 * 60 * 1000),
      success_count: 60,
      failure_count: 1,
      created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      created_by: "王五",
    },
    {
      id: "task-5",
      name: "Provider 模型同步",
      description: "同步 Provider 可用模型列表",
      type: "sync",
      cron_expression: "0 */6 * * *",
      status: "disabled",
      config: {
        syncTarget: "models",
      },
      last_run_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      last_run_status: "failure",
      success_count: 20,
      failure_count: 5,
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      created_by: "李四",
    },
    {
      id: "task-6",
      name: "性能报告",
      description: "生成每日性能分析报告",
      type: "report",
      cron_expression: "0 8 * * *",
      status: "enabled",
      config: {
        reportType: "performance",
        recipients: ["tech@example.com"],
      },
      last_run_at: new Date(Date.now() - 16 * 60 * 60 * 1000),
      last_run_status: "success",
      next_run_at: new Date(Date.now() + 8 * 60 * 60 * 1000),
      success_count: 28,
      failure_count: 2,
      created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      created_by: "张三",
    },
  ];

  return tasks;
};

// Mock execution records
const generateMockExecutions = (): TaskExecution[] => {
  const executions: TaskExecution[] = [];
  const tasks = generateMockTasks();
  const statuses: ExecutionStatus[] = [
    "success",
    "success",
    "success",
    "success",
    "failure",
  ];

  tasks.forEach((task) => {
    // Generate the last 10 execution records for each task
    for (let i = 0; i < 10; i++) {
      const started_at = new Date(
        Date.now() - i * 24 * 60 * 60 * 1000 - Math.random() * 60 * 60 * 1000,
      );
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const duration = Math.floor(Math.random() * 300000) + 1000; // 1-301 seconds

      executions.push({
        id: `exec-${task.id}-${i}`,
        task_id: task.id,
        task_name: task.name,
        started_at,
        completed_at: new Date(started_at.getTime() + duration),
        status:
          i === 0 && task.last_run_status === "running" ? "running" : status,
        duration: status !== "running" ? duration : undefined,
        result: status === "success" ? "执行成功" : undefined,
        error: status === "failure" ? "连接超时" : undefined,
        details: {
          itemsProcessed: Math.floor(Math.random() * 100),
          duration: duration,
        },
      });
    }
  });

  return executions.sort(
    (a, b) => b.started_at.getTime() - a.started_at.getTime(),
  );
};

let mockTasks: ScheduledTask[] = [];
let mockExecutions: TaskExecution[] = [];

// Initialization
const initTasks = () => {
  if (mockTasks.length === 0) {
    mockTasks = generateMockTasks();
    mockExecutions = generateMockExecutions();
  }
};

// Simulated latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Parse a cron expression into readable text
export function parseCronToText(cron: string): string {
  const preset = cronPresets.find((p) => p.value === cron);
  if (preset) return preset.label;

  const parts = cron.split(" ");
  if (parts.length !== 5) return "自定义";

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (minute.startsWith("*/")) {
    const interval = minute.slice(2);
    return `每 ${interval} 小时`;
  }

  if (dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    if (minute === "0") {
      return `每天 ${hour}:00`;
    }
    return `每天 ${hour}:${minute}`;
  }

  return "自定义";
}

// Compute the next run time (simplified; should use a cron library)
export function calculateNextRun(cron: string): Date {
  const now = new Date();
  const parts = cron.split(" ");
  if (parts.length !== 5) return now;

  const [minute, hour] = parts;
  const next = new Date(now);

  if (minute === "0" && hour !== "*") {
    next.setHours(parseInt(hour), 0, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
  } else if (minute.startsWith("*/")) {
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
  // Get task list
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
          t.description?.toLowerCase().includes(query),
      );
    }

    return tasks;
  },

  // Get a single task
  async getTask(id: string): Promise<ScheduledTask | undefined> {
    await delay(200);
    initTasks();
    return mockTasks.find((t) => t.id === id);
  },

  // Create task
  async createTask(
    data: Omit<
      ScheduledTask,
      | "id"
      | "created_at"
      | "updated_at"
      | "success_count"
      | "failure_count"
      | "last_run_at"
      | "last_run_status"
      | "next_run_at"
    >,
  ): Promise<ScheduledTask> {
    await delay(300);
    initTasks();

    const task: ScheduledTask = {
      ...data,
      id: `task-${Date.now()}`,
      created_at: new Date(),
      updated_at: new Date(),
      success_count: 0,
      failure_count: 0,
      next_run_at:
        data.status === "enabled"
          ? calculateNextRun(data.cron_expression)
          : undefined,
    };

    mockTasks.push(task);
    return task;
  },

  // Update task
  async updateTask(
    id: string,
    data: Partial<ScheduledTask>,
  ): Promise<ScheduledTask | undefined> {
    await delay(300);
    initTasks();

    const index = mockTasks.findIndex((t) => t.id === id);
    if (index === -1) return undefined;

    mockTasks[index] = {
      ...mockTasks[index],
      ...data,
      updated_at: new Date(),
    };

    if (data.cron_expression || data.status) {
      mockTasks[index].next_run_at =
        mockTasks[index].status === "enabled"
          ? calculateNextRun(mockTasks[index].cron_expression)
          : undefined;
    }

    return mockTasks[index];
  },

  // Delete task
  async deleteTask(id: string): Promise<boolean> {
    await delay(200);
    initTasks();

    const index = mockTasks.findIndex((t) => t.id === id);
    if (index === -1) return false;

    mockTasks.splice(index, 1);
    return true;
  },

  // Toggle task status
  async toggleTask(id: string): Promise<ScheduledTask | undefined> {
    await delay(200);
    initTasks();

    const task = mockTasks.find((t) => t.id === id);
    if (!task) return undefined;

    task.status = task.status === "enabled" ? "disabled" : "enabled";
    task.updated_at = new Date();
    task.next_run_at =
      task.status === "enabled"
        ? calculateNextRun(task.cron_expression)
        : undefined;

    return task;
  },

  // Run the task immediately
  async executeTask(id: string): Promise<TaskExecution> {
    await delay(500);
    initTasks();

    const task = mockTasks.find((t) => t.id === id);
    if (!task) throw new Error("Task not found");

    const execution: TaskExecution = {
      id: `exec-${id}-${Date.now()}`,
      task_id: id,
      task_name: task.name,
      started_at: new Date(),
      status: "success",
      completed_at: new Date(Date.now() + 5000),
      duration: 5000,
      result: "执行成功",
      details: {
        itemsProcessed: Math.floor(Math.random() * 50) + 10,
      },
    };

    mockExecutions.unshift(execution);

    // Update task statistics
    task.last_run_at = execution.started_at;
    task.last_run_status = "success";
    task.success_count++;
    task.updated_at = new Date();

    return execution;
  },

  // Get execution records
  async getExecutions(filter?: {
    task_id?: string;
    status?: ExecutionStatus;
    limit?: number;
  }): Promise<TaskExecution[]> {
    await delay(300);
    initTasks();

    let executions = [...mockExecutions];

    if (filter?.task_id) {
      executions = executions.filter((e) => e.task_id === filter.task_id);
    }
    if (filter?.status) {
      executions = executions.filter((e) => e.status === filter.status);
    }

    if (filter?.limit) {
      executions = executions.slice(0, filter.limit);
    }

    return executions;
  },

  // Get a single execution record
  async getExecution(id: string): Promise<TaskExecution | undefined> {
    await delay(200);
    initTasks();
    return mockExecutions.find((e) => e.id === id);
  },

  // Get task statistics
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

    const todayExecutions = mockExecutions.filter((e) => e.started_at >= today);
    const success_count = mockExecutions.filter(
      (e) => e.status === "success",
    ).length;

    return {
      total: mockTasks.length,
      enabled: mockTasks.filter((t) => t.status === "enabled").length,
      disabled: mockTasks.filter((t) => t.status === "disabled").length,
      totalExecutions: mockExecutions.length,
      successRate:
        mockExecutions.length > 0
          ? (success_count / mockExecutions.length) * 100
          : 0,
      executionsToday: todayExecutions.length,
    };
  },

  // Get task type list
  async getTaskTypes(): Promise<TaskTypeDescriptor[]> {
    await delay(100);
    return Object.entries(taskTypeConfig).map(([type, config]) => ({
      taskType: type,
      label: config.label,
      description: config.description,
      icon: config.icon,
    }));
  },
};
