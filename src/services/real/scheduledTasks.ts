/**
 * ScheduledTasks 真实 API
 * 后端端点: /api/task/...
 */

import { apiClient } from "../api/apiClient";

interface ScheduledTask {
  id: string;
  name: string;
  type: string;
  cron: string;
  enabled: boolean;
  status?: string; // 'enabled' | 'disabled'
  description?: string;
  lastRun?: string;
  nextRun?: string;
}

interface TaskExecution {
  id: string;
  taskId: string;
  status: string;
  startTime: string;
  endTime?: string;
  result?: unknown;
}

const baseApi = {
  getAll: (): Promise<ScheduledTask[]> =>
    apiClient.get<ScheduledTask[]>("/api/task/list"),

  getById: (id: string): Promise<ScheduledTask> =>
    apiClient.get<ScheduledTask>(`/api/task/${id}`),

  create: (data: Partial<ScheduledTask>): Promise<ScheduledTask> =>
    apiClient.post<ScheduledTask>("/api/task/create", data),

  update: (id: string, data: Partial<ScheduledTask>): Promise<ScheduledTask> =>
    apiClient.post<ScheduledTask>("/api/task/update", { id, ...data }),

  delete: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/task/delete/${id}`);
    return true;
  },
};

interface TaskFilter {
  type?: string;
  status?: string;
  search?: string;
}

const scheduledTaskRealApi = {
  ...baseApi,

  // 别名方法 - 支持客户端过滤
  getTasks: async (filter?: TaskFilter): Promise<ScheduledTask[]> => {
    let tasks = await apiClient.get<ScheduledTask[]>("/api/task/list");

    if (filter?.type) {
      tasks = tasks.filter((t: ScheduledTask) => t.type === filter.type);
    }
    if (filter?.status) {
      tasks = tasks.filter((t: ScheduledTask) => {
        // 支持 status 字段或从 enabled 推导
        const taskStatus = t.status || (t.enabled ? 'enabled' : 'disabled');
        return taskStatus === filter.status;
      });
    }
    if (filter?.search) {
      const query = filter.search.toLowerCase();
      tasks = tasks.filter(
        (t: ScheduledTask) =>
          t.name.toLowerCase().includes(query) ||
          (t as ScheduledTask & { description?: string }).description?.toLowerCase().includes(query)
      );
    }

    return tasks;
  },

  getTask: (id: string): Promise<ScheduledTask> =>
    apiClient.get<ScheduledTask>(`/api/task/${id}`),

  createTask: (data: Partial<ScheduledTask>): Promise<ScheduledTask> =>
    apiClient.post<ScheduledTask>("/api/task/create", data),

  updateTask: (id: string, data: Partial<ScheduledTask>): Promise<ScheduledTask> =>
    apiClient.post<ScheduledTask>("/api/task/update", { id, ...data }),

  deleteTask: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/task/delete/${id}`);
    return true;
  },

  enable: (taskId: string): Promise<void> =>
    apiClient.post(`/api/task/enable/${taskId}`),

  disable: (taskId: string): Promise<void> =>
    apiClient.post(`/api/task/disable/${taskId}`),

  toggleTask: async (taskId: string): Promise<void> => {
    const task = await baseApi.getById(taskId);
    if ((task as ScheduledTask).enabled) {
      await apiClient.post(`/api/task/disable/${taskId}`);
    } else {
      await apiClient.post(`/api/task/enable/${taskId}`);
    }
  },

  toggleStatus: async (taskId: string): Promise<void> => {
    const task = await baseApi.getById(taskId);
    if ((task as ScheduledTask).enabled) {
      await apiClient.post(`/api/task/disable/${taskId}`);
    } else {
      await apiClient.post(`/api/task/enable/${taskId}`);
    }
  },

  executeTask: (taskId: string): Promise<{ jobId: string }> =>
    apiClient.post<{ job_id: string }>(`/api/task/execute/${taskId}`).then((result) => ({
      jobId: result.job_id,
    })),

  getExecutions: (filter?: { taskId?: string; status?: string; limit?: number }): Promise<TaskExecution[]> =>
    apiClient.get<TaskExecution[]>("/api/task/executions", { params: { limit: filter?.limit } }),

  getStats: async (): Promise<{ total: number; enabled: number; disabled: number; totalExecutions: number; successRate: number; executionsToday: number }> => {
    const tasks = await baseApi.getAll();
    return {
      total: tasks.length,
      enabled: tasks.filter(t => (t as ScheduledTask).enabled).length,
      disabled: tasks.filter(t => !(t as ScheduledTask).enabled).length,
      totalExecutions: 0,
      successRate: 0,
      executionsToday: 0,
    };
  },
};

export { scheduledTaskRealApi };
export type { ScheduledTask, TaskExecution };
