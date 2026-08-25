/**
 * Task workbench service (M3 TASK-01/02/04): project CRUD, plan editing,
 * run/resume with review actions, over the agent-runtime backend.
 */

import { apiClient } from "../api/apiClient";

export type StepStrategy = "direct" | "review_required" | "expert";

export type StepStatus =
  | "pending"
  | "running"
  | "done"
  | "failed"
  | "awaiting_review"
  | "rework";

export type ProjectPhase = "planning" | "executing" | "review" | "delivered";

export interface TaskStep {
  id: string;
  title: string;
  prompt: string;
  strategy: StepStrategy;
  status: StepStatus;
  output?: string | Record<string, unknown> | null;
  error?: string | null;
}

export interface Project {
  id: string;
  title: string;
  goal: string;
  output_format: string;
  phase: ProjectPhase;
  steps: TaskStep[];
  created_at: string;
  updated_at: string;
}

export interface ProjectSummary {
  id: string;
  title: string;
  goal: string;
  output_format: string;
  phase: ProjectPhase;
  updated_at: string;
}

export type RunStatus = "completed" | "awaiting_review" | "failed";

export interface RunResult {
  status: RunStatus;
  error?: string;
  project: Project;
}

export const PHASE_LABELS: Record<ProjectPhase, string> = {
  planning: "规划中",
  executing: "执行中",
  review: "评审中",
  delivered: "已交付",
};

export const PHASE_COLORS: Record<ProjectPhase, string> = {
  planning: "default",
  executing: "processing",
  review: "warning",
  delivered: "success",
};

export const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  pending: "待执行",
  running: "执行中",
  done: "完成",
  failed: "失败",
  awaiting_review: "待评审",
  rework: "返工",
};

export const STEP_STATUS_COLORS: Record<StepStatus, string> = {
  pending: "default",
  running: "processing",
  done: "success",
  failed: "error",
  awaiting_review: "warning",
  rework: "warning",
};

export const STRATEGY_LABELS: Record<StepStrategy, string> = {
  direct: "直执行",
  review_required: "需评审",
  expert: "专家",
};

/** Progress fraction from step statuses (mirrors the backend). */
export function projectProgress(project: Project): number {
  if (project.steps.length === 0) return 0;
  const settled = project.steps.filter((s) =>
    ["done", "failed", "awaiting_review"].includes(s.status),
  ).length;
  return settled / project.steps.length;
}

class TaskService {
  async create(input: {
    title: string;
    goal: string;
    output_format?: string;
  }): Promise<Project> {
    return apiClient.post<Project>("/api/task/project/create", input);
  }

  async list(): Promise<ProjectSummary[]> {
    try {
      const data = await apiClient.get<ProjectSummary[]>("/api/task/project/list");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async detail(id: string): Promise<Project | null> {
    try {
      return await apiClient.get<Project>(`/api/task/project/${id}`);
    } catch {
      return null;
    }
  }

  async setPlan(
    id: string,
    steps: Array<{ title: string; prompt: string; strategy: StepStrategy }>,
  ): Promise<Project> {
    return apiClient.post<Project>(`/api/task/project/${id}/plan`, { steps });
  }

  async run(id: string, model?: string): Promise<RunResult> {
    return apiClient.post<RunResult>(`/api/task/project/${id}/run`, {
      model: model ?? null,
    });
  }

  async review(id: string, stepId: string, approve: boolean): Promise<Project> {
    return apiClient.post<Project>(`/api/task/project/${id}/review/${stepId}`, {
      approve,
    });
  }

  async retry(id: string, stepId: string): Promise<Project> {
    return apiClient.post<Project>(`/api/task/project/${id}/retry/${stepId}`);
  }
}

export const taskService = new TaskService();
