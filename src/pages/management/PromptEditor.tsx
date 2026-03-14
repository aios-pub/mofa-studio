/**
 * 提示词编辑器组件
 */

import { useState, useEffect, useCallback } from 'react';
import {
  SaveOutlined,
  FunctionOutlined,
  FileTextOutlined,
  CalendarOutlined,
  NumberOutlined,
  FontSizeOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import type { Prompt, PromptVariable } from '../../services/mock/prompts';
import { promptApi } from '../../services/mock/prompts';

interface PromptEditorProps {
  promptId?: string;
  onSave?: (prompt: Prompt) => void;
  onCancel?: () => void;
}

// 系统变量定义
const systemVariables = [
  { name: 'current_date', label: '当前日期', example: '2024-01-15' },
  { name: 'current_time', label: '当前时间', example: '14:30:00' },
  { name: 'current_datetime', label: '当前日期时间', example: '2024-01-15 14:30:00' },
  { name: 'user_name', label: '用户名', example: '张三' },
  { name: 'user_id', label: '用户ID', example: 'user-123' },
  { name: 'agent_name', label: 'Agent名称', example: '助手A' },
  { name: 'agent_id', label: 'Agent ID', example: 'agent-001' },
];

// 预设模板
const presetTemplates = [
  {
    id: 'translation',
    name: '翻译助手',
    category: '翻译',
    content: `你是一个专业的翻译助手。请将用户输入的内容从 {{source_language}} 翻译成 {{target_language}}。

翻译要求：
1. 保持原文的语气和风格
2. 使用地道的表达方式
3. 专业术语保持准确
4. 必要时提供注释说明`,
    variables: [
      { name: 'source_language', type: 'enum' as const, defaultValue: '英语', required: true, options: ['中文', '英语', '日语', '韩语', '法语', '德语'] },
      { name: 'target_language', type: 'enum' as const, defaultValue: '中文', required: true, options: ['中文', '英语', '日语', '韩语', '法语', '德语'] },
    ],
  },
  {
    id: 'code-review',
    name: '代码审查',
    category: '开发',
    content: `你是一个专业的代码审查助手。请根据以下规范审查代码：

项目: {{project_name}}
语言: {{language}}
审查重点: {{review_focus}}

请从以下维度进行评估：
1. 代码质量 - 可读性、可维护性
2. 性能优化 - 算法效率、资源使用
3. 安全性 - 潜在漏洞、敏感数据处理
4. 最佳实践 - 代码规范、设计模式

请提供具体的改进建议。`,
    variables: [
      { name: 'project_name', type: 'string' as const, defaultValue: '我的项目', required: true },
      { name: 'language', type: 'enum' as const, defaultValue: 'JavaScript', required: true, options: ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust'] },
      { name: 'review_focus', type: 'string' as const, defaultValue: '全部', required: false },
    ],
  },
  {
    id: 'assistant',
    name: '通用助手',
    category: '通用',
    content: `你是一个友好、专业的 AI 助手，名字叫 {{agent_name}}。

你的职责是：
1. 准确理解用户的问题
2. 提供清晰、有帮助的回答
3. 必要时请求更多信息
4. 保持专业和友好的语气

回答原则：
- 简洁明了，避免冗余
- 提供示例帮助理解
- 不确定时诚实说明
- 保护用户隐私`,
    variables: [
      { name: 'agent_name', type: 'string' as const, defaultValue: '小助手', required: true },
    ],
  },
  {
    id: 'data-analysis',
    name: '数据分析',
    category: '分析',
    content: `你是一个数据分析专家，擅长处理和解读各类数据。

可用的分析工具：
- SQL 查询
- Python 数据处理 (pandas, numpy)
- 统计分析
- 数据可视化

请根据用户的需求：
1. 理解数据结构和业务背景
2. 提供分析思路和方法
3. 编写分析代码
4. 解释结果并给出建议`,
    variables: [],
  },
];

// 变量类型映射
const variableTypes = [
  { value: 'string', label: '字符串', icon: FontSizeOutlined },
  { value: 'number', label: '数字', icon: NumberOutlined },
  { value: 'enum', label: '枚举', icon: UnorderedListOutlined },
  { value: 'date', label: '日期', icon: CalendarOutlined },
];

export default function PromptEditor({ promptId, onSave, onCancel }: PromptEditorProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'variables' | 'preview'>('content');

  // 表单状态
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('通用');
  const [content, setContent] = useState('');
  const [variables, setVariables] = useState<PromptVariable[]>([]);
  const [originalPrompt, setOriginalPrompt] = useState<Prompt | null>(null);

  // 预览状态
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});

  // 是否有修改
  const hasChanges = originalPrompt
    ? name !== originalPrompt.name ||
      description !== originalPrompt.description ||
      content !== originalPrompt.content ||
      JSON.stringify(variables) !== JSON.stringify(originalPrompt.variables)
    : name || description || content;

  // 加载提示词
  useEffect(() => {
    if (promptId) {
      loadPrompt(promptId);
    }
  }, [promptId]);

  const loadPrompt = async (id: string) => {
    try {
      setLoading(true);
      const prompt = await promptApi.getById(id);
      if (prompt) {
        setName(prompt.name);
        setDescription(prompt.description);
        setCategory(prompt.category);
        setContent(prompt.content);
        setVariables(prompt.variables);
        setOriginalPrompt(prompt);
      }
    } catch (error) {
      console.error('Failed to load prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  // 应用预设模板
  const applyTemplate = (template: typeof presetTemplates[0]) => {
    setName(template.name);
    setCategory(template.category);
    setContent(template.content);
    setVariables(template.variables.map((v) => ({ ...v, required: v.required ?? false })));
    setActiveTab('content');
  };

  // 添加变量
  const addVariable = () => {
    const newVar: PromptVariable = {
      name: `variable_${variables.length + 1}`,
      type: 'string',
      defaultValue: '',
      required: false,
    };
    setVariables([...variables, newVar]);
  };

  // 更新变量
  const updateVariable = (index: number, updates: Partial<PromptVariable>) => {
    const newVars = [...variables];
    newVars[index] = { ...newVars[index], ...updates };
    setVariables(newVars);
  };

  // 删除变量
  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  // 插入变量到内容
  const insertVariable = (varName: string) => {
    const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + `{{${varName}}}` + content.substring(end);
      setContent(newContent);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + varName.length + 4, start + varName.length + 4);
      }, 0);
    } else {
      setContent(content + `{{${varName}}}`);
    }
  };

  // 预览内容（替换变量）
  const getPreviewContent = useCallback(() => {
    let preview = content;
    // 替换自定义变量
    variables.forEach((v) => {
      const value = previewValues[v.name] || v.defaultValue || `[${v.name}]`;
      preview = preview.replace(new RegExp(`\\{\\{${v.name}\\}\\}`, 'g'), value);
    });
    // 替换系统变量
    const now = new Date();
    systemVariables.forEach((sv) => {
      let value = '';
      switch (sv.name) {
        case 'current_date':
          value = now.toLocaleDateString('zh-CN');
          break;
        case 'current_time':
          value = now.toLocaleTimeString('zh-CN');
          break;
        case 'current_datetime':
          value = now.toLocaleString('zh-CN');
          break;
        case 'user_name':
          value = '当前用户';
          break;
        case 'user_id':
          value = 'user-current';
          break;
        case 'agent_name':
          value = 'AI助手';
          break;
        case 'agent_id':
          value = 'agent-current';
          break;
      }
      preview = preview.replace(new RegExp(`\\{\\{${sv.name}\\}\\}`, 'g'), value);
    });
    return preview;
  }, [content, variables, previewValues]);

  // 保存
  const handleSave = async () => {
    if (!name.trim() || !content.trim()) {
      alert('请填写名称和内容');
      return;
    }

    try {
      setSaving(true);
      const promptData = {
        name: name.trim(),
        description: description.trim(),
        category,
        content: content.trim(),
        variables,
      };

      let savedPrompt: Prompt;
      if (originalPrompt) {
        savedPrompt = (await promptApi.update(originalPrompt.id, promptData))!;
      } else {
        savedPrompt = await promptApi.create(promptData);
      }

      setOriginalPrompt(savedPrompt);
      onSave?.(savedPrompt);
    } catch (error) {
      console.error('Failed to save prompt:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--color-text-tertiary)]">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-base)]">
      {/* 头部 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {originalPrompt ? '编辑提示词' : '新建提示词'}
          </h2>
          {hasChanges && (
            <span className="text-xs text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded">
              有未保存的更改
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            取消
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-tertiary)]"
          >
            <EyeOutlined />
            预览
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !content.trim()}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SaveOutlined />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* 左侧：预设模板 */}
          <div className="w-56 border-r border-[var(--color-border)] p-3 overflow-y-auto bg-[var(--color-bg-secondary)]">
            <h3 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">
              预设模板
            </h3>
            <div className="space-y-1">
              {presetTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  className="w-full text-left p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BulbOutlined className="text-[var(--color-primary)]" />
                    <span className="text-sm text-[var(--color-text-primary)]">{template.name}</span>
                  </div>
                  <span className="text-xs text-[var(--color-text-tertiary)]">{template.category}</span>
                </button>
              ))}
            </div>

            <h3 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2 mt-4">
              系统变量
            </h3>
            <div className="space-y-1">
              {systemVariables.map((sv) => (
                <button
                  key={sv.name}
                  onClick={() => insertVariable(sv.name)}
                  className="w-full text-left p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
                >
                  <code className="text-xs text-[var(--color-primary)]">{`{{${sv.name}}}`}</code>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{sv.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 中间：编辑区 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 基本信息表单 */}
            <div className="p-4 border-b border-[var(--color-border)] space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    名称 *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="提示词名称"
                    className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    分类
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="分类名称"
                    className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  描述
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="简短描述提示词的用途"
                  className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                />
              </div>
            </div>

            {/* 标签栏 */}
            <div className="flex border-b border-[var(--color-border)]">
              {[
                { key: 'content', label: '内容', icon: FileTextOutlined },
                { key: 'variables', label: '变量', icon: FunctionOutlined },
                { key: 'preview', label: '预览', icon: EyeOutlined },
              ].map((tab) => (
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
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'content' && (
                <textarea
                  name="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="输入提示词内容，使用 {{变量名}} 插入变量..."
                  className="w-full h-full p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)] font-mono resize-none"
                />
              )}

              {activeTab === 'variables' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                      自定义变量
                    </h3>
                    <button
                      onClick={addVariable}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)]"
                    >
                      <PlusOutlined className="text-xs" />
                      添加变量
                    </button>
                  </div>

                  {variables.length === 0 ? (
                    <div className="text-center py-8 text-[var(--color-text-tertiary)]">
                      <FunctionOutlined className="text-2xl mx-auto mb-2 opacity-50" />
                      <p>暂无自定义变量</p>
                      <p className="text-xs">点击上方按钮添加变量</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {variables.map((v, index) => (
                        <div
                          key={index}
                          className="p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <code className="text-sm text-[var(--color-primary)]">{`{{${v.name}}}`}</code>
                            <button
                              onClick={() => insertVariable(v.name)}
                              className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)]"
                            >
                              插入
                            </button>
                            <div className="flex-1" />
                            <button
                              onClick={() => removeVariable(index)}
                              className="p-1 text-[var(--color-text-tertiary)] hover:text-red-500"
                            >
                              <DeleteOutlined />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={v.name}
                              onChange={(e) => updateVariable(index, { name: e.target.value })}
                              placeholder="变量名"
                              className="px-2 py-1 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded"
                            />
                            <select
                              value={v.type}
                              onChange={(e) => updateVariable(index, { type: e.target.value as PromptVariable['type'] })}
                              className="px-2 py-1 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded"
                            >
                              {variableTypes.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={v.defaultValue || ''}
                              onChange={(e) => updateVariable(index, { defaultValue: e.target.value })}
                              placeholder="默认值"
                              className="px-2 py-1 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded"
                            />
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={v.required}
                                onChange={(e) => updateVariable(index, { required: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">必填</span>
                            </label>
                          </div>
                          {v.type === 'enum' && (
                            <div className="mt-2">
                              <input
                                type="text"
                                value={(v.options || []).join(', ')}
                                onChange={(e) =>
                                  updateVariable(index, {
                                    options: e.target.value.split(',').map((s) => s.trim()),
                                  })
                                }
                                placeholder="枚举值，用逗号分隔"
                                className="w-full px-2 py-1 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'preview' && (
                <div className="space-y-4">
                  {/* 变量输入 */}
                  {variables.length > 0 && (
                    <div className="p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg">
                      <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
                        填写变量值
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {variables.map((v) => (
                          <div key={v.name}>
                            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">
                              {v.name}
                              {v.required && <span className="text-red-500">*</span>}
                            </label>
                            {v.type === 'enum' ? (
                              <select
                                value={previewValues[v.name] || v.defaultValue || ''}
                                onChange={(e) =>
                                  setPreviewValues({ ...previewValues, [v.name]: e.target.value })
                                }
                                className="w-full px-2 py-1 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded"
                              >
                                {(v.options || []).map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={v.type === 'number' ? 'number' : v.type === 'date' ? 'date' : 'text'}
                                value={previewValues[v.name] || v.defaultValue || ''}
                                onChange={(e) =>
                                  setPreviewValues({ ...previewValues, [v.name]: e.target.value })
                                }
                                placeholder={v.defaultValue}
                                className="w-full px-2 py-1 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 预览结果 */}
                  <div className="p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg">
                    <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
                      预览结果
                    </h4>
                    <pre className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap font-mono">
                      {getPreviewContent()}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
