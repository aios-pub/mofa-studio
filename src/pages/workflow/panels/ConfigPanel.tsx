/**
 * 配置面板 - 右侧节点配置面板
 */

import { useState } from "react";
import { Button, Input, Select, InputNumber } from "antd";
import { DeleteOutlined, CloseOutlined } from "@ant-design/icons";
import type { Node } from "@xyflow/react";
import type { NodeConfig, NodeType } from "../../../types/workflow";
import { nodeTypeConfig } from "@/services";

import { agentApi } from "@/services";
import { useEffect } from "react";
import type { Agent } from "../../../types";

interface ConfigPanelProps {
  node: Node;
  onClose: () => void;
  onUpdate: (config: NodeConfig) => void;
  onDelete: () => void;
}

export default function ConfigPanel({
  node,
  onClose,
  onUpdate,
  onDelete,
}: ConfigPanelProps) {
  const [config, setConfig] = useState<NodeConfig>(
    node.data.config as NodeConfig,
  );
  const [agents, setAgents] = useState<Agent[]>([]);

  // 加载相关数据
  useEffect(() => {
    const loadData = async () => {
      const agentData = await agentApi.getAll();
      setAgents(agentData);
    };
    loadData();
  }, []);

  const typeInfo = nodeTypeConfig[node.type as NodeType];

  const handleUpdateLabel = (label: string) => {
    const newConfig = {
      ...config,
      config: { ...config.config, label },
    } as NodeConfig;
    setConfig(newConfig);
  };

  const handleSave = () => {
    onUpdate(config);
  };

  const handleConfigChange = (c: NodeConfig) => {
    setConfig(c);
    onUpdate(c);
  };

  return (
    <div className="w-80 border-l border-(--color-border) bg-[var(--color-bg-secondary)] flex flex-col">
      {/* 头部 */}
      <div className="p-4 border-b border-(--color-border) flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{typeInfo?.icon}</span>
          <span className="font-medium text-[var(--color-text-primary)]">
            {typeInfo?.name || "节点配置"}
          </span>
        </div>
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={onClose}
        />
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 基本信息 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              节点名称
            </label>
            <Input
              value={config.config.label}
              onChange={(e) => handleUpdateLabel(e.target.value)}
              onBlur={handleSave}
            />
          </div>

          {/* 根据Node type渲染不同配置 */}
          {config.type === "agent" && (
            <AgentConfig
              config={config}
              agents={agents}
              onChange={handleConfigChange}
            />
          )}
          {config.type === "condition" && <ConditionConfig config={config} />}
          {config.type === "http_request" && (
            <HttpRequestConfig config={config} onChange={handleConfigChange} />
          )}
          {config.type === "delay" && (
            <DelayConfig config={config} onChange={handleConfigChange} />
          )}
          {config.type === "start" && <StartConfig config={config} />}
          {config.type === "end" && <EndConfig config={config} />}
        </div>
      </div>

      {/* 底部 */}
      <div className="p-4 border-t border-(--color-border)">
        <Button danger block icon={<DeleteOutlined />} onClick={onDelete}>
          删除节点
        </Button>
      </div>
    </div>
  );
}

// Agent 配置
function AgentConfig({
  config,
  agents,
  onChange,
}: {
  config: NodeConfig;
  agents: Agent[];
  onChange: (c: NodeConfig) => void;
}) {
  const agentConfig = config as {
    type: "agent";
    config: {
      agentId?: string;
      agentName?: string;
      timeout?: number;
      retryCount?: number;
      label?: string;
    };
  };
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          选择 Agent
        </label>
        <Select
          value={agentConfig.config.agentId}
          onChange={(agentId) => {
            const agent = agents.find((a) => a.id === agentId);
            onChange({
              ...config,
              config: {
                ...agentConfig.config,
                agentId,
                agentName: agent?.name,
              },
            } as NodeConfig);
          }}
          options={agents.map((a) => ({ value: a.id, label: a.name }))}
          placeholder="选择 Agent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          超时时间 (ms)
        </label>
        <InputNumber
          value={agentConfig.config.timeout || 60000}
          onChange={(timeout) =>
            onChange({
              ...config,
              config: { ...agentConfig.config, timeout },
            } as NodeConfig)
          }
          min={1000}
          max={600000}
          className="w-full"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          重试次数
        </label>
        <InputNumber
          value={agentConfig.config.retryCount || 0}
          onChange={(retryCount) =>
            onChange({
              ...config,
              config: { ...agentConfig.config, retryCount },
            } as NodeConfig)
          }
          min={0}
          max={5}
          className="w-full"
        />
      </div>
    </div>
  );
}

// 条件配置
function ConditionConfig({ config: _config }: { config: NodeConfig }) {
  const condConfig = _config as {
    type: "condition";
    config: {
      branches?: { id: string; label: string; expression: string }[];
      label?: string;
    };
  };
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          分支配置
        </label>
        <div className="space-y-2">
          {condConfig?.config?.branches?.map((branch) => (
            <div
              key={branch.id}
              className="p-2 bg-(--color-bg-tertiary) rounded"
            >
              <div className="text-sm font-medium">{branch.label}</div>
              <div className="text-xs text-[var(--color-text-tertiary)] font-mono">
                {branch.expression}
              </div>
            </div>
          ))}
        </div>
        <Button type="dashed" size="small" className="mt-2" block>
          添加分支
        </Button>
      </div>
    </div>
  );
}

// HTTP 请求配置
function HttpRequestConfig({
  config,
  onChange,
}: {
  config: NodeConfig;
  onChange: (c: NodeConfig) => void;
}) {
  const httpConfig = config as {
    type: "http_request";
    config: { url?: string; method?: string; timeout?: number; label?: string };
  };
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          URL
        </label>
        <Input
          value={httpConfig.config.url || ""}
          onChange={(e) =>
            onChange({
              ...config,
              config: { ...httpConfig.config, url: e.target.value },
            } as NodeConfig)
          }
          placeholder="https://api.example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          Method
        </label>
        <Select
          value={httpConfig.config.method || "GET"}
          onChange={(method) =>
            onChange({
              ...config,
              config: { ...httpConfig.config, method },
            } as NodeConfig)
          }
          options={[
            { value: "GET", label: "GET" },
            { value: "POST", label: "POST" },
            { value: "PUT", label: "PUT" },
            { value: "DELETE", label: "DELETE" },
          ]}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          超时时间 (ms)
        </label>
        <InputNumber
          value={httpConfig.config.timeout || 30000}
          onChange={(timeout) =>
            onChange({
              ...config,
              config: { ...httpConfig.config, timeout },
            } as NodeConfig)
          }
          min={1000}
          max={300000}
          className="w-full"
        />
      </div>
    </div>
  );
}

// 延迟配置
function DelayConfig({
  config,
  onChange,
}: {
  config: NodeConfig;
  onChange: (c: NodeConfig) => void;
}) {
  const delayConfig = config as {
    type: "delay";
    config: { duration?: number; label?: string };
  };
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          延迟时间 (ms)
        </label>
        <InputNumber
          value={delayConfig.config.duration || 1000}
          onChange={(duration) =>
            onChange({
              ...config,
              config: { ...delayConfig.config, duration },
            } as NodeConfig)
          }
          min={100}
          max={60000}
          className="w-full"
        />
      </div>
    </div>
  );
}

// Start node configuration
function StartConfig({ config }: { config: NodeConfig }) {
  const startConfig = config as {
    type: "start";
    config: {
      inputs?: { name: string; type: string; description?: string }[];
      label?: string;
    };
  };
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          输入参数
        </label>
        <div className="space-y-2">
          {startConfig.config.inputs?.map((input, idx) => (
            <div key={idx} className="p-2 bg-(--color-bg-tertiary) rounded">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{input.name}</span>
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {input.type}
                </span>
              </div>
              {input.description && (
                <div className="text-xs text-[var(--color-text-tertiary)] mt-1">
                  {input.description}
                </div>
              )}
            </div>
          ))}
        </div>
        <Button type="dashed" size="small" className="mt-2" block>
          添加参数
        </Button>
      </div>
    </div>
  );
}

// End node configuration
function EndConfig({ config }: { config: NodeConfig }) {
  const endConfig = config as {
    type: "end";
    config: { outputs?: { name: string; source: string }[]; label?: string };
  };
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          输出映射
        </label>
        <div className="space-y-2">
          {endConfig.config.outputs?.map((output, idx) => (
            <div key={idx} className="p-2 bg-(--color-bg-tertiary) rounded">
              <div className="text-sm font-medium">{output.name}</div>
              <div className="text-xs text-[var(--color-text-tertiary)] font-mono">
                ← {output.source}
              </div>
            </div>
          ))}
        </div>
        <Button type="dashed" size="small" className="mt-2" block>
          添加输出
        </Button>
      </div>
    </div>
  );
}
