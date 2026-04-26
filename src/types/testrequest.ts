/**
 * HTTP请求相关类型定义
 * 从testset.ts中分离出来的专用类型
 */

// 重新导出testset中的HTTP相关类型
export type {
  HttpMethod,
  AuthType,
  BodyType,
  RawContentType,
  KeyValue,
  HttpRequestConfig,
  HttpResponse,
  WebSocketRequestConfig,
  SSERequestConfig,
  SocketIORequestConfig,
  WorkflowRequestConfig,
} from "./testset";

// ==================== 环境变量相关类型 ====================

/** 环境变量 */
export interface EnvironmentVariable {
  key: string;
  value: string;
  description?: string;
  enabled?: boolean;
}

/** 环境 */
export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
  isGlobal?: boolean;
  tenantId?: string;
  createTime: string;
  updateTime: string;
}

// ==================== 脚本相关类型 ====================

/** 脚本类型 */
export type ScriptType = "pre_request" | "test";

/** 脚本配置 */
export interface ScriptConfig {
  type: ScriptType;
  script: string;
  enabled?: boolean;
}

// ==================== 测试执行相关类型 ====================

/** 测试执行参数 */
export interface TestExecutionParams {
  environmentId?: string;
  timeout?: number;
  retryCount?: number;
}

// 注意: TestExecutionResult 在 documentation.ts 中定义
// 此文件仅定义 HTTP 请求相关的配置类型
