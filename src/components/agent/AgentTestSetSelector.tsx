/**
 * Agent 关联测试集选择器
 */

import { useState, useEffect } from 'react';
import { Input } from 'antd';
import {
  SearchOutlined,
  CloseOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { testSetApi } from '../../services/mock/testsets';
import type { TestSet } from '../../types/testset';

interface AgentTestSetSelectorProps {
  agentId: string;
  selectedTestSets: string[];
  onChange: (testSetIds: string[]) => void;
  onRunTest?: (testSetId: string) => void;
}

export default function AgentTestSetSelector({
  agentId,
  selectedTestSets,
  onChange,
}: AgentTestSetSelectorProps) {
  const [testSets, setTestSets] = useState<TestSet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [runningTestSetId, setRunningTestSetId] = useState<string | null>(null);

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

  const toggleTestSet = (testSetId: string) => {
    if (selectedTestSets.includes(testSetId)) {
      onChange(selectedTestSets.filter((id) => id !== testSetId));
    } else {
      onChange([...selectedTestSets, testSetId]);
    }
  };

  const runTest = async (testSetId: string) => {
    setRunningTestSetId(testSetId);
    try {
      await testSetApi.runTestSet(agentId, testSetId);
      // 重新加载测试集以获取最新状态
      await loadTestSets();
    } catch (error) {
      console.error('Failed to run test:', error);
    } finally {
      setRunningTestSetId(null);
    }
  };

  const filteredTestSets = testSets.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  // 已选择的测试集
  const selectedTestSetObjects = testSets.filter((t) => selectedTestSets.includes(t.id));

  // 状态图标
  const getStatusIcon = (status: TestSet['status']) => {
    switch (status) {
      case 'running':
        return <LoadingOutlined className="text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircleOutlined className="text-green-500" />;
      default:
        return <ClockCircleOutlined className="text-[var(--color-text-tertiary)]" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* 已选择的测试集 */}
      {selectedTestSetObjects.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-[var(--color-text-primary)]">
            已关联测试集 ({selectedTestSetObjects.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedTestSetObjects.map((testSet) => (
              <div
                key={testSet.id}
                className="flex items-center gap-1 px-2 py-1 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-lg"
              >
                {getStatusIcon(testSet.status)}
                <span className="text-sm text-[var(--color-primary)]">{testSet.name}</span>
                <button
                  onClick={() => toggleTestSet(testSet.id)}
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
        placeholder="搜索测试集..."
        prefix={<SearchOutlined />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        allowClear
      />

      {/* 测试集列表 */}
      {loading ? (
        <div className="text-center py-4 text-[var(--color-text-tertiary)]">加载中...</div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {Object.entries(groupedTestSets).map(([category, categoryTestSets]) => (
            <div key={category}>
              <h4 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">
                {category}
              </h4>
              <div className="space-y-2">
                {categoryTestSets.map((testSet) => {
                  const isSelected = selectedTestSets.includes(testSet.id);
                  const isRunning = runningTestSetId === testSet.id;

                  return (
                    <div
                      key={testSet.id}
                      className={`border rounded-lg p-3 transition-colors ${
                        isSelected
                          ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]/30'
                          : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTestSet(testSet.id)}
                          className="rounded border-[var(--color-border)]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(testSet.status)}
                            <span className="text-sm font-medium text-[var(--color-text-primary)]">
                              {testSet.name}
                            </span>
                            {testSet.passRate !== undefined && (
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  testSet.passRate >= 80
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : testSet.passRate >= 50
                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}
                              >
                                {testSet.passRate.toFixed(0)}%
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                            {testSet.description}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-tertiary)]">
                            <span>{testSet.cases.length} 个用例</span>
                            {testSet.totalDuration && (
                              <span>{(testSet.totalDuration / 1000).toFixed(1)}s</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => runTest(testSet.id)}
                          disabled={isRunning || testSet.status === 'running'}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isRunning || testSet.status === 'running' ? (
                            <>
                              <LoadingOutlined className="text-xs" spin />
                              运行中
                            </>
                          ) : (
                            <>
                              <PlayCircleOutlined className="text-xs" />
                              运行
                            </>
                          )}
                        </button>
                      </div>
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
