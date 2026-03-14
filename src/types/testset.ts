/**
 * 测试集相关类型定义
 */

/** 测试用例状态 */
export type TestCaseStatus = 'pending' | 'running' | 'passed' | 'failed';

/** 断言类型 */
export type AssertionType = 'exact' | 'contains' | 'regex' | 'ai_eval' | 'custom';

/** 断言配置 */
export interface Assertion {
  id: string;
  type: AssertionType;
  value: string;
  description?: string;
}

/** 测试用例 */
export interface TestCase {
  id: string;
  testSetId: string;
  name: string;
  description?: string;
  input: string;
  expectedOutput?: string;
  assertions: Assertion[];
  status: TestCaseStatus;
  actualOutput?: string;
  duration?: number; // 毫秒
  error?: string;
  createdAt: Date;
}

/** 测试集 */
export interface TestSet {
  id: string;
  name: string;
  description: string;
  category: string;
  cases: TestCase[];
  status: 'idle' | 'running' | 'completed';
  passRate?: number;
  totalDuration?: number;
  createdAt: Date;
  updatedAt: Date;
}

/** 测试报告 */
export interface TestReport {
  id: string;
  testSetId: string;
  agentId: string;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  passRate: number;
  totalDuration: number;
  cases: Array<{
    caseId: string;
    caseName: string;
    status: TestCaseStatus;
    duration: number;
    input: string;
    expectedOutput?: string;
    actualOutput?: string;
    assertions: Array<{
      type: AssertionType;
      passed: boolean;
      message?: string;
    }>;
    error?: string;
  }>;
  executedAt: Date;
}
