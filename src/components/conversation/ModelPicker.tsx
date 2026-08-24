/**
 * Model picker for the assistant chat toolbar.
 *
 * Lists chat-capable models served by the llm-gateway (mofa-engine) with an
 * "engine auto-route" default, and surfaces an inline setup hint when the
 * engine is not reachable (install Ollama / add a provider key / start the
 * engine binary) instead of failing silently at send time.
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

export default function ModelPicker({ value, onChange }: ModelPickerProps) {
  const [models, setModels] = useState<EngineModel[]>([]);
  const [health, setHealth] = useState<EngineHealth | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Load once on mount; a manual refresh happens every time the dropdown
    // reopens so newly started engines appear without an app restart.
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
        label: "自动 · 引擎路由",
      },
      ...models.map((m) => ({
        value: m.id,
        label: `${m.id}${m.cost_tier === "free" ? " · 免费" : ""}`,
      })),
    ],
    [models],
  );

  const engineOk = health?.reachable ?? false;

  return (
    <Tooltip
      title={
        engineOk
          ? `mofa-engine ${health?.version ?? ""} · ${models.length} 个对话模型`
          : "mofa-engine 未运行：启动引擎（cargo run --release）并确保 Ollama 或任一厂商 API Key 可用，或设置 MOFA_ENGINE_URL"
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
        aria-label="模型选择"
      />
    </Tooltip>
  );
}
