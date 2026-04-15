/**
 * 测试集相关类型定义
 * 与后端 DTO 对齐
 */

/** 测试用例状态 */
export type TestCaseStatus = "pending" | "running" | "passed" | "failed";

/** 断言类型 */
export type AssertionType = "exact" | "contains" | "regex" | "ai_eval" | "custom";

/** 断言配置 */
export interface Assertion {
  id: string;
  type: AssertionType;
  value: string;
  description?: string;
}

/** 测试集 - 对应后端 TestSetDTO */
export interface TestSet {
  id: string;
  name: string;
  description?: string;
  category?: string;
  categoryId?: string;
  status: string;
  tenantId?: string;
  createTime: string;
  updateTime: string;
}

/** 测试集详情 - 包含关联的测试用例 */
export interface TestSetDetail extends TestSet {
  cases: TestCase[];
}

/** 测试用例 - 对应后端 TestCaseDTO */
export interface TestCase {
  id: string;
  testSetId: string;
  name: string;
  description?: string;
  input: string;
  expectedOutput?: string;
  assertions?: Assertion[] | Record<string, unknown>;
  status: string;
  tenantId?: string;
  createTime: string;
  updateTime: string;
}

/** 测试用例创建/编辑表单数据 */
export interface TestCaseFormData {
  name: string;
  description?: string;
  input: string;
  expectedOutput?: string;
  assertions?: Assertion[];
}

/** 测试集创建/编辑表单数据 */
export interface TestSetFormData {
  name: string;
  description?: string;
  category?: string;
  categoryId?: string;
}

/** 测试分类 - 对应后端 TestCategoryDTO */
export interface TestCategory {
  id: string;
  name: string;
  parentId?: string;
  tenantId?: string;
  createTime: string;
  updateTime: string;
}

/** 分类创建/编辑表单数据 */
export interface TestCategoryFormData {
  name: string;
  parentId?: string;
}

/** 测试报告 - 对应后端 TestReportDTO */
export interface TestReport {
  id: string;
  testSetId: string;
  agentId: string;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  passRate?: number;
  totalDuration?: number;
  executedAt: string;
  tenantId?: string;
  createTime: string;
  updateTime: string;
}

/** 报告中的用例结果（前端展示用） */
export interface ReportCaseResult {
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
}
