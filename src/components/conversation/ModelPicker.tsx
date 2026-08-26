import { useTranslation } from "react-i18next";
/**
 * Model picker for the assistant chat toolbar.
 *
 * Lists chat-capable models served by the embedded llm-gateway (mofa-engine
 * running in-process) with an "engine auto-route" default, and surfaces an
 * inline setup hint when no model provider is configured yet (add a provider
 * key in settings) instead of failing silently at send time.
 */

import { useEffect, useMemo, useState } from "react";
import { Select, Tooltip, Badge } from "antd";
import {
  AUTO_MODEL,
  engineService,
  type EngineHealth,
  type EngineModel,
} from "@/services/api/engine";

export interface ModelPickerProps {
  /** Selected model id; `AUTO_MODEL` (or empty) lets the engine route. */
  value?: string;
  onChange: (model: string) => void;
}

export default function ModelPicker({ value, onChange }: ModelPickerProps) {  const { t } = useTranslation();

  const [models, setModels] = useState<EngineModel[]>([]);
  const [health, setHealth] = useState<EngineHealth | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Load once on mount; a manual refresh happens every time the dropdown
    // reopens so newly added providers appear without an app restart.
    let cancelled = false;
    const load = async () => {
      const [h, m] = await Promise.all([
        engineService.health(),
        engineService.listChatModels(),
      ]);
      if (!cancelled) {
        setHealth(h);
        setModels(m);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    void engineService.listChatModels().then((m) => setModels(m));
  }, [open]);

  const options = useMemo(
    () => [
      {
        value: AUTO_MODEL,
        label: t("自动 · 引擎路由"),
      },
      ...models.map((m) => ({
        value: m.id,
        label: `${m.id}${m.cost_tier === "free" ? " · 免费" : ""}`,
      })),
    ],
    [models],
  );

  const engineOk = health?.reachable ?? false;
  const providerCount =
    health?.providers_configured ?? (models.length > 0 ? 1 : 0);

  return (
    <Tooltip
      title={
        !engineOk
          ? t("引擎不可用")
          : models.length === 0
            ? t(
                "内置推理引擎已就绪 · 尚未配置模型提供商，可在设置中添加 API Key",
              )
            : `mofa-engine · ${providerCount} 个提供商 · ${models.length} 个对话模型`
      }
    >
      <Select
        size="small"
        style={{ minWidth: 180 }}
        value={value || AUTO_MODEL}
        options={options}
        onChange={onChange}
        onOpenChange={setOpen}
        open={open}
        suffixIcon={
          <Badge
            dot
            status={engineOk ? "success" : "warning"}
            offset={[4, 0]}
          />
        }
        aria-label={t("模型选择")}
      />
    </Tooltip>
  );
}
