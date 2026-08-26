import { useTranslation } from "react-i18next";
/**
 * Deliverable center (TASK-17): all project/automation outputs in one
 * place — list + inline preview (点击即预览无需下载) and a line-diff view
 * that locates changes between two executions.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Empty, Select, Spin, Tag } from "antd";
import {
  FileDoneOutlined,
  EyeOutlined,
  DiffOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import {
  diffLines,
  diffStats,
  groupByProject,
  listDeliverables,
  type Deliverable,
} from "@/services/api/deliverables";
import { MarkdownRenderer } from "@/components/common";

type View = "list" | "diff";

const SOURCE_LABELS: Record<Deliverable["source"], string> = {
  project: "项目",
  automation: "自动化",
};

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DeliverablesPage() {  const { t } = useTranslation();

  const [items, setItems] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [selected, setSelected] = useState<Deliverable | null>(null);
  // Diff pair: two deliverables from the same project group (two runs).
  const [diffLeft, setDiffLeft] = useState<string | null>(null);
  const [diffRight, setDiffRight] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await listDeliverables());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => groupByProject(items), [items]);
  /** Candidate pairs: any two deliverables sharing a project group. */
  const diffCandidates = useMemo(() => {
    const pairs: Array<{ left: Deliverable; right: Deliverable }> = [];
    for (const group of groups.values()) {
      for (let i = 0; i < group.length; i += 1) {
        for (let j = i + 1; j < group.length; j += 1) {
          pairs.push({ left: group[i], right: group[j] });
        }
      }
    }
    return pairs;
  }, [groups]);

  const left = items.find((d) => d.id === diffLeft) ?? null;
  const right = items.find((d) => d.id === diffRight) ?? null;
  const diff = left && right ? diffLines(left.content, right.content) : [];
  const stats = diffStats(diff);

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="w-80 border-r border-(--color-border) flex flex-col">
        <div className="p-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
            <FileDoneOutlined className="text-[var(--color-primary)]" />
            产物中心
          </h2>
          <div className="flex gap-1">
            <Button
              size="small"
              type={view === "list" ? "primary" : "text"}
              icon={<EyeOutlined />}
              onClick={() => setView("list")}
              aria-label={t("列表视图")}
            />
            <Button
              size="small"
              type={view === "diff" ? "primary" : "text"}
              icon={<DiffOutlined />}
              disabled={diffCandidates.length === 0}
              onClick={() => setView("diff")}
              aria-label={t("变更 diff")}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spin size="small" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-xs text-[var(--color-text-tertiary)] p-2">
              还没有产物——跑一个项目后，步骤产物会汇集在这里
            </p>
          ) : view === "list" ? (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                  selected?.id === item.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                    : "border-(--color-border) hover:bg-(--color-bg-tertiary)"
                }`}
                aria-label={t("预览产物 {{p0}}", { p0: item.title })}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm text-[var(--color-text-primary)] truncate">
                    {item.title}
                  </span>
                  <Tag>{SOURCE_LABELS[item.source]}</Tag>
                </div>
                <p className="text-xs text-[var(--color-text-tertiary)] truncate mt-0.5">
                  {item.outputFormat} · {item.updatedAt.slice(0, 10)}
                </p>
              </button>
            ))
          ) : (
            <div className="p-2 space-y-2">
              <p className="text-xs text-[var(--color-text-tertiary)]">
                选择同项目的两个产物对比差异
              </p>
              <Select
                size="small"
                value={diffLeft}
                onChange={setDiffLeft}
                placeholder={t("旧版本")}
                options={items.map((item) => ({ value: item.id, label: item.title }))}
                style={{ width: "100%" }}
                aria-label={t("diff 旧版本")}
              />
              <Select
                size="small"
                value={diffRight}
                onChange={setDiffRight}
                placeholder={t("新版本")}
                options={items.map((item) => ({ value: item.id, label: item.title }))}
                style={{ width: "100%" }}
                aria-label={t("diff 新版本")}
              />
              {diff.length > 0 && (
                <p className="text-xs">
                  <span className="text-green-500">+{stats.added}</span>{" "}
                  <span className="text-red-500">-{stats.removed}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {view === "list" ? (
          !selected ? (
            <div className="h-full flex items-center justify-center">
              <Empty description={t("点击左侧产物即可预览")} />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                  {selected.title}
                </h3>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() =>
                    downloadText(selected.content, `${selected.title}.md`)
                  }
                  aria-label={t("下载产物")}
                >
                  下载
                </Button>
              </div>
              <div className="rounded-xl border border-(--color-border) bg-[var(--color-bg-secondary)] p-6">
                <MarkdownRenderer content={selected.content} />
              </div>
            </div>
          )
        ) : !left || !right ? (
          <div className="h-full flex items-center justify-center">
            <Empty description={t("选择两个产物以查看差异")} />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-red-500">− {left.title}</span>
              <span className="text-[var(--color-text-tertiary)]">vs</span>
              <span className="text-green-500">+ {right.title}</span>
            </div>
            <div className="rounded-xl border border-(--color-border) bg-[var(--color-bg-secondary)] overflow-hidden font-mono text-xs">
              {diff.map((line, index) => (
                <div
                  key={index}
                  className={`flex gap-2 px-3 py-0.5 ${
                    line.op === "added"
                      ? "bg-green-500/10 text-green-600"
                      : line.op === "removed"
                        ? "bg-red-500/10 text-red-600"
                        : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  <span className="w-8 text-right text-[var(--color-text-tertiary)] shrink-0">
                    {line.oldLine ?? ""}
                  </span>
                  <span className="w-8 text-right text-[var(--color-text-tertiary)] shrink-0">
                    {line.newLine ?? ""}
                  </span>
                  <span className="w-3 shrink-0">
                    {line.op === "added" ? "+" : line.op === "removed" ? "−" : ""}
                  </span>
                  <span className="whitespace-pre-wrap break-all">{line.text}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              左列旧行号，右列新行号；绿色为新增，红色为删除。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
