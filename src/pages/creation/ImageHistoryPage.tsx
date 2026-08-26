import { useTranslation } from "react-i18next";
/**
 * Generation history page (TOOL-05): grid of parameter snapshots with
 * one-click 恢复参数, metadata-degrade notes, single-delete, and the
 * version-compare slider for any two entries.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Empty, Modal, Popconfirm, message } from "antd";
import {
  HistoryOutlined,
  RedoOutlined,
  DeleteOutlined,
  ColumnWidthOutlined,
} from "@ant-design/icons";
import type { ImageGenHistoryEntry } from "@/services/api/image";
import {
  clearHistory,
  entryCompleteness,
  listHistory,
  removeEntry,
  restoreHref,
} from "@/services/api/imageHistory";
import CompareSlider from "@/components/creation/CompareSlider";

export default function ImageHistoryPage() {  const { t } = useTranslation();

  const navigate = useNavigate();
  const [history, setHistory] = useState<ImageGenHistoryEntry[]>(() => listHistory());
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);

  const compareEntries = useMemo(
    () => compareIds.map((id) => history.find((e) => e.id === id)).filter(Boolean) as ImageGenHistoryEntry[],
    [compareIds, history],
  );

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const openCompare = () => {
    if (compareEntries.length !== 2) return;
    setSliderPosition(50);
    setCompareOpen(true);
  };

  const restore = (entry: ImageGenHistoryEntry) => {
    const { complete, missing } = entryCompleteness(entry);
    if (!complete) {
      message.warning(`该记录缺少${missing.join("、")}，将以手动参数方式恢复`);
    } else {
      message.info(t("参数已恢复并自动重跑（参数级复现；精确同图需模型支持 seed）"));
    }
    navigate(restoreHref(entry));
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
          <HistoryOutlined className="text-[var(--color-primary)]" />
          生成历史
        </h2>
        <div className="flex gap-2">
          <Button
            icon={<ColumnWidthOutlined />}
            disabled={compareIds.length !== 2}
            onClick={openCompare}
            aria-label={t("对比所选")}
          >
            对比（{compareIds.length}/2）
          </Button>
          <Popconfirm
            title={t("确定清空全部历史？")}
            onConfirm={() => {
              clearHistory();
              setHistory([]);
              setCompareIds([]);
            }}
            okText={t("清空")}
            cancelText={t("取消")}
          >
            <Button danger aria-label={t("清空历史")}>
              清空
            </Button>
          </Popconfirm>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <Empty description={t("还没有生成记录——去图像生成页跑第一张")} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
          {history.map((entry) => {
            const selected = compareIds.includes(entry.id);
            const completeness = entryCompleteness(entry);
            return (
              <figure
                key={entry.id}
                className={`rounded-xl overflow-hidden border-2 bg-[var(--color-bg-secondary)] ${
                  selected ? "border-[var(--color-primary)]" : "border-(--color-border)"
                }`}
              >
                {entry.images[0] ? (
                  <img src={entry.images[0]} alt={entry.prompt} className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center text-3xl text-[var(--color-text-tertiary)]">
                    🖼️
                  </div>
                )}
                <figcaption className="p-3 space-y-1.5">
                  <p className="text-xs text-[var(--color-text-primary)] line-clamp-2">{entry.prompt}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    {entry.size} · {entry.n} 张 · {entry.model || "未知模型"} ·{" "}
                    {entry.created_at.slice(0, 16).replace("T", " ")}
                  </p>
                  {!completeness.complete && (
                    <p className="text-xs text-amber-500">
                      缺少{completeness.missing.join("、")}（降级为手动参数）
                    </p>
                  )}
                  <div className="flex gap-1 pt-1">
                    <Button
                      size="small"
                      icon={<RedoOutlined />}
                      onClick={() => restore(entry)}
                      aria-label={t("恢复参数 {{p0}}", { p0: entry.prompt })}
                    >
                      恢复参数
                    </Button>
                    <Button
                      size="small"
                      onClick={() => toggleCompare(entry.id)}
                      aria-pressed={selected}
                      aria-label={t("选择对比 {{p0}}", { p0: entry.prompt })}
                    >
                      {selected ? "取消对比" : "对比"}
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => setHistory(removeEntry(entry.id))}
                      aria-label={t("删除记录 {{p0}}", { p0: entry.prompt })}
                    />
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}

      <Modal
        title={t("版本对比")}
        open={compareOpen}
        onCancel={() => setCompareOpen(false)}
        footer={null}
        width={640}
      >
        {compareEntries.length === 2 && (
          <div className="space-y-3">
            <CompareSlider
              beforeSrc={compareEntries[0].images[0] ?? ""}
              afterSrc={compareEntries[1].images[0] ?? ""}
              beforeLabel={compareEntries[0].created_at.slice(5, 16).replace("T", " ")}
              afterLabel={compareEntries[1].created_at.slice(5, 16).replace("T", " ")}
              position={sliderPosition}
              onPositionChange={setSliderPosition}
            />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-(--color-bg-tertiary)">
                <p className="text-[var(--color-text-secondary)]">{compareEntries[0].prompt}</p>
                <p className="mt-1 text-[var(--color-text-tertiary)]">
                  {compareEntries[0].size} · {compareEntries[0].model}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-(--color-bg-tertiary)">
                <p className="text-[var(--color-text-secondary)]">{compareEntries[1].prompt}</p>
                <p className="mt-1 text-[var(--color-text-tertiary)]">
                  {compareEntries[1].size} · {compareEntries[1].model}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
