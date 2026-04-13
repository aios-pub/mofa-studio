/**
 * TestSets 真实 API
 * 后端端点: /api/testset/...
 */

import { apiClient } from "../api/apiClient";
import type {
  TestSet,
  TestSetFormData,
  TestCase,
  TestCaseFormData,
  TestReport,
  Assertion,
} from "../../types/testset";

// ==================== 数据映射 ====================

interface BackendTestSet {
  id: string;
  name: string;
  description?: string;
  category?: string;
  status: string;
  tenant_id?: string;
  create_time: string;
  update_time: string;
}

interface BackendTestCase {
  id: string;
  test_set_id: string;
  name: string;
  description?: string;
  input: string;
  expected_output?: string;
  assertions?: Assertion[] | Record<string, unknown>;
  status: string;
  tenant_id?: string;
  create_time: string;
  update_time: string;
}

interface BackendTestReport {
  id: string;
  test_set_id: string;
  agent_id: string;
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  pass_rate?: number;
  total_duration?: number;
  executed_at: string;
  tenant_id?: string;
  create_time: string;
  update_time: string;
}

function mapTestSet(raw: BackendTestSet): TestSet {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    category: raw.category,
    status: raw.status,
    tenantId: raw.tenant_id,
    createTime: raw.create_time,
    updateTime: raw.update_time,
  };
}

function mapTestCase(raw: BackendTestCase): TestCase {
  return {
    id: raw.id,
    testSetId: raw.test_set_id,
    name: raw.name,
    description: raw.description,
    input: raw.input,
    expectedOutput: raw.expected_output,
    assertions: raw.assertions,
    status: raw.status,
    tenantId: raw.tenant_id,
    createTime: raw.create_time,
    updateTime: raw.update_time,
  };
}

function mapTestReport(raw: BackendTestReport): TestReport {
  return {
    id: raw.id,
    testSetId: raw.test_set_id,
    agentId: raw.agent_id,
    totalCases: raw.total_cases,
    passedCases: raw.passed_cases,
    failedCases: raw.failed_cases,
    passRate: raw.pass_rate,
    totalDuration: raw.total_duration,
    executedAt: raw.executed_at,
    tenantId: raw.tenant_id,
    createTime: raw.create_time,
    updateTime: raw.update_time,
  };
}

// ==================== API ====================

const testSetRealApi = {
  // ==================== TestSet CRUD ====================

  getAll: async (): Promise<TestSet[]> => {
    const rawList = await apiClient.get<BackendTestSet[]>("/api/testset/list");
    return rawList.map(mapTestSet);
  },

  getById: async (id: string): Promise<TestSet> => {
    const raw = await apiClient.get<BackendTestSet>(`/api/testset/${id}`);
    return mapTestSet(raw);
  },

  create: async (data: TestSetFormData): Promise<TestSet> => {
    const raw = await apiClient.post<BackendTestSet>("/api/testset/create", {
      name: data.name,
      description: data.description,
      category: data.category,
    });
    return mapTestSet(raw);
  },

  update: async (id: string, data: Partial<TestSetFormData>): Promise<TestSet> => {
    const raw = await apiClient.post<BackendTestSet>("/api/testset/update", {
      id,
      name: data.name,
      description: data.description,
      category: data.category,
    });
    return mapTestSet(raw);
  },

  delete: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/testset/delete/${id}`);
    return true;
  },

  // ==================== TestCase CRUD ====================

  getCases: async (testSetId: string): Promise<TestCase[]> => {
    const rawList = await apiClient.get<BackendTestCase[]>(
      `/api/testset/cases?test_set_id=${testSetId}`,
    );
    return rawList.map(mapTestCase);
  },

  getCase: async (id: string): Promise<TestCase> => {
    const raw = await apiClient.get<BackendTestCase>(`/api/testset/case/${id}`);
    return mapTestCase(raw);
  },

  createCase: async (
    testSetId: string,
    data: TestCaseFormData,
  ): Promise<TestCase> => {
    const raw = await apiClient.post<BackendTestCase>(
      "/api/testset/case/create",
      {
        test_set_id: testSetId,
        name: data.name,
        description: data.description,
        input: data.input,
        expected_output: data.expectedOutput,
        assertions: data.assertions,
      },
    );
    return mapTestCase(raw);
  },

  updateCase: async (
    id: string,
    testSetId: string,
    data: Partial<TestCaseFormData>,
  ): Promise<TestCase> => {
    const raw = await apiClient.post<BackendTestCase>(
      "/api/testset/case/update",
      {
        id,
        test_set_id: testSetId,
        name: data.name,
        description: data.description,
        input: data.input,
        expected_output: data.expectedOutput,
        assertions: data.assertions,
      },
    );
    return mapTestCase(raw);
  },

  deleteCase: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/testset/case/delete/${id}`);
    return true;
  },

  // ==================== Test Execution ====================

  runTest: async (
    testSetId: string,
    agentId: string,
  ): Promise<TestReport> => {
    const raw = await apiClient.post<BackendTestReport>(
      "/api/testset/run-test",
      {
        test_set_id: testSetId,
        agent_id: agentId,
      },
    );
    return mapTestReport(raw);
  },

  // 别名
  runTestSet: async (
    testSetId: string,
    agentId: string,
  ): Promise<TestReport> => {
    const raw = await apiClient.post<BackendTestReport>(
      "/api/testset/run-test",
      {
        test_set_id: testSetId,
        agent_id: agentId,
      },
    );
    return mapTestReport(raw);
  },

  runTestCase: async (
    _testCase: TestCase,
  ): Promise<{ status: string; output: string }> => {
    console.warn("testSetApi.runTestCase: Using mock response");
    return { status: "passed", output: "Test case executed successfully" };
  },

  // ==================== Test Reports ====================

  getReportsByTestSet: async (testSetId: string): Promise<TestReport[]> => {
    const rawList = await apiClient.get<BackendTestReport[]>(
      `/api/testset/reports/by-testset?test_set_id=${testSetId}`,
    );
    return rawList.map(mapTestReport);
  },

  getReportsByAgent: async (agentId: string): Promise<TestReport[]> => {
    const rawList = await apiClient.get<BackendTestReport[]>(
      `/api/testset/reports/by-agent?agent_id=${agentId}`,
    );
    return rawList.map(mapTestReport);
  },

  getReport: async (id: string): Promise<TestReport> => {
    const raw = await apiClient.get<BackendTestReport>(
      `/api/testset/report/${id}`,
    );
    return mapTestReport(raw);
  },
};

export { testSetRealApi };
