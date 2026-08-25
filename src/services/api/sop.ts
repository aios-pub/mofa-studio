/**
 * SOP templates (TASK-20): a delivered project's step sequence + strategy
 * packs into a reusable template; templates convert to automation
 * pipelines (TASK-05) by binding a trigger. The asset-flywheel hinge.
 */

import { apiClient } from "../api/apiClient";
import type { Project, StepStrategy } from "./task";

export interface SopStep {
  title: string;
  prompt: string;
  strategy: StepStrategy;
}

export interface SopTemplate {
  id: string;
  name: string;
  description: string;
  output_format: string;
  steps: SopStep[];
  created_at: string;
  /** Trigger binding once converted to an automation pipeline (TASK-05). */
  trigger?: { kind: "cron" | "manual"; cron?: string } | null;
}

export const SOP_COLLECTION = "sop";

/** Pack a delivered project into an SOP template (一键沉淀). */
export function projectToSop(project: Project, name?: string): Omit<SopTemplate, "id" | "created_at"> {
  return {
    name: name?.trim() || `${project.title} SOP`,
    description: `源自项目「${project.title}」：${project.goal}（交付格式 ${project.output_format}）`,
    output_format: project.output_format,
    steps: project.steps.map((step) => ({
      title: step.title,
      prompt: step.prompt,
      strategy: step.strategy,
    })),
    trigger: null,
  };
}

/** Build a trigger-bound automation pipeline payload from a template. */
export function sopToPipeline(
  template: SopTemplate,
  inputs: Record<string, string>,
  trigger: { kind: "cron" | "manual"; cron?: string },
): {
  name: string;
  sop_id: string;
  inputs: Record<string, string>;
  trigger: { kind: string; cron?: string };
  steps: SopStep[];
} {
  return {
    name: `${template.name} · 自动化`,
    sop_id: template.id,
    inputs,
    trigger,
    steps: template.steps,
  };
}

/** Substitute {{param}} slots in step prompts with pipeline inputs. */
export function bindStepPrompt(prompt: string, inputs: Record<string, string>): string {
  return prompt.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (whole, name: string) => {
    const value = inputs[name.trim()];
    return value !== undefined && value !== "" ? value : whole;
  });
}

/** Extract the {{slots}} a template's prompts reference. */
export function templateSlots(template: SopTemplate): string[] {
  const seen = new Set<string>();
  for (const step of template.steps) {
    for (const match of step.prompt.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
      seen.add(match[1].trim());
    }
  }
  return [...seen];
}

class SopService {
  async list(): Promise<SopTemplate[]> {
    try {
      const data = await apiClient.get<SopTemplate[]>("/api/sop/list");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async save(template: Omit<SopTemplate, "id" | "created_at">): Promise<SopTemplate | null> {
    try {
      return await apiClient.post<SopTemplate>("/api/sop/create", template);
    } catch {
      return null;
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/api/sop/delete/${id}`);
      return true;
    } catch {
      return false;
    }
  }

  async bindTrigger(id: string, trigger: { kind: "cron" | "manual"; cron?: string }): Promise<SopTemplate | null> {
    try {
      return await apiClient.post<SopTemplate>(`/api/sop/${id}/trigger`, trigger);
    } catch {
      return null;
    }
  }
}

export const sopService = new SopService();
