/**
 * 测试集 Mock 数据和 API
 */

import type {
  TestSet,
  TestSetFormData,
  TestCase,
  TestCaseFormData,
  TestReport,
  TestCaseStatus,
} from "../../types/testset";

// Mock 测试用例
const createMockTestCases = (testSetId: string): TestCase[] => [
  {
    id: `${testSetId}-case-1`,
    testSetId,
    name: "基本问候测试",
    description: "测试 Agent 对基本问候的响应",
    input: "你好，请介绍一下你自己",
    expectedOutput: "应该包含自我介绍",
    assertions: [
      { id: "a1", type: "contains", value: "助手", description: '包含"助手"关键词' },
    ],
    status: "pending",
    createTime: "2026-03-10T00:00:00",
    updateTime: "2026-03-10T00:00:00",
  },
  {
    id: `${testSetId}-case-2`,
    testSetId,
    name: "代码解释测试",
    description: "测试 Agent 解释代码的能力",
    input: "请解释这段代码：function add(a, b) { return a + b; }",
    expectedOutput: "应该解释函数的作用",
    assertions: [
      { id: "a2", type: "contains", value: "函数", description: '包含"函数"关键词' },
      { id: "a3", type: "contains", value: "相加", description: '包含"相加"关键词' },
    ],
    status: "pending",
    createTime: "2026-03-11T00:00:00",
    updateTime: "2026-03-11T00:00:00",
  },
  {
    id: `${testSetId}-case-3`,
    testSetId,
    name: "数学计算测试",
    description: "测试 Agent 的数学计算能力",
    input: "计算 123 * 456 等于多少？",
    expectedOutput: "56088",
    assertions: [
      { id: "a4", type: "contains", value: "56088", description: "包含正确答案" },
    ],
    status: "pending",
    createTime: "2026-03-12T00:00:00",
    updateTime: "2026-03-12T00:00:00",
  },
];

// Mock 测试集列表
let mockTestSets: TestSet[] = [
  {
    id: "testset-1",
    name: "基础能力测试集",
    description: "测试 Agent 的基础对话能力",
    category: "基础测试",
    status: "idle",
    createTime: "2026-03-01T00:00:00",
    updateTime: "2026-03-14T00:00:00",
  },
  {
    id: "testset-2",
    name: "代码能力测试集",
    description: "测试 Agent 的代码相关能力",
    category: "代码测试",
    status: "idle",
    createTime: "2026-03-05T00:00:00",
    updateTime: "2026-03-14T00:00:00",
  },
  {
    id: "testset-3",
    name: "翻译能力测试集",
    description: "测试 Agent 的多语言翻译能力",
    category: "翻译测试",
    status: "idle",
    createTime: "2026-03-10T00:00:00",
    updateTime: "2026-03-14T00:00:00",
  },
];

// Mock 测试用例存储
let mockTestCases: Map<string, TestCase[]> = new Map([
  ["testset-1", createMockTestCases("testset-1")],
  ["testset-2", createMockTestCases("testset-2")],
  ["testset-3", createMockTestCases("testset-3")],
]);

// 测试报告存储
const testReports: TestReport[] = [];

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 测试集 API
export const testSetApi = {
  // ==================== TestSet CRUD ====================

  async getAll(): Promise<TestSet[]> {
    await delay(300);
    return [...mockTestSets];
  },

  async getById(id: string): Promise<TestSet> {
    await delay(200);
    const testSet = mockTestSets.find((t) => t.id === id);
    if (!testSet) throw new Error("Test set not found");
    return { ...testSet };
  },

  async create(data: TestSetFormData): Promise<TestSet> {
    await delay(300);
    const now = new Date().toISOString();
    const testSet: TestSet = {
      id: `testset-${Date.now()}`,
      name: data.name,
      description: data.description,
      category: data.category,
      status: "idle",
      createTime: now,
      updateTime: now,
    };
    mockTestSets.push(testSet);
    return testSet;
  },

  async update(id: string, data: Partial<TestSetFormData>): Promise<TestSet> {
    await delay(300);
    const index = mockTestSets.findIndex((t) => t.id === id);
    if (index === -1) throw new Error("Test set not found");

    mockTestSets[index] = {
      ...mockTestSets[index],
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.category !== undefined && { category: data.category }),
      updateTime: new Date().toISOString(),
    };
    return { ...mockTestSets[index] };
  },

  async delete(id: string): Promise<boolean> {
    await delay(200);
    mockTestSets = mockTestSets.filter((t) => t.id !== id);
    mockTestCases.delete(id);
    return true;
  },

  // ==================== TestCase CRUD ====================

  async getCases(testSetId: string): Promise<TestCase[]> {
    await delay(200);
    return [...(mockTestCases.get(testSetId) || [])];
  },

  async getCase(id: string): Promise<TestCase> {
    await delay(200);
    for (const cases of mockTestCases.values()) {
      const found = cases.find((c) => c.id === id);
      if (found) return { ...found };
    }
    throw new Error("Test case not found");
  },

  async createCase(testSetId: string, data: TestCaseFormData): Promise<TestCase> {
    await delay(300);
    const now = new Date().toISOString();
    const testCase: TestCase = {
      id: `case-${Date.now()}`,
      testSetId,
      name: data.name,
      description: data.description,
      input: data.input,
      expectedOutput: data.expectedOutput,
      assertions: data.assertions,
      status: "pending",
      createTime: now,
      updateTime: now,
    };
    const cases = mockTestCases.get(testSetId) || [];
    cases.push(testCase);
    mockTestCases.set(testSetId, cases);
    return testCase;
  },

  async updateCase(
    id: string,
    testSetId: string,
    data: Partial<TestCaseFormData>,
  ): Promise<TestCase> {
    await delay(300);
    const cases = mockTestCases.get(testSetId) || [];
    const index = cases.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Test case not found");

    cases[index] = {
      ...cases[index],
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.input && { input: data.input }),
      ...(data.expectedOutput !== undefined && { expectedOutput: data.expectedOutput }),
      ...(data.assertions !== undefined && { assertions: data.assertions }),
      updateTime: new Date().toISOString(),
    };
    mockTestCases.set(testSetId, cases);
    return { ...cases[index] };
  },

  async deleteCase(id: string): Promise<boolean> {
    await delay(200);
    for (const [testSetId, cases] of mockTestCases.entries()) {
      const filtered = cases.filter((c) => c.id !== id);
      if (filtered.length !== cases.length) {
        mockTestCases.set(testSetId, filtered);
        return true;
      }
    }
    return true;
  },

  // ==================== Test Execution ====================

  async runTestCase(
    _agentId: string,
    testCase: TestCase,
  ): Promise<{ status: TestCaseStatus; output: string; duration: number }> {
    await delay(500 + Math.random() * 1000);
    const mockResponses: Record<string, string> = {
      基本问候测试:
        "你好！我是 AI 助手，很高兴为您服务。我可以帮助您解答问题、编写代码、翻译文本等。",
      代码解释测试:
        "这是一个 JavaScript 函数，名为 add。它接收两个参数 a 和 b，然后返回它们的和。这是一个简单的加法函数。",
      数学计算测试: "123 × 456 = 56088",
    };

    const output =
      mockResponses[testCase.name] ||
      `这是对 "${testCase.input}" 的模拟响应。`;
    const duration = Math.floor(500 + Math.random() * 1500);

    return {
      status: "passed",
      output,
      duration,
    };
  },

  async runTestSet(agentId: string, testSetId: string): Promise<TestReport> {
    await delay(1000);
    const cases = mockTestCases.get(testSetId) || [];
    const totalCases = cases.length;
    const passedCases = Math.floor(totalCases * (0.6 + Math.random() * 0.4));
    const failedCases = totalCases - passedCases;
    const passRate = totalCases > 0 ? (passedCases / totalCases) * 100 : 0;

    const report: TestReport = {
      id: `report-${Date.now()}`,
      testSetId,
      agentId,
      totalCases,
      passedCases,
      failedCases,
      passRate,
      totalDuration: Math.floor(totalCases * (500 + Math.random() * 1000)),
      executedAt: new Date().toISOString(),
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
    };

    testReports.unshift(report);

    // 更新测试集状态
    const index = mockTestSets.findIndex((t) => t.id === testSetId);
    if (index !== -1) {
      mockTestSets[index] = {
        ...mockTestSets[index],
        status: "completed",
        updateTime: new Date().toISOString(),
      };
    }

    return report;
  },

  // ==================== Test Reports ====================

  async getReportsByTestSet(testSetId: string): Promise<TestReport[]> {
    await delay(200);
    return testReports.filter((r) => r.testSetId === testSetId);
  },

  async getReportsByAgent(agentId: string): Promise<TestReport[]> {
    await delay(200);
    return testReports.filter((r) => r.agentId === agentId);
  },

  async getReport(id: string): Promise<TestReport> {
    await delay(200);
    const report = testReports.find((r) => r.id === id);
    if (!report) throw new Error("Report not found");
    return report;
  },
};
