/**
 * Deliverable center service (TASK-17): aggregates project step outputs
 * and automation-run artifacts into one browsable list with preview, and
 * a line-diff utility that locates changes between two executions of the
 * same deliverable (验收: diff 视图能定位两次执行间的文件差异).
 */

import { apiClient } from "../api/apiClient";
import type { Project } from "./task";

export type DeliverableSource = "project" | "automation";

export interface Deliverable {
  id: string;
  title: string;
  /** Markdown content of the step output. */
  content: string;
  source: DeliverableSource;
  /** Origin project id (projects link back). */
  projectId: string;
  /** Format the project declared at 立项. */
  outputFormat: string;
  updatedAt: string;
}

/** Extract text deliverables from a project's steps (preview-ready). */
export function projectToDeliverables(project: Project): Deliverable[] {
  return project.steps
    .filter((step) => typeof step.output === "string" && step.output.trim() !== "")
    .map((step, index) => ({
      id: `${project.id}:${step.id}`,
      title: `${project.title} · ${step.title}${index > 0 ? ` (${index + 1})` : ""}`,
      content: step.output as string,
      source: project.title.includes("· 自动执行") ? "automation" : "project",
      projectId: project.id,
      outputFormat: project.output_format,
      updatedAt: project.updated_at,
    }));
}

/** Fetch all projects' deliverables (list endpoint + per-detail fanout). */
export async function listDeliverables(): Promise<Deliverable[]> {
  try {
    const summaries = await apiClient.get<Array<{ id: string }>>(
      "/api/task/project/list",
    );
    if (!Array.isArray(summaries)) return [];
    const details = await Promise.all(
      summaries.map((summary) =>
        apiClient
          .get<Project>(`/api/task/project/${summary.id}`)
          .catch(() => null),
      ),
    );
    return details
      .filter((project): project is Project => project !== null)
      .flatMap(projectToDeliverables);
  } catch {
    return [];
  }
}

// ==================== Line diff (LCS) ====================

export type DiffOp = "same" | "added" | "removed";

export interface DiffLine {
  op: DiffOp;
  text: string;
  /** Line number in the old (removed/same) or new (added/same) text. */
  oldLine?: number;
  newLine?: number;
}

/**
 * LCS line diff between two texts — the diff view's engine. Pure and
 * testable; O(n·m) is fine for deliverable-sized texts.
 */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const n = a.length;
  const m = b.length;
  // lcs[i][j] = LCS length of a[i..] and b[j..]
  const lcs: number[][] = Array.from({ length: n + 1 }, () => vec(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i][j] =
        a[i] === b[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let oldNo = 1;
  let newNo = 1;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ op: "same", text: a[i], oldLine: oldNo, newLine: newNo });
      i += 1;
      j += 1;
      oldNo += 1;
      newNo += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ op: "removed", text: a[i], oldLine: oldNo });
      i += 1;
      oldNo += 1;
    } else {
      out.push({ op: "added", text: b[j], newLine: newNo });
      j += 1;
      newNo += 1;
    }
  }
  while (i < n) {
    out.push({ op: "removed", text: a[i], oldLine: oldNo });
    i += 1;
    oldNo += 1;
  }
  while (j < m) {
    out.push({ op: "added", text: b[j], newLine: newNo });
    j += 1;
    newNo += 1;
  }
  return out;
}

function vec(size: number): number[] {
  return new Array(size).fill(0);
}

/** Diff summary counts for list badges. */
export function diffStats(diff: DiffLine[]): { added: number; removed: number } {
  return {
    added: diff.filter((d) => d.op === "added").length,
    removed: diff.filter((d) => d.op === "removed").length,
  };
}

/** Group deliverables by origin project so two runs compare naturally. */
export function groupByProject(deliverables: Deliverable[]): Map<string, Deliverable[]> {
  const groups = new Map<string, Deliverable[]>();
  for (const item of deliverables) {
    const list = groups.get(item.projectId) ?? [];
    list.push(item);
    groups.set(item.projectId, list);
  }
  return groups;
}
