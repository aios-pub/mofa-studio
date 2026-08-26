import { useTranslation } from "react-i18next";
/**
 * Agent associated test sets selector
 */

import { useState, useEffect } from "react";
import { Input } from "antd";
import {
  SearchOutlined,
  CloseOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { testSetApi } from "@/services";
import type { TestSet } from "../../types/testset";

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
}: AgentTestSetSelectorProps) {  const { t } = useTranslation();

  const [testSets, setTestSets] = useState<TestSet[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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
      console.error("Failed to load test sets:", error);
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
      await loadTestSets();
    } catch (error) {
      console.error("Failed to run test:", error);
    } finally {
      setRunningTestSetId(null);
    }
  };

  const filteredTestSets = testSets.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.category || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Group by category
  const groupedTestSets = filteredTestSets.reduce(
    (acc, testSet) => {
      const cat = testSet.category || "未分类";
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(testSet);
      return acc;
    },
    {} as Record<string, TestSet[]>,
  );

  // Selected test sets
  const selectedTestSetObjects = testSets.filter((t) =>
    selectedTestSets.includes(t.id),
  );

  // Status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <LoadingOutlined className="text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircleOutlined className="text-green-500" />;
      default:
        return (
          <ClockCircleOutlined className="text-[var(--color-text-tertiary)]" />
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Selected test sets */}
      {selectedTestSetObjects.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-[var(--color-text-primary)]">
            已关联测试集 ({selectedTestSetObjects.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedTestSetObjects.map((testSet) => (
              <div
                key={testSet.id}
                className="flex items-center gap-1 px-2 py-1 bg-[var(--color-primary)]/10 border border-(--color-primary)/30 rounded-lg"
              >
                {getStatusIcon(testSet.status)}
                <span className="text-sm text-[var(--color-primary)]">
                  {testSet.name}
                </span>
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

      {/* Search box */}
      <Input
        placeholder={t("搜索测试集...")}
        prefix={<SearchOutlined />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        allowClear
      />

      {/* Test set list */}
      {loading ? (
        <div className="text-center py-4 text-[var(--color-text-tertiary)]">
          加载中...
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {Object.entries(groupedTestSets).map(
            ([category, categoryTestSets]) => (
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
                            ? "bg-[var(--color-primary)]/5 border-(--color-primary)/30"
                            : "bg-[var(--color-bg-secondary)] border-(--color-border) hover:border-[var(--color-border-hover)]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTestSet(testSet.id)}
                            className="rounded border-(--color-border)"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(testSet.status)}
                              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                                {testSet.name}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                              {testSet.description}
                            </p>
                          </div>
                          <button
                            onClick={() => runTest(testSet.id)}
                            disabled={isRunning || testSet.status === "running"}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-(--color-bg-tertiary) hover:bg-[var(--color-bg-base)] border border-(--color-border) rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isRunning || testSet.status === "running" ? (
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
            ),
          )}
        </div>
      )}
    </div>
  );
}
