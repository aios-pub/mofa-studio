/**
 * Octos 网关设置 — 移植自 Octos GatewayTab
 * 包含 Gateway、Hooks、Sandbox 配置
 */

import { useState } from "react";
import { Input, Typography, InputNumber, Alert, Collapse, Switch, Select, Space, Button, Form } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { OctosProfileConfig, OctosGatewaySettings, HookConfig, SandboxConfig } from "@/types/octos";

const { Text } = Typography;

interface Props {
  config: OctosProfileConfig;
  onChange: (config: OctosProfileConfig) => void;
}

export default function OctosGatewaySettingsTab({ config, onChange }: Props) {
  const [hooksForm] = Form.useForm();
  const [newHookEvent, setNewHookEvent] = useState<string>("tool_call");

  const updateGateway = (field: keyof OctosGatewaySettings, value: number | string | null) => {
    onChange({
      ...config,
      gateway: { ...config.gateway, [field]: value },
    });
  };

  const updateHooks = (hooks: HookConfig[]) => {
    onChange({
      ...config,
      hooks,
    });
  };

  const updateSandbox = (sandbox: SandboxConfig) => {
    onChange({
      ...config,
      sandbox,
    });
  };

  const addHook = () => {
    const values = hooksForm.getFieldsValue();
    const newHook: HookConfig = {
      event: values.event || "tool_call",
      command: values.command?.split(" ").filter(Boolean) || [],
      timeout_ms: values.timeout_ms,
      tool_filter: values.tool_filter?.split(",").map((s: string) => s.trim()).filter(Boolean),
    };
    updateHooks([...(config.hooks || []), newHook]);
    hooksForm.resetFields();
  };

  const removeHook = (index: number) => {
    updateHooks((config.hooks || []).filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <Alert
        type="info"
        showIcon
        title="网关设置"
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

      {/* Hooks 配置 */}
      <Collapse
        items={[
          {
            key: "hooks",
            label: <Text strong> Hooks 配置</Text>,
            children: (
              <div className="space-y-4">
                <Alert
                  type="info"
                  showIcon
                  title="事件钩子"
                  description="在指定事件发生时执行自定义命令，可用于通知、日志记录等。"
                  className="text-xs"
                />

                {/* 添加 Hook 表单 */}
                <Form form={hooksForm} layout="inline" className="mb-4">
                  <Form.Item name="event" label="事件" initialValue="tool_call">
                    <Select
                      style={{ width: 150 }}
                      options={[
                        { label: "工具调用", value: "tool_call" },
                        { label: "消息发送", value: "message_send" },
                        { label: "对话结束", value: "conversation_end" },
                        { label: "错误发生", value: "error" },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="command" label="命令">
                    <Input placeholder="/path/to/script.sh" />
                  </Form.Item>
                  <Form.Item name="timeout_ms" label="超时(ms)">
                    <InputNumber placeholder="30000" style={{ width: 120 }} />
                  </Form.Item>
                  <Form.Item name="tool_filter" label="工具过滤">
                    <Input placeholder="web_search,code_exec (逗号分隔)" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" icon={<PlusOutlined />} onClick={addHook}>
                      添加
                    </Button>
                  </Form.Item>
                </Form>

                {/* 已有 Hooks 列表 */}
                {config.hooks && config.hooks.length > 0 && (
                  <Space orientation="vertical" size={8} className="w-full">
                    {config.hooks.map((hook, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <Space orientation="vertical" size={0}>
                          <Text strong>{hook.event}</Text>
                          <Text type="secondary" className="text-xs">
                            命令: {hook.command.join(" ")}
                          </Text>
                          {hook.tool_filter && (
                            <Text type="secondary" className="text-xs">
                              过滤: {hook.tool_filter.join(", ")}
                            </Text>
                          )}
                        </Space>
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => removeHook(index)}
                        />
                      </div>
                    ))}
                  </Space>
                )}
              </div>
            ),
          },
          {
            key: "sandbox",
            label: <Text strong>沙箱配置</Text>,
            children: (
              <div className="space-y-4">
                <Alert
                  type="info"
                  showIcon
                  title="沙箱模式"
                  description="配置代码执行和安全隔离环境。Docker 模式提供最强的隔离性。"
                  className="text-xs"
                />

                <div>
                  <Text type="secondary" className="block mb-2">启用沙箱</Text>
                  <Switch
                    checked={config.sandbox?.enabled || false}
                    onChange={(v) => updateSandbox({ ...config.sandbox, enabled: v } as SandboxConfig)}
                  />
                  <div className="mt-1"><Text type="secondary" className="text-xs">启用后，代码执行将在隔离环境中运行</Text></div>
                </div>

                {config.sandbox?.enabled && (
                  <>
                    <div>
                      <Text type="secondary" className="block mb-2">沙箱模式</Text>
                      <Select
                        value={config.sandbox.mode || "auto"}
                        onChange={(v) => updateSandbox({ ...config.sandbox, mode: v } as SandboxConfig)}
                        style={{ width: 300 }}
                        options={[
                          { label: "自动（推荐）", value: "auto" },
                          { label: "Docker（最强隔离）", value: "docker" },
                          { label: "macOS 沙箱", value: "macos" },
                          { label: "Bubblewrap (Linux)", value: "bwrap" },
                        ]}
                      />
                    </div>

                    <div>
                      <Text type="secondary" className="block mb-2">允许网络访问</Text>
                      <Switch
                        checked={config.sandbox.allow_network || false}
                        onChange={(v) => updateSandbox({ ...config.sandbox, allow_network: v } as SandboxConfig)}
                      />
                      <div className="mt-1"><Text type="secondary" className="text-xs">允许沙箱内的代码访问网络</Text></div>
                    </div>

                    {config.sandbox.mode === "docker" && (
                      <div className="p-3 bg-blue-50 rounded space-y-3">
                        <Text strong className="text-sm">Docker 配置</Text>
                        <div>
                          <Text type="secondary" className="block mb-1 text-xs">镜像</Text>
                          <Input
                            value={config.sandbox.docker?.image || ""}
                            onChange={(e) => updateSandbox({
                              ...config.sandbox,
                              docker: { ...config.sandbox.docker, image: e.target.value || undefined }
                            })}
                            placeholder="python:3.11-slim"
                          />
                        </div>
                        <div>
                          <Text type="secondary" className="block mb-1 text-xs">CPU 限制</Text>
                          <Input
                            value={config.sandbox.docker?.cpu_limit || ""}
                            onChange={(e) => updateSandbox({
                              ...config.sandbox,
                              docker: { ...config.sandbox.docker, cpu_limit: e.target.value || undefined }
                            })}
                            placeholder="0.5"
                            className="w-40"
                          />
                        </div>
                        <div>
                          <Text type="secondary" className="block mb-1 text-xs">内存限制</Text>
                          <Input
                            value={config.sandbox.docker?.memory_limit || ""}
                            onChange={(e) => updateSandbox({
                              ...config.sandbox,
                              docker: { ...config.sandbox.docker, memory_limit: e.target.value || undefined }
                            })}
                            placeholder="512m"
                            className="w-40"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
