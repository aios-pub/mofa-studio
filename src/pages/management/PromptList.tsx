/**
 * 提示词列表页面
 */

import { useState, useEffect } from 'react';
import { Input, Button, Tag, Dropdown, message } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  FileTextOutlined,
  CodeOutlined,
  HistoryOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { promptApi, type Prompt } from '../../services/mock/prompts';
import PromptVersionHistory from '../../components/prompt/PromptVersionHistory';
import PromptTestPanel from '../../components/prompt/PromptTestPanel';

export default function PromptListPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const data = await promptApi.getAll();
      setPrompts(data);
    } catch (error) {
      console.error('Failed to load prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await promptApi.delete(id);
      setPrompts(prompts.filter((p) => p.id !== id));
      if (selectedPrompt?.id === id) {
        setSelectedPrompt(null);
      }
      message.success('提示词已删除');
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      message.error('删除失败');
    }
  };

  const handleDuplicate = async (prompt: Prompt) => {
    try {
      const newPrompt = await promptApi.create({
        ...prompt,
        name: `${prompt.name} (副本)`,
      });
      setPrompts([...prompts, newPrompt]);
      message.success('提示词已复制');
    } catch (error) {
      console.error('Failed to duplicate prompt:', error);
      message.error('复制失败');
    }
  };

  // 获取所有分类
  const categories = ['all', ...new Set(prompts.map((p) => p.category))];

  // 过滤提示词
  const filteredPrompts = prompts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 获取操作菜单
  const getActionMenuItems = (prompt: Prompt) => [
    {
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
      onClick: () => setSelectedPrompt(prompt),
    },
    {
      key: 'copy',
      label: '复制',
      icon: <CopyOutlined />,
      onClick: () => handleDuplicate(prompt),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDelete(prompt.id),
    },
  ];

  return (
    <div className="flex h-full">
      {/* 左侧列表 */}
      <div className="w-80 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg-secondary)]">
        {/* 头部 */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">提示词管理</h2>
            <Button type="primary" icon={<PlusOutlined />} size="small" />
          </div>

          {/* 搜索 */}
          <Input
            placeholder="搜索提示词..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />

          {/* 分类筛选 */}
          <div className="flex gap-1 flex-wrap">
            {categories.map((cat) => (
              <Tag
                key={cat}
                color={selectedCategory === cat ? 'blue' : 'default'}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'all' ? '全部' : cat}
              </Tag>
            ))}
          </div>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">加载中...</div>
          ) : filteredPrompts.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              <FileTextOutlined className="text-3xl mb-2 opacity-50" />
              <p>暂无提示词</p>
            </div>
          ) : (
            filteredPrompts.map((prompt) => (
              <div
                key={prompt.id}
                onClick={() => setSelectedPrompt(prompt)}
                className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedPrompt?.id === prompt.id
                    ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30'
                    : 'hover:bg-[var(--color-bg-tertiary)]'
                }`}
              >
                <div className="flex items-start gap-2">
                  <FileTextOutlined className="flex-shrink-0 text-[var(--color-text-tertiary)] mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--color-text-primary)] truncate">
                        {prompt.name}
                      </span>
                      <span className="text-xs text-[var(--color-text-tertiary)]">v{prompt.version}</span>
                    </div>
                    <p className="text-sm text-[var(--color-text-tertiary)] truncate">
                      {prompt.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-1.5 py-0.5 bg-[var(--color-bg-base)] rounded text-[var(--color-text-tertiary)]">
                        {prompt.category}
                      </span>
                      {prompt.variables.length > 0 && (
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          {prompt.variables.length} 个变量
                        </span>
                      )}
                    </div>
                  </div>
                  <Dropdown
                    menu={{ items: getActionMenuItems(prompt) }}
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
        {selectedPrompt ? (
          <PromptDetail
            prompt={selectedPrompt}
            onUpdate={loadPrompts}
            onPreview={() => {}}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileTextOutlined className="text-5xl text-[var(--color-text-tertiary)] mb-4" />
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">选择一个提示词</h3>
              <p className="text-[var(--color-text-secondary)]">从左侧列表中选择查看详情</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 提示词详情组件
function PromptDetail({
  prompt,
  onUpdate,
  onPreview,
}: {
  prompt: Prompt;
  onUpdate: () => void;
  onPreview: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'content' | 'variables' | 'versions' | 'test'>('content');
  const [currentPrompt, setCurrentPrompt] = useState(prompt);

  // 当 prompt prop 变化时更新当前提示词
  useEffect(() => {
    setCurrentPrompt(prompt);
  }, [prompt]);

  const handleRollback = async () => {
    // 重新加载提示词数据
    onUpdate();
    const updated = await promptApi.getById(prompt.id);
    if (updated) {
      setCurrentPrompt(updated);
    }
  };

  const tabs = [
    { key: 'content', label: '内容', icon: FileTextOutlined },
    { key: 'variables', label: '变量', icon: CodeOutlined },
    { key: 'versions', label: '版本历史', icon: HistoryOutlined },
    { key: 'test', label: '测试', icon: PlayCircleOutlined },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-start justify-between p-6 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{currentPrompt.name}</h2>
          <p className="text-[var(--color-text-secondary)]">{currentPrompt.description}</p>
        </div>
        <div className="flex gap-2">
          <Button
            icon={<EyeOutlined />}
            onClick={onPreview}
          >
            预览
          </Button>
          <Button type="primary" icon={<EditOutlined />}>
            编辑
          </Button>
        </div>
      </div>

      {/* 元信息 */}
      <div className="grid grid-cols-3 gap-4 px-6 pb-4">
        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">分类</span>
          <p className="text-sm text-[var(--color-text-primary)]">{currentPrompt.category}</p>
        </div>
        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">版本</span>
          <p className="text-sm text-[var(--color-text-primary)]">v{currentPrompt.version}</p>
        </div>
        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">变量数</span>
          <p className="text-sm text-[var(--color-text-primary)]">{currentPrompt.variables.length}</p>
        </div>
      </div>

      {/* 标签栏 */}
      <div className="flex gap-1 px-6 border-b border-[var(--color-border)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Icon />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'content' && (
          <div className="p-6 h-full overflow-y-auto">
            <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
              <pre className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap font-mono">
                {currentPrompt.content}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'variables' && (
          <div className="p-6 h-full overflow-y-auto">
            <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
              {currentPrompt.variables.length === 0 ? (
                <p className="text-center text-[var(--color-text-tertiary)] py-4">暂无变量</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left py-2 text-[var(--color-text-tertiary)]">变量名</th>
                      <th className="text-left py-2 text-[var(--color-text-tertiary)]">类型</th>
                      <th className="text-left py-2 text-[var(--color-text-tertiary)]">默认值</th>
                      <th className="text-left py-2 text-[var(--color-text-tertiary)]">必填</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPrompt.variables.map((variable) => (
                      <tr key={variable.name} className="border-b border-[var(--color-border)]/50">
                        <td className="py-2">
                          <code className="text-[var(--color-primary)]">{`{{${variable.name}}}`}</code>
                        </td>
                        <td className="py-2 text-[var(--color-text-secondary)]">{variable.type}</td>
                        <td className="py-2 text-[var(--color-text-secondary)]">
                          {variable.defaultValue || '-'}
                        </td>
                        <td className="py-2">
                          {variable.required ? (
                            <span className="text-red-500">是</span>
                          ) : (
                            <span className="text-[var(--color-text-tertiary)]">否</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'versions' && (
          <div className="h-full">
            <PromptVersionHistory prompt={currentPrompt} onRollback={handleRollback} />
          </div>
        )}

        {activeTab === 'test' && (
          <div className="h-full">
            <PromptTestPanel
              prompt={currentPrompt}
              content={currentPrompt.content}
              variables={currentPrompt.variables}
            />
          </div>
        )}
      </div>
    </div>
  );
}
