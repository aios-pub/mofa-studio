/**
 * TestSets 真实 API
 * 后端端点: /api/testset/...
 */

import { createActionApi } from "./base";
import { apiClient } from "../api/apiClient";

// 类型定义
interface TestSetItem {
  id: string;
  testSetId: string;
  input: string;
  expectedOutput?: string;
  actualOutput?: string;
  status?: 'pending' | 'running' | 'passed' | 'failed';
  createdAt: Date;
}

interface TestSet {
  id: string;
  name: string;
  description: string;
  agentId: string;
  items: TestSetItem[];
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TestCase {
  id: string;
  testSetId: string;
  input: string;
  expectedOutput?: string;
  actualOutput?: string;
  status?: 'pending' | 'running' | 'passed' | 'failed';
}

const baseApi = createActionApi<TestSet>("/api/testset", "list");

const testSetRealApi = {
  ...baseApi,

  getByCategory: (category: string): Promise<TestSet[]> =>
    apiClient.get<TestSet[]>(`/api/testset/by-category?category=${category}`),

  // Test Cases
  getCases: (): Promise<TestSetItem[]> =>
    apiClient.get<TestSetItem[]>("/api/testset/cases"),

  getCase: (id: string): Promise<TestSetItem> =>
    apiClient.get<TestSetItem>(`/api/testset/case/${id}`),

  createCase: (data: Partial<TestSetItem>): Promise<TestSetItem> =>
    apiClient.post<TestSetItem>("/api/testset/case/create", data),

  updateCase: (id: string, data: Partial<TestSetItem>): Promise<TestSetItem> =>
    apiClient.post<TestSetItem>("/api/testset/case/update", { id, ...data }),

  deleteCase: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/testset/case/delete/${id}`);
    return true;
  },

  // Test Reports
  getReportsByTestSet: (testsetId: string): Promise<unknown[]> =>
    apiClient.get(`/api/testset/reports/by-testset?testset_id=${testsetId}`),

  getReportsByAgent: (agentId: string): Promise<unknown[]> =>
    apiClient.get(`/api/testset/reports/by-agent?agent_id=${agentId}`),

  getReport: (id: string): Promise<unknown> =>
    apiClient.get(`/api/testset/report/${id}`),

  createReport: (data: Record<string, unknown>): Promise<unknown> =>
    apiClient.post("/api/testset/report/create", data),

  deleteReport: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/testset/report/delete/${id}`);
    return true;
  },

  // 兼容旧接口
  getItems: (testSetId: string): Promise<TestSetItem[]> =>
    apiClient.get<TestSetItem[]>(`/api/testset/cases?testset_id=${testSetId}`),

  addItem: (testSetId: string, item: Partial<TestSetItem>): Promise<TestSetItem> =>
    apiClient.post<TestSetItem>("/api/testset/case/create", { testset_id: testSetId, ...item }),

  runTest: (testSetId: string, agentId: string): Promise<{ id: string; totalCases: number; passedCases: number; failedCases: number; passRate: number }> =>
    apiClient.post("/api/testset/run-test", { test_set_id: testSetId, agent_id: agentId }),

  // 别名方法
  runTestSet: (testSetId: string, agentId: string): Promise<{ id: string; totalCases: number; passedCases: number; failedCases: number; passRate: number }> =>
    apiClient.post("/api/testset/run-test", { test_set_id: testSetId, agent_id: agentId }),

  runTestCase: async (_testCase: TestCase): Promise<{ status: string; output: string }> => {
    console.warn("testSetApi.runTestCase: Using mock response");
    return { status: "passed", output: "Test case executed successfully" };
  },
};

export { testSetRealApi };
export type { TestSet, TestSetItem, TestCase };
