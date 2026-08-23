/**
 * HTTP request type definitions
 * Dedicated types split out of testset.ts
 */

// Re-export HTTP-related types from testset
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

// ==================== Environment variable types ====================

/** Environment variable */
export interface EnvironmentVariable {
  key: string;
  value: string;
  description?: string;
  enabled?: boolean;
}

/** Environments */
export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
  isGlobal?: boolean;
  tenantId?: string;
  createTime: string;
  updateTime: string;
}

// ==================== Script types ====================

/** Script type */
export type ScriptType = "pre_request" | "test";

/** Script configuration */
export interface ScriptConfig {
  type: ScriptType;
  script: string;
  enabled?: boolean;
}

// ==================== Test execution types ====================

/** Test execution parameters */
export interface TestExecutionParams {
  environmentId?: string;
  timeout?: number;
  retryCount?: number;
}

// Note: TestExecutionResult is defined in documentation.ts
// This file only defines HTTP request configuration types
