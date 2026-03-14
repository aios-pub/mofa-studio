/**
 * Agent 关联提示词选择器
 */

import { useState, useEffect } from 'react';
import { Input } from 'antd';
import { SearchOutlined, CloseOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import { promptApi } from '../../services/mock/prompts';
import type { Prompt } from '../../services/mock/prompts';

interface AgentPromptSelectorProps {
  agentId: string;
  selectedPrompts: string[];
  onChange: (prompts: string[]) => void;
}

export default function AgentPromptSelector({
  selectedPrompts,
  onChange,
}: AgentPromptSelectorProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

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

  const togglePrompt = (promptId: string) => {
    if (selectedPrompts.includes(promptId)) {
      onChange(selectedPrompts.filter((id) => id !== promptId));
    } else {
      onChange([...selectedPrompts, promptId]);
    }
  };

  const filteredPrompts = prompts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 按分类分组
  const groupedPrompts = filteredPrompts.reduce(
    (acc, prompt) => {
      if (!acc[prompt.category]) {
        acc[prompt.category] = [];
      }
      acc[prompt.category].push(prompt);
      return acc;
    },
    {} as Record<string, Prompt[]>
  );

  // 已选择的提示词
  const selectedPromptObjects = prompts.filter((p) => selectedPrompts.includes(p.id));

  return (
    <div className="space-y-4">
      {/* 已选择的提示词 */}
      {selectedPromptObjects.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-[var(--color-text-primary)]">
            已关联提示词 ({selectedPromptObjects.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedPromptObjects.map((prompt) => (
              <div
                key={prompt.id}
                className="flex items-center gap-1 px-2 py-1 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-lg"
              >
                <span className="text-sm text-[var(--color-primary)]">{prompt.name}</span>
                <button
                  onClick={() => togglePrompt(prompt.id)}
                  className="p-0.5 hover:bg-[var(--color-primary)]/20 rounded"
                >
                  <CloseOutlined className="text-xs text-[var(--color-primary)]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 搜索框 */}
      <Input
        placeholder="搜索提示词..."
        prefix={<SearchOutlined />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        allowClear
      />

      {/* 提示词列表 */}
      {loading ? (
        <div className="text-center py-4 text-[var(--color-text-tertiary)]">加载中...</div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {Object.entries(groupedPrompts).map(([category, categoryPrompts]) => (
            <div key={category}>
              <h4 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">
                {category}
              </h4>
              <div className="space-y-2">
                {categoryPrompts.map((prompt) => {
                  const isSelected = selectedPrompts.includes(prompt.id);
                  const isExpanded = expandedPrompt === prompt.id;

                  return (
                    <div
                      key={prompt.id}
                      className={`border rounded-lg overflow-hidden transition-colors ${
                        isSelected
                          ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]/30'
                          : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                      }`}
                    >
                      {/* 头部 */}
                      <div
                        className="flex items-center gap-3 p-3 cursor-pointer"
                        onClick={() => togglePrompt(prompt.id)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePrompt(prompt.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-[var(--color-border)]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[var(--color-text-primary)]">
                              {prompt.name}
                            </span>
                            <span className="text-xs text-[var(--color-text-tertiary)]">
                              v{prompt.version}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                            {prompt.description}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedPrompt(isExpanded ? null : prompt.id);
                          }}
                          className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded"
                        >
                          {isExpanded ? (
                            <UpOutlined className="text-[var(--color-text-tertiary)]" />
                          ) : (
                            <DownOutlined className="text-[var(--color-text-tertiary)]" />
                          )}
                        </button>
                      </div>

                      {/* 展开内容 */}
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-[var(--color-border)]">
                          <div className="mt-2 p-3 bg-[var(--color-bg-tertiary)] rounded-lg">
                            <pre className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap font-mono">
                              {prompt.content}
                            </pre>
                          </div>

                          {/* 变量列表 */}
                          {prompt.variables.length > 0 && (
                            <div className="mt-2">
                              <h5 className="text-xs font-medium text-[var(--color-text-tertiary)] mb-1">
                                变量
                              </h5>
                              <div className="flex flex-wrap gap-1">
                                {prompt.variables.map((variable) => (
                                  <span
                                    key={variable.name}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--color-bg-tertiary)] rounded text-xs"
                                  >
                                    <code className="text-[var(--color-primary)]">
                                      {`{{${variable.name}}}`}
                                    </code>
                                    <span className="text-[var(--color-text-tertiary)]">
                                      ({variable.type})
                                    </span>
                                    {variable.required && (
                                      <span className="text-red-500">*</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
