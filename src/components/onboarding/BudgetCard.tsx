/**
 * Budget card (PLAT-05 配额与余额): monthly USD ceiling over engine-reported
 * spend, enforced at the gateway (chat + image calls return a 429 once the
 * ceiling is hit). Mounted on the key-setup page.
 */

import { useEffect, useState } from "react";
import { Button, InputNumber, Progress, Switch, message } from "antd";
import { WalletOutlined } from "@ant-design/icons";
import {
  budgetService,
  formatUsd,
  spendRatio,
  type BudgetState,
} from "@/services/api/budget";

export default function BudgetCard() {
  const [state, setState] = useState<BudgetState | null>(null);
  const [limit, setLimit] = useState<number>(10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void budgetService.get().then((s) => {
      setState(s);
      if (s.monthly_limit_usd > 0) setLimit(s.monthly_limit_usd);
    });
  }, []);

  const save = async (enabled: boolean) => {
    setSaving(true);
    const ok = await budgetService.save(enabled, limit);
    setSaving(false);
    if (!ok) {
      message.error("保存预算失败");
      return;
    }
    message.success(enabled ? `已启用月度预算 ${formatUsd(limit)}` : "已关闭预算限额");
    setState(await budgetService.get());
  };

  const ratio = state ? spendRatio(state) : 0;

  return (
    <section
      className="rounded-xl border border-(--color-border) bg-(--color-bg-secondary) p-4 space-y-3"
      aria-label="配额与余额"
    >
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
          <WalletOutlined className="text-[var(--color-primary)]" />
          配额与余额（PLAT-05）
        </h3>
        <Switch
          checked={state?.enabled ?? false}
          loading={saving}
          onChange={(checked) => void save(checked)}
          aria-label="预算开关"
        />
      </div>

      {state?.enabled ? (
        <div className="space-y-1">
          <Progress
            percent={Math.round(ratio * 100)}
            status={ratio >= 1 ? "exception" : ratio >= 0.8 ? "active" : "normal"}
            aria-label="本月用量进度"
          />
          <p className="text-xs text-[var(--color-text-secondary)]" aria-label="预算用量文本">
            {state.month} 已用 {formatUsd(state.spent_usd)} / {formatUsd(state.monthly_limit_usd)}
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            按引擎上报的调用成本累计；超限后对话与生图会提示配额用尽，可在上方调高
          </p>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-tertiary)]">
          未启用限额：所有调用不设预算上限
        </p>
      )}

      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-text-secondary)]">月度上限（美元）</span>
        <InputNumber
          min={0.01}
          max={1000000}
          step={1}
          value={limit}
          onChange={(v) => setLimit(typeof v === "number" ? v : limit)}
          aria-label="月度预算上限"
          style={{ width: 120 }}
        />
        <Button size="small" loading={saving} onClick={() => void save(state?.enabled ?? false)}>
          保存
        </Button>
      </div>
    </section>
  );
}
