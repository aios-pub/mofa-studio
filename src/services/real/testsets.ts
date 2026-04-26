/**
 * TestSets 真实 API
 * 后端端点: /api/testset/...
 */

import { apiClient } from "../api/apiClient";
import { mapToCamel } from "./fieldMapper";
import type {
  TestSet,
  TestSetFormData,
  TestCase,
  TestCaseFormData,
  TestCaseRequestType,
  TestReport,
  TestReportDetail,
  TestCategory,
  TestCategoryFormData,
  Assertion,
} from "../../types/testset";
import type {
  ApiDocumentation,
  EndpointDocumentation,
  TestExecutionParams,
  TestExecutionResult,
} from "../../types/documentation";

// ==================== 数据映射 ====================

interface BackendTestSet {
  id: string;
  name: string;
  description?: string;
  category?: string;
  category_id?: string;
  status: string;
  tenant_id?: string;
  create_time: string;
  update_time: string;
}

interface BackendTestCategory {
  id: string;
  name: string;
  parent_id?: string;
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
  request_type?: string;
  request_config?: Record<string, unknown>;
  pre_request_script?: string;
  test_script?: string;
  environment_id?: string;
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
    categoryId: raw.category_id,
    status: raw.status,
    tenantId: raw.tenant_id,
    createTime: raw.create_time,
    updateTime: raw.update_time,
  };
}

function mapTestCategory(raw: BackendTestCategory): TestCategory {
  return {
    id: raw.id,
    name: raw.name,
    parentId: raw.parent_id,
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
    requestType: raw.request_type as TestCaseRequestType | undefined,
    requestConfig: raw.request_config,
    preRequestScript: raw.pre_request_script,
    testScript: raw.test_script,
    environmentId: raw.environment_id,
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
      category_id: data.categoryId,
    });
    return mapTestSet(raw);
  },

  update: async (id: string, data: Partial<TestSetFormData>): Promise<TestSet> => {
    const existing = await testSetRealApi.getById(id);
    const merged = { ...existing, ...data };
    const raw = await apiClient.post<BackendTestSet>("/api/testset/update", {
      id,
      name: merged.name,
      description: merged.description,
      category: merged.category,
      category_id: merged.categoryId,
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
        request_type: data.requestType,
        request_config: data.requestConfig,
        pre_request_script: data.preRequestScript,
        test_script: data.testScript,
        environment_id: data.environmentId,
      },
    );
    return mapTestCase(raw);
  },

  updateCase: async (
    id: string,
    testSetId: string,
    data: Partial<TestCaseFormData>,
  ): Promise<TestCase> => {
    const existing = await testSetRealApi.getCase(id);
    const merged = { ...existing, ...data };
    const raw = await apiClient.post<BackendTestCase>(
      "/api/testset/case/update",
      {
        id,
        test_set_id: testSetId,
        name: merged.name,
        description: merged.description,
        input: merged.input,
        expected_output: merged.expectedOutput ?? merged.expectedOutput,
        assertions: merged.assertions,
        request_type: merged.requestType,
        request_config: merged.requestConfig,
        pre_request_script: merged.preRequestScript,
        test_script: merged.testScript,
        environment_id: merged.environmentId,
      },
    );
    return mapTestCase(raw);
  },

  deleteCase: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/testset/case/delete/${id}`);
    return true;
  },

  copyCase: async (
    id: string,
    testSetId: string,
  ): Promise<TestCase> => {
    const raw = await apiClient.post<BackendTestCase>(
      "/api/testset/case/copy",
      {
        id,
        test_set_id: testSetId,
      },
    );
    return mapTestCase(raw);
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
    testCase: TestCase,
    agentId: string,
  ): Promise<{
    status: string;
    statusCode: number;
    statusMessage: string;
    duration: number;
    error?: string;
    scriptLogs: string[];
    testResults: Array<{ name: string; passed: boolean; error?: string }>;
    body: string;
  }> => {
    const raw = await apiClient.post<any>("/api/testset/run-case", {
      test_case_id: testCase.id,
      agent_id: agentId,
    });
    return {
      status: raw.status,
      statusCode: raw.status_code,
      statusMessage: raw.status_message,
      duration: raw.duration,
      error: raw.error,
      scriptLogs: raw.script_logs || [],
      testResults: raw.test_results || [],
      body: raw.body,
    };
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

  getReportDetail: async (id: string): Promise<TestReportDetail | null> => {
    const raw = await apiClient.get<TestReportDetail | null>(
      `/api/testset/report/${id}/detail`,
    );
    if (!raw) return null;
    return mapToCamel<TestReportDetail>(raw);
  },

  // ==================== TestCategory CRUD ====================

  getAllCategories: async (): Promise<TestCategory[]> => {
    const rawList = await apiClient.get<BackendTestCategory[]>(
      "/api/testset/categories",
    );
    return rawList.map(mapTestCategory);
  },

  createCategory: async (data: TestCategoryFormData): Promise<TestCategory> => {
    const raw = await apiClient.post<BackendTestCategory>(
      "/api/testset/category/create",
      {
        name: data.name,
        parent_id: data.parentId,
      },
    );
    return mapTestCategory(raw);
  },

  updateCategory: async (
    id: string,
    data: { name: string; parentId?: string },
  ): Promise<TestCategory> => {
    const raw = await apiClient.post<BackendTestCategory>(
      "/api/testset/category/update",
      {
        id,
        name: data.name,
        parent_id: data.parentId,
      },
    );
    return mapTestCategory(raw);
  },

  deleteCategory: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/testset/category/delete/${id}`);
    return true;
  },

  // ==================== API Documentation ====================

  getDocumentation: async (testSetId: string): Promise<ApiDocumentation> => {
    return await apiClient.get<ApiDocumentation>(`/api/docs/${testSetId}`);
  },

  getEndpointDoc: async (testCaseId: string): Promise<EndpointDocumentation> => {
    return await apiClient.get<EndpointDocumentation>(
      `/api/docs/endpoint/${testCaseId}`,
    );
  },

  executeFromDocs: async (
    testCaseId: string,
    params: TestExecutionParams,
  ): Promise<TestExecutionResult> => {
    return await apiClient.post<TestExecutionResult>(
      `/api/docs/execute/${testCaseId}`,
      params,
    );
  },

  // ==================== HTTP Test Execution ====================

  executeHttpRequest: async (request: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    params?: Array<{ key: string; value: string; enabled?: boolean }>;
    body?: unknown;
    bodyType?: string;
    timeout?: number;
    authType?: string;
    authConfig?: Record<string, unknown>;
  }): Promise<TestExecutionResult> => {
    return await apiClient.post<TestExecutionResult>(
      "/api/testset/execute-http",
      {
        url: request.url,
        method: request.method,
        headers: request.headers,
        params: request.params,
        body: request.body,
        body_type: request.bodyType,
        timeout: request.timeout,
        auth_type: request.authType,
        auth_config: request.authConfig,
      },
    );
  },

  // ==================== WebSocket Test Execution ====================

  executeWebSocketRequest: async (request: {
    url: string;
    protocols?: string[];
    headers?: Record<string, string>;
    messagesToSend?: Array<{ message: string; delay?: number }>;
    timeout?: number;
  }): Promise<TestExecutionResult> => {
    return await apiClient.post<TestExecutionResult>(
      "/api/testset/execute-websocket",
      {
        url: request.url,
        protocols: request.protocols,
        headers: request.headers,
        messages_to_send: request.messagesToSend,
        timeout: request.timeout,
      },
    );
  },

  // ==================== SSE Test Execution ====================

  executeSSERequest: async (request: {
    url: string;
    headers?: Record<string, string>;
    minEvents?: number;
    maxDuration?: number;
  }): Promise<TestExecutionResult> => {
    return await apiClient.post<TestExecutionResult>(
      "/api/testset/execute-sse",
      {
        url: request.url,
        headers: request.headers,
        min_events: request.minEvents,
        max_duration: request.maxDuration,
      },
    );
  },

  // ==================== Socket.IO Test Execution ====================

  executeSocketIORequest: async (request: {
    url: string;
    namespace?: string;
    auth?: Record<string, unknown>;
    eventsToEmit?: Array<{ event: string; data: unknown }>;
    eventsToListen?: Array<{ event: string }>;
    timeout?: number;
  }): Promise<TestExecutionResult> => {
    return await apiClient.post<TestExecutionResult>(
      "/api/testset/execute-socketio",
      {
        url: request.url,
        namespace: request.namespace,
        auth: request.auth,
        events_to_emit: request.eventsToEmit,
        events_to_listen: request.eventsToListen,
        timeout: request.timeout,
      },
    );
  },
};

export { testSetRealApi };
