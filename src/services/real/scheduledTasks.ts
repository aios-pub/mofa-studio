/**
 * Scheduled tasks real API
 * Backend endpoints: /api/task/...
 */

import { apiClient } from "../api/apiClient";
import { parseDate } from "./fieldMapper";
import type {
  ScheduledTask,
  TaskExecution,
  TaskType,
  TaskStatus,
  ExecutionStatus,
  TaskConfig,
  TaskTypeDescriptor,
} from "../mock/scheduledTasks";

// ==================== Raw backend types ====================

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

// ==================== Field mapping ====================

/** Backend icon identifier -> frontend emoji */
const ICON_MAP: Record<string, string> = {
  loop: '🔁',
  test_tube: '🧪',
  refresh: '🔄',
  schedule: '⏰',
  timer: '⏱️',
  robot: '🤖',
  brain: '🧠',
  bolt: '⚡',
  gear: '⚙️',
  check: '✅',
  warning: '⚠️',
  chart: '📊',
};

function mapIcon(icon: string): string {
  // If already an emoji (non-ASCII or common emoji range), return directly
  if (icon && /[\u{1F000}-\u{1FFFF}]/u.test(icon)) return icon;
  return ICON_MAP[icon] || icon;
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
    cron_expression: raw.cron_expression,
    status: STATUS_MAP[raw.status] || "disabled",
    config: (raw.config as TaskConfig) || ({} as TaskConfig),
    last_run_at: parseDate(raw.last_run_at),
    last_run_status: raw.last_run_status
      ? (EXECUTION_STATUS_MAP[raw.last_run_status] ?? raw.last_run_status as ExecutionStatus)
      : undefined,
    next_run_at: parseDate(raw.next_run_at),
    success_count: raw.success_count ?? 0,
    failure_count: raw.failure_count ?? 0,
    created_at: parseDate(raw.create_time) ?? new Date(),
    updated_at: parseDate(raw.update_time) ?? new Date(),
    created_by: raw.created_by || "",
  };
}

function mapTaskToBackend(task: Partial<ScheduledTask>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (task.name !== undefined) result.name = task.name;
  if (task.description !== undefined) result.description = task.description;
  if (task.type !== undefined) result.task_type = task.type;
  if (task.cron_expression !== undefined) result.cron_expression = task.cron_expression;
  if (task.status !== undefined) result.status = STATUS_REVERSE_MAP[task.status];
  if (task.config !== undefined) result.config = task.config;
  if (task.created_by !== undefined) result.created_by = task.created_by;

  return result;
}

function mapExecutionFromBackend(raw: BackendExecution): TaskExecution {
  return {
    id: raw.id,
    task_id: raw.task_id,
    task_name: raw.task_name,
    started_at: parseDate(raw.started_at) ?? new Date(),
    completed_at: parseDate(raw.completed_at),
    status: EXECUTION_STATUS_MAP[raw.status] ?? (raw.status as ExecutionStatus),
    duration: raw.duration,
    result: raw.result,
    error: raw.error,
    details: raw.details,
  };
}

// ==================== API interfaces ====================

// Task type cache (page lifetime only; types depend on server registration)
let cachedTaskTypes: TaskTypeDescriptor[] | null = null;

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
      | "created_at"
      | "updated_at"
      | "success_count"
      | "failure_count"
      | "last_run_at"
      | "last_run_status"
      | "next_run_at"
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
    // Backend update requires mandatory fields (e.g. task_type); fetch existing data and merge first
    const existing = await apiClient.get<BackendTask>(`/api/task/${id}`);
    const merged = { ...mapTaskFromBackend(existing), ...data };
    const body = { id, ...mapTaskToBackend(merged) };
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
    // Refetch the updated task
    const updated = await apiClient.get<BackendTask>(`/api/task/${id}`);
    return mapTaskFromBackend(updated);
  },

  async executeTask(id: string): Promise<TaskExecution> {
    const raw = await apiClient.post<BackendExecution>(`/api/task/execute/${id}`);
    return mapExecutionFromBackend(raw);
  },

  async getExecutions(filter?: {
    task_id?: string;
    status?: ExecutionStatus;
    limit?: number;
  }): Promise<TaskExecution[]> {
    const params: Record<string, unknown> = {};
    if (filter?.limit) params.limit = filter.limit;

    const rawList = await apiClient.get<BackendExecution[]>("/api/task/executions", { params });
    let executions = rawList.map(mapExecutionFromBackend);

    if (filter?.task_id) {
      executions = executions.filter((e) => e.task_id === filter.task_id);
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

    const todayExecutions = executions.filter((e) => new Date(e.started_at) >= today);
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

  async getTaskTypes(): Promise<TaskTypeDescriptor[]> {
    if (cachedTaskTypes) return cachedTaskTypes;
    const rawList = await apiClient.get<Record<string, unknown>[]>("/api/task/types");
    const mapped: TaskTypeDescriptor[] = rawList.map((raw) => ({
      task_type: (raw.task_type ?? raw.taskType) as string,
      label: (raw.label ?? "") as string,
      description: (raw.description ?? "") as string,
      icon: mapIcon((raw.icon ?? "") as string),
      config_schema: (raw.config_schema ?? raw.configSchema) as Record<string, unknown> | undefined,
    }));
    cachedTaskTypes = mapped;
    return mapped;
  },

  async getExecution(id: string): Promise<TaskExecution | undefined> {
    const raw = await apiClient.get<BackendExecution>(`/api/task/execution/${id}`);
    if (!raw) return undefined;
    return mapExecutionFromBackend(raw);
  },
};

export { scheduledTaskRealApi };
