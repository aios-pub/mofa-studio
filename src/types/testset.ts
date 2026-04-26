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

/** 测试用例类型 */
export type TestCaseRequestType = "agent" | "http" | "workflow" | "websocket" | "sse" | "socketio";

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
  requestType?: TestCaseRequestType;
  requestConfig?: Record<string, unknown>;
  preRequestScript?: string;
  testScript?: string;
  environmentId?: string;
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
  requestType?: TestCaseRequestType;
  requestConfig?: Record<string, unknown>;
  preRequestScript?: string;
  testScript?: string;
  environmentId?: string;
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

/** 测试报告详情（包含用例级别的详细结果） */
export interface TestReportDetail {
  id: string;
  testSetId: string;
  testSetName: string;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  passRate?: number;
  totalDuration: number;
  executedAt: string;
  testCaseReports: TestCaseReport[];
  environment: Record<string, string>;
  metadata: Record<string, string>;
}

/** 测试用例报告详情 */
export interface TestCaseReport {
  testCaseId: string;
  testCaseName: string;
  status: string;
  statusCode: number;
  statusMessage: string;
  duration: number;
  error?: string;
  scriptLogs: string[];
  testResults: TestScriptResult[];
  iterations?: TestIteration[];
  request?: RequestInfo;
  response?: ResponseInfo;
}

/** 测试脚本结果 */
export interface TestScriptResult {
  name: string;
  passed: boolean;
  error?: string;
}

/** 测试迭代（数据驱动测试） */
export interface TestIteration {
  iterationNumber: number;
  dataRow: Record<string, string>;
  status: string;
  duration: number;
  error?: string;
  response?: ResponseInfo;
}

/** 请求信息 */
export interface RequestInfo {
  method: string;
  url: string;
  headers: NameValuePair[];
  body?: string;
}

/** 响应信息 */
export interface ResponseInfo {
  statusCode: number;
  statusMessage: string;
  headers: NameValuePair[];
  body: string;
}

/** 键值对 */
export interface NameValuePair {
  name: string;
  value: string;
}

// ==================== HTTP请求相关类型 ====================

/** HTTP方法 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

/** 认证类型 */
export type AuthType = "none" | "bearer" | "api_key" | "basic" | "oauth2";

/** 请求体类型 */
export type BodyType = "none" | "form_data" | "x_www_form_urlencoded" | "raw" | "binary";

/** Raw类型 */
export type RawContentType = "text/plain" | "application/json" | "application/xml" | "text/html" | "text/javascript";

/** 键值对 */
export interface KeyValue {
  key: string;
  value: string;
  description?: string;
  enabled?: boolean;
}

/** HTTP请求配置 */
export interface HttpRequestConfig {
  url: string;
  method: HttpMethod;
  headers?: KeyValue[];
  params?: KeyValue[];
  bodyType?: BodyType;
  body?: Record<string, unknown> | KeyValue[] | string;
  rawContentType?: RawContentType;
  authType?: AuthType;
  authConfig?: {
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    addTo?: "header" | "query";
    headerName?: string;
  };
  timeout?: number;
}

/** HTTP响应 */
export interface HttpResponse {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string>;
  body: string;
  responseTime: number;
}

/** WebSocket请求配置 */
export interface WebSocketRequestConfig {
  url: string;
  protocols?: string[];
  headers?: KeyValue[];
  messagesToSend?: Array<{
    message: string;
    delay?: number;
  }>;
  expectedEvents?: Array<{
    event: string;
    expectedData?: string;
  }>;
  timeout?: number;
}

/** SSE请求配置 */
export interface SSERequestConfig {
  url: string;
  headers?: KeyValue[];
  minEvents?: number;
  maxDuration?: number;
  expectedEvents?: Array<{
    event?: string;
  }>;
}

/** Socket.IO请求配置 */
export interface SocketIORequestConfig {
  url: string;
  namespace?: string;
  auth?: Record<string, unknown>;
  eventsToEmit?: Array<{
    event: string;
    data: Record<string, unknown>;
  }>;
  eventsToListen?: string[];
  timeout?: number;
}

/** 工作流请求配置 */
export interface WorkflowRequestConfig {
  workflowId: string;
  inputMapping?: Record<string, string>;
  expectedOutput?: Record<string, unknown>;
}

/** 环境变量 */
export interface Environment {
  id: string;
  name: string;
  description?: string;
  variables: EnvironmentVariable[];
  isGlobal: boolean;
  tenantId?: string;
  createTime: string;
  updateTime: string;
}

/** 环境变量项 */
export interface EnvironmentVariable {
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
  type?: "string" | "number" | "boolean" | "json";
}

/** 环境变量表单数据 */
export interface EnvironmentFormData {
  name: string;
  description?: string;
  variables: EnvironmentVariable[];
  isGlobal?: boolean;
}

/** 环境变量创建数据 */
export interface EnvironmentCreateData {
  name: string;
  description?: string;
  variables: EnvironmentVariable[];
  isGlobal?: boolean;
}

/** 脚本类型 */
export type ScriptType = "pre_request" | "test";

/** 脚本配置 */
export interface Script {
  id: string;
  type: ScriptType;
  name: string;
  content: string;
  enabled: boolean;
  createTime: string;
  updateTime: string;
}

/** 测试用例脚本关联 */
export interface TestCaseScript {
  testCaseId: string;
  preRequestScript?: string;
  testScript?: string;
}

/** 脚本执行上下文 - 类似Postman的pm对象 */
export interface ScriptContext {
  // 环境变量
  environment: {
    get: (key: string) => string | undefined;
    set: (key: string, value: string) => void;
    unset: (key: string) => void;
    clear: () => void;
    toArray: () => Array<{ key: string; value: string }>;
  };
  // 全局变量
  globals: {
    get: (key: string) => string | undefined;
    set: (key: string, value: string) => void;
    unset: (key: string) => void;
    clear: () => void;
    toArray: () => Array<{ key: string; value: string }>;
  };
  // 请求数据
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: unknown;
  };
  // 响应数据（仅在后置脚本中可用）
  response?: {
    statusCode: number;
    statusMessage: string;
    headers: Record<string, string>;
    body: string;
    responseTime: number;
  };
  // 测试断言（仅在后置脚本中可用）
  test?: {
    (name: string, fn: () => void): void;
  };
  // 工具函数
  utils: {
    replaceVariables: (text: string) => string;
    base64Encode: (text: string) => string;
    base64Decode: (text: string) => string;
    jsonParse: (text: string) => unknown;
    jsonStringify: (obj: unknown) => string;
  };
}

/** 脚本执行结果 */
export interface ScriptExecutionResult {
  success: boolean;
  error?: string;
  logs: string[];
  testResults?: Array<{
    name: string;
    passed: boolean;
    error?: string;
  }>;
  environmentChanges?: Array<{ key: string; value: string; action: "set" | "unset" }>;
}

/** 数据驱动测试数据源类型 */
export type DataSourceType = "csv" | "json" | "excel";

/** 数据驱动测试配置 */
export interface DataDrivenTestConfig {
  id: string;
  testCaseId: string;
  name: string;
  dataSourceType: DataSourceType;
  dataSourceData: string; // 文件内容或内联数据
  variableMapping: Record<string, string>; // 数据列到变量名的映射
  enabled: boolean;
  iterateCount?: number; // 迭代次数，默认为数据行数
}

/** 数据行 */
export interface DataRow {
  index: number;
  data: Record<string, string>;
  variables: Record<string, string>; // 应用映射后的变量
}

/** 数据驱动测试执行结果 */
export interface DataDrivenTestResult {
  testCaseId: string;
  totalIterations: number;
  passedIterations: number;
  failedIterations: number;
  iterationResults: Array<{
    iteration: number;
    data: Record<string, string>;
    success: boolean;
    error?: string;
    response?: {
      statusCode: number;
      body: string;
      responseTime: number;
    };
  }>;
}

