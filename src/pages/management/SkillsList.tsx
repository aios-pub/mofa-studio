/**
 * Skills 管理页面
 */

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Zap,
  Play,
  Settings,
  Code,
  Power,
  PowerOff,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { Skill } from '../../services/mock/skills';
import { skillApi } from '../../services/mock/skills';

export default function SkillsListPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const data = await skillApi.getAll();
      setSkills(data);
    } catch (error) {
      console.error('Failed to load skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个 Skill 吗？')) return;
    try {
      await skillApi.delete(id);
      setSkills(skills.filter((s) => s.id !== id));
      setContextMenu(null);
    } catch (error) {
      console.error('Failed to delete skill:', error);
    }
  };

  const handleToggleEnabled = async (skill: Skill) => {
    try {
      const updated = await skillApi.update(skill.id, { enabled: !skill.enabled });
      if (updated) {
        setSkills(skills.map((s) => (s.id === skill.id ? updated : s)));
        if (selectedSkill?.id === skill.id) {
          setSelectedSkill(updated);
        }
      }
    } catch (error) {
      console.error('Failed to toggle skill:', error);
    }
  };

  const handleDuplicate = async (skill: Skill) => {
    try {
      const newSkill = await skillApi.create({
        ...skill,
        name: `${skill.name} (副本)`,
        type: 'custom',
      });
      setSkills([...skills, newSkill]);
      setContextMenu(null);
    } catch (error) {
      console.error('Failed to duplicate skill:', error);
    }
  };

  // 获取所有分类
  const categories = ['all', ...new Set(skills.map((s) => s.category))];

  // 过滤 Skills
  const filteredSkills = skills.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    const matchesType = selectedType === 'all' || s.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  // 按分类分组
  const groupedSkills = filteredSkills.reduce(
    (acc, skill) => {
      if (!acc[skill.category]) {
        acc[skill.category] = [];
      }
      acc[skill.category].push(skill);
      return acc;
    },
    {} as Record<string, Skill[]>
  );

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div className="flex h-full">
      {/* 左侧列表 */}
      <div className="w-80 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg-secondary)]">
        {/* 头部 */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Skills 管理</h2>
            <button className="p-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* 搜索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              placeholder="搜索 Skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
            />
          </div>

          {/* 筛选器 */}
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex-1 px-2 py-1.5 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? '全部分类' : cat}
                </option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="flex-1 px-2 py-1.5 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
            >
              <option value="all">全部类型</option>
              <option value="builtin">内置</option>
              <option value="custom">自定义</option>
              <option value="api">API</option>
            </select>
          </div>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">加载中...</div>
          ) : filteredSkills.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无 Skills</p>
            </div>
          ) : (
            Object.entries(groupedSkills).map(([category, categorySkills]) => (
              <div key={category} className="mb-2">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center gap-1 w-full px-2 py-1 text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                >
                  {expandedCategories.has(category) ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  {category} ({categorySkills.length})
                </button>
                {expandedCategories.has(category) && (
                  <div className="space-y-1 mt-1">
                    {categorySkills.map((skill) => (
                      <div
                        key={skill.id}
                        onClick={() => setSelectedSkill(skill)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ id: skill.id, x: e.clientX, y: e.clientY });
                        }}
                        className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedSkill?.id === skill.id
                            ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30'
                            : 'hover:bg-[var(--color-bg-tertiary)]'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={`p-1.5 rounded ${
                              skill.enabled
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-gray-500/10 text-gray-500'
                            }`}
                          >
                            <Zap className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[var(--color-text-primary)] truncate">
                                {skill.name}
                              </span>
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  skill.type === 'builtin'
                                    ? 'bg-blue-500/10 text-blue-500'
                                    : skill.type === 'custom'
                                      ? 'bg-purple-500/10 text-purple-500'
                                      : 'bg-orange-500/10 text-orange-500'
                                }`}
                              >
                                {skill.type === 'builtin' ? '内置' : skill.type === 'custom' ? '自定义' : 'API'}
                              </span>
                            </div>
                            <p className="text-sm text-[var(--color-text-tertiary)] truncate">
                              {skill.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-[var(--color-text-tertiary)]">
                                {skill.parameters.length} 个参数
                              </span>
                              <span className="text-xs text-[var(--color-text-tertiary)]">•</span>
                              <span className="text-xs text-[var(--color-text-tertiary)]">
                                {skill.timeout / 1000}s 超时
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleEnabled(skill);
                            }}
                            className={`p-1 rounded ${
                              skill.enabled
                                ? 'text-green-500 hover:bg-green-500/10'
                                : 'text-gray-400 hover:bg-gray-500/10'
                            }`}
                          >
                            {skill.enabled ? (
                              <Power className="w-4 h-4" />
                            ) : (
                              <PowerOff className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 overflow-y-auto">
        {selectedSkill ? (
          <SkillDetail skill={selectedSkill} onUpdate={loadSkills} onToggleEnabled={handleToggleEnabled} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Zap className="w-16 h-16 text-[var(--color-text-tertiary)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">选择一个 Skill</h3>
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
              const skill = skills.find((s) => s.id === contextMenu.id);
              if (skill) setSelectedSkill(skill);
              setContextMenu(null);
            }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
          >
            <Edit2 className="w-4 h-4" />
            编辑
          </button>
          <button
            onClick={() => {
              const skill = skills.find((s) => s.id === contextMenu.id);
              if (skill) handleDuplicate(skill);
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

// Skill 详情组件
function SkillDetail({
  skill,
  onUpdate: _onUpdate,
  onToggleEnabled,
}: {
  skill: Skill;
  onUpdate: () => void;
  onToggleEnabled: (skill: Skill) => void;
}) {
  const [activeTab, setActiveTab] = useState<'params' | 'test' | 'logs'>('params');
  const [testParams, setTestParams] = useState<Record<string, unknown>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; result: unknown } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<
    Array<{ timestamp: Date; type: 'info' | 'success' | 'error'; message: string }>
  >([]);

  useEffect(() => {
    // 初始化测试参数
    const initialParams: Record<string, unknown> = {};
    skill.parameters.forEach((p) => {
      if (p.defaultValue !== undefined) {
        initialParams[p.name] = p.defaultValue;
      }
    });
    setTestParams(initialParams);
  }, [skill]);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const startTime = Date.now();

    try {
      setExecutionLogs((prev) => [
        ...prev,
        { timestamp: new Date(), type: 'info', message: `开始执行 ${skill.name}...` },
      ]);

      const result = await skillApi.execute(skill.id, testParams);
      const duration = Date.now() - startTime;

      setTestResult(result);
      setExecutionLogs((prev) => [
        ...prev,
        {
          timestamp: new Date(),
          type: result.success ? 'success' : 'error',
          message: result.success
            ? `执行成功 (${duration}ms)`
            : `执行失败: ${result.result}`,
        },
      ]);
    } catch (error) {
      setExecutionLogs((prev) => [
        ...prev,
        {
          timestamp: new Date(),
          type: 'error',
          message: `执行错误: ${error}`,
        },
      ]);
    } finally {
      setIsTesting(false);
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-start justify-between p-6 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{skill.name}</h2>
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${
                skill.type === 'builtin'
                  ? 'bg-blue-500/10 text-blue-500'
                  : skill.type === 'custom'
                    ? 'bg-purple-500/10 text-purple-500'
                    : 'bg-orange-500/10 text-orange-500'
              }`}
            >
              {skill.type === 'builtin' ? '内置' : skill.type === 'custom' ? '自定义' : 'API'}
            </span>
          </div>
          <p className="text-[var(--color-text-secondary)]">{skill.description}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onToggleEnabled(skill)}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg ${
              skill.enabled
                ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                : 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
            }`}
          >
            {skill.enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
            {skill.enabled ? '已启用' : '已禁用'}
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]">
            <Edit2 className="w-4 h-4" />
            编辑
          </button>
        </div>
      </div>

      {/* 元信息 */}
      <div className="grid grid-cols-4 gap-4 px-6 pb-4">
        <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">分类</span>
          <p className="text-sm text-[var(--color-text-primary)]">{skill.category}</p>
        </div>
        <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">超时时间</span>
          <p className="text-sm text-[var(--color-text-primary)]">{skill.timeout / 1000}s</p>
        </div>
        <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">参数数量</span>
          <p className="text-sm text-[var(--color-text-primary)]">{skill.parameters.length}</p>
        </div>
        <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">创建时间</span>
          <p className="text-sm text-[var(--color-text-primary)]">
            {new Date(skill.createdAt).toLocaleDateString('zh-CN')}
          </p>
        </div>
      </div>

      {/* 标签栏 */}
      <div className="flex gap-1 px-6 border-b border-[var(--color-border)]">
        {[
          { key: 'params', label: '参数配置', icon: Settings },
          { key: 'test', label: '测试执行', icon: Play },
          { key: 'logs', label: '执行日志', icon: Code },
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
      <div className="flex-1 overflow-hidden">
        {activeTab === 'params' && (
          <div className="p-6 h-full overflow-y-auto">
            <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] overflow-hidden">
              <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  参数定义
                </span>
              </div>
              {skill.parameters.length === 0 ? (
                <div className="p-4 text-center text-[var(--color-text-tertiary)]">暂无参数</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left py-2 px-4 text-[var(--color-text-tertiary)]">
                        参数名
                      </th>
                      <th className="text-left py-2 px-4 text-[var(--color-text-tertiary)]">
                        类型
                      </th>
                      <th className="text-left py-2 px-4 text-[var(--color-text-tertiary)]">
                        描述
                      </th>
                      <th className="text-left py-2 px-4 text-[var(--color-text-tertiary)]">
                        默认值
                      </th>
                      <th className="text-left py-2 px-4 text-[var(--color-text-tertiary)]">
                        必填
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {skill.parameters.map((param) => (
                      <tr key={param.name} className="border-b border-[var(--color-border)]/50">
                        <td className="py-2 px-4">
                          <code className="text-[var(--color-primary)]">{param.name}</code>
                        </td>
                        <td className="py-2 px-4 text-[var(--color-text-secondary)]">
                          {param.type}
                        </td>
                        <td className="py-2 px-4 text-[var(--color-text-secondary)]">
                          {param.description}
                        </td>
                        <td className="py-2 px-4 text-[var(--color-text-secondary)]">
                          {param.defaultValue !== undefined
                            ? JSON.stringify(param.defaultValue)
                            : '-'}
                        </td>
                        <td className="py-2 px-4">
                          {param.required ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <X className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* JSON Schema 展示 */}
            <div className="mt-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] overflow-hidden">
              <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  JSON Schema
                </span>
              </div>
              <pre className="p-4 text-sm text-[var(--color-text-primary)] font-mono overflow-x-auto">
                {JSON.stringify(
                  {
                    name: skill.name,
                    description: skill.description,
                    parameters: skill.parameters.reduce(
                      (acc, p) => {
                        acc[p.name] = {
                          type: p.type,
                          description: p.description,
                          required: p.required,
                          default: p.defaultValue,
                        };
                        return acc;
                      },
                      {} as Record<string, unknown>
                    ),
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'test' && (
          <div className="p-6 h-full overflow-y-auto">
            <div className="space-y-4">
              {/* 参数输入 */}
              <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] overflow-hidden">
                <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    测试参数
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {skill.parameters.map((param) => (
                    <div key={param.name}>
                      <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] mb-1">
                        <code className="text-[var(--color-primary)]">{param.name}</code>
                        <span className="text-[var(--color-text-tertiary)]">({param.type})</span>
                        {param.required && <span className="text-red-500">*</span>}
                      </label>
                      {param.type === 'boolean' ? (
                        <select
                          value={testParams[param.name] ? 'true' : 'false'}
                          onChange={(e) =>
                            setTestParams({
                              ...testParams,
                              [param.name]: e.target.value === 'true',
                            })
                          }
                          className="w-full px-3 py-2 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : param.type === 'object' || param.type === 'array' ? (
                        <textarea
                          value={
                            typeof testParams[param.name] === 'string'
                              ? (testParams[param.name] as string)
                              : JSON.stringify(testParams[param.name] || (param.type === 'array' ? [] : {}), null, 2)
                          }
                          onChange={(e) =>
                            setTestParams({
                              ...testParams,
                              [param.name]: e.target.value,
                            })
                          }
                          placeholder={param.description}
                          rows={3}
                          className="w-full px-3 py-2 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)] font-mono"
                        />
                      ) : (
                        <input
                          type={param.type === 'number' ? 'number' : 'text'}
                          value={String(testParams[param.name] ?? '')}
                          onChange={(e) =>
                            setTestParams({
                              ...testParams,
                              [param.name]: param.type === 'number' ? Number(e.target.value) : e.target.value,
                            })
                          }
                          placeholder={param.description}
                          className="w-full px-3 py-2 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                        />
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleTest}
                    disabled={isTesting || !skill.enabled}
                    className="flex items-center justify-center gap-2 w-full py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        执行中...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        执行测试
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 执行结果 */}
              {testResult && (
                <div
                  className={`bg-[var(--color-bg-secondary)] rounded-lg border overflow-hidden ${
                    testResult.success
                      ? 'border-green-500/30'
                      : 'border-red-500/30'
                  }`}
                >
                  <div
                    className={`p-3 border-b ${
                      testResult.success
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          testResult.success ? 'text-green-500' : 'text-red-500'
                        }`}
                      >
                        {testResult.success ? '执行成功' : '执行失败'}
                      </span>
                    </div>
                  </div>
                  <pre className="p-4 text-sm text-[var(--color-text-primary)] font-mono overflow-x-auto whitespace-pre-wrap">
                    {typeof testResult.result === 'string'
                      ? testResult.result
                      : JSON.stringify(testResult.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="p-6 h-full overflow-y-auto">
            <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] h-full flex flex-col">
              <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)] flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  执行日志
                </span>
                <button
                  onClick={() => setExecutionLogs([])}
                  className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                >
                  清空日志
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 font-mono text-sm">
                {executionLogs.length === 0 ? (
                  <div className="text-center text-[var(--color-text-tertiary)] py-8">
                    暂无执行日志
                  </div>
                ) : (
                  executionLogs.map((log, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 py-1 ${
                        log.type === 'error'
                          ? 'text-red-500'
                          : log.type === 'success'
                            ? 'text-green-500'
                            : 'text-[var(--color-text-secondary)]'
                      }`}
                    >
                      <span className="text-[var(--color-text-tertiary)]">
                        [{formatTime(log.timestamp)}]
                      </span>
                      <span>{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
