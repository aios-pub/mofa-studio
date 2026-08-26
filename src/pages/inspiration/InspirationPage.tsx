import { useTranslation } from "react-i18next";
/**
 * Inspiration gallery (TASK-21 M2): curated 做同款 cases with live
 * dependency detection — one click lands on the right tool prefilled and
 * auto-running (creation cases) or loads the flow template (canvas cases).
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Select, Spin, Tag, message } from "antd";
import { BulbOutlined } from "@ant-design/icons";
import {
  INSPIRATION_CASES,
  INSPIRATION_KINDS,
  caseHref,
  filterCases,
  missingCaseDependencies,
  type InspirationCase,
  type InspirationKind,
} from "@/services/api/inspiration";
import { engineService, type EngineModel } from "@/services/api/engine";

const DEP_LABELS: Record<string, string> = {
  chat: "对话模型",
  image_gen: "图像模型",
};

export default function InspirationPage() {  const { t } = useTranslation();

  const navigate = useNavigate();
  const [kind, setKind] = useState<InspirationKind | "all">("all");
  const [models, setModels] = useState<EngineModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void engineService.listModels().then((m) => {
      setModels(m);
      setLoading(false);
    });
  }, []);

  const cases = useMemo(() => filterCases(INSPIRATION_CASES, kind), [kind]);

  const run = (case_: InspirationCase) => {
    const missing = missingCaseDependencies(case_, models);
    if (missing.length > 0) {
      message.warning(
        `缺少${missing.map((m) => DEP_LABELS[m] ?? m).join("、")}——仍可打开查看，配置后即可运行`,
      );
    }
    navigate(caseHref(case_));
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
          <BulbOutlined className="text-[var(--color-primary)]" />
          灵感广场
        </h2>
        <Select
          value={kind}
          onChange={setKind}
          options={INSPIRATION_KINDS}
          style={{ width: 120 }}
          aria-label={t("类型筛选")}
        />
      </div>
      <p className="text-xs text-[var(--color-text-tertiary)]">
        看中哪个直接「做同款」——配置一键复刻，改个主题就是你的作品。
      </p>

      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <Spin size="large" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
          {cases.map((case_) => {
            const missing = missingCaseDependencies(case_, models);
            return (
              <button
                key={case_.id}
                onClick={() => run(case_)}
                className="text-left p-5 rounded-2xl border border-(--color-border) bg-[var(--color-bg-secondary)] hover:border-[var(--color-primary)] hover:shadow-lg transition-all"
                aria-label={t("做同款 {{p0}}", { p0: case_.title })}
              >
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{case_.icon}</span>
                  <Tag>{INSPIRATION_KINDS.find((k) => k.value === case_.kind)?.label}</Tag>
                </div>
                <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">
                  {case_.title}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                  {case_.description}
                </p>
                <p className="mt-2 text-xs">
                  {missing.length === 0 ? (
                    <span className="text-green-500">{t("依赖就绪 · 一键做同款")}</span>
                  ) : (
                    <span className="text-amber-500">
                      缺少{missing.map((m) => DEP_LABELS[m] ?? m).join("、")}
                    </span>
                  )}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
