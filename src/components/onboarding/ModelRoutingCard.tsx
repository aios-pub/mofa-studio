/**
 * Tiered routing settings card (PLAT-03): pick the strong planner and the
 * fast executor; unset tiers keep the engine's auto routing. Mounted on
 * the key-setup page.
 */

import { useEffect, useState } from "react";
import { Button, Select, Tag } from "antd";
import { BranchesOutlined } from "@ant-design/icons";
import { AUTO_MODEL, engineService, type EngineModel } from "@/services/api/engine";
import {
  loadPolicy,
  savePolicy,
  suggestTiers,
  type ModelRoutingPolicy,
} from "@/services/api/modelPolicy";

export default function ModelRoutingCard() {
  const [policy, setPolicy] = useState<ModelRoutingPolicy>(() => loadPolicy());
  const [models, setModels] = useState<EngineModel[]>([]);
  const [tiers, setTiers] = useState({ strong: [] as EngineModel[], fast: [] as EngineModel[] });

  useEffect(() => {
    void engineService.listModels().then((list) => {
      setModels(list);
      setTiers(suggestTiers(list));
    });
  }, []);

  const options = (role: "strong" | "fast") => [
    { value: AUTO_MODEL, label: "自动 · 引擎路由" },
    ...models.map((m) => ({
      value: m.id,
      label: `${m.id}${tiers[role].some((t) => t.id === m.id) ? (role === "strong" ? " · 强" : " · 快") : ""}`,
    })),
  ];

  const save = () => {
    savePolicy(policy);
  };

  return (
    <div className="max-w-md mx-auto mt-6 p-6 rounded-2xl border border-(--color-border) bg-[var(--color-bg-secondary)] space-y-4">
      <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
        <BranchesOutlined className="text-[var(--color-primary)]" />
        分层路由（可选）
      </h3>
      <p className="text-xs text-[var(--color-text-tertiary)]">
        规划/写作用强模型，对话执行用快模型（对标务实策略）。未设置时保持引擎自动路由；会话内的手动切换始终优先。
      </p>

      <div>
        <label className="block text-sm font-medium mb-1">
          规划模型 <Tag color="purple">强</Tag>
        </label>
        <Select
          value={policy.planner || AUTO_MODEL}
          onChange={(planner) => setPolicy((p) => ({ ...p, planner: planner === AUTO_MODEL ? "" : planner }))}
          options={options("strong")}
          style={{ width: "100%" }}
          showSearch
          aria-label="规划模型选择"
        />
        {tiers.strong.length > 0 && (
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            建议：{tiers.strong.map((m) => m.id).join("、")}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          执行模型 <Tag color="cyan">快</Tag>
        </label>
        <Select
          value={policy.executor || AUTO_MODEL}
          onChange={(executor) => setPolicy((p) => ({ ...p, executor: executor === AUTO_MODEL ? "" : executor }))}
          options={options("fast")}
          style={{ width: "100%" }}
          showSearch
          aria-label="执行模型选择"
        />
        {tiers.fast.length > 0 && (
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            建议：{tiers.fast.map((m) => m.id).join("、")}
          </p>
        )}
      </div>

      <Button block onClick={save} aria-label="保存分层路由">
        保存分层路由
      </Button>
    </div>
  );
}
