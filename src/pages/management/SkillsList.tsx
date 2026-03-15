/**
 * Skills 管理页面
 */

import { useState, useEffect } from 'react';
import { Input, Button, Tag, Select, message, Tabs, Collapse, Typography, Card, Statistic } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  ThunderboltOutlined,
  CheckOutlined,
  CloseOutlined,
  LoadingOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  CodeOutlined,
  PoweroffOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import type { Skill } from '../../services/mock/skills';
import { skillApi } from '../../services/mock/skills';

const { Text, Title } = Typography;

export default function SkillsListPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

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

  const handleCategoryChange = (keys: string | string[]) => {
    setExpandedCategories(Array.isArray(keys) ? keys : [keys]);
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
        <div className="p-4 space-y-3 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <Title level={5} style={{ margin: 0 }}>Skills 管理</Title>
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
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <Text type="secondary">加载中...</Text>
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="text-center py-8">
              <ThunderboltOutlined style={{ fontSize: 24, opacity: 0.5, marginBottom: 8, display: 'block' }} />
              <Text type="secondary">暂无 Skills</Text>
            </div>
          ) : (
            <Collapse
              activeKey={expandedCategories}
              onChange={handleCategoryChange}
              expandIconPosition="start"
              bordered={false}
              style={{ background: 'transparent' }}
              items={Object.entries(groupedSkills).map(([category, categorySkills]) => ({
                key: category,
                label: (
                  <div className="flex items-center gap-2">
                    <FolderOutlined style={{ fontSize: 12 }} />
                    <Text strong style={{ fontSize: 13 }}>{category}</Text>
                    <Tag style={{ marginLeft: 4, fontSize: 11 }}>{categorySkills.length}</Tag>
                  </div>
                ),
                children: (
                  <div className="space-y-1">
                    {categorySkills.map((skill) => (
                      <div
                        key={skill.id}
                        onClick={() => setSelectedSkill(skill)}
                        className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                          selectedSkill?.id === skill.id
                            ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30'
                            : 'hover:bg-[var(--color-bg-tertiary)] border border-transparent'
                        }`}
                      >
                        <div
                          className={`flex-shrink-0 p-1.5 rounded ${
                            skill.enabled
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-gray-500/10 text-gray-500'
                          }`}
                        >
                          <ThunderboltOutlined style={{ fontSize: 12 }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Text strong ellipsis style={{ fontSize: 13 }}>{skill.name}</Text>
                            {getTypeTag(skill.type)}
                          </div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {skill.parameters.length} 个参数 · {skill.timeout / 1000}s 超时
                          </Text>
                        </div>
                        <Button
                          type="text"
                          size="small"
                          icon={<PoweroffOutlined />}
                          className={`flex-shrink-0 ${skill.enabled ? 'text-green-500' : 'text-gray-400'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleEnabled(skill);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ),
              }))}
            />
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
              <ThunderboltOutlined style={{ fontSize: 48, color: 'var(--color-text-tertiary)', marginBottom: 16 }} />
              <Title level={5} type="secondary">选择一个 Skill</Title>
              <Text type="secondary">从左侧列表中选择查看详情</Text>
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
            <Title level={4} style={{ margin: 0 }}>{skill.name}</Title>
            {getTypeTag(skill.type)}
          </div>
          <Text type="secondary">{skill.description}</Text>
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
        <Card size="small" bordered={false} style={{ background: 'var(--color-bg-secondary)' }}>
          <Statistic title={<Text type="secondary" style={{ fontSize: 12 }}>分类</Text>} value={skill.category} valueStyle={{ fontSize: 14 }} />
        </Card>
        <Card size="small" bordered={false} style={{ background: 'var(--color-bg-secondary)' }}>
          <Statistic title={<Text type="secondary" style={{ fontSize: 12 }}>超时时间</Text>} value={skill.timeout / 1000} suffix="s" valueStyle={{ fontSize: 14 }} />
        </Card>
        <Card size="small" bordered={false} style={{ background: 'var(--color-bg-secondary)' }}>
          <Statistic title={<Text type="secondary" style={{ fontSize: 12 }}>参数数量</Text>} value={skill.parameters.length} valueStyle={{ fontSize: 14 }} />
        </Card>
        <Card size="small" bordered={false} style={{ background: 'var(--color-bg-secondary)' }}>
          <Statistic
            title={<Text type="secondary" style={{ fontSize: 12 }}>创建时间</Text>}
            value={new Date(skill.createdAt).toLocaleDateString('zh-CN')}
            valueStyle={{ fontSize: 14 }}
          />
        </Card>
      </div>

      {/* 标签栏 */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as typeof activeTab)}
        items={tabs.map((tab) => ({
          key: tab.key,
          label: (
            <span className="flex items-center gap-2">
              <tab.icon />
              {tab.label}
            </span>
          ),
        }))}
        className="px-6"
      />

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
