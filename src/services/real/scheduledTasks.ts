/**
 * ScheduledTasks 真实 API
 * 后端端点: /api/task/...
 *
 * 后端字段映射 (snake_case → camelCase):
 *   task_type      → type
 *   cron_expression → cronExpression
 *   status(active/paused) → status(enabled/disabled)
 *   success_count  → successCount
 *   failure_count  → failureCount
 *   last_run_at    → lastRunAt
 *   last_run_status → lastRunStatus
 *   next_run_at    → nextRunAt
 *   created_by     → createdBy
 *   create_time    → createdAt
 *   update_time    → updatedAt
 *   started_at     → startedAt
 *   completed_at   → completedAt
 *   task_id        → taskId
 *   task_name      → taskName
 */

import { apiClient } from "../api/apiClient";
import type {
  ScheduledTask,
  TaskExecution,
  TaskType,
  TaskStatus,
  ExecutionStatus,
  TaskConfig,
} from "../mock/scheduledTasks";

// ==================== 后端原始类型 ====================

interface BackendTask {
  id: string;
  name: string;
  description?: string;
  task_type: string;
  cron_expression: string;
  status: string; // "active" | "paused"
  config?: Record<string, unknown>;
  last_run_at?: string;
  last_run_status?: string;
  next_run_at?: string;
  success_count: number;
  failure_count: number;
  created_by?: string;
  tenant_id?: string;
  create_time: string;
  update_time: string;
}

interface BackendExecution {
  id: string;
  task_id: string;
  task_name: string;
  started_at: string;
  completed_at?: string;
  status: string; // "running" | "completed" | "failed"
  duration?: number;
  result?: string;
  error?: string;
  details?: Record<string, unknown>;
  create_time: string;
  update_time: string;
}

// ==================== 字段映射 ====================

/** 安全解析后端返回的日期字符串（支持 ISO 8601 / "YYYY-MM-DD HH:MM:SS" / 时间戳） */
function parseDate(value: string | number | null | undefined): Date | undefined {
  if (!value) return undefined;
  if (typeof value === 'number') return new Date(value);
  // chrono::NaiveDateTime 可能输出 "YYYY-MM-DDTHH:MM:SS" 或 "YYYY-MM-DD HH:MM:SS"
  const d = new Date(value.includes(' ') ? value.replace(' ', 'T') : value);
  return isNaN(d.getTime()) ? undefined : d;
}

const STATUS_MAP: Record<string, TaskStatus> = {
  active: "enabled",
  paused: "disabled",
  enabled: "enabled",
  disabled: "disabled",
};

const STATUS_REVERSE_MAP: Record<TaskStatus, string> = {
  enabled: "active",
  disabled: "paused",
};

const EXECUTION_STATUS_MAP: Record<string, ExecutionStatus> = {
  completed: "success",
  failed: "failure",
  success: "success",
  failure: "failure",
  running: "running",
  pending: "pending",
};

function mapTaskFromBackend(raw: BackendTask): ScheduledTask {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description || undefined,
    type: raw.task_type as TaskType,
    cronExpression: raw.cron_expression,
    status: STATUS_MAP[raw.status] || "disabled",
    config: (raw.config as TaskConfig) || ({} as TaskConfig),
    lastRunAt: parseDate(raw.last_run_at),
    lastRunStatus: raw.last_run_status
      ? (EXECUTION_STATUS_MAP[raw.last_run_status] ?? raw.last_run_status as ExecutionStatus)
      : undefined,
    nextRunAt: parseDate(raw.next_run_at),
    successCount: raw.success_count ?? 0,
    failureCount: raw.failure_count ?? 0,
    createdAt: parseDate(raw.create_time) ?? new Date(),
    updatedAt: parseDate(raw.update_time) ?? new Date(),
    createdBy: raw.created_by || "",
  };
}

function mapTaskToBackend(task: Partial<ScheduledTask>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (task.name !== undefined) result.name = task.name;
  if (task.description !== undefined) result.description = task.description;
  if (task.type !== undefined) result.task_type = task.type;
  if (task.cronExpression !== undefined) result.cron_expression = task.cronExpression;
  if (task.status !== undefined) result.status = STATUS_REVERSE_MAP[task.status];
  if (task.config !== undefined) result.config = task.config;
  if (task.createdBy !== undefined) result.created_by = task.createdBy;

  return result;
}

function mapExecutionFromBackend(raw: BackendExecution): TaskExecution {
  return {
    id: raw.id,
    taskId: raw.task_id,
    taskName: raw.task_name,
    startedAt: parseDate(raw.started_at) ?? new Date(),
    completedAt: parseDate(raw.completed_at),
    status: EXECUTION_STATUS_MAP[raw.status] ?? (raw.status as ExecutionStatus),
    duration: raw.duration,
    result: raw.result,
    error: raw.error,
    details: raw.details,
  };
}

// ==================== API 接口 ====================

const scheduledTaskRealApi = {
  async getTasks(filter?: {
    type?: TaskType;
    status?: TaskStatus;
    search?: string;
  }): Promise<ScheduledTask[]> {
    const rawList = await apiClient.get<BackendTask[]>("/api/task/list");
    let tasks = rawList.map(mapTaskFromBackend);

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

  async getTask(id: string): Promise<ScheduledTask | undefined> {
    const raw = await apiClient.get<BackendTask>(`/api/task/${id}`);
    return mapTaskFromBackend(raw);
  },

  async createTask(
    data: Omit<
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
  ): Promise<ScheduledTask> {
    const body = mapTaskToBackend(data);
    const raw = await apiClient.post<BackendTask>("/api/task/create", body);
    return mapTaskFromBackend(raw);
  },

  async updateTask(
    id: string,
    data: Partial<ScheduledTask>,
  ): Promise<ScheduledTask | undefined> {
    const body = { id, ...mapTaskToBackend(data) };
    const raw = await apiClient.post<BackendTask>("/api/task/update", body);
    return mapTaskFromBackend(raw);
  },

  async deleteTask(id: string): Promise<boolean> {
    await apiClient.delete(`/api/task/delete/${id}`);
    return true;
  },

  async toggleTask(id: string): Promise<ScheduledTask | undefined> {
    const raw = await apiClient.get<BackendTask>(`/api/task/${id}`);
    const task = mapTaskFromBackend(raw);
    if (task.status === "enabled") {
      await apiClient.post(`/api/task/disable/${id}`);
    } else {
      await apiClient.post(`/api/task/enable/${id}`);
    }
    // 重新获取更新后的任务
    const updated = await apiClient.get<BackendTask>(`/api/task/${id}`);
    return mapTaskFromBackend(updated);
  },

  async executeTask(id: string): Promise<TaskExecution> {
    const raw = await apiClient.post<BackendExecution>(`/api/task/execute/${id}`);
    return mapExecutionFromBackend(raw);
  },

  async getExecutions(filter?: {
    taskId?: string;
    status?: ExecutionStatus;
    limit?: number;
  }): Promise<TaskExecution[]> {
    const params: Record<string, unknown> = {};
    if (filter?.limit) params.limit = filter.limit;

    const rawList = await apiClient.get<BackendExecution[]>("/api/task/executions", { params });
    let executions = rawList.map(mapExecutionFromBackend);

    if (filter?.taskId) {
      executions = executions.filter((e) => e.taskId === filter.taskId);
    }
    if (filter?.status) {
      executions = executions.filter((e) => e.status === filter.status);
    }

    return executions;
  },

  async getStats(): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    totalExecutions: number;
    successRate: number;
    executionsToday: number;
  }> {
    const [rawTaskList, rawExecList] = await Promise.all([
      apiClient.get<BackendTask[]>("/api/task/list"),
      apiClient.get<BackendExecution[]>("/api/task/executions"),
    ]);
    const tasks = rawTaskList.map(mapTaskFromBackend);
    const executions = rawExecList.map(mapExecutionFromBackend);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayExecutions = executions.filter((e) => new Date(e.startedAt) >= today);
    const successCount = executions.filter((e) => e.status === "success").length;

    return {
      total: tasks.length,
      enabled: tasks.filter((t) => t.status === "enabled").length,
      disabled: tasks.filter((t) => t.status === "disabled").length,
      totalExecutions: executions.length,
      successRate: executions.length > 0 ? (successCount / executions.length) * 100 : 0,
      executionsToday: todayExecutions.length,
    };
  },
};

export { scheduledTaskRealApi };
