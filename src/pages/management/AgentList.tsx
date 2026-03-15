/**
 * Agent 列表页面
 */

import { useState, useEffect } from 'react';
import { Input, Button, Dropdown, message, Tabs } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  RobotOutlined,
  SettingOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { agentApi } from '../../services/mock/agents';
import { PermissionConfig } from '../../components/permission';
import type { Agent } from '../../types';

export default function AgentListPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [_showCreateModal, setShowCreateModal] = useState(false);

  const handleDelete = async (id: string) => {
    try {
      await agentApi.delete(id);
      setAgents(agents.filter((a) => a.id !== id));
      if (selectedAgent?.id === id) {
        setSelectedAgent(null);
      }
      message.success('Agent 已删除');
    } catch (error) {
      console.error('Failed to delete agent:', error);
      message.error('删除失败');
    }
  };

  const handleDuplicate = async (agent: Agent) => {
    try {
      const newAgent = await agentApi.create({
        ...agent,
        name: `${agent.name} (副本)`,
      });
      setAgents([...agents, newAgent]);
      message.success('Agent 已复制');
    } catch (error) {
      console.error('Failed to duplicate agent:', error);
      message.error('复制失败');
    }
  };

  // 获取操作菜单
  const getActionMenuItems = (agent: Agent) => [
    {
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
      onClick: () => setSelectedAgent(agent),
    },
    {
      key: 'copy',
      label: '复制',
      icon: <CopyOutlined />,
      onClick: () => handleDuplicate(agent),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDelete(agent.id),
    },
  ];

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const data = await agentApi.getAll();
      setAgents(data);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 状态颜色映射
  const statusColors: Record<string, string> = {
    idle: 'bg-green-500',
    thinking: 'bg-yellow-500',
    tool: 'bg-blue-500',
    waiting: 'bg-orange-500',
    error: 'bg-red-500',
    offline: 'bg-gray-400',
  };

  return (
    <div className="flex h-full">
      {/* 左侧列表 */}
      <div className="w-80 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg-secondary)]">
        {/* 头部 */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Agent 管理</h2>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowCreateModal(true)}
            />
          </div>

          <Input
            placeholder="搜索 Agent..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">加载中...</div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              <RobotOutlined className="text-3xl mb-2 opacity-50" />
              <p>暂无 Agent</p>
            </div>
          ) : (
            filteredAgents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedAgent?.id === agent.id
                    ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30'
                    : 'hover:bg-[var(--color-bg-tertiary)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{agent.avatar || '🤖'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--color-text-primary)] truncate">
                        {agent.name}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${statusColors[agent.status]}`} />
                    </div>
                    <p className="text-sm text-[var(--color-text-tertiary)] truncate">
                      {agent.description}
                    </p>
                  </div>
                  <Dropdown
                    menu={{ items: getActionMenuItems(agent) }}
                    trigger={['click']}
                    placement="bottomRight"
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<MoreOutlined />}
                      className="opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Dropdown>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 overflow-y-auto">
        {selectedAgent ? (
          <AgentDetail agent={selectedAgent} onUpdate={loadAgents} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RobotOutlined className="text-5xl text-[var(--color-text-tertiary)] mb-4" />
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">选择一个 Agent</h3>
              <p className="text-[var(--color-text-secondary)]">从左侧列表中选择查看详情</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Agent 详情组件
function AgentDetail({ agent, onUpdate: _onUpdate }: { agent: Agent; onUpdate: () => void }) {
  const [activeTab, setActiveTab] = useState<'basic' | 'permission' | 'prompts' | 'skills' | 'tests'>('basic');

  const tabs = [
    { key: 'basic', label: '基本信息', icon: RobotOutlined },
    { key: 'permission', label: '权限配置', icon: SafetyOutlined },
    { key: 'prompts', label: '关联提示词', icon: EditOutlined },
    { key: 'skills', label: '关联 Skills', icon: SettingOutlined },
    { key: 'tests', label: '关联测试集', icon: CopyOutlined },
  ];

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="flex items-start gap-4 mb-6">
        <div className="text-4xl">{agent.avatar || '🤖'}</div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{agent.name}</h2>
          <p className="text-[var(--color-text-secondary)]">{agent.description}</p>
        </div>
      </div>

      {/* 标签栏 */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as typeof activeTab)}
        items={tabs.map((tab) => ({
          key: tab.key,
          label: (
            <span className="flex items-center gap-2">
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </span>
          ),
        }))}
      />

      {/* 内容区 */}
      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
        {activeTab === 'basic' && <AgentBasicInfo agent={agent} />}
        {activeTab === 'permission' && <AgentPermissionInfo agent={agent} />}
        {activeTab === 'prompts' && <PlaceholderContent title="关联提示词" />}
        {activeTab === 'skills' && <PlaceholderContent title="关联 Skills" />}
        {activeTab === 'tests' && <PlaceholderContent title="关联测试集" />}
      </div>
    </div>
  );
}

// 基本信息组件
function AgentBasicInfo({ agent }: { agent: Agent }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            名称
          </label>
          <Input
            value={agent.name}
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            状态
          </label>
          <Input
            value={agent.status}
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            模型
          </label>
          <Input
            value={agent.modelId}
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            Provider
          </label>
          <Input
            value={agent.providerId}
            readOnly
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          描述
        </label>
        <Input.TextArea
          value={agent.description}
          rows={3}
          readOnly
        />
      </div>
    </div>
  );
}

// 权限信息组件
function AgentPermissionInfo({ agent }: { agent: Agent }) {
  return (
    <PermissionConfig
      agentId={agent.id}
      agentName={agent.name}
      onSave={() => {
        // 可以在这里添加保存后的回调
      }}
    />
  );
}

// 占位内容
function PlaceholderContent({ title }: { title: string }) {
  return (
    <div className="text-center py-8 text-[var(--color-text-tertiary)]">
      {title}配置功能开发中...
    </div>
  );
}
