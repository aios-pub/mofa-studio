/**
 * Octos 网关设置 — 移植自 Octos GatewayTab
 */

import { Input, Typography, InputNumber, Alert } from "antd";
import type { OctosProfileConfig, OctosGatewaySettings } from "@/types/octos";

const { Text } = Typography;

interface Props {
  config: OctosProfileConfig;
  onChange: (config: OctosProfileConfig) => void;
}

export default function OctosGatewaySettingsTab({ config, onChange }: Props) {
  const updateGateway = (field: keyof OctosGatewaySettings, value: number | string | null) => {
    onChange({
      ...config,
      gateway: { ...config.gateway, [field]: value },
    });
  };

  return (
    <div className="space-y-4">
      <Alert
        type="info"
        showIcon
        message="网关设置"
        description="配置 Agent 行为参数：对话记忆、工具调用限制、系统提示词等。"
        className="text-xs"
      />

      <div>
        <Text type="secondary" className="block mb-1">最大历史记录</Text>
        <InputNumber
          value={config.gateway.max_history ?? undefined}
          onChange={(v) => updateGateway("max_history", v ?? null)}
          placeholder="50"
          style={{ width: 200 }}
        />
        <div><Text type="secondary" className="text-xs">对话历史中保留的最大消息数</Text></div>
      </div>

      <div>
        <Text type="secondary" className="block mb-1">最大迭代次数</Text>
        <InputNumber
          value={config.gateway.max_iterations ?? undefined}
          onChange={(v) => updateGateway("max_iterations", v ?? null)}
          placeholder="50"
          style={{ width: 200 }}
        />
        <div><Text type="secondary" className="text-xs">每次 Agent 调用的最大工具调用迭代次数</Text></div>
      </div>

      <div>
        <Text type="secondary" className="block mb-1">最大并发会话</Text>
        <InputNumber
          value={config.gateway.max_concurrent_sessions ?? undefined}
          onChange={(v) => updateGateway("max_concurrent_sessions", v ?? null)}
          placeholder="10"
          style={{ width: 200 }}
        />
        <div><Text type="secondary" className="text-xs">最大并发聊天会话数（默认无限制）</Text></div>
      </div>

      <div>
        <Text type="secondary" className="block mb-1">浏览器超时（秒）</Text>
        <InputNumber
          value={config.gateway.browser_timeout_secs ?? undefined}
          onChange={(v) => updateGateway("browser_timeout_secs", v ?? null)}
          placeholder="30"
          style={{ width: 200 }}
        />
        <div><Text type="secondary" className="text-xs">无头浏览器工具操作的超时时间</Text></div>
      </div>

      <div>
        <Text type="secondary" className="block mb-1">最大输出 Tokens</Text>
        <InputNumber
          value={config.gateway.max_output_tokens ?? undefined}
          onChange={(v) => updateGateway("max_output_tokens", v ?? null)}
          placeholder="4096"
          style={{ width: 200 }}
        />
        <div><Text type="secondary" className="text-xs">每次 LLM 调用的默认最大输出 tokens</Text></div>
      </div>

      <div>
        <Text type="secondary" className="block mb-1">系统提示词</Text>
        <Input.TextArea
          value={config.gateway.system_prompt ?? ""}
          onChange={(e) => updateGateway("system_prompt", e.target.value || null)}
          placeholder="You are a helpful assistant."
          rows={4}
        />
        <div><Text type="secondary" className="text-xs">此网关实例的自定义系统提示词</Text></div>
      </div>
    </div>
  );
}
