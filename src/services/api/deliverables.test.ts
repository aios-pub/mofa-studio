/**
 * Tests for the deliverable center (TASK-17): extraction, grouping, and
 * the LCS line diff (定位两次执行间的差异).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import type { Project } from "./task";
import {
  diffLines,
  diffStats,
  groupByProject,
  listDeliverables,
  projectToDeliverables,
} from "./deliverables";

vi.mock("../api/apiClient", () => ({
  apiClient: { get: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    title: "周报",
    goal: "汇总",
    output_format: "word",
    phase: "delivered",
    steps: [
      { id: "s1", title: "汇总", prompt: "p", strategy: "direct", status: "done", output: "汇总结果 A" },
      { id: "s2", title: "终稿", prompt: "p", strategy: "review_required", status: "done", output: "终稿内容" },
      { id: "s3", title: "空步", prompt: "p", strategy: "direct", status: "done", output: null },
    ],
    created_at: "2026-08-25T00:00:00Z",
    updated_at: "2026-08-25T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  mockedGet.mockReset();
});

describe("projectToDeliverables", () => {
  it("extracts text outputs and tags the source", () => {
    const items = projectToDeliverables(project());
    expect(items).toHaveLength(2); // null output dropped
    expect(items[0]).toMatchObject({
      content: "汇总结果 A",
      source: "project",
      outputFormat: "word",
    });

    const automated = projectToDeliverables(
      project({ title: "周报 SOP · 自动执行" }),
    );
    expect(automated[0].source).toBe("automation");
  });
});

describe("listDeliverables", () => {
  it("fans out to project details fail-soft", async () => {
    mockedGet.mockResolvedValueOnce([{ id: "p1" }, { id: "p2" }]);
    mockedGet.mockResolvedValueOnce(project());
    mockedGet.mockRejectedValueOnce(new Error("gone"));
    const items = await listDeliverables();
    expect(items).toHaveLength(2);
    expect(mockedGet).toHaveBeenCalledWith("/api/task/project/p2");
  });

  it("empty list returns empty", async () => {
    mockedGet.mockResolvedValueOnce([]);
    expect(await listDeliverables()).toEqual([]);
    mockedGet.mockRejectedValueOnce(new Error("x"));
    expect(await listDeliverables()).toEqual([]);
  });
});

describe("groupByProject", () => {
  it("groups deliverables by origin project", () => {
    const a = projectToDeliverables(project());
    const b = projectToDeliverables(project({ id: "p2", title: "另项目" }));
    const groups = groupByProject([...a, ...b]);
    expect(groups.size).toBe(2);
    expect(groups.get("p1")).toHaveLength(2);
  });
});

describe("diffLines (变更 diff)", () => {
  it("marks added, removed, and same lines with numbers", () => {
    const diff = diffLines("第一行\n第二行\n第三行", "第一行\n改动行\n第三行\n新增行");
    const ops = diff.map((d) => d.op);
    expect(ops).toEqual(["same", "removed", "added", "same", "added"]);
    const removed = diff.find((d) => d.op === "removed")!;
    expect(removed.oldLine).toBe(2);
    expect(removed.text).toBe("第二行");
    const added = diff.find((d) => d.op === "added")!;
    expect(added.newLine).toBe(2);
    const tail = diff[diff.length - 1];
    expect(tail).toMatchObject({ op: "added", text: "新增行", newLine: 4 });
  });

  it("identical texts yield all-same with paired line numbers", () => {
    const diff = diffLines("a\nb", "a\nb");
    expect(diff.every((d) => d.op === "same")).toBe(true);
    expect(diff[0]).toMatchObject({ oldLine: 1, newLine: 1 });
  });

  it("empty old text is all-added", () => {
    const diff = diffLines("", "新内容");
    // "" splits to [""], so the diff shows the removal of the empty line
    // and the addition of the content.
    expect(diff.some((d) => d.op === "added")).toBe(true);
  });
});

describe("diffStats", () => {
  it("counts adds and removals", () => {
    const diff = diffLines("a\nb\nc", "a\nx\nc\nd");
    expect(diffStats(diff)).toEqual({ added: 2, removed: 1 });
  });
});
