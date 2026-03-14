/**
 * Skills 管理页面
 */

import { useState, useEffect } from 'react';
import { Input, Button, Tag, Select, message } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  ThunderboltOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  CheckOutlined,
  CloseOutlined,
  LoadingOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  CodeOutlined,
  PoweroffOutlined,
} from '@ant-design/icons';
import type { Skill } from '../../services/mock/skills';
import { skillApi } from '../../services/mock/skills';

export default function SkillsListPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
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

  const handleToggleEnabled = async (skill: Skill) => {
    try {
      const updated = await skillApi.update(skill.id, { enabled: !skill.enabled });
      if (updated) {
        setSkills(skills.map((s) => (s.id === skill.id ? updated : s)));
        if (selectedSkill?.id === skill.id) {
          setSelectedSkill(updated);
        }
        message.success(skill.enabled ? '已禁用' : '已启用');
      }
    } catch (error) {
      console.error('Failed to toggle skill:', error);
      message.error('操作失败');
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

  const getTypeTag = (type: Skill['type']) => {
    const config: Record<Skill['type'], { color: string; label: string }> = {
      builtin: { color: 'blue', label: '内置' },
      custom: { color: 'purple', label: '自定义' },
      api: { color: 'orange', label: 'API' },
    };
    return <Tag color={config[type].color}>{config[type].label}</Tag>;
  };

  return (
    <div className="flex h-full">
      {/* 左侧列表 */}
      <div className="w-80 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg-secondary)]">
        {/* 头部 */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Skills 管理</h2>
            <Button type="primary" icon={<PlusOutlined />} size="small" />
          </div>

          {/* 搜索 */}
          <Input
            placeholder="搜索 Skills..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />

          {/* 筛选器 */}
          <div className="flex gap-2">
            <Select
              value={selectedCategory}
              onChange={setSelectedCategory}
              style={{ flex: 1 }}
              size="small"
              options={categories.map((cat) => ({
                label: cat === 'all' ? '全部分类' : cat,
                value: cat,
              }))}
            />
            <Select
              value={selectedType}
              onChange={setSelectedType}
              style={{ flex: 1 }}
              size="small"
              options={[
                { label: '全部类型', value: 'all' },
                { label: '内置', value: 'builtin' },
                { label: '自定义', value: 'custom' },
                { label: 'API', value: 'api' },
              ]}
            />
          </div>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">加载中...</div>
          ) : filteredSkills.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              <ThunderboltOutlined className="text-3xl mb-2 opacity-50" />
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
                    <CaretDownOutlined className="text-xs" />
                  ) : (
                    <CaretRightOutlined className="text-xs" />
                  )}
                  {category} ({categorySkills.length})
                </button>
                {expandedCategories.has(category) && (
                  <div className="space-y-1 mt-1">
                    {categorySkills.map((skill) => (
                      <div
                        key={skill.id}
                        onClick={() => setSelectedSkill(skill)}
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
                            <ThunderboltOutlined className="text-sm" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[var(--color-text-primary)] truncate">
                                {skill.name}
                              </span>
                              {getTypeTag(skill.type)}
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
                          <Button
                            type="text"
                            size="small"
                            icon={<PoweroffOutlined />}
                            className={skill.enabled ? 'text-green-500' : 'text-gray-400'}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleEnabled(skill);
                            }}
                          />
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
              <ThunderboltOutlined className="text-5xl text-[var(--color-text-tertiary)] mb-4" />
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">选择一个 Skill</h3>
              <p className="text-[var(--color-text-secondary)]">从左侧列表中选择查看详情</p>
            </div>
          </div>
        )}
      </div>
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

  const getTypeTag = (type: Skill['type']) => {
    const config: Record<Skill['type'], { color: string; label: string }> = {
      builtin: { color: 'blue', label: '内置' },
      custom: { color: 'purple', label: '自定义' },
      api: { color: 'orange', label: 'API' },
    };
    return <Tag color={config[type].color}>{config[type].label}</Tag>;
  };

  const tabs = [
    { key: 'params', label: '参数配置', icon: SettingOutlined },
    { key: 'test', label: '测试执行', icon: PlayCircleOutlined },
    { key: 'logs', label: '执行日志', icon: CodeOutlined },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-start justify-between p-6 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{skill.name}</h2>
            {getTypeTag(skill.type)}
          </div>
          <p className="text-[var(--color-text-secondary)]">{skill.description}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => onToggleEnabled(skill)}
            className={skill.enabled ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'}
          >
            <PoweroffOutlined className="mr-1" />
            {skill.enabled ? '已启用' : '已禁用'}
          </Button>
          <Button type="primary" icon={<EditOutlined />}>
            编辑
          </Button>
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
                            <CheckOutlined className="text-green-500" />
                          ) : (
                            <CloseOutlined className="text-[var(--color-text-tertiary)]" />
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
                      <Input
                        value={String(testParams[param.name] ?? '')}
                        onChange={(e) =>
                          setTestParams({
                            ...testParams,
                            [param.name]: param.type === 'number' ? Number(e.target.value) : e.target.value,
                          })
                        }
                        placeholder={param.description}
                      />
                    </div>
                  ))}
                  <Button
                    type="primary"
                    icon={isTesting ? <LoadingOutlined /> : <PlayCircleOutlined />}
                    onClick={handleTest}
                    disabled={isTesting || !skill.enabled}
                    block
                  >
                    {isTesting ? '执行中...' : '执行测试'}
                  </Button>
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
                        <CheckOutlined className="text-green-500" />
                      ) : (
                        <CloseOutlined className="text-red-500" />
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
                <Button
                  type="text"
                  size="small"
                  onClick={() => setExecutionLogs([])}
                >
                  清空日志
                </Button>
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
