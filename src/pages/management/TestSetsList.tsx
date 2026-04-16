/**
 * 测试集管理页面
 */

import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Tag,
  Select,
  message,
  Tabs,
  Typography,
  Card,
  Statistic,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import type {
  TestSet,
  TestCase,
  TestReport,
  TestSetFormData,
  TestCaseFormData,
  TestCategory,
  TestCategoryFormData,
} from "../../types/testset";
import { testSetApi, agentApi } from "@/services";
import { showDeleteConfirm } from "@/components/common/Modal";
import { TestSetFormModal } from "./components/TestSetFormModal";
import { TestCaseFormModal } from "./components/TestCaseFormModal";
import { CategoryFormModal } from "./components/CategoryFormModal";
import { TestSetTree } from "./components/TestSetTree";

const { Text, Title } = Typography;

export default function TestSetsListPage() {
  const [testSets, setTestSets] = useState<TestSet[]>([]);
  const [categories, setCategories] = useState<TestCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTestSet, setSelectedTestSet] = useState<TestSet | null>(null);

  // Modal states
  const [testSetModalOpen, setTestSetModalOpen] = useState(false);
  const [editingTestSet, setEditingTestSet] = useState<TestSet | null>(null);
  const [testSetModalLoading, setTestSetModalLoading] = useState(false);
  const [createTestSetCategoryId, setCreateTestSetCategoryId] = useState<
    string | undefined
  >();

  // Category modal states
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TestCategory | null>(
    null,
  );
  const [createCategoryParentId, setCreateCategoryParentId] = useState<
    string | undefined
  >();
  const [categoryModalLoading, setCategoryModalLoading] = useState(false);

  useEffect(() => {
    loadTestSets();
    loadCategories();
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

  const loadCategories = async () => {
    try {
      const data = await testSetApi.getAllCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  // ==================== TestSet CRUD ====================

  const handleCreateTestSet = (categoryId?: string) => {
    setEditingTestSet(null);
    setCreateTestSetCategoryId(categoryId);
    setTestSetModalOpen(true);
  };

  const handleEditTestSet = (testSet: TestSet) => {
    setEditingTestSet(testSet);
    setTestSetModalOpen(true);
  };

  const handleTestSetSubmit = async (data: TestSetFormData) => {
    try {
      setTestSetModalLoading(true);
      if (editingTestSet) {
        const updated = await testSetApi.update(editingTestSet.id, data);
        setTestSets((prev) =>
          prev.map((t) => (t.id === editingTestSet.id ? updated : t)),
        );
        if (selectedTestSet?.id === editingTestSet.id) {
          setSelectedTestSet(updated);
        }
        message.success("测试集已更新");
      } else {
        const created = await testSetApi.create(data);
        setTestSets((prev) => [...prev, created]);
        message.success("测试集已创建");
      }
      setTestSetModalOpen(false);
    } catch (error) {
      console.error("Failed to save test set:", error);
      throw error;
    } finally {
      setTestSetModalLoading(false);
    }
  };

  const handleDeleteTestSet = (testSet: TestSet) => {
    showDeleteConfirm({
      title: "删除测试集",
      content: `确定要删除测试集「${testSet.name}」吗？此操作不可恢复。`,
      onOk: async () => {
        try {
          await testSetApi.delete(testSet.id);
          setTestSets((prev) => prev.filter((t) => t.id !== testSet.id));
          if (selectedTestSet?.id === testSet.id) {
            setSelectedTestSet(null);
          }
          message.success("测试集已删除");
        } catch (error) {
          console.error("Failed to delete test set:", error);
          message.error("删除失败");
        }
      },
    });
  };

  const handleSelectTestSet = (testSet: TestSet) => {
    setSelectedTestSet(testSet);
  };

  // ==================== Category CRUD ====================

  const handleCreateCategory = (parentId?: string) => {
    setEditingCategory(null);
    setCreateCategoryParentId(parentId);
    setCategoryModalOpen(true);
  };

  const handleEditCategory = (category: TestCategory) => {
    setEditingCategory(category);
    setCategoryModalOpen(true);
  };

  const handleDeleteCategory = (category: TestCategory) => {
    showDeleteConfirm({
      title: "删除分类",
      content: `确定要删除分类「${category.name}」吗？`,
      onOk: async () => {
        try {
          await testSetApi.deleteCategory(category.id);
          setCategories((prev) => prev.filter((c) => c.id !== category.id));
          message.success("分类已删除");
        } catch (error: any) {
          console.error("Failed to delete category:", error);
          message.error(error?.message || "删除失败");
        }
      },
    });
  };

  const handleCategorySubmit = async (data: TestCategoryFormData) => {
    try {
      setCategoryModalLoading(true);
      if (editingCategory) {
        const updated = await testSetApi.updateCategory(editingCategory.id, {
          name: data.name,
        });
        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategory.id ? updated : c)),
        );
        message.success("分类已更新");
      } else {
        const created = await testSetApi.createCategory(data);
        setCategories((prev) => [...prev, created]);
        message.success("分类已创建");
      }
      setCategoryModalOpen(false);
    } catch (error) {
      console.error("Failed to save category:", error);
      throw error;
    } finally {
      setCategoryModalLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* 左侧树形列表 */}
      <div className="w-80 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg-secondary)]">
        {/* 头部 */}
        <div className="p-4 flex items-center justify-between border-b border-[var(--color-border)]">
          <Title level={5} style={{ margin: 0 }}>
            测试集管理
          </Title>
          <div className="flex gap-1">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="small"
              onClick={() => handleCreateTestSet()}
              title="新建测试集"
            />
          </div>
        </div>

        {/* 树形列表 */}
        {loading ? (
          <div className="text-center py-8">
            <Text type="secondary">加载中...</Text>
          </div>
        ) : (
          <TestSetTree
            testSets={testSets}
            categories={categories}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTestSetId={selectedTestSet?.id || null}
            onSelectTestSet={handleSelectTestSet}
            onCreateTestSet={handleCreateTestSet}
            onCreateCategory={handleCreateCategory}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        )}
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 overflow-hidden">
        {selectedTestSet ? (
          <TestSetDetail
            testSet={selectedTestSet}
            onUpdate={loadTestSets}
            onEditTestSet={handleEditTestSet}
            onDeleteTestSet={handleDeleteTestSet}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <ExperimentOutlined
                style={{
                  fontSize: 48,
                  color: "var(--color-text-tertiary)",
                  marginBottom: 16,
                }}
              />
              <Title level={5} type="secondary">
                选择一个测试集
              </Title>
              <Text type="secondary">从左侧树形列表中选择查看详情</Text>
            </div>
          </div>
        )}
      </div>

      {/* 测试集创建/编辑弹窗 */}
      <TestSetFormModal
        open={testSetModalOpen}
        onClose={() => {
          setTestSetModalOpen(false);
          setEditingTestSet(null);
          setCreateTestSetCategoryId(undefined);
        }}
        onSubmit={handleTestSetSubmit}
        testSet={editingTestSet}
        categories={categories}
        defaultCategoryId={createTestSetCategoryId}
        loading={testSetModalLoading}
      />

      {/* 分类创建/编辑弹窗 */}
      <CategoryFormModal
        open={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false);
          setEditingCategory(null);
          setCreateCategoryParentId(undefined);
        }}
        onSubmit={handleCategorySubmit}
        category={editingCategory}
        parentId={createCategoryParentId}
        loading={categoryModalLoading}
      />
    </div>
  );
}

// 测试集详情组件
function TestSetDetail({
  testSet,
  onUpdate,
  onEditTestSet,
  onDeleteTestSet,
}: {
  testSet: TestSet;
  onUpdate: () => void;
  onEditTestSet: (testSet: TestSet) => void;
  onDeleteTestSet: (testSet: TestSet) => void;
}) {
  const [activeTab, setActiveTab] = useState<"cases" | "run" | "report">(
    "cases",
  );
  const [cases, setCases] = useState<TestCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentReport, setCurrentReport] = useState<TestReport | null>(null);
  const [reports, setReports] = useState<TestReport[]>([]);
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  // 测试用例弹窗
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [caseModalLoading, setCaseModalLoading] = useState(false);

  const loadCases = useCallback(async () => {
    if (!testSet.id) return;
    try {
      setCasesLoading(true);
      const data = await testSetApi.getCases(testSet.id);
      setCases(data);
    } catch (error) {
      console.error("Failed to load test cases:", error);
    } finally {
      setCasesLoading(false);
    }
  }, [testSet.id]);

  const loadReports = useCallback(async () => {
    if (!testSet.id) return;
    try {
      const data = await testSetApi.getReportsByTestSet(testSet.id);
      setReports(data);
    } catch (error) {
      console.error("Failed to load reports:", error);
    }
  }, [testSet.id]);

  useEffect(() => {
    loadCases();
    loadReports();
  }, [loadCases, loadReports]);

  useEffect(() => {
    agentApi.getAll().then((list) => {
      setAgents(list.map((a: any) => ({ id: a.id, name: a.name })));
      if (list.length > 0) setSelectedAgentId(list[0].id);
    }).catch(() => {});
  }, []);

  // ==================== Test Run ====================

  const handleRunAll = async () => {
    if (!selectedAgentId) {
      message.warning("请先选择 Agent");
      return;
    }
    setIsRunning(true);
    setCurrentReport(null);
    try {
      const report = await testSetApi.runTestSet(selectedAgentId, testSet.id);
      setCurrentReport(report);
      onUpdate();
      loadReports();
    } catch (error) {
      console.error("Failed to run test set:", error);
      message.error("测试运行失败");
    } finally {
      setIsRunning(false);
    }
  };

  // ==================== TestCase CRUD ====================

  const handleCreateCase = () => {
    setEditingCase(null);
    setCaseModalOpen(true);
  };

  const handleEditCase = (testCase: TestCase) => {
    setEditingCase(testCase);
    setCaseModalOpen(true);
  };

  const handleCaseSubmit = async (data: TestCaseFormData) => {
    try {
      setCaseModalLoading(true);
      if (editingCase) {
        await testSetApi.updateCase(editingCase.id, testSet.id, data);
        message.success("测试用例已更新");
      } else {
        await testSetApi.createCase(testSet.id, data);
        message.success("测试用例已创建");
      }
      setCaseModalOpen(false);
      loadCases();
    } catch (error) {
      console.error("Failed to save test case:", error);
      throw error;
    } finally {
      setCaseModalLoading(false);
    }
  };

  const handleDeleteCase = (testCase: TestCase) => {
    showDeleteConfirm({
      title: "删除测试用例",
      content: `确定要删除测试用例「${testCase.name}」吗？`,
      onOk: async () => {
        try {
          await testSetApi.deleteCase(testCase.id);
          message.success("测试用例已删除");
          loadCases();
        } catch (error) {
          console.error("Failed to delete test case:", error);
          message.error("删除失败");
        }
      },
    });
  };

  const tabs = [
    { key: "cases", label: "测试用例", icon: FileTextOutlined },
    { key: "run", label: "执行详情", icon: PlayCircleOutlined },
    { key: "report", label: "测试报告", icon: BarChartOutlined },
  ];

  // 最新报告
  const latestReport = currentReport || reports[0];

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-start justify-between p-6 pb-4">
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {testSet.name}
          </Title>
          <Text type="secondary">{testSet.description}</Text>
        </div>
        <div className="flex gap-2 items-center">
          <Select
            value={selectedAgentId || undefined}
            onChange={setSelectedAgentId}
            style={{ width: 180 }}
            placeholder="选择 Agent"
            options={agents.map((a) => ({ label: a.name, value: a.id }))}
          />
          <Button
            type="primary"
            icon={isRunning ? <LoadingOutlined /> : <PlayCircleOutlined />}
            onClick={handleRunAll}
            disabled={isRunning}
            style={{ backgroundColor: "#22c55e" }}
          >
            {isRunning ? "运行中..." : "运行全部"}
          </Button>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => onEditTestSet(testSet)}
          >
            编辑
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDeleteTestSet(testSet)}
          >
            删除
          </Button>
        </div>
      </div>

      {/* 元信息 */}
      <div className="grid grid-cols-4 gap-4 px-6 pb-4">
        <Card
          size="small"
          variant="borderless"
          style={{ background: "var(--color-bg-secondary)" }}
        >
          <Statistic
            title={
              <Text type="secondary" style={{ fontSize: 12 }}>
                分类
              </Text>
            }
            value={testSet.category || "未分类"}
            valueStyle={{ fontSize: 14 }}
          />
        </Card>
        <Card
          size="small"
          variant="borderless"
          style={{ background: "var(--color-bg-secondary)" }}
        >
          <Statistic
            title={
              <Text type="secondary" style={{ fontSize: 12 }}>
                用例数
              </Text>
            }
            value={cases.length}
            valueStyle={{ fontSize: 14 }}
          />
        </Card>
        <Card
          size="small"
          variant="borderless"
          style={{ background: "var(--color-bg-secondary)" }}
        >
          <Statistic
            title={
              <Text type="secondary" style={{ fontSize: 12 }}>
                状态
              </Text>
            }
            value={
              testSet.status === "idle"
                ? "待测试"
                : testSet.status === "completed"
                  ? "已完成"
                  : testSet.status
            }
            valueStyle={{ fontSize: 14 }}
          />
        </Card>
        <Card
          size="small"
          variant="borderless"
          style={{ background: "var(--color-bg-secondary)" }}
        >
          <Statistic
            title={
              <Text type="secondary" style={{ fontSize: 12 }}>
                报告数
              </Text>
            }
            value={reports.length}
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
        {/* 测试用例 Tab */}
        {activeTab === "cases" && (
          <div className="p-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                测试用例 ({cases.length})
              </span>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={handleCreateCase}
              >
                添加用例
              </Button>
            </div>

            {casesLoading ? (
              <div className="text-center py-8">
                <LoadingOutlined />
                <Text type="secondary" className="ml-2">
                  加载中...
                </Text>
              </div>
            ) : cases.length === 0 ? (
              <div className="text-center py-8">
                <FileTextOutlined
                  style={{
                    fontSize: 32,
                    opacity: 0.3,
                    marginBottom: 8,
                    display: "block",
                  }}
                />
                <Text type="secondary">暂无测试用例，点击上方按钮添加</Text>
              </div>
            ) : (
              <div className="space-y-3">
                {cases.map((testCase) => {
                  const assertionList = Array.isArray(testCase.assertions)
                    ? testCase.assertions
                    : [];
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
                              <Tag
                                color={
                                  testCase.status === "passed"
                                    ? "success"
                                    : testCase.status === "failed"
                                      ? "error"
                                      : "default"
                                }
                                style={{ fontSize: 11 }}
                              >
                                {testCase.status === "passed"
                                  ? "通过"
                                  : testCase.status === "failed"
                                    ? "失败"
                                    : "待测试"}
                              </Tag>
                            </div>
                            {testCase.description && (
                              <p className="text-sm text-[var(--color-text-tertiary)] mt-0.5">
                                {testCase.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => handleEditCase(testCase)}
                            />
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteCase(testCase)}
                            />
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs text-[var(--color-text-tertiary)]">
                              输入
                            </span>
                            <p className="mt-1 text-sm text-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)] p-2 rounded font-mono">
                              {testCase.input || "(空)"}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-[var(--color-text-tertiary)]">
                              期望输出
                            </span>
                            <p className="mt-1 text-sm text-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)] p-2 rounded">
                              {testCase.expectedOutput || "(无)"}
                            </p>
                          </div>
                        </div>

                        {assertionList.length > 0 && (
                          <div className="mt-3">
                            <span className="text-xs text-[var(--color-text-tertiary)]">
                              断言 ({assertionList.length})
                            </span>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {assertionList.map((assertion) => (
                                <Tag key={assertion.id}>
                                  {assertion.type}: {assertion.value}
                                </Tag>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 执行详情 Tab */}
        {activeTab === "run" && (
          <div className="p-6 h-full overflow-y-auto">
            {isRunning ? (
              <div className="flex flex-col items-center justify-center py-12">
                <LoadingOutlined className="text-4xl text-[var(--color-primary)] mb-4" />
                <p className="text-[var(--color-text-primary)] font-medium">
                  正在执行测试...
                </p>
                <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
                  请稍候，测试用例正在逐一执行
                </p>
              </div>
            ) : latestReport ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <FileTextOutlined className="text-[var(--color-text-tertiary)]" />
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        总用例
                      </span>
                    </div>
                    <p className="text-2xl font-semibold text-[var(--color-text-primary)] mt-2">
                      {latestReport.totalCases}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <CheckCircleOutlined className="text-green-500" />
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        通过
                      </span>
                    </div>
                    <p className="text-2xl font-semibold text-green-500 mt-2">
                      {latestReport.passedCases}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <CloseCircleOutlined className="text-red-500" />
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        失败
                      </span>
                    </div>
                    <p className="text-2xl font-semibold text-red-500 mt-2">
                      {latestReport.failedCases}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <BarChartOutlined className="text-[var(--color-text-tertiary)]" />
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        通过率
                      </span>
                    </div>
                    <p
                      className={`text-2xl font-semibold mt-2 ${
                        (latestReport.passRate ?? 0) >= 80
                          ? "text-green-500"
                          : (latestReport.passRate ?? 0) >= 60
                            ? "text-yellow-500"
                            : "text-red-500"
                      }`}
                    >
                      {latestReport.passRate?.toFixed(1) || "0"}%
                    </p>
                  </div>
                </div>

                {latestReport.totalDuration !== undefined &&
                  latestReport.totalDuration > 0 && (
                    <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                      <div className="flex items-center gap-2">
                        <ClockCircleOutlined className="text-[var(--color-text-tertiary)]" />
                        <span className="text-sm text-[var(--color-text-secondary)]">
                          总耗时
                        </span>
                      </div>
                      <p className="text-lg font-semibold text-[var(--color-text-primary)] mt-1">
                        {(latestReport.totalDuration / 1000).toFixed(1)}s
                      </p>
                    </div>
                  )}

                {/* 用例执行结果 */}
                <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                  <div className="p-3 border-b border-[var(--color-border)]">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      执行结果
                    </span>
                  </div>
                  <div className="divide-y divide-[var(--color-border)]">
                    {cases.map((testCase) => (
                      <div
                        key={testCase.id}
                        className="p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {testCase.status === "passed" ? (
                            <CheckCircleOutlined className="text-green-500" />
                          ) : testCase.status === "failed" ? (
                            <CloseCircleOutlined className="text-red-500" />
                          ) : (
                            <ClockCircleOutlined className="text-[var(--color-text-tertiary)]" />
                          )}
                          <span className="text-sm text-[var(--color-text-primary)]">
                            {testCase.name}
                          </span>
                        </div>
                        <Tag
                          color={
                            testCase.status === "passed"
                              ? "success"
                              : testCase.status === "failed"
                                ? "error"
                                : "default"
                          }
                        >
                          {testCase.status === "passed"
                            ? "通过"
                            : testCase.status === "failed"
                              ? "失败"
                              : "未执行"}
                        </Tag>
                      </div>
                    ))}
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

        {/* 测试报告 Tab */}
        {activeTab === "report" && (
          <div className="p-6 h-full overflow-y-auto">
            {reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <BarChartOutlined className="text-[var(--color-text-tertiary)]" />
                        <span className="font-medium text-[var(--color-text-primary)]">
                          测试报告
                        </span>
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(report.executedAt).toLocaleString()}
                      </Text>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          总用例
                        </span>
                        <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                          {report.totalCases}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          通过
                        </span>
                        <p className="text-lg font-semibold text-green-500">
                          {report.passedCases}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          失败
                        </span>
                        <p className="text-lg font-semibold text-red-500">
                          {report.failedCases}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          通过率
                        </span>
                        <p
                          className={`text-lg font-semibold ${
                            (report.passRate ?? 0) >= 80
                              ? "text-green-500"
                              : (report.passRate ?? 0) >= 60
                                ? "text-yellow-500"
                                : "text-red-500"
                          }`}
                        >
                          {report.passRate?.toFixed(1) || "0"}%
                        </p>
                      </div>
                    </div>

                    {report.totalDuration !== undefined &&
                      report.totalDuration > 0 && (
                        <div className="mt-2 text-sm text-[var(--color-text-tertiary)]">
                          总耗时: {(report.totalDuration / 1000).toFixed(1)}s
                        </div>
                      )}
                  </div>
                ))}
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

      {/* 测试用例创建/编辑弹窗 */}
      <TestCaseFormModal
        open={caseModalOpen}
        onClose={() => {
          setCaseModalOpen(false);
          setEditingCase(null);
        }}
        onSubmit={handleCaseSubmit}
        testCase={editingCase}
        loading={caseModalLoading}
      />
    </div>
  );
}
