/**
 * Tests for SOP templates (TASK-20): project packing, slot binding,
 * pipeline conversion, and service mapping.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import type { Project } from "./task";
import {
  bindStepPrompt,
  projectToSop,
  sopService,
  sopToPipeline,
  templateSlots,
} from "./sop";

vi.mock("../api/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);
const mockedDelete = vi.mocked(apiClient.delete);

function deliveredProject(): Project {
  return {
    id: "p1",
    title: "产品周报",
    goal: "汇总本周数据",
    output_format: "word",
    phase: "delivered",
    steps: [
      { id: "s1", title: "汇总", prompt: "汇总 {{数据源}} 数据", strategy: "direct", status: "done" },
      { id: "s2", title: "终稿", prompt: "撰写周报", strategy: "review_required", status: "done" },
    ],
    created_at: "2026-08-25T00:00:00Z",
    updated_at: "2026-08-25T00:00:00Z",
  };
}

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
  mockedDelete.mockReset();
});

describe("projectToSop (一键沉淀)", () => {
  it("packs step sequences with strategies and provenance", () => {
    const sop = projectToSop(deliveredProject());
    expect(sop.name).toBe("产品周报 SOP");
    expect(sop.output_format).toBe("word");
    expect(sop.steps).toHaveLength(2);
    expect(sop.steps[1].strategy).toBe("review_required");
    expect(sop.description).toContain("产品周报");
    expect(sop.trigger).toBeNull();
  });

  it("accepts a custom name", () => {
    expect(projectToSop(deliveredProject(), "周报流水线").name).toBe("周报流水线");
  });
});

describe("templateSlots / bindStepPrompt (参数化输入)", () => {
  const sop = projectToSop(deliveredProject());

  it("finds the referenced slots", () => {
    expect(templateSlots(sop)).toEqual(["数据源"]);
  });

  it("binds provided values and keeps unfilled slots visible", () => {
    const prompt = sop.steps[0].prompt;
    expect(bindStepPrompt(prompt, { 数据源: "销售表" })).toBe("汇总 销售表 数据");
    expect(bindStepPrompt(prompt, {})).toBe(prompt);
  });
});

describe("sopToPipeline (转自动化流水线)", () => {
  it("carries steps and binds the trigger", () => {
    const template = { ...projectToSop(deliveredProject()), id: "sop-1", created_at: "now" };
    const pipeline = sopToPipeline(template, { 数据源: "销售表" }, { kind: "cron", cron: "0 9 * * 1" });
    expect(pipeline.sop_id).toBe("sop-1");
    expect(pipeline.trigger).toEqual({ kind: "cron", cron: "0 9 * * 1" });
    expect(pipeline.inputs).toEqual({ 数据源: "销售表" });
    expect(pipeline.steps).toHaveLength(2);
    expect(pipeline.name).toContain("自动化");
  });
});

describe("sopService", () => {
  it("list reads fail-soft", async () => {
    mockedGet.mockResolvedValueOnce([{ id: "s1" }]);
    expect(await sopService.list()).toHaveLength(1);
    mockedGet.mockRejectedValueOnce(new Error("x"));
    expect(await sopService.list()).toEqual([]);
  });

  it("save/remove/bind map their endpoints", async () => {
    mockedPost.mockResolvedValueOnce({ id: "sop-2", name: "n" });
    await sopService.save(projectToSop(deliveredProject()));
    expect(mockedPost).toHaveBeenCalledWith("/api/sop/create", expect.any(Object));

    mockedDelete.mockResolvedValueOnce(undefined);
    expect(await sopService.remove("sop-2")).toBe(true);

    mockedPost.mockResolvedValueOnce({ id: "sop-2" });
    await sopService.bindTrigger("sop-2", { kind: "cron", cron: "0 9 * * *" });
    expect(mockedPost).toHaveBeenCalledWith("/api/sop/sop-2/trigger", {
      kind: "cron",
      cron: "0 9 * * *",
    });
  });
});
