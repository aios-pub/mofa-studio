/**
 * 配置面板 - 右侧节点配置面板
 */

import { useState } from 'react';
import { Button, Input, Select, InputNumber, Switch, Divider, Collapse, Empty } from 'antd';
import { DeleteOutlined, CloseOutlined } from '@ant-design/icons';
import type { Node } from '@xyflow/react';
import type { NodeConfig, NodeType } from '../../../types/workflow';
import { nodeTypeConfig } from '../../../services/mock/workflows';

import { agentApi } from '../../../services/mock/agents';
import { promptApi } from '../../../services/mock/prompts';
import { skillApi } from '../../../services/mock/skills';
import { useEffect } from 'react';

interface ConfigPanelProps {
  node: Node;
  onClose: () => void;
  onUpdate: (config: NodeConfig) => void;
  onDelete: () => void;
}

export default function ConfigPanel({ node, onClose, onUpdate, onDelete }: ConfigPanelProps) {
  const [config, setConfig] = useState<NodeConfig>(node.data.config);
  const [agents, setAgents] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);

  // 加载相关数据
  useEffect(() => {
    const loadData = async () => {
      const [agentData, promptData, skillData] = await Promise.all([
        agentApi.getAll(),
        promptApi.getAll(),
        skillApi.getAll(),
      ]);
      setAgents(agentData);
      setPrompts(promptData);
      setSkills(skillData);
    };
    loadData();
  }, []);

  const typeInfo = nodeTypeConfig[node.type as NodeType];

  const handleUpdateLabel = (label: string) => {
    const newConfig = { ...config, config: { ...config.config, label } };
    setConfig(newConfig);
  };

  const handleSave = () => {
    onUpdate(config);
  };

  return (
    <div className="w-80 border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col">
      {/* 头部 */}
      <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{typeInfo?.icon}</span>
          <span className="font-medium text-[var(--color-text-primary)]">
            {typeInfo?.name || '节点配置'}
          </span>
        </div>
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} />
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

          {/* 根据节点类型渲染不同配置 */}
          {config.type === 'agent' && (
            <AgentConfig
              config={config}
              agents={agents}
              onChange={(c) => {
                setConfig(c);
                onUpdate(c);
              }}
            />
          )}
          {config.type === 'condition' && (
            <ConditionConfig
              config={config}
              onChange={(c) => {
                setConfig(c);
                onUpdate(c);
              }}
            />
          )}
          {config.type === 'http_request' && (
            <HttpRequestConfig
              config={config}
              onChange={(c) => {
                setConfig(c);
                onUpdate(c);
              }}
            />
          )}
          {config.type === 'delay' && (
            <DelayConfig
              config={config}
              onChange={(c) => {
                setConfig(c);
                onUpdate(c);
              }}
            />
          )}
          {config.type === 'start' && (
            <StartConfig
              config={config}
              onChange={(c) => {
                setConfig(c);
                onUpdate(c);
              }}
            />
          )}
          {config.type === 'end' && (
            <EndConfig
              config={config}
              onChange={(c) => {
                setConfig(c);
                onUpdate(c);
              }}
            />
          )}
        </div>
      </div>

      {/* 底部 */}
      <div className="p-4 border-t border-[var(--color-border)]">
        <Button danger block icon={<DeleteOutlined />} onClick={onDelete}>
          删除节点
        </Button>
      </div>
    </div>
  );
}

// Agent 配置
function AgentConfig({ config, agents, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          选择 Agent
        </label>
        <Select
          value={config.config.agentId}
          onChange={(agentId) => {
            const agent = agents.find((a: any) => a.id === agentId);
            onChange({
              ...config,
              config: { ...config.config, agentId, agentName: agent?.name },
            });
          }}
          options={agents.map((a: any) => ({ value: a.id, label: a.name }))}
          placeholder="选择 Agent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          超时时间 (ms)
        </label>
        <InputNumber
          value={config.config.timeout || 60000}
          onChange={(timeout) =>
            onChange({ ...config, config: { ...config.config, timeout } })
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
          value={config.config.retryCount || 0}
          onChange={(retryCount) =>
            onChange({ ...config, config: { ...config.config, retryCount } })
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
function ConditionConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          分支配置
        </label>
        <div className="space-y-2">
          {config.config.branches?.map((branch: any, index: number) => (
            <div key={branch.id} className="p-2 bg-[var(--color-bg-tertiary)] rounded">
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
function HttpRequestConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          URL
        </label>
        <Input
          value={config.config.url || ''}
          onChange={(e) =>
            onChange({ ...config, config: { ...config.config, url: e.target.value } })
          }
          placeholder="https://api.example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          Method
        </label>
        <Select
          value={config.config.method || 'GET'}
          onChange={(method) =>
            onChange({ ...config, config: { ...config.config, method } })
          }
          options={[
            { value: 'GET', label: 'GET' },
            { value: 'POST', label: 'POST' },
            { value: 'PUT', label: 'PUT' },
            { value: 'DELETE', label: 'DELETE' },
          ]}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          超时时间 (ms)
        </label>
        <InputNumber
          value={config.config.timeout || 30000}
          onChange={(timeout) =>
            onChange({ ...config, config: { ...config.config, timeout } })
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
function DelayConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          延迟时间 (ms)
        </label>
        <InputNumber
          value={config.config.duration || 1000}
          onChange={(duration) =>
            onChange({ ...config, config: { ...config.config, duration } })
          }
          min={100}
          max={60000}
          className="w-full"
        />
      </div>
    </div>
  );
}

// 开始节点配置
function StartConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          输入参数
        </label>
        <div className="space-y-2">
          {config.config.inputs?.map((input: any, index: number) => (
            <div key={index} className="p-2 bg-[var(--color-bg-tertiary)] rounded">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{input.name}</span>
                <span className="text-xs text-[var(--color-text-tertiary)]">{input.type}</span>
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

// 结束节点配置
function EndConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          输出映射
        </label>
        <div className="space-y-2">
          {config.config.outputs?.map((output: any, index: number) => (
            <div key={index} className="p-2 bg-[var(--color-bg-tertiary)] rounded">
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
