import { useTranslation } from "react-i18next";
/**
 * Deep research workspace (TOOL-09): tiered runs with upfront token
 * estimates, a live 检索路径树, and the cited markdown report.
 */

import { useCallback, useState } from "react";
import { Button, Input, Select, Spin, Tag, message, Empty } from "antd";
import { SearchOutlined, DownloadOutlined } from "@ant-design/icons";
import {
  PHASE_LABELS,
  RESEARCH_TIERS,
  researchService,
  tierInfo,
  type ResearchPhase,
  type ResearchStatus,
  type ResearchTier,
} from "@/services/api/research";
import { MarkdownRenderer } from "@/components/common";
import { loadPolicy, resolveModel } from "@/services/api/modelPolicy";

const PHASE_COLORS: Record<ResearchPhase, string> = {
  planning: "processing",
  searching: "processing",
  synthesizing: "processing",
  done: "success",
  failed: "error",
};

export default function ResearchPage() {  const { t } = useTranslation();

  const [topic, setTopic] = useState("");
  const [tier, setTier] = useState<ResearchTier>("standard");
  const [status, setStatus] = useState<ResearchStatus | null>(null);
  const [running, setRunning] = useState(false);

  const selectedTier = tierInfo(tier);

  const start = useCallback(async () => {
    const trimmed = topic.trim();
    if (!trimmed || running) return;
    setRunning(true);
    setStatus(null);
    try {
      const started = await researchService.start(trimmed, tier);
      message.info(
        t("已启动（目标 {{p0}} 源，预估 {{p1}} tokens）", { p0: started.sources_target, p1: started.estimated_tokens }),
      );
      const final = await researchService.pollUntilTerminal(
        started.research_id,
        setStatus,
        2000,
        300,
      );
      if (final.phase === "failed") {
        message.error(`研究失败：${final.error ?? "未知错误"}`);
      } else {
        message.success(t("研究报告已生成"));
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(t("启动失败：{{p0}}", { p0: detail }));
    } finally {
      setRunning(false);
    }
  }, [topic, tier, running]);

  return (
    <div className="flex h-full">
      {/* Panel */}
      <div className="w-72 border-r border-(--color-border) p-4 space-y-4 overflow-y-auto">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
          <SearchOutlined className="text-[var(--color-primary)]" />
          深入研究
        </h2>

        <div>
          <label className="block text-sm font-medium mb-1">{t("研究课题")}</label>
          <Input.TextArea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t("例如：2026 年国产新能源车的市场格局")}
            rows={3}
            aria-label={t("研究课题")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t("档位")}</label>
          <Select
            value={tier}
            onChange={setTier}
            options={RESEARCH_TIERS.map((t) => ({ value: t.value, label: t.label }))}
            style={{ width: "100%" }}
            aria-label={t("研究档位")}
          />
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            预估成本约 <span className="text-amber-500">{selectedTier.estimatedTokens} tokens</span>
            （BYOK 实际计费）；检索 {selectedTier.sources} 个来源后交叉验证。
          </p>
        </div>

        <Button
          type="primary"
          block
          icon={<SearchOutlined />}
          loading={running}
          disabled={!topic.trim()}
          onClick={start}
          aria-label={t("开始研究")}
        >
          开始研究
        </Button>

        {/* 检索路径树 */}
        {status && (
          <div className="pt-2 border-t border-(--color-border)">
            <div className="flex items-center gap-2 mb-2">
              <Tag color={PHASE_COLORS[status.phase]}>{PHASE_LABELS[status.phase]}</Tag>
              <span className="text-xs text-[var(--color-text-tertiary)]">
                {status.sources} 源
              </span>
            </div>
            {running && <Spin size="small" />}
            <ul className="mt-2 space-y-1">
              {status.queries.map((q, index) => (
                <li key={index} className="text-xs text-[var(--color-text-tertiary)] flex items-start gap-1">
                  <span className="text-[var(--color-primary)]">└</span>
                  <span className="flex-1">
                    {q.query}
                    <span className="ml-1 text-[var(--color-text-secondary)]">
                      ({q.results} 条)
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {status.phase === "failed" && status.error && (
              <p className="mt-2 text-xs text-red-400">{status.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Report */}
      <div className="flex-1 overflow-y-auto p-6">
        {!status?.report_md ? (
          <div className="h-full flex items-center justify-center">
            <Empty description={t("输入课题，选择档位开始研究——报告将带引用编号")} />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex justify-end">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => researchService.downloadReport(status.report_md!, status.topic)}
                aria-label={t("下载报告")}
              >
                下载 .md
              </Button>
            </div>
            <div className="rounded-xl border border-(--color-border) bg-[var(--color-bg-secondary)] p-6">
              <MarkdownRenderer content={status.report_md} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
