/**
 * Project workbench (M3 TASK-02/04): project list with phase tags, 立项
 * dialog (goal + output format), plan editor (add/remove/reorder steps
 * with strategy), run/resume with live step statuses, review
 * approve/reject on gated steps, retry on failures, and step-artifact
 * preview.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Empty,
  Input,
  Modal,
  Progress,
  Select,
  Tag,
  message,
} from "antd";
import {
  ProjectOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  RedoOutlined,
  DeleteOutlined,
  SaveOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { sopService, projectToSop, templateSlots } from "@/services/api/sop";
import {
  PHASE_COLORS,
  PHASE_LABELS,
  STEP_STATUS_COLORS,
  STEP_STATUS_LABELS,
  STRATEGY_LABELS,
  projectProgress,
  taskService,
  type Project,
  type ProjectSummary,
  type StepStrategy,
  type TaskStep,
} from "@/services/api/task";

const OUTPUT_FORMATS = [
  { value: "markdown", label: "Markdown" },
  { value: "word", label: "Word 文档" },
  { value: "excel", label: "Excel 表格" },
  { value: "ppt", label: "PPT 演示" },
  { value: "pdf", label: "PDF" },
];

interface DraftStep {
  title: string;
  prompt: string;
  strategy: StepStrategy;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftGoal, setDraftGoal] = useState("");
  const [draftFormat, setDraftFormat] = useState("markdown");
  const [draftSteps, setDraftSteps] = useState<DraftStep[]>([]);
  const [running, setRunning] = useState(false);
  // TASK-20: SOP persistence + automation conversion.
  const [sopPrompt, setSopPrompt] = useState(false);
  const [cronPrompt, setCronPrompt] = useState(false);
  const [cronValue, setCronValue] = useState("0 9 * * 1");
  const [savedSopId, setSavedSopId] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setProjects(await taskService.list());
    setLoading(false);
  }, []);

  const openProject = useCallback(async (id: string) => {
    const project = await taskService.detail(id);
    setSelected(project);
    if (project) {
      setDraftSteps(
        project.steps.map((s) => ({
          title: s.title,
          prompt: s.prompt,
          strategy: s.strategy,
        })),
      );
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const createProject = useCallback(async () => {
    if (!draftTitle.trim() || !draftGoal.trim()) {
      message.warning("标题与目标必填");
      return;
    }
    try {
      const project = await taskService.create({
        title: draftTitle.trim(),
        goal: draftGoal.trim(),
        output_format: draftFormat,
      });
      if (draftSteps.length > 0) {
        await taskService.setPlan(project.id, draftSteps);
      }
      message.success("项目已创建");
      setCreateOpen(false);
      setDraftTitle("");
      setDraftGoal("");
      setDraftSteps([]);
      await loadList();
      await openProject(project.id);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(`创建失败：${detail}`);
    }
  }, [draftTitle, draftGoal, draftFormat, draftSteps, loadList, openProject]);

  const savePlan = useCallback(async () => {
    if (!selected || draftSteps.length === 0) return;
    try {
      const updated = await taskService.setPlan(selected.id, draftSteps);
      setSelected(updated);
      message.success("计划已保存");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(`保存失败：${detail}`);
    }
  }, [selected, draftSteps]);

  const run = useCallback(async () => {
    if (!selected || running) return;
    setRunning(true);
    try {
      const result = await taskService.run(selected.id);
      setSelected(result.project);
      if (result.status === "awaiting_review") {
        message.info("项目在评审门暂停——请审阅后通过或打回");
      } else if (result.status === "failed") {
        message.error(`执行失败：${result.error ?? "未知错误"}`);
      } else {
        message.success("项目已交付");
      }
      await loadList();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(`运行失败：${detail}`);
    } finally {
      setRunning(false);
    }
  }, [selected, running, loadList]);

  const review = useCallback(
    async (stepId: string, approve: boolean) => {
      if (!selected) return;
      try {
        const updated = await taskService.review(selected.id, stepId, approve);
        setSelected(updated);
        message.success(approve ? "评审通过" : "已打回返工");
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        message.error(`评审失败：${detail}`);
      }
    },
    [selected],
  );

  const retry = useCallback(
    async (stepId: string) => {
      if (!selected) return;
      try {
        const updated = await taskService.retry(selected.id, stepId);
        setSelected(updated);
        message.info("步骤已重置，可重新运行");
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        message.error(`重试失败：${detail}`);
      }
    },
    [selected],
  );

  const saveAsSop = useCallback(async () => {
    if (!selected) return;
    const packed = projectToSop(selected);
    const saved = await sopService.save(packed);
    if (saved) {
      setSavedSopId(saved.id);
      message.success(`已沉淀为 SOP「${saved.name}」（${saved.steps.length} 步）`);
      setSopPrompt(false);
      setCronPrompt(true);
    } else {
      message.error("SOP 保存失败");
    }
  }, [selected]);

  const toAutomation = useCallback(async () => {
    if (!savedSopId) return;
    const bound = await sopService.bindTrigger(savedSopId, {
      kind: "cron",
      cron: cronValue,
    });
    if (bound) {
      message.success(`已转为自动化流水线（cron: ${cronValue}）`);
      setCronPrompt(false);
    } else {
      message.error("触发器绑定失败");
    }
  }, [savedSopId, cronValue]);

  const patchDraft = (index: number, patch: Partial<DraftStep>) => {
    setDraftSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  };

  return (
    <div className="flex h-full">
      {/* Project list */}
      <div className="w-72 border-r border-(--color-border) flex flex-col">
        <div className="p-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
            <ProjectOutlined className="text-[var(--color-primary)]" />
            项目
          </h2>
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
            aria-label="新建项目"
          >
            立项
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {loading ? (
            <p className="text-xs text-[var(--color-text-tertiary)] p-2">加载中…</p>
          ) : projects.length === 0 ? (
            <p className="text-xs text-[var(--color-text-tertiary)] p-2">
              还没有项目——点击「立项」开始
            </p>
          ) : (
            projects.map((summary) => (
              <button
                key={summary.id}
                onClick={() => void openProject(summary.id)}
                className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                  selected?.id === summary.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                    : "border-(--color-border) hover:bg-(--color-bg-tertiary)"
                }`}
                aria-label={`打开项目 ${summary.title}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {summary.title}
                  </span>
                  <Tag color={PHASE_COLORS[summary.phase]}>
                    {PHASE_LABELS[summary.phase]}
                  </Tag>
                </div>
                <p className="text-xs text-[var(--color-text-tertiary)] truncate mt-0.5">
                  {summary.goal}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Project detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selected ? (
          <div className="h-full flex items-center justify-center">
            <Empty description="选择或创建一个项目" />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {selected.title}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {selected.goal} · 交付格式 {selected.output_format}
                </p>
              </div>
              <Tag color={PHASE_COLORS[selected.phase]}>
                {PHASE_LABELS[selected.phase]}
              </Tag>
            </div>
            <Progress
              percent={Math.round(projectProgress(selected) * 100)}
              size="small"
              aria-label="项目进度"
            />

            {/* Run controls */}
            <div className="flex gap-2">
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={running}
                onClick={run}
                aria-label="运行项目"
              >
                {selected.phase === "planning" ? "开跑" : "继续执行"}
              </Button>
              <Button onClick={savePlan} disabled={draftSteps.length === 0} aria-label="保存计划">
                保存计划
              </Button>
              {selected.phase === "delivered" && (
                <Button
                  icon={<SaveOutlined />}
                  onClick={() => setSopPrompt(true)}
                  aria-label="存为 SOP"
                >
                  存为 SOP
                </Button>
              )}
            </div>

            {/* Step list (live statuses + review actions) */}
            <div className="space-y-2">
              {selected.steps.map((step: TaskStep, index: number) => (
                <div
                  key={step.id}
                  className="p-3 rounded-xl border border-(--color-border) bg-[var(--color-bg-secondary)] space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-tertiary)]">
                      {index + 1}.
                    </span>
                    <span className="text-sm font-medium text-[var(--color-text-primary)] flex-1 truncate">
                      {step.title}
                    </span>
                    <Tag>{STRATEGY_LABELS[step.strategy]}</Tag>
                    <Tag color={STEP_STATUS_COLORS[step.status]}>
                      {STEP_STATUS_LABELS[step.status]}
                    </Tag>
                  </div>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{step.prompt}</p>
                  {step.error && (
                    <p className="text-xs text-red-400">失败原因：{step.error}</p>
                  )}
                  {step.output != null && typeof step.output === "string" && (
                    <div className="p-2 rounded-lg bg-(--color-bg-tertiary) text-xs text-[var(--color-text-secondary)] max-h-24 overflow-y-auto whitespace-pre-wrap">
                      {step.output}
                    </div>
                  )}
                  <div className="flex gap-1">
                    {step.status === "awaiting_review" && (
                      <>
                        <Button
                          size="small"
                          icon={<CheckOutlined />}
                          onClick={() => void review(step.id, true)}
                          aria-label={`通过 ${step.title}`}
                        >
                          通过
                        </Button>
                        <Button
                          size="small"
                          danger
                          icon={<CloseOutlined />}
                          onClick={() => void review(step.id, false)}
                          aria-label={`打回 ${step.title}`}
                        >
                          打回
                        </Button>
                      </>
                    )}
                    {step.status === "failed" && (
                      <Button
                        size="small"
                        icon={<RedoOutlined />}
                        onClick={() => void retry(step.id)}
                        aria-label={`重试 ${step.title}`}
                      >
                        重试
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Plan editor */}
            <div className="space-y-2 pt-3 border-t border-(--color-border)">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                  计划编辑（增删改后保存）
                </p>
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() =>
                    setDraftSteps((prev) => [
                      ...prev,
                      { title: "", prompt: "", strategy: "direct" },
                    ])
                  }
                  aria-label="添加步骤"
                >
                  添加步骤
                </Button>
              </div>
              {draftSteps.map((draft, index) => (
                <div
                  key={index}
                  className="flex gap-2 items-start p-2 rounded-lg border border-(--color-border)"
                >
                  <div className="flex-1 space-y-1">
                    <Input
                      size="small"
                      value={draft.title}
                      onChange={(e) => patchDraft(index, { title: e.target.value })}
                      placeholder="步骤标题"
                      aria-label={`步骤标题 ${index + 1}`}
                    />
                    <Input.TextArea
                      size="small"
                      value={draft.prompt}
                      onChange={(e) => patchDraft(index, { prompt: e.target.value })}
                      placeholder="执行指令"
                      autoSize={{ minRows: 1, maxRows: 2 }}
                      aria-label={`步骤指令 ${index + 1}`}
                    />
                  </div>
                  <Select
                    size="small"
                    value={draft.strategy}
                    onChange={(strategy) => patchDraft(index, { strategy })}
                    options={(Object.keys(STRATEGY_LABELS) as StepStrategy[]).map((s) => ({
                      value: s,
                      label: STRATEGY_LABELS[s],
                    }))}
                    style={{ width: 96 }}
                    aria-label={`步骤策略 ${index + 1}`}
                  />
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      setDraftSteps((prev) => prev.filter((_, i) => i !== index))
                    }
                    aria-label={`删除步骤 ${index + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TASK-20: 存为 SOP */}
      <Modal
        title="沉淀为 SOP 模板"
        open={sopPrompt}
        onOk={() => void saveAsSop()}
        onCancel={() => setSopPrompt(false)}
        okText="沉淀"
        cancelText="取消"
      >
        {selected && (
          <div className="space-y-2 text-sm">
            <p>
              将把 <b>{selected.steps.length}</b> 个步骤（含策略配置）打包为可复用模板。
            </p>
            {templateSlots({ ...projectToSop(selected), id: "", created_at: "" }).length > 0 && (
              <p className="text-xs text-[var(--color-text-tertiary)]">
                检测到参数化占位符：
                {templateSlots({ ...projectToSop(selected), id: "", created_at: "" }).join("、")}
                ——自动化时将作为输入绑定。
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* TASK-20→05: 转自动化流水线 */}
      <Modal
        title="转为自动化流水线"
        open={cronPrompt}
        onOk={() => void toAutomation()}
        onCancel={() => setCronPrompt(false)}
        okText="绑定触发器"
        cancelText="以后再说"
      >
        <div className="space-y-2">
          <p className="text-sm">
            绑定定时触发器后，该 SOP 将按计划无人值守执行（结果推送桌面通知）。
          </p>
          <Input
            value={cronValue}
            onChange={(e) => setCronValue(e.target.value)}
            placeholder="cron 表达式，如 0 9 * * 1（每周一 9 点）"
            aria-label="cron 表达式"
            prefix={<ClockCircleOutlined />}
          />
        </div>
      </Modal>

      {/* 立项 dialog */}
      <Modal
        title="立项"
        open={createOpen}
        onOk={() => void createProject()}
        onCancel={() => setCreateOpen(false)}
        okText="创建"
        cancelText="取消"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">项目标题</label>
            <Input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="例如：产品周报"
              aria-label="项目标题"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">目标</label>
            <Input.TextArea
              value={draftGoal}
              onChange={(e) => setDraftGoal(e.target.value)}
              placeholder="一句话说清要交付什么"
              rows={2}
              aria-label="项目目标"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">交付格式</label>
            <Select
              value={draftFormat}
              onChange={setDraftFormat}
              options={OUTPUT_FORMATS}
              style={{ width: "100%" }}
              aria-label="交付格式"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
