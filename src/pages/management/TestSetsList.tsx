/**
 * 测试集管理页面
 */

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  FlaskConical,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Loader2,
  BarChart3,
  FileText,
} from 'lucide-react';
import type { TestSet, TestCase, TestReport, TestCaseStatus } from '../../types/testset';
import { testSetApi } from '../../services/mock/testsets';

export default function TestSetsListPage() {
  const [testSets, setTestSets] = useState<TestSet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTestSet, setSelectedTestSet] = useState<TestSet | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

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

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDelete = (id: string) => {
    if (!confirm('确定要删除这个测试集吗？')) return;
    setTestSets(testSets.filter((t) => t.id !== id));
    if (selectedTestSet?.id === id) {
      setSelectedTestSet(null);
    }
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
  };

  return (
    <div className="flex h-full">
      {/* 左侧列表 */}
      <div className="w-80 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg-secondary)]">
        {/* 头部 */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">测试集管理</h2>
            <button className="p-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* 搜索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              placeholder="搜索测试集..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
            />
          </div>

          {/* 分类筛选 */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? '全部分类' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">加载中...</div>
          ) : filteredTestSets.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              <FlaskConical className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无测试集</p>
            </div>
          ) : (
            Object.entries(groupedTestSets).map(([category, categoryTestSets]) => (
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
                  {category} ({categoryTestSets.length})
                </button>
                {expandedCategories.has(category) && (
                  <div className="space-y-1 mt-1">
                    {categoryTestSets.map((testSet) => (
                      <div
                        key={testSet.id}
                        onClick={() => setSelectedTestSet(testSet)}
                        className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedTestSet?.id === testSet.id
                            ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30'
                            : 'hover:bg-[var(--color-bg-tertiary)]'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={`p-1.5 rounded ${
                              testSet.status === 'running'
                                ? 'bg-blue-500/10 text-blue-500'
                                : testSet.passRate !== undefined && testSet.passRate >= 80
                                  ? 'bg-green-500/10 text-green-500'
                                  : testSet.passRate !== undefined && testSet.passRate < 80
                                    ? 'bg-red-500/10 text-red-500'
                                    : 'bg-gray-500/10 text-gray-500'
                            }`}
                          >
                            <FlaskConical className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[var(--color-text-primary)] truncate">
                                {testSet.name}
                              </span>
                            </div>
                            <p className="text-sm text-[var(--color-text-tertiary)] truncate">
                              {testSet.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-[var(--color-text-tertiary)]">
                                {testSet.cases.length} 个用例
                              </span>
                              {testSet.passRate !== undefined && (
                                <>
                                  <span className="text-xs text-[var(--color-text-tertiary)]">•</span>
                                  <span
                                    className={`text-xs ${
                                      testSet.passRate >= 80
                                        ? 'text-green-500'
                                        : testSet.passRate >= 60
                                          ? 'text-yellow-500'
                                          : 'text-red-500'
                                    }`}
                                  >
                                    {testSet.passRate.toFixed(0)}% 通过
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicate(testSet);
                              }}
                              className="p-1 hover:bg-[var(--color-bg-base)] rounded"
                            >
                              <Copy className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(testSet.id);
                              }}
                              className="p-1 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </div>
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
      <div className="flex-1 overflow-hidden">
        {selectedTestSet ? (
          <TestSetDetail testSet={selectedTestSet} onUpdate={loadTestSets} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FlaskConical className="w-16 h-16 text-[var(--color-text-tertiary)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">选择一个测试集</h3>
              <p className="text-[var(--color-text-secondary)]">从左侧列表中选择查看详情</p>
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

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-start justify-between p-6 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{testSet.name}</h2>
          <p className="text-[var(--color-text-secondary)]">{testSet.description}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRunAll}
            disabled={isRunning}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                运行中...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                运行全部
              </>
            )}
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
          <p className="text-sm text-[var(--color-text-primary)]">{testSet.category}</p>
        </div>
        <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">用例数</span>
          <p className="text-sm text-[var(--color-text-primary)]">{testSet.cases.length}</p>
        </div>
        <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">通过率</span>
          <p className={`text-sm font-medium ${testSet.passRate !== undefined ? getPassRateColor(testSet.passRate) : ''}`}>
            {testSet.passRate !== undefined ? `${testSet.passRate.toFixed(0)}%` : '-'}
          </p>
        </div>
        <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">总耗时</span>
          <p className="text-sm text-[var(--color-text-primary)]">
            {testSet.totalDuration ? `${(testSet.totalDuration / 1000).toFixed(1)}s` : '-'}
          </p>
        </div>
      </div>

      {/* 标签栏 */}
      <div className="flex gap-1 px-6 border-b border-[var(--color-border)]">
        {[
          { key: 'cases', label: '测试用例', icon: FileText },
          { key: 'run', label: '执行详情', icon: Play },
          { key: 'report', label: '测试报告', icon: BarChart3 },
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
                                  <CheckCircle className="w-3.5 h-3.5" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5" />
                                )}
                                {result.status === 'passed' ? '通过' : '失败'}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--color-text-tertiary)] mt-0.5">
                            {testCase.description}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRunSingle(testCase)}
                          disabled={isRunning || runningCaseId === testCase.id}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded hover:bg-[var(--color-bg-base)] disabled:opacity-50"
                        >
                          {runningCaseId === testCase.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                          运行
                        </button>
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
                            <span
                              key={assertion.id}
                              className="text-xs px-2 py-1 bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-secondary)]"
                            >
                              {assertion.type}: {assertion.value}
                            </span>
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
                <Loader2 className="w-12 h-12 animate-spin text-[var(--color-primary)] mb-4" />
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
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-[var(--color-text-secondary)]">通过</span>
                    </div>
                    <p className="text-2xl font-semibold text-green-500 mt-2">
                      {Array.from(caseResults.values()).filter((r) => r.status === 'passed').length}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="text-sm text-[var(--color-text-secondary)]">失败</span>
                    </div>
                    <p className="text-2xl font-semibold text-red-500 mt-2">
                      {Array.from(caseResults.values()).filter((r) => r.status === 'failed').length}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[var(--color-text-tertiary)]" />
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
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : result?.status === 'failed' ? (
                              <XCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <Clock className="w-4 h-4 text-[var(--color-text-tertiary)]" />
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
                <Play className="w-12 h-12 mb-4 opacity-50" />
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
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
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
                              <span
                                key={index}
                                className={`text-xs px-2 py-1 rounded ${
                                  assertion.passed
                                    ? 'bg-green-500/10 text-green-500'
                                    : 'bg-red-500/10 text-red-500'
                                }`}
                              >
                                {assertion.passed ? '✓' : '✗'} {assertion.message}
                              </span>
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
                <BarChart3 className="w-12 h-12 mb-4 opacity-50" />
                <p>运行测试后查看详细报告</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
