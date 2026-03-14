/**
 * 测试集 Mock 数据和 API
 */

import type { TestSet, TestCase, TestReport, Assertion, TestCaseStatus } from '../../types/testset';

// Mock 测试用例
const createMockTestCases = (testSetId: string): TestCase[] => [
  {
    id: `${testSetId}-case-1`,
    testSetId,
    name: '基本问候测试',
    description: '测试 Agent 对基本问候的响应',
    input: '你好，请介绍一下你自己',
    expectedOutput: '应该包含自我介绍',
    assertions: [
      { id: 'a1', type: 'contains', value: '助手', description: '包含"助手"关键词' },
    ],
    status: 'pending',
    createdAt: new Date('2026-03-10'),
  },
  {
    id: `${testSetId}-case-2`,
    testSetId,
    name: '代码解释测试',
    description: '测试 Agent 解释代码的能力',
    input: '请解释这段代码：function add(a, b) { return a + b; }',
    expectedOutput: '应该解释函数的作用',
    assertions: [
      { id: 'a2', type: 'contains', value: '函数', description: '包含"函数"关键词' },
      { id: 'a3', type: 'contains', value: '相加', description: '包含"相加"关键词' },
    ],
    status: 'pending',
    createdAt: new Date('2026-03-11'),
  },
  {
    id: `${testSetId}-case-3`,
    testSetId,
    name: '数学计算测试',
    description: '测试 Agent 的数学计算能力',
    input: '计算 123 * 456 等于多少？',
    expectedOutput: '56088',
    assertions: [
      { id: 'a4', type: 'contains', value: '56088', description: '包含正确答案' },
    ],
    status: 'pending',
    createdAt: new Date('2026-03-12'),
  },
  {
    id: `${testSetId}-case-4`,
    testSetId,
    name: '翻译测试',
    description: '测试 Agent 的翻译能力',
    input: '请将 "Hello, World!" 翻译成中文',
    expectedOutput: '你好，世界！',
    assertions: [
      { id: 'a5', type: 'contains', value: '你好', description: '包含"你好"' },
      { id: 'a6', type: 'contains', value: '世界', description: '包含"世界"' },
    ],
    status: 'pending',
    createdAt: new Date('2026-03-13'),
  },
  {
    id: `${testSetId}-case-5`,
    testSetId,
    name: '错误处理测试',
    description: '测试 Agent 对无效输入的处理',
    input: '',
    expectedOutput: '应该提示输入不能为空',
    assertions: [
      { id: 'a7', type: 'regex', value: '(请|需要|必须).*输入', description: '提示需要输入' },
    ],
    status: 'pending',
    createdAt: new Date('2026-03-14'),
  },
];

// Mock 测试集列表
export const mockTestSets: TestSet[] = [
  {
    id: 'testset-1',
    name: '基础能力测试集',
    description: '测试 Agent 的基础对话能力',
    category: '基础测试',
    cases: createMockTestCases('testset-1'),
    status: 'idle',
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-14'),
  },
  {
    id: 'testset-2',
    name: '代码能力测试集',
    description: '测试 Agent 的代码相关能力',
    category: '代码测试',
    cases: createMockTestCases('testset-2'),
    status: 'idle',
    createdAt: new Date('2026-03-05'),
    updatedAt: new Date('2026-03-14'),
  },
  {
    id: 'testset-3',
    name: '翻译能力测试集',
    description: '测试 Agent 的多语言翻译能力',
    category: '翻译测试',
    cases: createMockTestCases('testset-3'),
    status: 'idle',
    createdAt: new Date('2026-03-10'),
    updatedAt: new Date('2026-03-14'),
  },
];

// Agent 关联的测试集
const agentTestSets: Map<string, string[]> = new Map([
  ['agent-1', ['testset-1']],
  ['agent-2', ['testset-1', 'testset-2']],
  ['agent-3', ['testset-1', 'testset-3']],
  ['agent-4', ['testset-1', 'testset-2']],
  ['agent-5', ['testset-1']],
]);

// 测试报告存储
const testReports: TestReport[] = [];

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 测试集 API
export const testSetApi = {
  // 获取所有测试集
  async getAll(): Promise<TestSet[]> {
    await delay(300);
    return mockTestSets;
  },

  // 获取单个测试集
  async getById(id: string): Promise<TestSet | undefined> {
    await delay(200);
    return mockTestSets.find((t) => t.id === id);
  },

  // 获取 Agent 关联的测试集
  async getAgentTestSets(agentId: string): Promise<TestSet[]> {
    await delay(200);
    const testSetIds = agentTestSets.get(agentId) || [];
    return mockTestSets.filter((t) => testSetIds.includes(t.id));
  },

  // 更新 Agent 关联的测试集
  async updateAgentTestSets(agentId: string, testSetIds: string[]): Promise<void> {
    await delay(200);
    agentTestSets.set(agentId, testSetIds);
  },

  // 运行单个测试用例
  async runTestCase(
    _agentId: string,
    testCase: TestCase
  ): Promise<{ status: TestCaseStatus; output: string; duration: number }> {
    await delay(500 + Math.random() * 1000);

    // 模拟 AI 响应
    const mockResponses: Record<string, string> = {
      '基本问候测试': '你好！我是 AI 助手，很高兴为您服务。我可以帮助您解答问题、编写代码、翻译文本等。',
      '代码解释测试': '这是一个 JavaScript 函数，名为 add。它接收两个参数 a 和 b，然后返回它们的和。这是一个简单的加法函数。',
      '数学计算测试': '123 × 456 = 56088',
      '翻译测试': '"Hello, World!" 翻译成中文是 "你好，世界！"',
      '错误处理测试': '请提供您想要咨询的问题，我会尽力为您解答。',
    };

    const output = mockResponses[testCase.name] || `这是对 "${testCase.input}" 的模拟响应。`;
    const duration = Math.floor(500 + Math.random() * 1500);

    // 验证断言
    let allPassed = true;
    for (const assertion of testCase.assertions) {
      const passed = this.evaluateAssertion(output, assertion);
      if (!passed) {
        allPassed = false;
        break;
      }
    }

    return {
      status: allPassed ? 'passed' : 'failed',
      output,
      duration,
    };
  },

  // 评估断言
  evaluateAssertion(output: string, assertion: Assertion): boolean {
    switch (assertion.type) {
      case 'exact':
        return output === assertion.value;
      case 'contains':
        return output.includes(assertion.value);
      case 'regex':
        return new RegExp(assertion.value).test(output);
      default:
        return true;
    }
  },

  // 运行测试集
  async runTestSet(agentId: string, testSetId: string): Promise<TestReport> {
    const testSet = mockTestSets.find((t) => t.id === testSetId);
    if (!testSet) {
      throw new Error('Test set not found');
    }

    // 更新状态为运行中
    testSet.status = 'running';

    const reportCases: TestReport['cases'] = [];
    let passedCount = 0;
    let totalDuration = 0;

    // 逐个运行测试用例
    for (const testCase of testSet.cases) {
      const result = await this.runTestCase(agentId, testCase);

      const assertionResults = testCase.assertions.map((assertion) => ({
        type: assertion.type,
        passed: this.evaluateAssertion(result.output, assertion),
        message: assertion.description,
      }));

      const allAssertionsPassed = assertionResults.every((a) => a.passed);

      reportCases.push({
        caseId: testCase.id,
        caseName: testCase.name,
        status: allAssertionsPassed ? 'passed' : 'failed',
        duration: result.duration,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: result.output,
        assertions: assertionResults,
      });

      if (allAssertionsPassed) {
        passedCount++;
      }
      totalDuration += result.duration;
    }

    // 更新测试集状态
    testSet.status = 'completed';
    testSet.passRate = (passedCount / testSet.cases.length) * 100;
    testSet.totalDuration = totalDuration;

    const report: TestReport = {
      id: `report-${Date.now()}`,
      testSetId,
      agentId,
      totalCases: testSet.cases.length,
      passedCases: passedCount,
      failedCases: testSet.cases.length - passedCount,
      passRate: (passedCount / testSet.cases.length) * 100,
      totalDuration,
      cases: reportCases,
      executedAt: new Date(),
    };

    testReports.unshift(report);
    return report;
  },

  // 获取测试报告
  async getReports(agentId?: string): Promise<TestReport[]> {
    await delay(200);
    if (agentId) {
      return testReports.filter((r) => r.agentId === agentId);
    }
    return testReports;
  },
};
