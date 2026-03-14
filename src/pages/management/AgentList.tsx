/**
 * Agent 列表页面
 */

import { useState, useEffect } from 'react';
import { Plus, Search, MoreHorizontal, Edit2, Trash2, Copy, Bot, Settings, Shield } from 'lucide-react';
import { agentApi } from '../../services/mock/agents';
import { PermissionConfig } from '../../components/permission';
import type { Agent } from '../../types';

export default function AgentListPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [_showCreateModal, setShowCreateModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

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

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个 Agent 吗？')) return;
    try {
      await agentApi.delete(id);
      setAgents(agents.filter((a) => a.id !== id));
      setContextMenu(null);
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  const handleDuplicate = async (agent: Agent) => {
    try {
      const newAgent = await agentApi.create({
        ...agent,
        name: `${agent.name} (副本)`,
      });
      setAgents([...agents, newAgent]);
      setContextMenu(null);
    } catch (error) {
      console.error('Failed to duplicate agent:', error);
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
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              placeholder="搜索 Agent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
            />
          </div>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">加载中...</div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无 Agent</p>
            </div>
          ) : (
            filteredAgents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ id: agent.id, x: e.clientX, y: e.clientY });
                }}
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenu({ id: agent.id, x: e.clientX, y: e.clientY });
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--color-bg-base)] rounded"
                  >
                    <MoreHorizontal className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                  </button>
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
              <Bot className="w-16 h-16 text-[var(--color-text-tertiary)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">选择一个 Agent</h3>
              <p className="text-[var(--color-text-secondary)]">从左侧列表中选择查看详情</p>
            </div>
          </div>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="fixed z-50 py-1 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const agent = agents.find((a) => a.id === contextMenu.id);
              if (agent) setSelectedAgent(agent);
              setContextMenu(null);
            }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
          >
            <Edit2 className="w-4 h-4" />
            编辑
          </button>
          <button
            onClick={() => {
              const agent = agents.find((a) => a.id === contextMenu.id);
              if (agent) handleDuplicate(agent);
            }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
          >
            <Copy className="w-4 h-4" />
            复制
          </button>
          <button
            onClick={() => handleDelete(contextMenu.id)}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4" />
            删除
          </button>
        </div>
      )}
    </div>
  );
}

// Agent 详情组件
function AgentDetail({ agent, onUpdate: _onUpdate }: { agent: Agent; onUpdate: () => void }) {
  const [activeTab, setActiveTab] = useState<'basic' | 'permission' | 'prompts' | 'skills' | 'tests'>('basic');

  const tabs = [
    { key: 'basic', label: '基本信息', icon: Bot },
    { key: 'permission', label: '权限配置', icon: Shield },
    { key: 'prompts', label: '关联提示词', icon: Edit2 },
    { key: 'skills', label: '关联 Skills', icon: Settings },
    { key: 'tests', label: '关联测试集', icon: Copy },
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
      <div className="flex gap-1 mb-6 border-b border-[var(--color-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

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
          <input
            type="text"
            value={agent.name}
            className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)]"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            状态
          </label>
          <input
            type="text"
            value={agent.status}
            className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)]"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            模型
          </label>
          <input
            type="text"
            value={agent.modelId}
            className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)]"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            Provider
          </label>
          <input
            type="text"
            value={agent.providerId}
            className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)]"
            readOnly
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          描述
        </label>
        <textarea
          value={agent.description}
          rows={3}
          className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)]"
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
