/**
 * 测试集管理页面
 */

import { useState, useEffect } from 'react';
import { Input, Button, Tag, Select, message, Tabs, Collapse, Typography, Card, Statistic } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ExperimentOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import type { TestSet, TestCase, TestReport, TestCaseStatus } from '../../types/testset';
import { testSetApi } from '../../services/mock/testsets';

const { Text, Title } = Typography;

export default function TestSetsListPage() {
  const [testSets, setTestSets] = useState<TestSet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTestSet, setSelectedTestSet] = useState<TestSet | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  useEffect(() => {
    loadTestSets();
  }, []);

  const loadTestSets = async () => {
    try {
      setLoading(true);
      const data = await testSetApi.getAll();
      setTestSets(data);
    } catch (error) {
      console.error('Failed to load test sets:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取所有分类
  const categories = ['all', ...new Set(testSets.map((t) => t.category))];

  // 过滤测试集
  const filteredTestSets = testSets.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 按分类分组
  const groupedTestSets = filteredTestSets.reduce(
    (acc, testSet) => {
      if (!acc[testSet.category]) {
        acc[testSet.category] = [];
      }
      acc[testSet.category].push(testSet);
      return acc;
    },
    {} as Record<string, TestSet[]>
  );

  const handleCategoryChange = (keys: string | string[]) => {
    setExpandedCategories(Array.isArray(keys) ? keys : [keys]);
  };

  const handleDelete = (id: string) => {
    setTestSets(testSets.filter((t) => t.id !== id));
    if (selectedTestSet?.id === id) {
      setSelectedTestSet(null);
    }
    message.success('测试集已删除');
  };

  const handleDuplicate = async (testSet: TestSet) => {
    const newTestSet: TestSet = {
      ...testSet,
      id: `testset-${Date.now()}`,
      name: `${testSet.name} (副本)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTestSets([...testSets, newTestSet]);
    message.success('测试集已复制');
  };

  return (
    <div className="flex h-full">
      {/* 左侧列表 */}
      <div className="w-80 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg-secondary)]">
        {/* 头部 */}
        <div className="p-4 space-y-3 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <Title level={5} style={{ margin: 0 }}>测试集管理</Title>
            <Button type="primary" icon={<PlusOutlined />} size="small" />
          </div>

          {/* 搜索 */}
          <Input
            placeholder="搜索测试集..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />

          {/* 分类筛选 */}
          <Select
            value={selectedCategory}
            onChange={setSelectedCategory}
            style={{ width: '100%' }}
            size="small"
            options={categories.map((cat) => ({
              label: cat === 'all' ? '全部分类' : cat,
              value: cat,
            }))}
          />
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <Text type="secondary">加载中...</Text>
            </div>
          ) : filteredTestSets.length === 0 ? (
            <div className="text-center py-8">
              <ExperimentOutlined style={{ fontSize: 24, opacity: 0.5, marginBottom: 8, display: 'block' }} />
              <Text type="secondary">暂无测试集</Text>
            </div>
          ) : (
            <Collapse
              activeKey={expandedCategories}
              onChange={handleCategoryChange}
              expandIconPosition="start"
              bordered={false}
              style={{ background: 'transparent' }}
              items={Object.entries(groupedTestSets).map(([category, categoryTestSets]) => ({
                key: category,
                label: (
                  <div className="flex items-center gap-2">
                    <FolderOutlined style={{ fontSize: 12 }} />
                    <Text strong style={{ fontSize: 13 }}>{category}</Text>
                    <Tag style={{ marginLeft: 4, fontSize: 11 }}>{categoryTestSets.length}</Tag>
                  </div>
                ),
                children: (
                  <div className="space-y-1">
                    {categoryTestSets.map((testSet) => (
                      <div
                        key={testSet.id}
                        onClick={() => setSelectedTestSet(testSet)}
                        className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                          selectedTestSet?.id === testSet.id
                            ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30'
                            : 'hover:bg-[var(--color-bg-tertiary)] border border-transparent'
                        }`}
                      >
                        <div
                          className={`flex-shrink-0 p-1.5 rounded ${
                            testSet.status === 'running'
                              ? 'bg-blue-500/10 text-blue-500'
                              : testSet.passRate !== undefined && testSet.passRate >= 80
                                ? 'bg-green-500/10 text-green-500'
                                : testSet.passRate !== undefined && testSet.passRate < 80
                                  ? 'bg-red-500/10 text-red-500'
                                  : 'bg-gray-500/10 text-gray-500'
                          }`}
                        >
                          <ExperimentOutlined style={{ fontSize: 12 }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Text strong ellipsis style={{ display: 'block', fontSize: 13 }}>
                            {testSet.name}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {testSet.cases.length} 个用例
                            {testSet.passRate !== undefined && (
                              <Tag
                                color={
                                  testSet.passRate >= 80 ? 'success' :
                                  testSet.passRate >= 60 ? 'warning' : 'error'
                                }
                                style={{ marginLeft: 8, fontSize: 11 }}
                              >
                                {testSet.passRate.toFixed(0)}% 通过
                              </Tag>
                            )}
                          </Text>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(testSet);
                            }}
                          />
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(testSet.id);
                            }}
                          />
                        </div>
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
      <div className="flex-1 overflow-hidden">
        {selectedTestSet ? (
          <TestSetDetail testSet={selectedTestSet} onUpdate={loadTestSets} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <ExperimentOutlined style={{ fontSize: 48, color: 'var(--color-text-tertiary)', marginBottom: 16 }} />
              <Title level={5} type="secondary">选择一个测试集</Title>
              <Text type="secondary">从左侧列表中选择查看详情</Text>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 测试集详情组件
function TestSetDetail({
  testSet,
  onUpdate,
}: {
  testSet: TestSet;
  onUpdate: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'cases' | 'run' | 'report'>('cases');
  const [isRunning, setIsRunning] = useState(false);
  const [runningCaseId, setRunningCaseId] = useState<string | null>(null);
  const [currentReport, setCurrentReport] = useState<TestReport | null>(null);
  const [caseResults, setCaseResults] = useState<
    Map<string, { status: TestCaseStatus; output: string; duration: number }>
  >(new Map());

  const handleRunAll = async () => {
    setIsRunning(true);
    setCaseResults(new Map());
    setCurrentReport(null);

    try {
      // 使用 'agent-1' 作为模拟 agent
      const report = await testSetApi.runTestSet('agent-1', testSet.id);
      setCurrentReport(report);

      // 更新用例结果
      const newResults = new Map<string, { status: TestCaseStatus; output: string; duration: number }>();
      report.cases.forEach((c) => {
        newResults.set(c.caseId, {
          status: c.status,
          output: c.actualOutput || '',
          duration: c.duration,
        });
      });
      setCaseResults(newResults);

      onUpdate();
    } catch (error) {
      console.error('Failed to run test set:', error);
    } finally {
      setIsRunning(false);
      setRunningCaseId(null);
    }
  };

  const handleRunSingle = async (testCase: TestCase) => {
    setRunningCaseId(testCase.id);
    try {
      const result = await testSetApi.runTestCase('agent-1', testCase);
      const newResults = new Map(caseResults);
      newResults.set(testCase.id, {
        status: result.status,
        output: result.output,
        duration: result.duration,
      });
      setCaseResults(newResults);
    } catch (error) {
      console.error('Failed to run test case:', error);
    } finally {
      setRunningCaseId(null);
    }
  };

  const getPassRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-500';
    if (rate >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const tabs = [
    { key: 'cases', label: '测试用例', icon: FileTextOutlined },
    { key: 'run', label: '执行详情', icon: PlayCircleOutlined },
    { key: 'report', label: '测试报告', icon: BarChartOutlined },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-start justify-between p-6 pb-4">
        <div>
          <Title level={4} style={{ margin: 0 }}>{testSet.name}</Title>
          <Text type="secondary">{testSet.description}</Text>
        </div>
        <div className="flex gap-2">
          <Button
            type="primary"
            icon={isRunning ? <LoadingOutlined /> : <PlayCircleOutlined />}
            onClick={handleRunAll}
            disabled={isRunning}
            style={{ backgroundColor: '#22c55e' }}
          >
            {isRunning ? '运行中...' : '运行全部'}
          </Button>
          <Button type="primary" icon={<EditOutlined />}>
            编辑
          </Button>
        </div>
      </div>

      {/* 元信息 */}
      <div className="grid grid-cols-4 gap-4 px-6 pb-4">
        <Card size="small" bordered={false} style={{ background: 'var(--color-bg-secondary)' }}>
          <Statistic title={<Text type="secondary" style={{ fontSize: 12 }}>分类</Text>} value={testSet.category} valueStyle={{ fontSize: 14 }} />
        </Card>
        <Card size="small" bordered={false} style={{ background: 'var(--color-bg-secondary)' }}>
          <Statistic title={<Text type="secondary" style={{ fontSize: 12 }}>用例数</Text>} value={testSet.cases.length} valueStyle={{ fontSize: 14 }} />
        </Card>
        <Card size="small" bordered={false} style={{ background: 'var(--color-bg-secondary)' }}>
          <Statistic
            title={<Text type="secondary" style={{ fontSize: 12 }}>通过率</Text>}
            value={testSet.passRate !== undefined ? testSet.passRate.toFixed(0) : '-'}
            suffix={testSet.passRate !== undefined ? '%' : ''}
            valueStyle={{
              fontSize: 14,
              color: testSet.passRate !== undefined
                ? (testSet.passRate >= 80 ? '#22c55e' : testSet.passRate >= 60 ? '#eab308' : '#ef4444')
                : undefined
            }}
          />
        </Card>
        <Card size="small" bordered={false} style={{ background: 'var(--color-bg-secondary)' }}>
          <Statistic
            title={<Text type="secondary" style={{ fontSize: 12 }}>总耗时</Text>}
            value={testSet.totalDuration ? (testSet.totalDuration / 1000).toFixed(1) : '-'}
            suffix={testSet.totalDuration ? 's' : ''}
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
        {activeTab === 'cases' && (
          <div className="p-6 h-full overflow-y-auto">
            <div className="space-y-3">
              {testSet.cases.map((testCase) => {
                const result = caseResults.get(testCase.id);
                return (
                  <div
                    key={testCase.id}
                    className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--color-text-primary)]">
                              {testCase.name}
                            </span>
                            {result && (
                              <span
                                className={`flex items-center gap-1 text-xs ${
                                  result.status === 'passed' ? 'text-green-500' : 'text-red-500'
                                }`}
                              >
                                {result.status === 'passed' ? (
                                  <CheckCircleOutlined className="text-sm" />
                                ) : (
                                  <CloseCircleOutlined className="text-sm" />
                                )}
                                {result.status === 'passed' ? '通过' : '失败'}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--color-text-tertiary)] mt-0.5">
                            {testCase.description}
                          </p>
                        </div>
                        <Button
                          size="small"
                          icon={runningCaseId === testCase.id ? <LoadingOutlined /> : <PlayCircleOutlined />}
                          onClick={() => handleRunSingle(testCase)}
                          disabled={isRunning || runningCaseId === testCase.id}
                        >
                          运行
                        </Button>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-[var(--color-text-tertiary)]">输入</span>
                          <p className="mt-1 text-sm text-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)] p-2 rounded font-mono">
                            {testCase.input || '(空)'}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-[var(--color-text-tertiary)]">期望输出</span>
                          <p className="mt-1 text-sm text-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)] p-2 rounded">
                            {testCase.expectedOutput}
                          </p>
                        </div>
                      </div>

                      {result && (
                        <div className="mt-3">
                          <span className="text-xs text-[var(--color-text-tertiary)]">实际输出</span>
                          <p
                            className={`mt-1 text-sm p-2 rounded font-mono ${
                              result.status === 'passed'
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {result.output}
                          </p>
                        </div>
                      )}

                      <div className="mt-3">
                        <span className="text-xs text-[var(--color-text-tertiary)]">断言 ({testCase.assertions.length})</span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {testCase.assertions.map((assertion) => (
                            <Tag key={assertion.id}>
                              {assertion.type}: {assertion.value}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'run' && (
          <div className="p-6 h-full overflow-y-auto">
            {isRunning ? (
              <div className="flex flex-col items-center justify-center py-12">
                <LoadingOutlined className="text-4xl text-[var(--color-primary)] mb-4" />
                <p className="text-[var(--color-text-primary)] font-medium">正在执行测试...</p>
                <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
                  请稍候，测试用例正在逐一执行
                </p>
              </div>
            ) : caseResults.size > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <CheckCircleOutlined className="text-green-500" />
                      <span className="text-sm text-[var(--color-text-secondary)]">通过</span>
                    </div>
                    <p className="text-2xl font-semibold text-green-500 mt-2">
                      {Array.from(caseResults.values()).filter((r) => r.status === 'passed').length}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <CloseCircleOutlined className="text-red-500" />
                      <span className="text-sm text-[var(--color-text-secondary)]">失败</span>
                    </div>
                    <p className="text-2xl font-semibold text-red-500 mt-2">
                      {Array.from(caseResults.values()).filter((r) => r.status === 'failed').length}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <ClockCircleOutlined className="text-[var(--color-text-tertiary)]" />
                      <span className="text-sm text-[var(--color-text-secondary)]">总耗时</span>
                    </div>
                    <p className="text-2xl font-semibold text-[var(--color-text-primary)] mt-2">
                      {Array.from(caseResults.values()).reduce((sum, r) => sum + r.duration, 0) / 1000}s
                    </p>
                  </div>
                </div>

                <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                  <div className="p-3 border-b border-[var(--color-border)]">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      执行结果
                    </span>
                  </div>
                  <div className="divide-y divide-[var(--color-border)]">
                    {testSet.cases.map((testCase) => {
                      const result = caseResults.get(testCase.id);
                      return (
                        <div key={testCase.id} className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {result?.status === 'passed' ? (
                              <CheckCircleOutlined className="text-green-500" />
                            ) : result?.status === 'failed' ? (
                              <CloseCircleOutlined className="text-red-500" />
                            ) : (
                              <ClockCircleOutlined className="text-[var(--color-text-tertiary)]" />
                            )}
                            <span className="text-sm text-[var(--color-text-primary)]">
                              {testCase.name}
                            </span>
                          </div>
                          {result && (
                            <span className="text-xs text-[var(--color-text-tertiary)]">
                              {result.duration}ms
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-tertiary)]">
                <PlayCircleOutlined className="text-4xl mb-4 opacity-50" />
                <p>点击"运行全部"开始执行测试</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'report' && (
          <div className="p-6 h-full overflow-y-auto">
            {currentReport ? (
              <div className="space-y-4">
                {/* 概览统计 */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <span className="text-xs text-[var(--color-text-tertiary)]">总用例</span>
                    <p className="text-xl font-semibold text-[var(--color-text-primary)] mt-1">
                      {currentReport.totalCases}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <span className="text-xs text-[var(--color-text-tertiary)]">通过</span>
                    <p className="text-xl font-semibold text-green-500 mt-1">
                      {currentReport.passedCases}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <span className="text-xs text-[var(--color-text-tertiary)]">失败</span>
                    <p className="text-xl font-semibold text-red-500 mt-1">
                      {currentReport.failedCases}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <span className="text-xs text-[var(--color-text-tertiary)]">通过率</span>
                    <p className={`text-xl font-semibold mt-1 ${getPassRateColor(currentReport.passRate)}`}>
                      {currentReport.passRate.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* 详细结果 */}
                <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                  <div className="p-3 border-b border-[var(--color-border)]">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      详细结果
                    </span>
                  </div>
                  <div className="divide-y divide-[var(--color-border)]">
                    {currentReport.cases.map((reportCase) => (
                      <div key={reportCase.caseId} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {reportCase.status === 'passed' ? (
                              <CheckCircleOutlined className="text-green-500" />
                            ) : (
                              <CloseCircleOutlined className="text-red-500" />
                            )}
                            <span className="font-medium text-[var(--color-text-primary)]">
                              {reportCase.caseName}
                            </span>
                          </div>
                          <span className="text-xs text-[var(--color-text-tertiary)]">
                            {reportCase.duration}ms
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-[var(--color-text-tertiary)]">输入:</span>
                            <p className="mt-1 p-2 bg-[var(--color-bg-tertiary)] rounded font-mono">
                              {reportCase.input}
                            </p>
                          </div>
                          <div>
                            <span className="text-[var(--color-text-tertiary)]">期望:</span>
                            <p className="mt-1 p-2 bg-[var(--color-bg-tertiary)] rounded">
                              {reportCase.expectedOutput}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3">
                          <span className="text-sm text-[var(--color-text-tertiary)]">实际输出:</span>
                          <p
                            className={`mt-1 p-2 rounded text-sm font-mono ${
                              reportCase.status === 'passed'
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {reportCase.actualOutput}
                          </p>
                        </div>

                        <div className="mt-3">
                          <span className="text-xs text-[var(--color-text-tertiary)]">断言结果:</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {reportCase.assertions.map((assertion, index) => (
                              <Tag
                                key={index}
                                color={assertion.passed ? 'success' : 'error'}
                              >
                                {assertion.passed ? '✓' : '✗'} {assertion.message}
                              </Tag>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-tertiary)]">
                <BarChartOutlined className="text-4xl mb-4 opacity-50" />
                <p>运行测试后查看详细报告</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
