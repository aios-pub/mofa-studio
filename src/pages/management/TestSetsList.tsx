/**
 * 测试集管理页面
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Tag,
  Select,
  message,
  Tabs,
  Typography,
  Card,
  Statistic,
  Modal,
  Input,
} from "antd";
import {
  PlusOutlined,
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
  ImportOutlined,
  ExportOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  CloudServerOutlined,
  LinkOutlined,
  RobotOutlined,
  CodeOutlined,
  GlobalOutlined,
  DatabaseOutlined,
  SearchOutlined,
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
import { testSetApi, agentApi, importExportApi } from "@/services";
import { showDeleteConfirm } from "@/components/common/Modal";
import { TestSetFormModal } from "./components/TestSetFormModal";
import ResizableSidebar from "@/components/layout/ResizableSidebar";
import { TestCaseFormModal } from "./components/TestCaseFormModal";
import { CategoryFormModal } from "./components/CategoryFormModal";
import { TestSetTree } from "./components/TestSetTree";
import { ImportModal } from "@/components/test/ImportModal";
import { ExportModal } from "@/components/test/ExportModal";
import { TestCaseReportDetail } from "@/components/test/TestCaseReportDetail";

const { Text, Title } = Typography;

// 简单的文件下载工具函数
const downloadAsFile = (data: unknown, filename: string, mimeType: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function TestSetsListPage() {
  const navigate = useNavigate();
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

  // Import/Export modal states
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const testSetsRequestIdRef = useRef(0);
  const categoriesRequestIdRef = useRef(0);

  useEffect(() => {
    loadTestSets();
    loadCategories();
  }, []);

  const loadTestSets = async () => {
    const requestId = ++testSetsRequestIdRef.current;
    try {
      setLoading(true);
      const data = await testSetApi.getAll();
      if (requestId !== testSetsRequestIdRef.current) return;
      setTestSets(data);
    } catch (error) {
      if (requestId !== testSetsRequestIdRef.current) return;
      console.error("Failed to load test sets:", error);
    } finally {
      if (requestId === testSetsRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const loadCategories = async () => {
    const requestId = ++categoriesRequestIdRef.current;
    try {
      const data = await testSetApi.getAllCategories();
      if (requestId !== categoriesRequestIdRef.current) return;
      setCategories(data);
    } catch (error) {
      if (requestId !== categoriesRequestIdRef.current) return;
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

  const handleOpenLoadTest = (_testSet: TestSet) => {
    navigate("/management/load-test");
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
          parentId: data.parentId,
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
      <ResizableSidebar className="border-r border-(--color-border) bg-[var(--color-bg-secondary)]" storageKey="sidebar:test-sets">
        {/* 头部 */}
        <div className="p-4 flex items-center justify-between border-b border-(--color-border)">
          <Title level={5} style={{ margin: 0 }}>
            测试集管理
          </Title>
          <div className="flex gap-1">
            <Button
              icon={<ImportOutlined />}
              size="small"
              onClick={() => setImportModalOpen(true)}
              title="导入"
            />
            <Button
              icon={<ExportOutlined />}
              size="small"
              onClick={() => setExportModalOpen(true)}
              title="导出"
            />
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
      </ResizableSidebar>

      {/* 右侧详情 */}
      <div className="flex-1 overflow-hidden">
        {selectedTestSet ? (
          <TestSetDetail
            testSet={selectedTestSet}
            categories={categories}
            onUpdate={loadTestSets}
            onEditTestSet={handleEditTestSet}
            onDeleteTestSet={handleDeleteTestSet}
            onOpenLoadTest={handleOpenLoadTest}
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
        parentId={editingCategory ? editingCategory.parentId : createCategoryParentId}
        categories={categories}
        loading={categoryModalLoading}
      />

      {/* 导入弹窗 */}
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        existingTestSets={testSets.map((ts) => ({ id: ts.id, name: ts.name }))}
        onImport={async (format, content, options, targetTestSetId) => {
          try {
            let result;
            if (format === "postman") {
              result = await importExportApi.importPostman(content as any, options);
            } else if (format === "openapi") {
              result = await importExportApi.importOpenAPI(content as any, options);
            } else {
              result = await importExportApi.importCurl(
                content as string,
                undefined,
                targetTestSetId,
                options,
              );
            }

            message.success(
              `导入成功！创建了 ${result.imported} 个测试集，跳过 ${result.skipped} 个`
            );

            // 重新加载测试集列表
            await loadTestSets();
            setImportModalOpen(false);
          } catch (error: any) {
            console.error("Import failed:", error);
            message.error(error.message || "导入失败");
          }
        }}
      />

      {/* 导出弹窗 */}
      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        testSets={testSets}
        onExport={async (format, options) => {
          try {
            const idsToExport =
              options.scope === "selected" && options.selectedIds?.length
                ? options.selectedIds
                : testSets.map((ts) => ts.id);
            const data = await importExportApi.exportCollection(
              idsToExport,
              format,
              options
            );

            // 下载为文件
            const filename = `test-sets-${format}-${Date.now()}.json`;
            const mimeType = "application/json";
            downloadAsFile(data, filename, mimeType);

            message.success("导出成功！");
            setExportModalOpen(false);
          } catch (error: any) {
            console.error("Export failed:", error);
            message.error(error.message || "导出失败");
          }
        }}
      />
    </div>
  );
}

// 测试集详情组件
function TestSetDetail({
  testSet,
  categories,
  onUpdate,
  onEditTestSet,
  onDeleteTestSet,
  onOpenLoadTest,
}: {
  testSet: TestSet;
  categories: TestCategory[];
  onUpdate: () => void;
  onEditTestSet: (testSet: TestSet) => void;
  onDeleteTestSet: (testSet: TestSet) => void;
  onOpenLoadTest?: (testSet: TestSet) => void;
}) {
  const navigate = useNavigate();
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
  const [runningCaseId, setRunningCaseId] = useState<string | null>(null);
  const [caseSearchQuery, setCaseSearchQuery] = useState("");

  // 报告详情
  const [reportDetailModalOpen, setReportDetailModalOpen] = useState(false);
  const [selectedReportDetail, setSelectedReportDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const reportDetailRequestIdRef = useRef(0);

  // 测试用例弹窗
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [caseModalLoading, setCaseModalLoading] = useState(false);

  const casesRequestIdRef = useRef(0);
  const reportsRequestIdRef = useRef(0);

  const loadCases = useCallback(async () => {
    if (!testSet.id) return;
    const requestId = ++casesRequestIdRef.current;
    try {
      setCasesLoading(true);
      const data = await testSetApi.getCases(testSet.id);
      if (requestId !== casesRequestIdRef.current) return;
      setCases(data);
    } catch (error) {
      if (requestId !== casesRequestIdRef.current) return;
      console.error("Failed to load test cases:", error);
    } finally {
      if (requestId === casesRequestIdRef.current) {
        setCasesLoading(false);
      }
    }
  }, [testSet.id]);

  const loadReports = useCallback(async () => {
    if (!testSet.id) return;
    const requestId = ++reportsRequestIdRef.current;
    try {
      const data = await testSetApi.getReportsByTestSet(testSet.id);
      if (requestId !== reportsRequestIdRef.current) return;
      setReports(data);
    } catch (error) {
      if (requestId !== reportsRequestIdRef.current) return;
      console.error("Failed to load reports:", error);
    }
  }, [testSet.id]);

  const loadReportDetail = useCallback(async (reportId: string) => {
    const requestId = ++reportDetailRequestIdRef.current;
    try {
      setLoadingDetail(true);
      const detail = await testSetApi.getReportDetail(reportId);
      if (requestId !== reportDetailRequestIdRef.current) return;
      setSelectedReportDetail(detail);
      setReportDetailModalOpen(true);
    } catch (error) {
      if (requestId !== reportDetailRequestIdRef.current) return;
      console.error("Failed to load report detail:", error);
      message.error("加载报告详情失败");
    } finally {
      if (requestId === reportDetailRequestIdRef.current) {
        setLoadingDetail(false);
      }
    }
  }, []);

  useEffect(() => {
    loadCases();
    loadReports();
  }, [loadCases, loadReports]);

  // 切换测试集时重置相关状态，避免显示旧测试集的数据
  useEffect(() => {
    setCurrentReport(null);
    setActiveTab("cases");
    setCaseSearchQuery("");
    setReportDetailModalOpen(false);
    setSelectedReportDetail(null);
    setRunningCaseId(null);
    setIsRunning(false);
    setCases([]);
    setReports([]);
    setCaseModalOpen(false);
    setEditingCase(null);
  }, [testSet.id]);

  useEffect(() => {
    agentApi
      .getAll()
      .then((list) => {
        setAgents(list.map((a: any) => ({ id: a.id, name: a.name })));
        if (list.length > 0) setSelectedAgentId(list[0].id);
      })
      .catch(() => {});
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
      loadCases(); // 刷新测试用例状态
    } catch (error) {
      console.error("Failed to run test set:", error);
      message.error("测试运行失败");
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunCase = async (testCase: TestCase) => {
    if (!selectedAgentId) {
      message.warning("请先选择 Agent");
      return;
    }
    setRunningCaseId(testCase.id);
    try {
      const result = await testSetApi.runTestCase(testCase, selectedAgentId);
      message.success(
        result.status === "passed"
          ? `测试用例 "${testCase.name}" 通过`
          : `测试用例 "${testCase.name}" 失败`,
      );
      loadCases(); // 刷新测试用例状态
      loadReports(); // 刷新报告列表
    } catch (error) {
      console.error("Failed to run test case:", error);
      message.error("测试用例执行失败");
    } finally {
      setRunningCaseId(null);
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

  const handleCopyCase = async (testCase: TestCase) => {
    try {
      message.loading({ content: "正在复制测试用例...", key: "copyCase" });
      const copiedCase = await testSetApi.copyCase(testCase.id, testSet.id);
      message.success({ content: `测试用例「${copiedCase.name}」已复制`, key: "copyCase" });
      loadCases();
    } catch (error) {
      console.error("Failed to copy test case:", error);
      message.error({ content: "复制失败", key: "copyCase" });
    }
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
            icon={<FileTextOutlined />}
            onClick={() => navigate(`/management/test-sets/${testSet.id}/docs`)}
          >
            查看文档
          </Button>
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
            icon={<BarChartOutlined />}
            onClick={() => onOpenLoadTest?.(testSet)}
          >
            压测
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
            value={
              (testSet.categoryId
                ? categories.find((c) => c.id === testSet.categoryId)?.name
                : testSet.category) || "未分类"
            }
            styles={{ content: { fontSize: 14 } }}
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
            styles={{ content: { fontSize: 14 } }}
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
            styles={{ content: { fontSize: 14 } }}
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
            styles={{ content: { fontSize: 14 } }}
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
            <div className="flex items-center justify-between mb-4 gap-3">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                测试用例 ({cases.length})
              </span>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="搜索用例"
                  prefix={<SearchOutlined className="text-gray-400" />}
                  value={caseSearchQuery}
                  onChange={(e) => setCaseSearchQuery(e.target.value)}
                  size="small"
                  style={{ width: 180 }}
                  allowClear
                />
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={handleCreateCase}
                >
                  添加用例
                </Button>
              </div>
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
              (() => {
                const filteredCases = cases.filter((tc) =>
                  caseSearchQuery
                    ? tc.name.toLowerCase().includes(caseSearchQuery.toLowerCase())
                    : true,
                );
                return filteredCases.length === 0 ? (
                  <div className="text-center py-8 text-[var(--color-text-tertiary)]">
                    <SearchOutlined
                      style={{
                        fontSize: 32,
                        opacity: 0.3,
                        marginBottom: 8,
                        display: "block",
                      }}
                    />
                    <Text type="secondary">
                      未找到匹配 "{caseSearchQuery}" 的测试用例
                    </Text>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredCases.map((testCase) => {
                  const assertionList = Array.isArray(testCase.assertions)
                    ? testCase.assertions
                    : [];
                  return (
                    <div
                      key={testCase.id}
                      className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) overflow-hidden"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[var(--color-text-primary)]">
                                {testCase.name}
                              </span>
                              {testCase.requestType && (
                                <>
                                  {testCase.requestType === "http" && (
                                    <ApiOutlined className="text-blue-500 text-xs" />
                                  )}
                                  {testCase.requestType === "websocket" && (
                                    <ThunderboltOutlined className="text-cyan-500 text-xs" />
                                  )}
                                  {testCase.requestType === "sse" && (
                                    <CloudServerOutlined className="text-green-500 text-xs" />
                                  )}
                                  {testCase.requestType === "socketio" && (
                                    <LinkOutlined className="text-purple-500 text-xs" />
                                  )}
                                  {testCase.requestType === "workflow" && (
                                    <FileTextOutlined className="text-purple-500 text-xs" />
                                  )}
                                  {testCase.requestType === "agent" && (
                                    <RobotOutlined className="text-gray-500 text-xs" />
                                  )}
                                  <Tag
                                    color={
                                      testCase.requestType === "http"
                                        ? "blue"
                                        : testCase.requestType === "websocket"
                                        ? "cyan"
                                        : testCase.requestType === "sse"
                                        ? "green"
                                        : testCase.requestType === "socketio"
                                        ? "purple"
                                        : testCase.requestType === "workflow"
                                        ? "purple"
                                        : testCase.requestType === "agent"
                                        ? "default"
                                        : "default"
                                    }
                                    style={{ fontSize: 11 }}
                                  >
                                    {testCase.requestType.toUpperCase()}
                                  </Tag>
                                </>
                              )}
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
                                    : "未执行"}
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
                              title="运行"
                              icon={runningCaseId === testCase.id ? <LoadingOutlined /> : <PlayCircleOutlined />}
                              onClick={() => handleRunCase(testCase)}
                              disabled={runningCaseId === testCase.id || isRunning}
                            />
                            <Button
                              type="text"
                              size="small"
                              title="复制"
                              icon={<CopyOutlined />}
                              onClick={() => handleCopyCase(testCase)}
                            />
                            <Button
                              type="text"
                              size="small"
                              title="编辑"
                              icon={<EditOutlined />}
                              onClick={() => handleEditCase(testCase)}
                            />
                            <Button
                              type="text"
                              size="small"
                              danger
                              title="删除"
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteCase(testCase)}
                            />
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs text-[var(--color-text-tertiary)]">
                              {testCase.requestType === "http" ||
                              testCase.requestType === "websocket" ||
                              testCase.requestType === "sse" ||
                              testCase.requestType === "socketio"
                                ? "URL"
                                : testCase.requestType === "workflow"
                                ? "工作流ID"
                                : "输入"}
                            </span>
                            <p className="mt-1 text-sm text-[var(--color-text-primary)] bg-(--color-bg-tertiary) p-2 rounded font-mono">
                              {testCase.input || "(空)"}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-[var(--color-text-tertiary)]">
                              {testCase.requestType === "http" ||
                              testCase.requestType === "websocket" ||
                              testCase.requestType === "sse" ||
                              testCase.requestType === "socketio"
                                ? "期望响应"
                                : testCase.requestType === "workflow"
                                ? "期望结果"
                                : "期望输出"}
                            </span>
                            <p className="mt-1 text-sm text-[var(--color-text-primary)] bg-(--color-bg-tertiary) p-2 rounded">
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

                        {/* 高级功能指示器 */}
                        {(testCase.preRequestScript ||
                          testCase.testScript ||
                          testCase.environmentId ||
                          !!(testCase.requestConfig &&
                            (testCase.requestConfig as any).dataDrivenConfig)) && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {testCase.preRequestScript && (
                              <Tag icon={<CodeOutlined />} color="orange">
                                前置脚本
                              </Tag>
                            )}
                            {testCase.testScript && (
                              <Tag icon={<CodeOutlined />} color="volcano">
                                测试脚本
                              </Tag>
                            )}
                            {testCase.environmentId && (
                              <Tag icon={<GlobalOutlined />} color="geekblue">
                                环境变量
                              </Tag>
                            )}
                            {!!(
                              testCase.requestConfig &&
                              (testCase.requestConfig as any).dataDrivenConfig
                            ) && (
                              <Tag icon={<DatabaseOutlined />} color="purple">
                                数据驱动
                              </Tag>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })())}
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
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border)">
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
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border)">
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
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border)">
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
                  <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border)">
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

                <div className="flex items-center justify-between">
                  {latestReport.totalDuration !== undefined &&
                    latestReport.totalDuration > 0 && (
                      <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border)">
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
                  <Button
                    type="primary"
                    icon={<BarChartOutlined />}
                    onClick={() => loadReportDetail(latestReport.id)}
                  >
                    查看详细报告
                  </Button>
                </div>

                {/* 用例执行结果 */}
                <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border)">
                  <div className="p-3 border-b border-(--color-border)">
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
                    className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) p-4 cursor-pointer hover:border-blue-400 transition-colors"
                    onClick={() => loadReportDetail(report.id)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <BarChartOutlined className="text-[var(--color-text-tertiary)]" />
                        <span className="font-medium text-[var(--color-text-primary)]">
                          测试报告
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          type="link"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadReportDetail(report.id);
                          }}
                        >
                          查看详情
                        </Button>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(report.executedAt).toLocaleString()}
                        </Text>
                      </div>
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

      {/* 测试报告详情弹窗 */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <BarChartOutlined />
            <span>测试报告详情</span>
          </div>
        }
        open={reportDetailModalOpen}
        onCancel={() => {
          setReportDetailModalOpen(false);
          setSelectedReportDetail(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setReportDetailModalOpen(false);
              setSelectedReportDetail(null);
            }}
          >
            关闭
          </Button>,
        ]}
        width={900}
      >
        {loadingDetail ? (
          <div className="text-center py-8">
            <LoadingOutlined />
            <Text type="secondary" className="ml-2">
              加载中...
            </Text>
          </div>
        ) : selectedReportDetail ? (
          <div className="max-h-[70vh] overflow-y-auto">
            {selectedReportDetail.testCaseReports
              ?.slice()
              .sort((a: any, b: any) => {
                if (a.status === "failed" && b.status !== "failed") return -1;
                if (a.status !== "failed" && b.status === "failed") return 1;
                return 0;
              })
              .map((testCaseReport: any, index: number) => (
                <TestCaseReportDetail key={`${testCaseReport.testCaseId}-${index}`} report={testCaseReport} />
              ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[var(--color-text-tertiary)]">
            暂无报告详情
          </div>
        )}
      </Modal>
    </div>
  );
}
