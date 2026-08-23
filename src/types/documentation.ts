/**
 * API Document类型定义
 * 用于生成可视化 API Document
 */

/**
 * API Document主体结构
 */
export interface ApiDocumentation {
  info: DocInfo;
  servers?: ServerInfo[];
  tags?: string[];
  endpoints: EndpointDocumentation[];
}

/**
 * Document基本信息
 */
export interface DocInfo {
  title: string;
  description?: string;
  version?: string;
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
}

/**
 * 服务器信息
 */
export interface ServerInfo {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariable>;
}

/**
 * 服务器变量（用于枚举值）
 */
export interface ServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

/**
 * API 端点Document
 */
export interface EndpointDocumentation {
  id: string;
  name: string;
  description?: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  parameters?: Parameter[];
  headers?: Header[];
  request_body?: RequestBody;
  responses?: ResponseExample[];
  tags: string[];
  deprecated?: boolean;
  security?: SecurityRequirement[];
}

/**
 * 参数定义
 */
export interface Parameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  description?: string;
  required: boolean;
  schema?: {
    type?: string;
    format?: string;
    enum?: string[];
    default?: any;
    example?: any;
    properties?: Record<string, any>;
    items?: any;
  };
}

/**
 * 请求头定义
 */
export interface Header {
  name: string;
  description?: string;
  required: boolean;
  example?: string;
  schema?: {
    type?: string;
    format?: string;
    enum?: string[];
    default?: string;
  };
}

/**
 * 请求体定义
 */
export interface RequestBody {
  content_type: string;
  description?: string;
  required?: boolean;
  schema: any;
  example?: any;
}

/**
 * 响应示例
 */
export interface ResponseExample {
  status_code: number;
  description: string;
  headers?: ResponseHeader[];
  example?: any;
  schema?: any;
  content_type?: string;
}

/**
 * 响应头
 */
export interface ResponseHeader {
  name: string;
  value?: string;
  description?: string;
}

/**
 * 安全认证要求
 */
export interface SecurityRequirement {
  type: "apiKey" | "http" | "oauth2" | "openIdConnect" | "bearer";
  scheme?: string;
  bearer_format?: string;
  description?: string;
  flows?: OAuthFlows;
}

/**
 * OAuth 流程配置
 */
export interface OAuthFlows {
  implicit?: OAuthFlow;
  password?: OAuthFlow;
  clientCredentials?: OAuthFlow;
  authorizationCode?: OAuthFlow;
}

/**
 * OAuth 流程详情
 */
export interface OAuthFlow {
  authorization_url?: string;
  token_url?: string;
  refresh_url?: string;
  scopes: Record<string, string>;
}

/**
 * 测试执行参数（用于Document页面内联测试）
 */
export interface TestExecutionParams {
  path_params?: Record<string, string>;
  query_params?: Record<string, string>;
  headers?: Record<string, string>;
  body?: any;
}

/**
 * 测试执行结果
 */
export interface TestExecutionResult {
  status_code: number;
  status_message: string;
  headers: Array<{ name: string; value: string }>;
  body: string;
  duration: number;
  success: boolean;
  error?: string;
}
